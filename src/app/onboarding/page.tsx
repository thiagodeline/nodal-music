import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/profile'
import OnboardingForm from './OnboardingForm'
export const metadata = { title: 'Complete seu cadastro | Nodal Music' }
export default async function Page() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  let { data: me } = await sb.from('profiles').select('status').eq('id', user.id).maybeSingle()
  if (!me) { await ensureProfile(sb, user); me = { status: 'PENDING_ONBOARDING' } } // conta sem perfil: cria agora
  if (me.status !== 'PENDING_ONBOARDING') redirect('/dashboard')
  return <OnboardingForm email={user.email ?? ''} />
}
