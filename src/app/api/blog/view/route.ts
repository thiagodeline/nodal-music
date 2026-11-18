import {NextResponse} from 'next/server'
import {cookies,headers} from 'next/headers'
import {createClient} from '@supabase/supabase-js'
export async function POST(request:Request){
 const h=await headers()
 const origin=h.get('origin')
 const own=new URL(request.url).origin
 if(origin!==own)return NextResponse.json({error:'Origem inválida.'},{status:403})
 let id=''
 try{id=String((await request.json()).id||'')}catch{return NextResponse.json({error:'Dados inválidos.'},{status:400})}
 if(!/^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id))return NextResponse.json({error:'ID inválido.'},{status:400})
 const cookieName='sv_'+id.replace(/-/g,'').slice(0,16)
 const jar=await cookies()
 if(jar.get(cookieName))return NextResponse.json({ok:true})
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return NextResponse.json({error:'Contador indisponível.'},{status:503})
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const {error}=await sb.rpc('blog_increment_view',{post_id:id})
 if(error)return NextResponse.json({error:'Falha ao registrar visualização.'},{status:500})
 const res=NextResponse.json({ok:true})
 res.cookies.set(cookieName,'1',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:86400})
 return res
}
