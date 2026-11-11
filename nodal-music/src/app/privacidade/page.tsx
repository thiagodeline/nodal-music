import LegalPage from '@/components/LegalPage'
import { privacidade } from '@/lib/legal-content'
export const metadata = { title: 'Política de Privacidade | Nodal Music' }
export default function Page() { return <LegalPage title="Política de Privacidade" sections={privacidade} /> }
