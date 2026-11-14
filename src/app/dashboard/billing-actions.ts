'use server'
import {createClient as serviceClient} from '@supabase/supabase-js'
import {createClient} from '@/lib/supabase/server'

type CardData={token:string;paymentMethodId:string;paymentTypeId:'credit_card'|'debit_card';installments:number;identification:{type:string;number:string}}
type PaymentMethod={method:'pix'}|{method:'card';card:CardData}
type CheckoutResult={ok:true;status:'paid'|'pending';message:string;orderId:string;pix?:{code:string;qrBase64:string;ticketUrl:string}}|{ok:false;message:string}
type OrderResponse={
 id?:string;status?:string;status_detail?:string;external_reference?:string;
 total_amount?:string;total_paid_amount?:string;currency_id?:string;
 transactions?:{payments?:Array<{status?:string;status_detail?:string;paid_amount?:string;payment_method?:{qr_code?:string;qr_code_base64?:string;ticket_url?:string}}>}
 error?:string;message?:string;
 errors?:Array<{code?:string;message?:string;description?:string}>;
}
const allowed=()=>process.env.SINTONE_PAYMENT_MODE==='one_time'&&
 process.env.SINTONE_ENABLE_PAID_CHECKOUT==='true'
const admin=()=>serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{
 auth:{persistSession:false,autoRefreshToken:false}
})
function verifiedPaid(order:OrderResponse,amount:number){
 const payments=order.transactions?.payments||[]
 return order.status==='processed' && order.status_detail==='accredited' &&
 payments.some(p=>p.status==='processed'&&p.status_detail==='accredited') &&
 Number(order.total_paid_amount)>=amount-0.01
}
async function reconcile(orderId:string,recordId:string,amount:number){
 const response=await fetch('https://api.mercadopago.com/v1/orders/'+encodeURIComponent(orderId),{
  headers:{Authorization:'Bearer '+process.env.MERCADOPAGO_ACCESS_TOKEN},cache:'no-store',
  signal:AbortSignal.timeout(12000)
 })
 if(!response.ok)return false
 const order=await response.json() as OrderResponse
 if(order.id!==orderId||order.external_reference!==recordId||Math.abs(Number(order.total_amount)-amount)>.01||!verifiedPaid(order,amount))return false
 const {error}=await admin().rpc('apply_verified_one_time_order',{
  p_order_id:recordId,p_mp_order_id:orderId,p_payment_state:'paid',p_amount:amount
 })
 if(error)console.error('[billing] verified order reconciliation failed', {code:error.code,orderId})
 return !error
}
export async function startOneTimeCheckout(planId:string,payment:PaymentMethod):Promise<CheckoutResult>{
 if(!allowed()||!process.env.MERCADOPAGO_ACCESS_TOKEN||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.MERCADOPAGO_WEBHOOK_SECRET)
  return {ok:false,message:'Pagamentos temporariamente indisponíveis.'}
 const sb=await createClient()
 const {data:{user}}=await sb.auth.getUser()
 if(!user?.email)return {ok:false,message:'Entre na sua conta para fazer o pagamento.'}
 if(!/^[0-9a-f-]{36}$/i.test(planId))return {ok:false,message:'Plano inválido.'}
 if(payment?.method!=='pix'&&payment?.method!=='card')return {ok:false,message:'Forma de pagamento inválida.'}
 if(payment.method==='card'){
  const c=payment.card
  if(!c||typeof c.token!=='string'||! /^[a-z0-9_-]{16,256}$/i.test(c.token)||
    !/^[a-z0-9_-]{2,35}$/i.test(c.paymentMethodId)||
    !['credit_card','debit_card'].includes(c.paymentTypeId)||
    c.installments!==1 || !['CPF','CNPJ'].includes(c.identification?.type)||
    !/^[0-9]{11,14}$/.test(c.identification?.number||''))
   return {ok:false,message:'Confira os dados de pagamento e tente novamente.'}
 }
 const {data:plan,error:planError}=await sb.from('billing_plans')
  .select('id,name,price_brl').eq('id',planId).eq('published',true).eq('archived',false).single()
 if(planError||!plan||!(Number(plan.price_brl)>0))
  return {ok:false,message:'Plano não está disponível para compra.'}
 const amount=Number(plan.price_brl),db=admin()
 const {data:existing}=await db.from('billing_one_time_orders')
  .select('id,mp_order_id,method,amount_brl,plan_id').eq('user_id',user.id)
  .eq('status','pending').order('created_at',{ascending:false}).limit(1).maybeSingle()
 if(existing){
  if(existing.method==='pix'&&existing.mp_order_id&&existing.plan_id===plan.id){
   // Uma nova solicitação não deve emitir uma segunda cobrança enquanto a anterior estiver pendente.
   return {ok:false,message:'Existe um Pix pendente. Consulte o pagamento anterior antes de gerar outro.'}
  }
  return {ok:false,message:'Existe um pagamento pendente em sua conta. Aguarde sua confirmação ou contate o suporte.'}
 }
 const {data:local,error:insertError}=await db.from('billing_one_time_orders')
  .insert({user_id:user.id,plan_id:plan.id,amount_brl:amount,method:payment.method,status:'pending'})
  .select('id').single()
 if(insertError||!local)return {ok:false,message:'Não foi possível iniciar o pagamento.'}
 let createdId:string|undefined
 try{
  const price=amount.toFixed(2)
  const method=payment.method==='pix'?{id:'pix',type:'bank_transfer'}:{
   id:payment.card.paymentMethodId,type:payment.card.paymentTypeId,
   token:payment.card.token,installments:1
  }
  const response=await fetch('https://api.mercadopago.com/v1/orders',{
   method:'POST',
   headers:{Authorization:'Bearer '+process.env.MERCADOPAGO_ACCESS_TOKEN,
    'Content-Type':'application/json','X-Idempotency-Key':local.id},
   cache:'no-store',signal:AbortSignal.timeout(18000),
   body:JSON.stringify({
    type:'online',processing_mode:'automatic',total_amount:price,external_reference:local.id,
    payer:{email:user.email,...(payment.method==='card'?{identification:payment.card.identification}:{})},
    transactions:{payments:[{amount:price,payment_method:method,
     ...(payment.method==='pix'?{expiration_time:'PT30M'}:{})}]}
   })
  })
  const body=await response.json().catch(()=>({})) as OrderResponse
  // HTTP 402 pode significar ordem CRIADA com transação recusada.
  // Vincule o ID remoto antes de avaliar falhas: nunca descarte esse vínculo.
  if(body.id){
   createdId=body.id
   const {error:link}=await db.from('billing_one_time_orders')
     .update({mp_order_id:body.id}).eq('id',local.id).is('mp_order_id',null)
   if(link)throw Error('Não foi possível vincular o pedido do Mercado Pago. Contate o suporte.')
  }
  if(!response.ok||!body.id){
   const mpErrors=(body.errors||[]).slice(0,3).map(x=>({
    code:String(x.code||'unknown').slice(0,80),
    detail:String(x.message||x.description||'').slice(0,160)
   }))
   console.error('[billing] Orders API rejected payment',{
    http:response.status,orderLinked:!!body.id,status:body.status||null,
    statusDetail:body.status_detail||null,
    codes:mpErrors
   })
   // 402 é um estado de processamento; a API pode ter criado um pedido.
   // Não permita novas tentativas antes da reconciliação se faltarem dados conclusivos.
   if(response.status===402 && body.id){
    const rejected=body.status==='failed'||body.status==='rejected'||
      (body.transactions?.payments||[]).some(p=>['rejected','failed'].includes(p.status||''))
    if(rejected)await db.from('billing_one_time_orders').update({status:'rejected'}).eq('id',local.id)
   }else if(response.status>=400&&response.status<500&&response.status!==408&&response.status!==429&&!body.id){
    // Rejeição explícita por validação (exceto 402).
    if(response.status!==402)await db.from('billing_one_time_orders').update({status:'rejected'}).eq('id',local.id)
   }
   const code=mpErrors[0]?.code||String(body.error||body.status_detail||'sem_codigo')
   throw Error('Mercado Pago (HTTP '+response.status+', código '+code+'). Acompanhe o pedido no painel antes de tentar de novo.')
  }
  createdId=body.id
  const paid=await reconcile(body.id,local.id,amount)
  if(paid)return {ok:true,status:'paid',message:'Pagamento confirmado. Seu acesso foi renovado por 30 dias.',orderId:local.id}
  if(body.status==='rejected'||body.status==='failed'||body.status==='canceled'){
   await db.from('billing_one_time_orders').update({status:'rejected'}).eq('id',local.id)
   return {ok:false,message:'Pagamento recusado. Nenhuma renovação foi aplicada.'}
  }
  const pix=body.transactions?.payments?.[0]?.payment_method
  if(payment.method==='pix'&&pix?.qr_code){
   return {ok:true,status:'pending',message:'Pix gerado. O plano será liberado após a confirmação do pagamento.',
    orderId:local.id,pix:{code:pix.qr_code,qrBase64:pix.qr_code_base64||'',ticketUrl:pix.ticket_url||''}}
  }
  return {ok:true,status:'pending',message:'Pagamento em processamento. O acesso será atualizado após confirmação.',orderId:local.id}
 }catch(e){
  // Se a API pode ter processado o pagamento, não marque como recusado nem permita duplicação.
  if(!createdId)console.error('[billing] Orders API failed or was rejected; review pending status',{localId:local.id})
  const reason=e instanceof Error?e.message:''
  return {ok:false,message:reason.startsWith('Mercado Pago (HTTP ')?reason:createdId?
   'O Mercado Pago criou um pedido, mas a conclusão não foi confirmada. Fale com o suporte antes de tentar novamente.':
   'Não foi possível concluir a solicitação. Verifique o histórico antes de tentar novamente.'}
 }
}
export async function checkOneTimeOrder(localId:string):Promise<{ok:boolean;paid:boolean;message:string}>{
 const sb=await createClient()
 const {data:{user}}=await sb.auth.getUser()
 if(!user||!/^[0-9a-f-]{36}$/i.test(localId))return {ok:false,paid:false,message:'Pedido inválido.'}
 const {data:row,error}=await sb.from('billing_one_time_orders').select('id,user_id,amount_brl,mp_order_id,status')
  .eq('id',localId).eq('user_id',user.id).single()
 if(error||!row)return {ok:false,paid:false,message:'Pagamento não encontrado.'}
 if(row.status==='paid')return {ok:true,paid:true,message:'Pagamento confirmado.'}
 if(!row.mp_order_id)return {ok:false,paid:false,message:'Pagamento aguardando conciliação.'}
 try{
  const paid=await reconcile(row.mp_order_id,row.id,Number(row.amount_brl))
  return {ok:true,paid,message:paid?'Pagamento confirmado. Plano atualizado.':'Pagamento ainda não confirmado.'}
 }catch{return {ok:false,paid:false,message:'Não foi possível consultar o pagamento agora.'}}
}
