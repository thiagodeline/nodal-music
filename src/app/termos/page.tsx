import LegalPage from '@/components/LegalPage'
import { termos } from '@/lib/legal-content'
export const metadata = { title: 'Termos de Serviço | SINTONE' }
export default function Page() { return <LegalPage title="Termos de Serviço" sections={termos} /> }
