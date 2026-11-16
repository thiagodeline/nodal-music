import { onboardingRedirect } from './lib/onboarding-route'
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
  // O painel administrativo faz checagem de RBAC própria no layout e nas ações.
  // Cargos de equipe não dependem do onboarding artístico.
  if(path.startsWith('/admin'))return res // getAdminContext() valida RBAC no servidor
  const { data: profile, error } = await sb.from('profiles')
    .select('role,status,onboarding_completed').eq('id', user.id).maybeSingle()
  // O login administrativo não participa do dashboard artístico nem do onboarding.
  if(!error&&profile?.role==='admin')return go('/admin')
  if (error) return res // se o banco falhar, não prende o usuário; o RLS continua protegendo os dados

  let contractPdfReady = false
  if (profile?.status === 'PENDING_CONTRACT' && path !== '/onboarding/contract') {
    // The second step of onboarding ends only after the signed document is
    // uploaded and verified. A profile status alone is not enough.
    const { data: contract, error: contractError } = await sb.from('user_contracts')
      .select('pdf_status').eq('user_id', user.id).maybeSingle()
    if (contractError) console.error('Middleware: erro ao verificar PDF contratual', contractError.code)
    contractPdfReady = !contractError && contract?.pdf_status === 'ready'
  }
  const next = onboardingRedirect(path, profile, contractPdfReady)
  if (next && next !== path) return go(next)
  return res
}
export const config = { matcher: ['/dashboard/:path*', '/admin/:path*', '/onboarding/:path*'] }
