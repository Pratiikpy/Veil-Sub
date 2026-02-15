import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let serverInstance: SupabaseClient | null = null

/** Server-side Supabase client (service role key — API routes only) */
export function getServerSupabase(): SupabaseClient | null {
  if (serverInstance) return serverInstance
  if (!supabaseUrl || !supabaseServiceKey) return null
  serverInstance = createClient(supabaseUrl, supabaseServiceKey)
  return serverInstance
}
