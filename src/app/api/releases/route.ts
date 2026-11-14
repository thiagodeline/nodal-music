import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
export const runtime='nodejs'
export async function POST(request:Request){
 const sb=await createClient()
 const {data:{user}}=await sb.auth.getUser()
 if(!user)return NextResponse.json({error:'Faça login novamente.'},{status:401})
 let payload:unknown
 try{payload=await request.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 if(!payload||typeof payload!=='object'||JSON.stringify(payload).length>120000)
  return NextResponse.json({error:'Dados do lançamento inválidos.'},{status:400})
 // A RPC aplica validações de plano, mensalidade, posse dos arquivos,
 // lojas permitidas e pagamento do add-on na MESMA transação do lançamento.
 const {data,error}=await sb.rpc('submit_sintone_release',{p:payload})
 if(error){
  const conflict=/limite mensal|adicional Instagram|não fazem parte do seu plano/i.test(error.message)
  return NextResponse.json({error:error.message},{status:conflict?402:400})
 }
 return NextResponse.json({id:data},{status:201})
}
