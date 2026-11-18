import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import LandingCms from '@/components/admin/LandingCms'
import {normalizeLanding,type LandingConfig} from '@/lib/landing-config'
export const dynamic='force-dynamic'
export const metadata={title:'CMS da Landing Page | Administração SINTONE'}
export default async function Page(){
 const ctx=await getAdminContext('admin')
 if(!ctx)notFound()
 const {data,error}=await ctx.supabase.from('landing_page_config').select('announcement_active,announcement_text,hero_banners,hero_image_url,social_links').eq('id',1).maybeSingle()
 if(error)throw new Error('Não foi possível consultar a configuração da Landing Page.')
 return <LandingCms initial={normalizeLanding(data as Partial<LandingConfig>|null)}/>
}
