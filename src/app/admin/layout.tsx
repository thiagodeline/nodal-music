import {notFound,redirect} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import AdminShell from '@/components/admin/AdminShell'
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const ctx=await getAdminContext('staff')
 if(!ctx)notFound()
 const sb=ctx.supabase
 const [pendingReleases,pendingPayouts,openTickets]=await Promise.all([
  ctx.tabs.includes('releases')?sb.from('releases').select('id',{head:true,count:'exact'}).eq('status','pending'):Promise.resolve({count:null,error:null}),
  ctx.tabs.includes('payouts')?sb.from('withdrawals').select('id',{head:true,count:'exact'}).eq('status','pending'):Promise.resolve({count:null,error:null}),
  ctx.tabs.includes('support')?sb.from('tickets').select('id',{head:true,count:'exact'}).eq('status','open'):Promise.resolve({count:null,error:null})
 ])
 const counts={releases:pendingReleases.error?null:pendingReleases.count,payouts:pendingPayouts.error?null:pendingPayouts.count,support:openTickets.error?null:openTickets.count}
 return <AdminShell email={ctx.user.email||'Equipe SINTONE'} tabs={ctx.tabs} roles={ctx.roles} counts={counts} isGeneral={ctx.isGeneral}>{children}</AdminShell>
}
