import LegalPage from '@/components/LegalPage'
import { cookies } from '@/lib/legal-content'
export const metadata = { title: 'Aviso de Cookies | Nodal Music' }
export default function Page() { return <LegalPage title="Aviso de Cookies" sections={cookies} /> }
