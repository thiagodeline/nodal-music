import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// A rota /admin nunca confia em checagem só no navegador.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  if (user.app_metadata?.role !== 'admin') notFound()
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') notFound()
  return children
}
