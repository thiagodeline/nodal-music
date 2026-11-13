import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/profile'
import OnboardingForm from './OnboardingForm'
export const metadata = { title: 'Complete seu cadastro | Nodal Music' }
export default async function Page() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const p = await ensureProfile(sb, user) // conta sem perfil: cria agora
  if (p.error) console.error('Erro detalhado Supabase (onboarding/page):', p.error)
  if (p.status && p.status !== 'PENDING_ONBOARDING') redirect('/dashboard')
  return <OnboardingForm email={user.email ?? ''} />
}
