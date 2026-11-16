import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import LandingHeroEditor from '@/components/admin/LandingHeroEditor'
export const dynamic='force-dynamic'
export const metadata={title:'Landing Page | Administração SINTONE'}
export default async function Page(){
 const ctx=await getAdminContext('admin')
 if(!ctx)notFound()
 const {data,error}=await ctx.supabase.from('landing_page_config').select('hero_image_url').eq('id',1).maybeSingle()
 if(error)throw new Error('Não foi possível consultar a configuração da Landing Page.')
 return <LandingHeroEditor initialUrl={data?.hero_image_url||null}/>
}
