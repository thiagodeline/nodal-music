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

type BillingResult = Result & {id?:string}
type BillingDraft={name:string;description:string;price:number;frequency:1|12;benefits:string[]}
export async function saveBillingDraft(input:BillingDraft,id?:string):Promise<BillingResult>{
 const ctx=await getAdminContext()
 if(!ctx)return forbidden
 const name=typeof input?.name==='string'?input.name.trim():''
 const description=typeof input?.description==='string'?input.description.trim():''
 const price=Number(input?.price)
 const frequency=input?.frequency
 const benefits=Array.isArray(input?.benefits)?input.benefits.map(x=>typeof x==='string'?x.trim():''):[]
 if(name.length<2||name.length>80||description.length>500||!Number.isFinite(price)||price<0||
   Math.abs(Math.round(price*100)-price*100)>0.001||(frequency!==1&&frequency!==12)||
   benefits.length>20||benefits.some(x=>x.length<1||x.length>160))
   return {ok:false,message:'Verifique nome, valor, periodicidade e benefícios.'}
 const clean={name,description,price_brl:price,frequency,frequency_type:'months',benefits}
 if(id){
  if(!isUuid(id))return {ok:false,message:'Plano inválido.'}
  const {data:previous,error:e}=await ctx.supabase.from('billing_plans')
   .select('price_brl,frequency,mp_plan_id,active,is_default,published').eq('id',id).single()
  if(e||!previous)return {ok:false,message:'Plano não encontrado.'}
  if(Number(previous.price_brl)===0&&price>0){
   if(!process.env.MERCADOPAGO_WEBHOOK_SECRET||!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return {ok:false,message:'Antes de converter um plano gratuito em pago, conclua a configuração do webhook e do checkout. Assim, ninguém ficará bloqueado sem poder assinar.'}
   const {data:alternatives}=await ctx.supabase.from('billing_plans').select('id')
     .eq('published',true).eq('archived',false).gt('price_brl',0).neq('id',id).limit(1)
   if(!alternatives?.length)
    return {ok:false,message:'Publique pelo menos um plano pago com checkout funcional antes de encerrar a modalidade gratuita.'}
  }
  const financialChange=Number(previous.price_brl)!==price||previous.frequency!==frequency
  if(previous.active)return {ok:false,message:'Desative o plano antes de editar condições comerciais.'}
  const next={...clean,mp_plan_id:financialChange?null:previous.mp_plan_id,
   published:previous.published,
   updated_at:new Date().toISOString()}
  const {data,error}=await ctx.supabase.from('billing_plans').update(next)
   .eq('id',id).eq('active',false).select('id')
  if(error||!data?.length)return {ok:false,message:'Não foi possível atualizar o plano: '+(error?.message||'Recarregue a lista.')}
  return {ok:true,message:financialChange&&previous.mp_plan_id?'Plano atualizado. O vínculo anterior com o Mercado Pago foi desfeito: registre o novo preço antes de publicar.':'Plano atualizado.'}
 }
 const {data,error}=await ctx.supabase.from('billing_plans')
  .insert({...clean,active:false,published:true,archived:false}).select('id').single()
 if(error)return {ok:false,message:'Falha ao criar o plano: '+error.message}
 return {ok:true,id:data.id,message:'Plano salvo na vitrine. '+(price===0?'Gratuito.':'O pagamento só ficará disponível após configurar a cobrança.')}
}
export async function archiveBillingDraft(id:string):Promise<Result>{
 const ctx=await getAdminContext()
 if(!ctx)return forbidden
 if(!isUuid(id))return {ok:false,message:'Plano inválido.'}
 const {data,error}=await ctx.supabase.from('billing_plans')
  .update({archived:true,published:false,updated_at:new Date().toISOString()})
  .eq('id',id).eq('active',false).select('id')
 if(error||!data?.length)return {ok:false,message:'Não foi possível arquivar o plano.'}
 return {ok:true,message:'Plano arquivado.'}
}
export async function setBillingPlanPublished(id:string,published:boolean):Promise<Result>{
 const ctx=await getAdminContext()
 if(!ctx)return forbidden
 if(!isUuid(id)||typeof published!=='boolean')return {ok:false,message:'Dados inválidos.'}
 const {data:plan,error:readError}=await ctx.supabase.from('billing_plans')
  .select('price_brl,mp_plan_id,archived').eq('id',id).single()
 if(readError||!plan||plan.archived)return {ok:false,message:'Plano indisponível.'}
 const {data,error}=await ctx.supabase.from('billing_plans').update({published,updated_at:new Date().toISOString()})
  .eq('id',id).select('id')
 if(error||!data?.length)return {ok:false,message:'Não foi possível alterar a visibilidade.'}
 return {ok:true,message:published?'Plano publicado na página inicial.':'Plano ocultado da página inicial.'}
}
export async function registerMercadoPagoPlan(id:string):Promise<Result>{
  const ctx=await getAdminContext()
  if(!ctx)return forbidden
  if(!isUuid(id))return {ok:false,message:'Plano inválido.'}
  const token=process.env.MERCADOPAGO_ACCESS_TOKEN
  const site=process.env.SINTONE_SITE_URL
  if(!token||!site||!/^https:\/\//.test(site))return {ok:false,message:'Configure MERCADOPAGO_ACCESS_TOKEN e SINTONE_SITE_URL na Vercel antes de registrar planos.'}
  const {data:plan,error:readError}=await ctx.supabase.from('billing_plans')
    .select('id,name,price_brl,frequency,frequency_type,mp_plan_id,active').eq('id',id).single()
  if(readError||!plan)return {ok:false,message:'Plano não encontrado.'}
  if(plan.mp_plan_id)return {ok:false,message:'Este plano já está vinculado ao Mercado Pago.'}
  if(Number(plan.price_brl)===0)return {ok:false,message:'Planos gratuitos não precisam de cadastro no Mercado Pago.'}
  if(plan.active)return {ok:false,message:'O plano precisa estar inativo para o registro inicial.'}
  try{
    const response=await fetch('https://api.mercadopago.com/preapproval_plan',{
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Idempotency-Key':id},
      body:JSON.stringify({
        reason:'SINTONE - '+plan.name,
        auto_recurring:{frequency:plan.frequency,frequency_type:plan.frequency_type,
          transaction_amount:Number(plan.price_brl),currency_id:'BRL'},
        back_url:new URL('/dashboard#account',site).toString()
      }),cache:'no-store'
    })
    const payload=await response.json() as {id?:string;message?:string}
    if(!response.ok||!payload.id)return {ok:false,message:'Mercado Pago não confirmou o cadastro do plano (HTTP '+response.status+').'}
    const {error}=await ctx.supabase.from('billing_plans').update({mp_plan_id:payload.id,updated_at:new Date().toISOString()})
      .eq('id',id).is('mp_plan_id',null)
    if(error)return {ok:false,message:'Plano criado no Mercado Pago, mas não foi associado no banco. Não recrie o plano sem conciliar o ID: '+payload.id}
      return {ok:true,message:'Plano registrado no Mercado Pago. Permanece inativo até a etapa de pagamentos.'}
  }catch{return {ok:false,message:'Falha de conexão com a API do Mercado Pago.'}}
}

/** Verificação somente leitura: não cria planos, assinaturas ou cobranças. */
export async function testMercadoPagoConnection():Promise<Result>{
  const ctx=await getAdminContext()
  if(!ctx)return forbidden
  const token=process.env.MERCADOPAGO_ACCESS_TOKEN
  const site=process.env.SINTONE_SITE_URL
  if(!token)return {ok:false,message:'Access Token não configurado no ambiente deste deployment.'}
  if(!site){return {ok:false,message:'SINTONE_SITE_URL não configurada no ambiente deste deployment.'}}
  try{
    const response=await fetch('https://api.mercadopago.com/preapproval_plan/search',{
      headers:{Authorization:'Bearer '+token,Accept:'application/json'},
      method:'GET',cache:'no-store',signal:AbortSignal.timeout(12000)
    })
    if(response.ok)return {ok:true,message:'Conexão autorizada com a API de Assinaturas do Mercado Pago. Nenhuma cobrança foi criada.'}
    if(response.status===401||response.status===403)return {ok:false,message:'Credencial recusada pelo Mercado Pago (HTTP '+response.status+'). Confirme o token e seu ambiente.'}
    return {ok:false,message:'API de assinaturas retornou HTTP '+response.status+'. Verifique a aplicação do Mercado Pago.'}
  }catch{
    return {ok:false,message:'Não foi possível consultar a API do Mercado Pago. Tente novamente.'}
  }
}
