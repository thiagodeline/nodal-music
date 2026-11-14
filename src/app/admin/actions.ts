'use server'

import { revalidatePath } from 'next/cache'
import { getAdminContext } from '@/lib/admin-access'

type Result = { ok: true; message?: string; url?: string } | { ok: false; message: string }
const forbidden: Result = { ok: false, message: 'Acesso restrito a administradores.' }
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export async function moderateRelease(id: string, decision: 'approved' | 'rejected', reason = ''): Promise<Result> {
  const ctx = await getAdminContext()
  if (!ctx) return forbidden
  if (!isUuid(id) || !['approved', 'rejected'].includes(decision)) return { ok: false, message: 'Dados inválidos.' }
  const cleanReason = typeof reason === 'string' ? reason.trim() : ''
  if (decision === 'rejected' && (cleanReason.length < 10 || cleanReason.length > 1500)) {
    return { ok: false, message: 'Informe um motivo de rejeição com 10 a 1.500 caracteres.' }
  }
  // Só moderar lançamentos ainda em revisão ou já moderados, nunca conteúdo no ar.
  const allowed = decision === 'approved' ? ['pending', 'rejected'] : ['pending', 'approved']
  const { data, error } = await ctx.supabase.from('releases')
    .update({
      status: decision,
      rejection_reason: decision === 'rejected' ? cleanReason : null,
      reviewed_by: ctx.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id).in('status', allowed).select('id')
  if (error) return { ok: false, message: 'Não foi possível alterar o lançamento: ' + error.message }
  if (!data?.length) return { ok: false, message: 'O lançamento mudou de status ou não pode mais ser moderado. Recarregue a página.' }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { ok: true, message: decision === 'approved' ? 'Lançamento aprovado.' : 'Lançamento rejeitado. O motivo foi registrado.' }
}

export async function getReleaseAudioUrl(id: string, trackId?: string): Promise<Result> {
  const ctx = await getAdminContext()
  if (!ctx) return forbidden
  if (!isUuid(id)) return { ok: false, message: 'Lançamento inválido.' }
  const { data: row, error: queryError } = await ctx.supabase.from('releases')
    .select('artist_id,audio_path').eq('id', id).maybeSingle()
  if (queryError || !row) return { ok: false, message: 'Lançamento não encontrado.' }
  let path = row.audio_path
  if (trackId) {
    if (!isUuid(trackId)) return { ok: false, message: 'Faixa inválida.' }
    const { data: track, error: trackError } = await ctx.supabase.from('release_tracks')
      .select('audio_path').eq('id', trackId).eq('release_id', id).maybeSingle()
    if (trackError || !track) return { ok: false, message: 'Faixa não encontrada.' }
    path = track.audio_path
  }
  if (!path || !path.startsWith(row.artist_id + '/')) {
    return { ok: false, message: 'Áudio não encontrado.' }
  }
  const { data, error } = await ctx.supabase.storage.from('audio').createSignedUrl(path, 600)
  if (error || !data?.signedUrl) return { ok: false, message: 'Falha ao gerar URL temporária do áudio.' }
  return { ok: true, url: data.signedUrl }
}

export async function getContractDownloadUrl(userId: string): Promise<Result> {
  const ctx = await getAdminContext()
  if (!ctx) return forbidden
  if (!isUuid(userId)) return { ok: false, message: 'Usuário inválido.' }
  const { data: contract, error: queryError } = await ctx.supabase.from('user_contracts')
    .select('signed_at,pdf_url,pdf_status').eq('user_id', userId).maybeSingle()
  if (queryError || !contract?.signed_at || contract.pdf_status !== 'ready') return { ok: false, message: 'O usuário não tem um contrato assinado.' }
  // O contrato é salvo em contracts/<userId>/contrato_assinado.pdf.
  const expected = userId + '/contrato_assinado.pdf'
  const stored = contract.pdf_url || expected
  const path = stored.startsWith(userId + '/') && stored.toLowerCase().endsWith('.pdf') ? stored : expected
  const { data, error } = await ctx.supabase.storage.from('contracts')
    .createSignedUrl(path, 60, { download: 'contrato_assinado.pdf' })
  if (error || !data?.signedUrl) return { ok: false, message: 'PDF não encontrado no Storage ou acesso negado.' }
  return { ok: true, url: data.signedUrl }
}

export async function replyToTicket(id: string, body: string): Promise<Result> {
  const ctx = await getAdminContext()
  if (!ctx) return forbidden
  if (!isUuid(id) || typeof body !== 'string' || !body.trim() || body.trim().length > 3000)
    return { ok: false, message: 'Informe uma resposta de até 3.000 caracteres.' }
  const { error } = await ctx.supabase.rpc('reply_to_ticket', {
    p_ticket_id: id, p_body: body.trim()
  })
  if (error) return { ok: false, message: 'Não foi possível responder ao ticket: ' + error.message }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { ok: true, message: 'Resposta registrada. Ticket marcado como Respondido.' }
}

export async function closeTicket(id: string): Promise<Result> {
  const ctx = await getAdminContext()
  if (!ctx) return forbidden
  if (!isUuid(id)) return { ok: false, message: 'Ticket inválido.' }
  const { data, error } = await ctx.supabase.from('tickets').update({status:'closed'})
    .eq('id',id).neq('status','closed').select('id')
  if (error || !data?.length) return { ok:false, message:'Não foi possível fechar o ticket.' }
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return {ok:true,message:'Ticket fechado.'}
}
