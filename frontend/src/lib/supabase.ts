import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let serverInstance: SupabaseClient | null = null

/** Server-side Supabase client (API routes only) */
export function getServerSupabase(): SupabaseClient | null {
  if (serverInstance) return serverInstance
  if (!supabaseUrl || !supabaseKey) return null
  serverInstance = createClient(supabaseUrl, supabaseKey)
  return serverInstance
}
