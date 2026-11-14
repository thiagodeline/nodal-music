import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './public-config'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
type CookieToSet = { name: string; value: string; options: CookieOptions }
export async function createClient() {
  const c = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => c.getAll(),
      setAll: (list: CookieToSet[]) => { try { list.forEach(({ name, value, options }) => c.set(name, value, options)) } catch {} },
    },
  })
}
