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

export async function getReleaseAudioUrl(id: string): Promise<Result> {
  const ctx = await getAdminContext()
  if (!ctx) return forbidden
  if (!isUuid(id)) return { ok: false, message: 'Lançamento inválido.' }
  const { data: row, error: queryError } = await ctx.supabase.from('releases')
    .select('artist_id,audio_path').eq('id', id).maybeSingle()
  if (queryError || !row?.audio_path || !row.audio_path.startsWith(row.artist_id + '/')) {
    return { ok: false, message: 'Áudio não encontrado para este lançamento.' }
  }
  const { data, error } = await ctx.supabase.storage.from('audio').createSignedUrl(row.audio_path, 600)
  if (error || !data?.signedUrl) return { ok: false, message: 'Falha ao gerar URL temporária do áudio.' }
  return { ok: true, url: data.signedUrl }
}

export async function getContractDownloadUrl(userId: string): Promise<Result> {
  const ctx = await getAdminContext()
  if (!ctx) return forbidden
  if (!isUuid(userId)) return { ok: false, message: 'Usuário inválido.' }
  const { data: contract, error: queryError } = await ctx.supabase.from('user_contracts')
    .select('signed_at,pdf_url').eq('user_id', userId).maybeSingle()
  if (queryError || !contract?.signed_at) return { ok: false, message: 'O usuário não tem um contrato assinado.' }
  // O contrato é salvo em contracts/<userId>/contrato_assinado.pdf.
  const expected = userId + '/contrato_assinado.pdf'
  const stored = contract.pdf_url || expected
  const path = stored.startsWith(userId + '/') && stored.toLowerCase().endsWith('.pdf') ? stored : expected
  const { data, error } = await ctx.supabase.storage.from('contracts')
    .createSignedUrl(path, 60, { download: 'contrato_assinado.pdf' })
  if (error || !data?.signedUrl) return { ok: false, message: 'PDF não encontrado no Storage ou acesso negado.' }
  return { ok: true, url: data.signedUrl }
}
