import {notFound,redirect} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import AdminShell from '@/components/admin/AdminShell'
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const ctx=await getAdminContext('staff')
 if(!ctx)notFound()
 return <AdminShell email={ctx.user.email||'Equipe SINTONE'} tabs={ctx.tabs} isGeneral={ctx.isGeneral}>{children}</AdminShell>
}
