import {createClient} from '@/lib/supabase/server'

export type StaffRole='admin'|'qc_specialist'|'ingestion_manager'|'customer_success'|'a_and_r'|'royalty_financial'
export type AdminTab='releases'|'artists'|'royalties'|'plans'|'banners'|'dsp'|'support'|'payouts'|'splits'|'delivery'|'team'
export const ROLE_TABS:Record<StaffRole,readonly AdminTab[]>={
 admin:['releases','artists','royalties','plans','banners','dsp','support','payouts','splits','delivery','team'],
 qc_specialist:['releases'],
 ingestion_manager:['delivery'],
 customer_success:['support'],
 a_and_r:['artists'],
 royalty_financial:['royalties','payouts']
}
export async function getAdminContext(required:StaffRole|'staff'='admin'){
 const supabase=await createClient()
 const {data:{user},error}=await supabase.auth.getUser()
 if(error||!user)return null
 const [{data:general,error:checkError},{data:assignments,error:roleError}]=await Promise.all([
  supabase.rpc('is_admin'),
  supabase.from('admin_user_roles').select('role').eq('user_id',user.id)
 ])
 if(checkError||roleError)return null
 const roles:StaffRole[]=general?['admin']:(assignments||[])
   .map(x=>x.role as StaffRole).filter(x=>Object.keys(ROLE_TABS).includes(x))
 if(!roles.length||required!=='staff'&&!roles.includes('admin')&&!roles.includes(required))return null
 const tabs=Array.from(new Set(roles.flatMap(role=>ROLE_TABS[role]))) as AdminTab[]
 return {supabase,user,roles,tabs,isGeneral:roles.includes('admin')}
}
