import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import DspManager from '@/components/admin/DspManager'
export const dynamic='force-dynamic'
export const metadata={title:'Configuração de plataformas | SINTONE'}
export default async function Page(){
 if(!await getAdminContext())notFound()
 return <DspManager/>
}
