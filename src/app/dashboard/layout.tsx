import Shell from '@/components/Shell'
import { createClient } from '@/lib/supabase/server'
export default async function Layout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: me } = user ? await sb.from('profiles').select('role').eq('id', user.id).single() : { data: null }
  const links: [string, string][] = [['/dashboard', 'Visão geral'], ['/dashboard/lancamentos/novo', 'Novo lançamento']]
  if (me?.role === 'admin') links.push(['/admin', 'Painel admin'])
  return <Shell links={links}>{children}</Shell>
}
