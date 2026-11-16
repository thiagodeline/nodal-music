import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import TeamRoles from '@/components/admin/TeamRoles'
export const dynamic='force-dynamic'
export const metadata={title:'Equipe e Cargos | SINTONE'}
export default async function Page(){
 const ctx=await getAdminContext()
 if(!ctx?.isGeneral)notFound()
 return <main className="sa-content"><TeamRoles/></main>
}
