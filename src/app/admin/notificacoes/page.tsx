import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import DirectNotificationsAdmin from '@/components/admin/DirectNotificationsAdmin'
export const dynamic='force-dynamic'
export const metadata={title:'Notificações aos Artistas | SINTONE Admin'}
export default async function Page(){
 const ctx=await getAdminContext('admin')
 if(!ctx)notFound()
 const [accounts,artists,history]=await Promise.all([
  ctx.supabase.from('profiles').select('id,name,artist_name,email').order('created_at',{ascending:false}).limit(1000),
  ctx.supabase.from('artist_profiles').select('id,owner_id,name').limit(2000),
  ctx.supabase.from('artist_notifications').select('id,user_id,artist_profile_id,title,message,type,action_url,read,created_at').order('created_at',{ascending:false}).limit(150)
 ])
 if(accounts.error||artists.error||history.error)throw Error('Falha ao consultar artistas ou notificações.')
 return <DirectNotificationsAdmin initialAccounts={accounts.data||[]} initialArtists={artists.data||[]} initialHistory={history.data||[]}/>
}
