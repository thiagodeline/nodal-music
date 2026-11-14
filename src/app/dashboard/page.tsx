import Dashboard from '@/components/dashboard/Dashboard'
export const metadata = { title: 'Painel do Artista | SINTONE' }
export default function Page() { const checkoutReady=!!(process.env.MERCADOPAGO_WEBHOOK_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.MERCADOPAGO_ACCESS_TOKEN);return <Dashboard checkoutReady={checkoutReady}/> }
