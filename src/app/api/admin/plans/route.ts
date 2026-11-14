import {NextResponse} from 'next/server'
import {getAdminContext} from '@/lib/admin-access'
import {parsePlanInput,planDbFields} from '@/lib/sintone-plan'
export const dynamic='force-dynamic'
export async function GET(){
 const ctx=await getAdminContext()
 if(!ctx)return NextResponse.json({error:'Acesso negado'},{status:403})
 const {data,error}=await ctx.supabase.from('billing_plans').select('*').order('created_at',{ascending:false})
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({plans:data})
}
export async function POST(request:Request){
 const ctx=await getAdminContext()
 if(!ctx)return NextResponse.json({error:'Acesso negado'},{status:403})
 try{
  const input=parsePlanInput(await request.json())
  const {data,error}=await ctx.supabase.from('billing_plans')
   .insert({...planDbFields(input),active:false,archived:false,is_default:false})
   .select('id').single()
  if(error)return NextResponse.json({error:error.message},{status:409})
  return NextResponse.json({id:data.id},{status:201})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Dados inválidos'},{status:400})}
}
