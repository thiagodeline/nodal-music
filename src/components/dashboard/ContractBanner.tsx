import { Lock, FileClock, ShieldAlert } from 'lucide-react'
import type { AccountStatus } from './useCanReleaseMusic'
export function ContractBanner({ status }: { status: AccountStatus }) {
  if (status === 'BLOCKED') return <div className="banner red" role="alert"><ShieldAlert size={20} /><p>Sua conta está bloqueada para novos lançamentos. Fale com o nosso suporte para entender o motivo.</p></div>
  if (status !== 'PENDING_CONTRACT') return null
  return <div className="banner" role="status"><FileClock size={20} /><p>Seu cadastro foi recebido. Enviamos o contrato para seu e-mail. Assim que nos devolver o contrato assinado, seu painel será liberado para lançamentos.</p></div>
}
export function NewReleaseCta({ can, label }: { can: boolean; label: string }) {
  return can ? <a className="btn" href="#new">{label}</a> : <button className="btn" disabled title="Disponível depois que o contrato assinado for aprovado"><Lock size={14} style={{ verticalAlign: -2 }} /> {label}</button>
}
