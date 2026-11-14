'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ContractAcceptance = {
  signed_at: string
  signed_name: string
  artist_name: string | null
  cpf: string | null
  cnpj: string | null
  contract_snapshot: string
  contract_version: string
  pdf_status: 'pending' | 'ready'
  user_id: string
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

function normalizedError(message?: string) {
  if (!message) return 'Não foi possível processar o contrato. Tente novamente.'
  if (/aguardando aprovação|não pode ser assinada|ainda não disponível/i.test(message))
    return 'O contrato ainda não foi aprovado pela SINTONE. A assinatura está temporariamente indisponível.'
  if (/jwt|session|autoriz|authentication|sessão/i.test(message))
    return 'Sua sessão expirou. Entre novamente para assinar.'
  return message.slice(0, 300)
}

export async function acceptContract(): Promise<Result<ContractAcceptance>> {
  const sb = await createClient()
  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) return { ok: false, error: 'Entre na sua conta para aceitar o contrato.' }

  const h = await headers()
  // IP informado pela infraestrutura, destinado à trilha de auditoria.
  // Não equivale a uma verificação de identidade ou assinatura ICP-Brasil.
  const ip = h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || h.get('x-forwarded-for')?.split(',')[0]?.trim()
    || h.get('x-real-ip') || ''
  const userAgent = h.get('user-agent') || ''
  const { data, error: rpcError } = await sb.rpc('accept_sintone_contract', {
    p_ip: ip,
    p_user_agent: userAgent,
  })
  if (rpcError || !data) {
    console.error('accept_sintone_contract:', rpcError?.code, rpcError?.message)
    return { ok: false, error: normalizedError(rpcError?.message) }
  }
  revalidatePath('/onboarding/contract')
  return { ok: true, data: data as ContractAcceptance }
}

export async function finalizeContractPdf(): Promise<Result<{ pdf_status: 'ready' }>> {
  const sb = await createClient()
  const { data: { user }, error } = await sb.auth.getUser()
  if (error || !user) return { ok: false, error: 'Sessão expirada. Faça login e tente novamente.' }

  const path = user.id + '/contrato_assinado.pdf'
  const { data: signed, error: rowError } = await sb.from('user_contracts')
    .select('pdf_url,pdf_status').eq('user_id', user.id).maybeSingle()
  if (rowError || !signed || signed.pdf_url !== path)
    return { ok: false, error: 'Assinatura não encontrada para sua conta.' }
  if (signed.pdf_status === 'ready')
    return { ok: true, data: { pdf_status: 'ready' } }

  // Confira os bytes reais do Storage no servidor: não confie em hash ou tamanho fornecido pelo navegador.
  const { data: file, error: downloadError } = await sb.storage.from('contracts').download(path)
  if (downloadError || !file)
    return { ok: false, error: 'O arquivo PDF ainda não foi encontrado no armazenamento. Reenvie o documento.' }
  if (file.size < 200 || file.size > 10 * 1024 * 1024)
    return { ok: false, error: 'O PDF precisa ter entre 200 bytes e 10 MB.' }
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-')
    return { ok: false, error: 'O arquivo armazenado não é um PDF válido.' }
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const { error: finalizeError } = await sb.rpc('finalize_sintone_contract_pdf', { p_sha256: sha256 })
  if (finalizeError) {
    console.error('finalize_sintone_contract_pdf:', finalizeError.code, finalizeError.message)
    return { ok: false, error: normalizedError(finalizeError.message) }
  }
  revalidatePath('/onboarding/contract')
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { ok: true, data: { pdf_status: 'ready' } }
}

export async function getSignedContractDownload(): Promise<Result<{ url: string }>> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, error: 'Sua sessão expirou. Entre novamente.' }

  const expected = user.id + '/contrato_assinado.pdf'
  const { data: record, error } = await sb.from('user_contracts')
    .select('pdf_url,pdf_status').eq('user_id', user.id).maybeSingle()
  if (error || !record || record.pdf_status !== 'ready' || record.pdf_url !== expected)
    return { ok: false, error: 'O PDF ainda está sendo preparado.' }
  const { data, error: storageError } = await sb.storage.from('contracts')
    .createSignedUrl(expected, 120, { download: 'contrato_assinado.pdf' })
  if (storageError || !data?.signedUrl)
    return { ok: false, error: 'Não foi possível gerar o link de download. Tente novamente.' }
  return { ok: true, data: { url: data.signedUrl } }
}
