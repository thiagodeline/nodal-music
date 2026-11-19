import type {Metadata} from 'next'
import './globals.css'
import CookieBanner from '@/components/CookieBanner'
import { Bricolage_Grotesque, DM_Sans, Inter, Plus_Jakarta_Sans } from 'next/font/google'

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--display' })
const body = DM_Sans({ subsets: ['latin'], variable: '--body' })
const inter = Inter({ subsets: ['latin'], variable: '--inter' })
const jak = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--jakarta' })
const siteUrl = 'https://sintone.com.br'
const description = 'Distribuição musical digital brasileira para artistas independentes. Envie músicas para Spotify, Apple Music, Deezer, TikTok e outras plataformas, com gestão do seu catálogo.'

export const metadata:Metadata = {
 metadataBase: new URL(siteUrl),
 title: { default: 'SINTONE | Distribuição Musical Digital Brasileira', template: '%s | SINTONE Distribuidora Digital' },
 description,
 applicationName: 'SINTONE',
 keywords: [
  'distribuidora de música','distribuição musical digital','lançar música no Spotify',
  'como colocar música no Spotify','distribuição digital brasileira',
  'distribuidora de música grátis','royalties via PIX','suporte para artistas independentes','SINTONE'
 ],
 authors: [{name:'SINTONE'}], creator:'SINTONE', publisher:'SINTONE',
 robots: {
  index:true, follow:true,
  googleBot:{index:true,follow:true,'max-video-preview':-1,'max-image-preview':'large','max-snippet':-1}
 },
 openGraph: {
  type:'website',locale:'pt_BR',url:siteUrl,siteName:'SINTONE',
  title:'SINTONE | Distribuição Musical Digital Brasileira',
  description,
  images:[{url:'/opengraph-image',width:1200,height:630,alt:'SINTONE — Distribuição musical digital brasileira'}]
 },
 twitter: {
  card:'summary_large_image',title:'SINTONE | Distribuição Musical Digital',description,
  images:['/opengraph-image']
 },
 ...(process.env.GOOGLE_SITE_VERIFICATION ? {verification:{google:process.env.GOOGLE_SITE_VERIFICATION}} : {}),
 icons:{icon:'/sintone-icon.svg?v=20261117',shortcut:'/sintone-icon.svg?v=20261117',apple:'/sintone-icon.svg?v=20261117'}
}
export default function Root({children}:{children:React.ReactNode}) {
 return <html lang="pt-BR"><body className={`${display.variable} ${body.variable} ${inter.variable} ${jak.variable}`}>{children}<CookieBanner/></body></html>
}
