import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
type CookieToSet = { name: string; value: string; options: CookieOptions }
export async function createClient() {
  const c = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => c.getAll(),
      setAll: (list: CookieToSet[]) => { try { list.forEach(({ name, value, options }) => c.set(name, value, options)) } catch {} },
    },
  })
}
