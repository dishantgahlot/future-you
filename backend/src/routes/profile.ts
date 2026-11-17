import { Router } from 'express'
import { z } from 'zod'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { validate } from '../middleware/validation.js'
import { AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)
  }
  return _supabase
}

const profileUpdateSchema = z.object({
  body: z.object({
    full_name: z.string().min(1).max(100).optional(),
    date_of_birth: z.string().datetime().optional().nullable(),
    timezone: z.string().optional(),
    units: z.enum(['metric', 'imperial']).optional(),
  }),
})

const preferencesSchema = z.object({
  body: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z.boolean().optional(),
    weekly_report: z.boolean().optional(),
    predictions: z.boolean().optional(),
  }),
})

router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data: profile, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', req.user!.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new AppError(500, error.message)
  }

  res.json({ data: profile || {} })
}))

router.patch('/', validate(profileUpdateSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data, error } = await getSupabase()
    .from('profiles')
    .upsert({
      id: req.user!.id,
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new AppError(400, error.message)

  res.json({ data })
}))

router.get('/preferences', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data: profile, error } = await getSupabase()
    .from('profiles')
    .select('preferences')
    .eq('id', req.user!.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new AppError(500, error.message)
  }

  const defaultPreferences = {
    theme: 'system',
    notifications: true,
    weekly_report: true,
    predictions: true,
  }

  res.json({ data: profile?.preferences || defaultPreferences })
}))

router.patch('/preferences', validate(preferencesSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data: current, error: fetchError } = await getSupabase()
    .from('profiles')
    .select('preferences')
    .eq('id', req.user!.id)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new AppError(500, fetchError.message)
  }

  const mergedPreferences = {
    ...(current?.preferences || {}),
    ...req.body,
  }

  const { data, error } = await getSupabase()
    .from('profiles')
    .upsert({
      id: req.user!.id,
      preferences: mergedPreferences,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new AppError(400, error.message)

  res.json({ data: data?.preferences || mergedPreferences })
}))

router.post('/avatar', asyncHandler(async (req: AuthenticatedRequest, res) => {
  res.json({ message: 'Avatar upload endpoint - implement with Supabase Storage' })
}))

router.delete('/account', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { error } = await getSupabase().auth.admin.deleteUser(req.user!.id)

  if (error) throw new AppError(400, error.message)

  res.json({ message: 'Account deleted successfully' })
}))

export { router as profileRoutes }