import './globals.css'
import CookieBanner from '@/components/CookieBanner'
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google'
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--display' })
const body = DM_Sans({ subsets: ['latin'], variable: '--body' })
export const metadata = { title: 'Nodal Music', description: 'Distribuidora de música para artistas independentes.' }
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body className={`${display.variable} ${body.variable}`}>{children}<CookieBanner /></body></html>
}
