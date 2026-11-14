import { Lock, FileClock, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import type { AccountStatus } from './useCanReleaseMusic'
export function ContractBanner({ status, signed = false }: { status: AccountStatus; signed?: boolean }) {
  if (status === 'BLOCKED') return <div className="banner red" role="alert"><ShieldAlert size={20} /><p>Sua conta está bloqueada para novos lançamentos. Fale com o nosso suporte para entender o motivo.</p></div>
  if (status !== 'PENDING_CONTRACT') return null
  return <div className="banner" role="status"><FileClock size={20} /><p>{signed
    ? <>Seu contrato foi assinado e está aguardando aprovação da equipe. <Link href="/onboarding/contract">Ver e baixar contrato</Link>.</>
    : <>Seu cadastro foi recebido, mas a assinatura do contrato ainda está pendente. <Link href="/onboarding/contract">Ler e assinar contrato</Link> para concluir seu cadastro.</>
  }</p></div>
}
export function NewReleaseCta({ can, label }: { can: boolean; label: string }) {
  return can ? <a className="btn" href="#new">{label}</a> : <button className="btn" disabled title="Disponível depois que o contrato assinado for aprovado"><Lock size={14} style={{ verticalAlign: -2 }} /> {label}</button>
}
