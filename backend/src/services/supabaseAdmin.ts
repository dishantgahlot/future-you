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
    _supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _supabaseAdmin
}

export const supabaseAdmin = getSupabaseAdmin()
export default supabaseAdmin
