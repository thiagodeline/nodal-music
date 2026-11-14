'use server'
import {createClient as createAdminClient} from '@supabase/supabase-js'
import {createClient} from '@/lib/supabase/server'
type Result={ok:true;url:string}|{ok:false;message:string}
export async function startBillingCheckout(planId:string):Promise<Result>{
 const sb=await createClient()
 const {data:{user},error:authError}=await sb.auth.getUser()
 if(authError||!user||!user.email)return {ok:false,message:'Faça login para contratar um plano.'}
 const token=process.env.MERCADOPAGO_ACCESS_TOKEN
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY
 const webhookSecret=process.env.MERCADOPAGO_WEBHOOK_SECRET
 const site=process.env.SINTONE_SITE_URL
 if(process.env.SINTONE_ENABLE_PAID_CHECKOUT!=='true'||!token||!secret||!webhookSecret||!site)
  return {ok:false,message:'A contratação ainda não está habilitada. A equipe está concluindo a integração de pagamentos.'}
 if(!/^[0-9a-f-]{36}$/i.test(planId))return {ok:false,message:'Plano inválido.'}
 const {data:plan,error}=await sb.from('billing_plans')
  .select('id,name,price_brl,mp_plan_id').eq('id',planId).eq('published',true).eq('archived',false).single()
 if(error||!plan||Number(plan.price_brl)<=0||!plan.mp_plan_id)
  return {ok:false,message:'Este plano não está disponível para contratação.'}
 const admin=createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,secret,{auth:{autoRefreshToken:false,persistSession:false}})
 // Confirme que o plano pertence às credenciais de produção e mantém o preço anunciado.
 try{
  const check=await fetch('https://api.mercadopago.com/preapproval_plan/'+encodeURIComponent(plan.mp_plan_id),{
   headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(10000)
  })
  if(!check.ok)return {ok:false,message:'Plano indisponível no Mercado Pago de produção. Verifique o vínculo no Admin.'}
  const remote=await check.json() as {auto_recurring?:{transaction_amount?:string|number;currency_id?:string}}
  if(remote.auto_recurring?.currency_id!=='BRL'||
    Math.abs(Number(remote.auto_recurring?.transaction_amount)-Number(plan.price_brl))>0.01)
   return {ok:false,message:'Preço do Mercado Pago não corresponde ao plano da SINTONE. Contratação bloqueada.'}
 }catch{return {ok:false,message:'Não foi possível validar o plano no Mercado Pago.'}}
 // Não crie contratos recorrentes duplicados em cliques repetidos.
 const {data:existing}=await admin.from('billing_subscriptions')
  .select('id,mp_preapproval_id').eq('user_id',user.id).eq('plan_id',plan.id)
  .in('status',['pending','authorized']).order('created_at',{ascending:false}).limit(1).maybeSingle()
 if(existing?.mp_preapproval_id){
  const prev=await fetch('https://api.mercadopago.com/preapproval/'+encodeURIComponent(existing.mp_preapproval_id),{
   headers:{Authorization:'Bearer '+token},cache:'no-store'
  })
  if(prev.ok){
   const mp=await prev.json() as {init_point?:string;status?:string}
   if(existing&&mp.status==='authorized')return {ok:false,message:'Você já possui uma assinatura para esse plano.'}
   if(mp.init_point&&mp.init_point.startsWith('https://www.mercadopago.com'))return {ok:true,url:mp.init_point}
  }
 }
 if(existing)return {ok:false,message:'Uma contratação desse plano já está em andamento. Procure o suporte antes de tentar novamente.'}
 const {data:row,error:insertError}=await admin.from('billing_subscriptions')
  .insert({user_id:user.id,plan_id:plan.id,status:'pending',price_at_signup:Number(plan.price_brl)})
  .select('id').single()
 if(insertError||!row)return {ok:false,message:'Não foi possível iniciar sua contratação.'}
 try{
  const response=await fetch('https://api.mercadopago.com/preapproval',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Idempotency-Key':row.id},
   body:JSON.stringify({preapproval_plan_id:plan.mp_plan_id,reason:'SINTONE - '+plan.name,
    external_reference:row.id,payer_email:user.email,
    back_url:new URL('/dashboard#plans',site).toString()}),cache:'no-store'
  })
  const payload=await response.json().catch(()=>({})) as {
   id?:string;init_point?:string;message?:string;error?:string;
   cause?:Array<{code?:string;description?:string}>
  }
  if(!response.ok){
   const code=String(payload.cause?.[0]?.code||payload.error||'unknown').slice(0,80)
   // Nunca registrar o token, e-mail do comprador ou o corpo bruto da API.
   console.error('[billing] Mercado Pago rejeitou criação de assinatura', {status:response.status,code})
   const detail=String(payload.cause?.[0]?.description||payload.message||'Solicitação rejeitada.')
     .slice(0,240)
   throw new Error('Mercado Pago (HTTP '+response.status+'): '+detail)
  }
  if(!payload.id||!payload.init_point)throw new Error('Mercado Pago não retornou link de checkout.')
  const url=new URL(payload.init_point)
  if(url.protocol!=='https:'||!['mercadopago.com.br','www.mercadopago.com.br','mercadopago.com','www.mercadopago.com'].includes(url.hostname))
   throw new Error('URL de pagamento inválida.')
  const {error:updateError}=await admin.from('billing_subscriptions')
    .update({mp_preapproval_id:payload.id}).eq('id',row.id)
  if(updateError){
   console.error('[billing] Não foi possível armazenar vínculo com assinatura', {subscriptionId:row.id,code:updateError.code})
   throw new Error('A assinatura foi criada no Mercado Pago, mas houve falha ao sincronizar o cadastro. Contate o suporte antes de tentar novamente.')
  }
  return {ok:true,url:url.toString()}
 }catch(e){
  const reason=e instanceof Error?e.message:'Falha inesperada de comunicação.'
  // Se o provedor criou a assinatura, não cancelar cegamente o registro local:
  // um cancelamento sem conciliação pode deixar uma assinatura cobrando no provedor.
  const {data:stored}=await admin.from('billing_subscriptions').select('mp_preapproval_id').eq('id',row.id).single()
  if(!stored?.mp_preapproval_id)
   await admin.from('billing_subscriptions').update({status:'cancelled'}).eq('id',row.id)
  return {ok:false,message:reason.startsWith('Mercado Pago (HTTP ')||reason.includes('Contate o suporte')||
    reason.includes('link de checkout')||reason.includes('URL de pagamento')?reason:
    'Não foi possível iniciar o checkout: '+reason.slice(0,180)}
 }
}
