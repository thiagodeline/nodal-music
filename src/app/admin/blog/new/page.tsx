import {notFound} from 'next/navigation'
import {getAdminContext} from '@/lib/admin-access'
import BlogEditor from '@/components/admin/BlogEditor'
export const metadata={title:'Novo artigo | SINTONE Admin'}
export default async function Page(){if(!await getAdminContext('admin'))notFound();return <BlogEditor/>}
