import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'

export async function GET(request:Request){
 const url=new URL(request.url)
 const code=url.searchParams.get('code')
 const next=url.searchParams.get('next')||'/dashboard'
 const safeNext=next.startsWith('/')&&!next.startsWith('//')&&!next.includes('\\')?next:'/dashboard'
 if(!code)return NextResponse.redirect(new URL('/login?auth_error=1',url.origin))
 const supabase=await createClient()
 const {error}=await supabase.auth.exchangeCodeForSession(code)
 if(error)return NextResponse.redirect(new URL('/login?auth_error=1',url.origin))
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)return NextResponse.redirect(new URL('/login?auth_error=1',url.origin))
 return NextResponse.redirect(new URL(safeNext,url.origin))
}
