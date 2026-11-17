/**
 * Supabase Admin Client (Service Role)
 *
 * Creates and exports a Supabase client with service role key for admin operations.
 * This bypasses RLS policies and is used for backend services that need to access
 * user data across all users (like AI services).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'

let _supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = config.supabase.url || 'https://dhgxiowaeldrtkwfasgl.supabase.co'
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey || 'placeholder'
    _supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _supabaseAdmin
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin() as any
    const val = client[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

export default supabaseAdmin
