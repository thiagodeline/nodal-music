import {NextResponse} from 'next/server'
import {createClient as serviceClient} from '@supabase/supabase-js'
import {getAdminContext} from '@/lib/admin-access'
export const runtime='nodejs'
const isUuid=(s:string)=>/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(s)
export async function POST(req:Request){
 const ctx=await getAdminContext('royalty_financial')
 if(!ctx)return NextResponse.json({error:'Acesso negado'},{status:403})
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!serviceKey||!supabaseUrl)return NextResponse.json({error:'Storage indisponível'},{status:503})
 const form=await req.formData()
 const id=String(form.get('withdrawalId')||'')
 const reference=String(form.get('reference')||'').trim()
 const file=form.get('receipt')
 if(!isUuid(id)||reference.length<8||reference.length>240||!(file instanceof File))
  return NextResponse.json({error:'Informe saque, referência e comprovante.'},{status:400})
 if(file.size<100||file.size>5*1024*1024)
  return NextResponse.json({error:'Comprovante deve ter entre 100 bytes e 5 MB.'},{status:400})
 const allowed:{[key:string]:string}={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'}
 const ext=allowed[file.type]
 if(!ext)return NextResponse.json({error:'Envie comprovante em PDF, JPG ou PNG.'},{status:400})
 const bytes=new Uint8Array(await file.arrayBuffer())
 const valid=ext==='pdf'?bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70:
  ext==='png'?bytes.slice(0,4).every((b,i)=>b===[137,80,78,71][i]):
  bytes[0]===255&&bytes[1]===216&&bytes[2]===255
 if(!valid)return NextResponse.json({error:'O conteúdo do arquivo não corresponde ao formato.'},{status:400})
 const {data:withdrawal,error:readError}=await ctx.supabase.from('withdrawals').select('id,status,receipt_path').eq('id',id).single()
 if(readError||!withdrawal||withdrawal.status!=='pending')
  return NextResponse.json({error:'Saque não encontrado ou já processado.'},{status:409})
 const db=serviceClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
 const path='payouts/'+id+'/'+crypto.randomUUID()+'.'+ext
 const {error:upErr}=await db.storage.from('receipts').upload(path,bytes,{upsert:false,contentType:file.type})
 if(upErr)return NextResponse.json({error:'Falha ao anexar comprovante.'},{status:500})
 // A transação de pagamento não pode ser concluída sem o caminho do comprovante.
 const {error:linkErr}=await ctx.supabase.from('withdrawals')
  .update({receipt_path:path}).eq('id',id).eq('status','pending')
 if(linkErr){
  await db.storage.from('receipts').remove([path])
  return NextResponse.json({error:'Falha ao registrar comprovante.'},{status:500})
 }
 const {error:payErr}=await ctx.supabase.rpc('admin_mark_manual_payout',{p_withdrawal_id:id,p_receipt_reference:reference})
 if(payErr){
  // Não remova um comprovante se outro processamento simultâneo consumiu o saque.
  return NextResponse.json({error:'Comprovante enviado, mas o saque não foi marcado como pago: '+payErr.message},{status:409})
 }
 return NextResponse.json({ok:true})
}
