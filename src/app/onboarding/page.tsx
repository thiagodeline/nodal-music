import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/profile'
import OnboardingForm from './OnboardingForm'
export const metadata = { title: 'Complete seu cadastro | SINTONE' }
export default async function Page() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const p = await ensureProfile(sb, user) // conta sem perfil: cria agora
  if (p.error) console.error('Erro detalhado Supabase (onboarding/page):', p.error)
  if (p.status && p.status !== 'PENDING_ONBOARDING') redirect('/dashboard')
  return <OnboardingForm email={user.email ?? ''} initialName={String(user.user_metadata?.full_name ?? '')} initialType={user.user_metadata?.registration_profile === 'LABEL' ? 'LABEL' : 'ARTIST'} isProducer={user.user_metadata?.registration_profile === 'PRODUCER'} />
}
