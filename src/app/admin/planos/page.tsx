import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import PlanManager from '@/components/admin/PlanManager'
export const dynamic='force-dynamic'
export const metadata={title:'Planos | SINTONE Admin'}
export default async function Page(){if(!await getAdminContext())notFound();return <PlanManager/>}
