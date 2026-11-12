import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './OnboardingForm'
export const metadata = { title: 'Complete seu cadastro | Nodal Music' }
export default async function Page() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await sb.from('profiles').select('status').eq('id', user.id).single()
  if (me && me.status !== 'PENDING_ONBOARDING') redirect('/dashboard')
  return <OnboardingForm email={user.email ?? ''} />
}
