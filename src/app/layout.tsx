import './globals.css'
import CookieBanner from '@/components/CookieBanner'
import { Bricolage_Grotesque, DM_Sans, Inter, Plus_Jakarta_Sans } from 'next/font/google'
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--display' })
const body = DM_Sans({ subsets: ['latin'], variable: '--body' })
const inter = Inter({ subsets: ['latin'], variable: '--inter' })
const jak = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--jakarta' })
export const metadata = { title: 'SINTONE — Distribuição Musical', description: 'Distribuição musical independente com controle, transparência e dados em um só painel.', applicationName: 'SINTONE', icons: { icon: '/sintone-icon.svg', shortcut: '/sintone-icon.svg' } }
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body className={`${display.variable} ${body.variable} ${inter.variable} ${jak.variable}`}>{children}<CookieBanner /></body></html>
}
