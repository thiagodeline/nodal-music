import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import BlogManager from '@/components/admin/BlogManager'
export const dynamic='force-dynamic'
export const metadata={title:'Blog | SINTONE Admin'}
export default async function Page(){
 const ctx=await getAdminContext('admin');if(!ctx)notFound()
 const {data,error}=await ctx.supabase.from('blog_posts').select('*').order('created_at',{ascending:false}).limit(1000)
 if(error)throw Error('Falha ao consultar artigos do blog.')
 return <BlogManager initial={data||[]}/>
}
