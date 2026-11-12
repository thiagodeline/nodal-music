'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function requestWithdrawal(fd: FormData) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser(); if (!user) return
  const amount = Number(fd.get('amount')); const pix = String(fd.get('pix') || '')
  if (!(amount >= 50) || !pix) return
  const { data: rep } = await sb.from('reports').select('revenue').eq('artist_id', user.id)
  const { data: wd } = await sb.from('withdrawals').select('amount,status').eq('artist_id', user.id)
  const balance = (rep ?? []).reduce((s, r) => s + Number(r.revenue), 0) - (wd ?? []).filter(w => w.status !== 'rejected').reduce((s, w) => s + Number(w.amount), 0)
  if (amount > balance) return
  await sb.from('profiles').update({ pix_key: pix }).eq('id', user.id)
  await sb.from('withdrawals').insert({ artist_id: user.id, amount, pix_key: pix })
  revalidatePath('/dashboard')
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
    const { data, error } = await sb.from('profiles')
      .update({ status: 'ACTIVE', can_release_music: true, contract_accepted_at: new Date().toISOString() })
      .eq('id', userId).eq('status', 'PENDING_CONTRACT').select('id')
    if (error) return { ok: false, error: 'Não foi possível aprovar: ' + error.message }
    if (!data?.length) return { ok: false, error: 'Essa conta não está aguardando contrato.' }
    revalidatePath('/dashboard')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Erro inesperado. Tente de novo.' }
  }
}
