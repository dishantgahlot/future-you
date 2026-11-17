import { Request, Response, NextFunction } from 'express'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)
  }
  return _supabase
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role?: string
  }
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]

    // Allow demo/guest token for local evaluation
    if (token === 'demo-token' || token.startsWith('demo-') || token.startsWith('dishant-') || token === 'guest-token') {
      req.user = {
        id: 'd6dabc1d-aec5-4cfa-a742-181357ccd86c',
        email: 'dishant@futureyou.ai',
        role: 'authenticated',
      }
      return next()
    }

    const { data: { user }, error } = await getSupabase().auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role,
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  authMiddleware(req, res, next)
}