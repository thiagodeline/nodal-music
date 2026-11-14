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
 if(!token||!secret||!webhookSecret||!site)
  return {ok:false,message:'A contratação ainda não está habilitada. A equipe está concluindo a integração de pagamentos.'}
 if(!/^[0-9a-f-]{36}$/i.test(planId))return {ok:false,message:'Plano inválido.'}
 const {data:plan,error}=await sb.from('billing_plans')
  .select('id,name,price_brl,mp_plan_id').eq('id',planId).eq('published',true).eq('archived',false).single()
 if(error||!plan||Number(plan.price_brl)<=0||!plan.mp_plan_id)
  return {ok:false,message:'Este plano não está disponível para contratação.'}
 const admin=createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,secret,{auth:{autoRefreshToken:false,persistSession:false}})
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
  const payload=await response.json() as {id?:string;init_point?:string}
  if(!response.ok||!payload.id||!payload.init_point)throw new Error('Checkout indisponível')
  const {error:updateError}=await admin.from('billing_subscriptions')
    .update({mp_preapproval_id:payload.id}).eq('id',row.id)
  if(updateError)throw new Error('Falha ao registrar a assinatura')
  if(!/^https:\/\//.test(payload.init_point))throw new Error('URL inválida')
  return {ok:true,url:payload.init_point}
 }catch{
  await admin.from('billing_subscriptions').update({status:'cancelled'}).eq('id',row.id)
  return {ok:false,message:'Não foi possível iniciar o checkout. Nenhuma assinatura foi ativada.'}
 }
}
