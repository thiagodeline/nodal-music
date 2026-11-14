import {createHmac,timingSafeEqual} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {NextRequest,NextResponse} from 'next/server'
export const runtime='nodejs'
type Notification={type?:string;action?:string}
export async function POST(request:NextRequest){
 const secret=process.env.MERCADOPAGO_WEBHOOK_SECRET
 const token=process.env.MERCADOPAGO_ACCESS_TOKEN
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!secret||!token||!serviceKey||!supabaseUrl)return NextResponse.json({error:'Configuração pendente'},{status:503})
 const id=request.nextUrl.searchParams.get('data.id')||request.nextUrl.searchParams.get('id')||''
 const signature=request.headers.get('x-signature')||''
 const requestId=request.headers.get('x-request-id')||''
 const ts=signature.match(/(?:^|,)\s*ts=([^,]+)/)?.[1]
 const v1=signature.match(/(?:^|,)\s*v1=([0-9a-f]+)/i)?.[1]
 if(!id||!ts||!v1||!requestId)return NextResponse.json({error:'Assinatura ausente'},{status:401})
 const seconds=Number(ts)>1e12?Number(ts)/1000:Number(ts)
 if(!Number.isFinite(seconds)||Math.abs(Date.now()/1000-seconds)>600)
  return NextResponse.json({error:'Timestamp inválido'},{status:401})
 const manifest=`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`
 const expected=Buffer.from(createHmac('sha256',secret).update(manifest).digest('hex'),'hex')
 const received=Buffer.from(v1,'hex')
 if(received.length!==expected.length||!timingSafeEqual(received,expected))
  return NextResponse.json({error:'Assinatura inválida'},{status:401})
 let notification:Notification
 try{notification=await request.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 const type=notification.type||notification.action?.split('.')[0]
 if(!['subscription_preapproval','subscription_authorized_payment','payment'].includes(type||''))
  return NextResponse.json({ok:true,ignored:true})
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
 const get=async(path:string)=>{
  const response=await fetch('https://api.mercadopago.com'+path,{
   headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(12000)})
  if(!response.ok)throw Error('Mercado Pago HTTP '+response.status)
  return response.json()
 }
 try{
  if(type==='subscription_preapproval'){
   const mp=await get('/preapproval/'+encodeURIComponent(id)) as {
    id:string;external_reference?:string;preapproval_plan_id?:string;status?:string
   }
   if(mp.id!==id||!mp.external_reference)return NextResponse.json({ok:true,ignored:true})
   const {data:local}=await admin.from('billing_subscriptions')
    .select('id,plan_id,mp_preapproval_id').eq('id',mp.external_reference).maybeSingle()
   if(!local)return NextResponse.json({ok:true,ignored:true})
   const {data:plan}=await admin.from('billing_plans').select('mp_plan_id').eq('id',local.plan_id).single()
   if(!plan||plan.mp_plan_id!==mp.preapproval_plan_id)
    return NextResponse.json({error:'Plano divergente'},{status:409})
   if(!local.mp_preapproval_id){
    const {error}=await admin.from('billing_subscriptions').update({mp_preapproval_id:id})
     .eq('id',local.id).is('mp_preapproval_id',null)
    if(error)return NextResponse.json({error:'Falha ao vincular assinatura'},{status:503})
   }else if(local.mp_preapproval_id!==id)return NextResponse.json({error:'ID divergente'},{status:409})
   // Autorização do cartão não é confirmação de parcela paga.
   const status=mp.status==='cancelled'||mp.status==='canceled'?'cancelled':
    mp.status==='paused'?'paused':mp.status==='pending'?'pending':null
   if(status){
    const {error}=await admin.rpc('apply_verified_billing_status',{
     p_subscription_id:local.id,p_mp_id:id,p_status:status})
    if(error)return NextResponse.json({error:'Falha ao atualizar assinatura'},{status:503})
   }
   return NextResponse.json({ok:true})
  }
  const invoice=type==='subscription_authorized_payment'?
   await get('/authorized_payments/'+encodeURIComponent(id)) as {
    id:number;preapproval_id:string;transaction_amount:string|number;
    currency_id:string;payment?:{id:number;status:string}
   }:null
  if(invoice){
   if(String(invoice.id)!==id||!invoice.preapproval_id||invoice.currency_id!=='BRL')
    return NextResponse.json({error:'Fatura inválida'},{status:400})
   const state=invoice.payment?.status==='approved'?'approved':
    ['rejected','cancelled','refunded'].includes(invoice.payment?.status||'')?invoice.payment!.status:'pending'
   const {error}=await admin.rpc('apply_verified_billing_invoice',{
    p_mp_preapproval_id:invoice.preapproval_id,p_mp_invoice_id:String(invoice.id),
    p_status:state,p_amount:Number(invoice.transaction_amount)
   })
   if(error)return NextResponse.json({error:'Falha ao conciliar fatura'},{status:503})
  }
  // Eventos "payment" não ativam benefícios isoladamente:
  // autorização é confirmada pela fatura de assinatura com vínculo verificado.
  return NextResponse.json({ok:true})
 }catch{return NextResponse.json({error:'Não foi possível consultar o recurso na API'},{status:502})}
}
