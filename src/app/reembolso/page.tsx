import LegalPage from '@/components/LegalPage'
import { reembolso } from '@/lib/legal-content'
export const metadata = { title: 'Política de Reembolso e Estornos | SINTONE' }
export default function Page() { return <LegalPage title="Política de Reembolso e Estornos" sections={reembolso} /> }
