import {createHmac,timingSafeEqual} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {NextRequest,NextResponse} from 'next/server'
export const runtime='nodejs'
export async function POST(request:NextRequest){
 const webhookSecret=process.env.MERCADOPAGO_WEBHOOK_SECRET
 const token=process.env.MERCADOPAGO_ACCESS_TOKEN
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!webhookSecret||!token||!serviceKey||!supabaseUrl)return NextResponse.json({error:'Configuração pendente'},{status:503})
 const id=request.nextUrl.searchParams.get('data.id')||request.nextUrl.searchParams.get('id')||''
 const sig=request.headers.get('x-signature')||''
 const requestId=request.headers.get('x-request-id')||''
 const ts=sig.match(/(?:^|,)ts=([^,]+)/)?.[1]
 const signature=sig.match(/(?:^|,)v1=([0-9a-f]+)/i)?.[1]
 if(!id||!ts||!signature||!requestId)return NextResponse.json({error:'Assinatura ausente'},{status:401})
 const seconds=Number(ts)>1e12?Number(ts)/1000:Number(ts)
 if(!Number.isFinite(seconds)||Math.abs(Date.now()/1000-seconds)>600)
  return NextResponse.json({error:'Timestamp inválido'},{status:401})
 const manifest=`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`
 const expected=createHmac('sha256',webhookSecret).update(manifest).digest('hex')
 const x=Buffer.from(signature,'hex'),y=Buffer.from(expected,'hex')
 if(x.length!==y.length||!timingSafeEqual(x,y))
  return NextResponse.json({error:'Assinatura inválida'},{status:401})
 let body:{type?:string;action?:string}
 try{body=await request.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 if(body.type!=='subscription_preapproval'&&body.action?.startsWith('subscription_preapproval.')!==true)
  return NextResponse.json({ok:true,ignored:true})
 const response=await fetch('https://api.mercadopago.com/preapproval/'+encodeURIComponent(id),{
  headers:{Authorization:'Bearer '+token},cache:'no-store'
 })
 if(!response.ok)return NextResponse.json({error:'Falha ao verificar assinatura'},{status:502})
 const mp=await response.json() as {id?:string;external_reference?:string;status?:string}
 if(mp.id!==id||!mp.external_reference||!mp.status)
  return NextResponse.json({error:'Identificadores inválidos'},{status:400})
 const status=mp.status==='authorized'?'authorized':mp.status==='paused'?'paused':
  mp.status==='cancelled'?'cancelled':mp.status==='pending'?'pending':'payment_problem'
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
 const {error}=await admin.rpc('apply_verified_billing_status',{
  p_subscription_id:mp.external_reference,p_mp_id:mp.id,p_status:status
 })
 if(error)return NextResponse.json({error:'Falha ao sincronizar assinatura'},{status:500})
 return NextResponse.json({ok:true})
}
