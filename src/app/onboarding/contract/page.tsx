import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContractSigning, { type ContractRecord } from './ContractSigning'

export const metadata = { title: 'Assinar contrato | SINTONE' }
export const dynamic = 'force-dynamic'

export default async function ContractPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await sb.from('profiles')
    .select('status,account_type,onboarding_completed,name,artist_name,cpf,cnpj')
    .eq('id', user.id).maybeSingle()
  if (!profile?.onboarding_completed || profile.status === 'PENDING_ONBOARDING') redirect('/onboarding')
  if (!profile.account_type || !profile.name) redirect('/onboarding')
  const { data: row } = await sb.from('user_contracts')
    .select('user_id,signed_at,signed_name,artist_name,cpf,cnpj,contract_snapshot,contract_version,pdf_status')
    .eq('user_id', user.id).maybeSingle()
  if (profile.status !== 'PENDING_CONTRACT' && !row) redirect('/dashboard')

  const { data: templates, error } = await sb.from('contract_templates')
    .select('version,body,active')
    .eq('account_type', profile.account_type).order('created_at', { ascending: false }).limit(10)
  if (error) console.error('contract_templates select', error.message)
  const template = templates?.find(t => t.active) || templates?.[0]
  const legalReady = !!template?.active
  const document = profile.account_type === 'ARTIST' ? profile.cpf : profile.cnpj

  return <ContractSigning
    userId={user.id}
    accountType={profile.account_type as 'ARTIST' | 'LABEL'}
    artistName={profile.artist_name || ''}
    fullName={profile.name}
    documentNumber={document || ''}
    contractVersion={template?.version || 'Indisponível'}
    contractText={row?.contract_snapshot || template?.body || 'O contrato ainda não está disponível.'}
    readyToSign={legalReady}
    existingRecord={row as ContractRecord | null}
  />
}
