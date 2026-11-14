import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './lib/supabase/public-config'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })
  const sb = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: CookieToSet[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })
  // redireciona sem perder os cookies de sessão que o Supabase acabou de renovar
  const go = (path: string) => { const r = NextResponse.redirect(new URL(path, req.url)); res.cookies.getAll().forEach(c => r.cookies.set(c)); return r }

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return go('/login')

  const path = req.nextUrl.pathname
  const { data: profile, error } = await sb.from('profiles').select('status, onboarding_completed').eq('id', user.id).maybeSingle()
  if (error) return res // se o banco falhar, não prende o usuário; o RLS continua protegendo os dados

  const pending = !profile || profile.onboarding_completed === false || profile.status === 'PENDING_ONBOARDING'
  const inOnboarding = path === '/onboarding' || path.startsWith('/onboarding/')
  if (pending && !inOnboarding) return go('/onboarding')   // /dashboard, /admin e subrotas
  if (!pending && inOnboarding) return go('/dashboard')    // onboarding já concluído
  return res
}
export const config = { matcher: ['/dashboard/:path*', '/admin/:path*', '/onboarding/:path*'] }
