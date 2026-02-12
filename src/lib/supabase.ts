import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Only create a real client if env vars are present.
// Otherwise export a dummy that won't be called (SUPABASE_ENABLED is false in App.tsx).
let supabase: SupabaseClient

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Stub — never used at runtime when SUPABASE_ENABLED is false
  supabase = null as unknown as SupabaseClient
}

export { supabase }
