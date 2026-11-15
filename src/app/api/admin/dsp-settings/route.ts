import {NextResponse} from 'next/server'
import {getAdminContext} from '@/lib/admin-access'
export const runtime='nodejs'
export async function GET(){
 const ctx=await getAdminContext()
 if(!ctx)return NextResponse.json({error:'Acesso negado'},{status:403})
 const {data,error}=await ctx.supabase.from('dsp_settings').select('*').order('name')
 return error?NextResponse.json({error:'Erro ao carregar plataformas'},{status:500}):NextResponse.json({platforms:data})
}
export async function PUT(request:Request){
 const ctx=await getAdminContext()
 if(!ctx)return NextResponse.json({error:'Acesso negado'},{status:403})
 let body:Record<string,unknown>
 try{body=await request.json()}catch{return NextResponse.json({error:'JSON inválido'},{status:400})}
 if(!body||typeof body.slug!=='string'||!/^[-a-z0-9]{2,90}$/.test(body.slug)||
 typeof body.active!=='boolean'||typeof body.is_extra!=='boolean'||
 typeof body.extra_fee!=='number'||!Number.isFinite(body.extra_fee)||
 body.extra_fee<0||body.extra_fee>100000||
 Math.round(body.extra_fee*100)!==Math.round(body.extra_fee*10000)/100)
  return NextResponse.json({error:'Parâmetros inválidos'},{status:400})
 const {error}=await ctx.supabase.from('dsp_settings')
  .update({active:body.active,is_extra:body.is_extra,extra_fee:body.is_extra?body.extra_fee:0})
  .eq('slug',body.slug)
 return error?NextResponse.json({error:error.message},{status:409}):NextResponse.json({ok:true})
}
