import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dhgxiowaeldrtkwfasgl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IWRZyas0DULzyRFcbJRzhg_jjKcXow_'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
