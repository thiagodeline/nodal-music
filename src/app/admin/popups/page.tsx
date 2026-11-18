import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import PopupsManager from '@/components/admin/PopupsManager'
export const dynamic='force-dynamic'
export const metadata={title:'Popups | Administração SINTONE'}
export default async function Page(){
 const ctx=await getAdminContext('admin')
 if(!ctx)notFound()
 const {data,error}=await ctx.supabase.from('dashboard_popups').select('id,image_url,is_active,created_at').order('created_at',{ascending:false})
 if(error)throw new Error('Não foi possível carregar os popups.')
 return <PopupsManager initial={data||[]}/>
}
