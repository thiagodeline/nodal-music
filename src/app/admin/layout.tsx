import {notFound,redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import AdminShell from '@/components/admin/AdminShell'
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const sb=await createClient()
 const {data:{user}}=await sb.auth.getUser()
 if(!user)redirect('/login')
 if(user.app_metadata?.role!=='admin')notFound()
 const {data:profile}=await sb.from('profiles').select('role,email').eq('id',user.id).maybeSingle()
 if(profile?.role!=='admin')notFound()
 return <AdminShell email={profile.email||user.email||'Administração'}>{children}</AdminShell>
}
