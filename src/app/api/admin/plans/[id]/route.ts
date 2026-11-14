import {NextResponse} from 'next/server'
import {getAdminContext} from '@/lib/admin-access'
import {parsePlanInput,planDbFields} from '@/lib/sintone-plan'
const valid=(x:string)=>/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x)
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 const ctx=await getAdminContext()
 if(!ctx)return NextResponse.json({error:'Acesso negado'},{status:403})
 const {id}=await params
 if(!valid(id))return NextResponse.json({error:'ID inválido'},{status:400})
 try{
  const input=parsePlanInput(await request.json())
  const {data:previous}=await ctx.supabase.from('billing_plans')
   .select('id,is_default,archived').eq('id',id).maybeSingle()
  if(!previous||previous.archived)return NextResponse.json({error:'Plano não encontrado'},{status:404})
  if(previous.is_default&&(!input.published||input.price!==0))
   return NextResponse.json({error:'O plano Grátis padrão deve permanecer gratuito e publicado.'},{status:409})
  const {error}=await ctx.supabase.from('billing_plans').update(planDbFields(input)).eq('id',id)
  return error?NextResponse.json({error:error.message},{status:409}):NextResponse.json({ok:true})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Dados inválidos'},{status:400})}
}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 const ctx=await getAdminContext()
 if(!ctx)return NextResponse.json({error:'Acesso negado'},{status:403})
 const {id}=await params
 if(!valid(id))return NextResponse.json({error:'ID inválido'},{status:400})
 const {data:plan}=await ctx.supabase.from('billing_plans').select('is_default').eq('id',id).maybeSingle()
 if(!plan)return NextResponse.json({error:'Plano não encontrado'},{status:404})
 if(plan.is_default)return NextResponse.json({error:'O plano Grátis padrão não pode ser excluído.'},{status:409})
 // Arquivar protege o histórico de contratos e pagamentos existentes.
 const {error}=await ctx.supabase.from('billing_plans').update({archived:true,published:false,updated_at:new Date().toISOString()}).eq('id',id)
 return error?NextResponse.json({error:error.message},{status:409}):NextResponse.json({ok:true,archived:true})
}
