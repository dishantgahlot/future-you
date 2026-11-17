import { Router } from 'express'
import { z } from 'zod'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { validate } from '../middleware/validation.js'

const router = Router()

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = config.supabase.url || process.env.VITE_SUPABASE_URL || 'https://dhgxiowaeldrtkwfasgl.supabase.co'
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey || process.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
    _supabase = createClient(url, key)
  }
  return _supabase
}

const signUpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    full_name: z.string().min(1, 'Full name is required').max(100),
  }),
})

const signInSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
})

const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
})

router.post('/signup', validate(signUpSchema), asyncHandler(async (req, res) => {
  const { email, password, full_name } = req.body

  let targetUser: any = null

  const { data, error } = await getSupabase().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (error) {
    if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('exists')) {
      const { data: usersData } = await getSupabase().auth.admin.listUsers()
      const existing = usersData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existing) {
        await getSupabase().auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: { full_name },
        })
        targetUser = existing
      }
    } else {
      throw new AppError(400, error.message)
    }
  } else {
    targetUser = data.user
  }

  const { data: sessionData, error: sessionError } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  })

  if (sessionError) {
    throw new AppError(400, sessionError.message)
  }

  res.status(201).json({
    user: targetUser || sessionData.user,
    session: sessionData.session,
  })
}))

router.post('/confirm-user', asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  try {
    const { data: usersData } = await getSupabase().auth.admin.listUsers()
    const user = usersData?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (user) {
      await getSupabase().auth.admin.updateUserById(user.id, { email_confirm: true })
      return res.json({ success: true, user })
    }
    return res.status(404).json({ error: 'User not found' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}))

router.post('/signin', validate(signInSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new AppError(401, 'Invalid credentials')
  }

  res.json({
    user: data.user,
    session: data.session,
  })
}))

router.post('/signout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    await getSupabase().auth.admin.signOut(token)
  }

  res.json({ message: 'Signed out successfully' })
}))

router.post('/refresh', validate(refreshSchema), asyncHandler(async (req, res) => {
  const { refresh_token } = req.body

  const { data, error } = await getSupabase().auth.refreshSession({ refresh_token })

  if (error) {
    throw new AppError(401, 'Invalid refresh token')
  }

  res.json({
    session: data.session,
    user: data.user,
  })
}))

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email || !z.string().email().safeParse(email).success) {
    throw new AppError(400, 'Valid email is required')
  }

  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${config.frontendUrl}/reset-password`,
  })

  if (error) {
    throw new AppError(400, error.message)
  }

  res.json({ message: 'Password reset email sent' })
}))

router.get('/user', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'No token provided')
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await getSupabase().auth.getUser(token)

  if (error || !user) {
    throw new AppError(401, 'Invalid token')
  }

  res.json({ user })
}))

export { router as authRoutes }