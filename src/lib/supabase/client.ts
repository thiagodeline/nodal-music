import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './public-config'

// Browser client only uses the public, RLS-scoped key.
export const createClient = () => createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
