'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function requestWithdrawal(fd: FormData) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, message: 'Sessão expirada.' }
  const amount = Number(fd.get('amount'))
  const pix = String(fd.get('pix') || '').trim()
  if (!Number.isFinite(amount) || !pix) return { ok: false, message: 'Dados inválidos.' }
  const { error } = await sb.rpc('request_sintone_withdrawal', { p_amount: amount, p_pix: pix })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/dashboard')
  return { ok: true, message: 'Pedido de saque enviado.' }
}
export async function setReleaseStatus(id: string, status: string) {
  const sb = await createClient(); await sb.from('releases').update({ status }).eq('id', id); revalidatePath('/admin')
}
export async function setWithdrawalStatus(id: string, status: string) {
  const sb = await createClient(); await sb.from('withdrawals').update({ status }).eq('id', id); revalidatePath('/admin')
}

export async function setLgpdStatus(id: string, status: string) {
  const sb = await createClient(); await sb.from('lgpd_requests').update({ status }).eq('id', id); revalidatePath('/admin')
}

export async function approveContract(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: 'Conta inválida.' }
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { ok: false, error: 'Sua sessão expirou. Entre novamente.' }
    const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return { ok: false, error: 'Acesso restrito a administradores.' }
    // A aprovação exige documento assinado e PDF finalizado — sem liberação manual antecipada.
    const { data: signed } = await sb.from('user_contracts')
      .select('signed_at,pdf_status').eq('user_id', userId).maybeSingle()
    if (!signed?.signed_at || signed.pdf_status !== 'ready')
      return { ok: false, error: 'O usuário ainda não concluiu a assinatura e o envio do PDF.' }
    const { data, error } = await sb.from('profiles')
      .update({ status: 'ACTIVE', can_release_music: true, contract_accepted_at: signed.signed_at })
      .eq('id', userId).eq('status', 'PENDING_CONTRACT').select('id')
    if (error) return { ok: false, error: 'Não foi possível aprovar: ' + error.message }
    if (!data?.length) return { ok: false, error: 'Essa conta não está aguardando contrato.' }
    revalidatePath('/dashboard')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Erro inesperado. Tente de novo.' }
  }
}
