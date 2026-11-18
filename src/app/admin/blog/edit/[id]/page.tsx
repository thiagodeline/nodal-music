import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import BlogEditor from '@/components/admin/BlogEditor'
export const dynamic='force-dynamic'
export const metadata={title:'Editar artigo | SINTONE Admin'}
export default async function Page({params}:{params:Promise<{id:string}>}){
 const ctx=await getAdminContext('admin');if(!ctx)notFound()
 const {id}=await params
 if(!/^[a-f0-9-]{36}$/i.test(id))notFound()
 const {data}=await ctx.supabase.from('blog_posts').select('*').eq('id',id).maybeSingle()
 if(!data)notFound()
 return <BlogEditor initial={data}/>
}
