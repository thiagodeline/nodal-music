import Link from 'next/link'
import Image from 'next/image'
import {ArrowUpRight,Instagram,Youtube,Music2} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import type {PublicPlan} from '@/components/billing/PlanCards'
import {normalizeLanding,type LandingConfig} from '@/lib/landing-config'
import LandingBelowHero from '@/components/landing/LandingBelowHero'
import HeroCarousel from '@/components/landing/HeroCarousel'
import '@/components/landing/editorial.css'

export const dynamic='force-dynamic'

export default async function Home() {
  const sb = await createClient()
  const { data } = await sb.from('billing_plans')
    .select('id,name,description,price_brl,frequency,benefits,mp_plan_id,is_default,monthly_releases_limit,max_artists')
    .eq('published', true).eq('archived', false).order('price_brl', { ascending: true })
  const plans = (data || []) as PublicPlan[]
  const {data:heroConfig}=await sb.from('landing_page_config').select('announcement_active,announcement_text,hero_banners,hero_image_url,social_links').eq('id',1).maybeSingle()
  const landing=normalizeLanding(heroConfig as Partial<LandingConfig>|null)
  const allowedOrigin=process.env.NEXT_PUBLIC_SUPABASE_URL||''
  const heroBanners=landing.hero_banners.filter(value=>{
   if(!allowedOrigin)return false
   try{const url=new URL(value.image_url),origin=new URL(allowedOrigin)
    return url.origin===origin.origin&&url.pathname.startsWith('/storage/v1/object/public/public-assets/hero/')
   }catch{return false}
  })
  const checkoutReady = process.env.SINTONE_ENABLE_PAID_CHECKOUT === 'true'
    && process.env.SINTONE_PAYMENT_MODE === 'one_time'
    && !!(process.env.MERCADOPAGO_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.MERCADOPAGO_ACCESS_TOKEN)

  return <div className="st-home um-home">
    <a className="um-skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header className="um-header"><div className="um-container um-header-inner">
     <Link className="um-header-logo" href="/" aria-label="SINTONE — Página inicial"><Image src="/sintone-logo.svg" alt="SINTONE" width={166} height={46} priority/></Link>
     <nav className="um-top-nav" aria-label="Navegação principal">
      <a href="#recursos">RECURSOS</a><a href="#carreira">CARREIRA</a>{plans.length>1&&<a href="#planos">PLANOS</a>}<a href="#faq">FAQ</a>
     </nav>
     <div className="um-header-actions"><Link className="um-login" href="/login">ENTRAR</Link><Link className="um-signup" href="/register">CADASTRE-SE <ArrowUpRight size={16}/></Link></div>
    </div></header>
    <main id="conteudo">
     {landing.announcement_active&&<div className="um-announcement"><span>{landing.announcement_text}</span></div>}
     <HeroCarousel banners={heroBanners}/>
     <LandingBelowHero plans={plans} checkoutReady={checkoutReady}/>
    </main>
    <footer className="um-footer"><div className="um-container">
     <div className="um-footer-lead"><span>[ SINTONE / {new Date().getFullYear()} ]</span><h2>SUA MÚSICA<br/>NÃO TEM LIMITES.</h2><Link href="/register">FAÇA PARTE DA SINTONE <ArrowUpRight size={20}/></Link></div>
     <div className="um-footer-grid">
      <div className="um-footer-brand"><Link href="/" aria-label="Início da SINTONE"><Image src="/sintone-logo.svg" alt="SINTONE" width={175} height={46}/></Link><p>Distribuição musical independente, com transparência, qualidade e respeito ao artista.</p></div>
      <nav aria-label="Links da plataforma"><strong>PLATAFORMA</strong><Link href="/register">Criar conta</Link><Link href="/login">Acessar painel</Link><a href="#como-funciona">Como funciona</a></nav>
      <nav aria-label="Recursos"><strong>RECURSOS</strong><a href="#recursos">Distribuição digital</a><a href="#carreira">Carreira independente</a><a href="#faq">Perguntas frequentes</a></nav>
      <nav aria-label="Informações legais"><strong>LEGAL / PRIVACIDADE</strong><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Política de privacidade</Link><Link href="/lgpd">LGPD</Link><Link href="/cookies">Cookies</Link><Link href="/reembolso">Reembolso</Link></nav>
      <nav aria-label="Redes sociais"><strong>REDES SOCIAIS</strong>
       {landing.social_links.instagram&&<a href={landing.social_links.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={15}/> Instagram</a>}
       {landing.social_links.youtube&&<a href={landing.social_links.youtube} target="_blank" rel="noopener noreferrer"><Youtube size={15}/> YouTube</a>}
       {landing.social_links.tiktok&&<a href={landing.social_links.tiktok} target="_blank" rel="noopener noreferrer"><Music2 size={15}/> TikTok</a>}
       {!Object.values(landing.social_links).some(Boolean)&&<span>Canais oficiais em breve</span>}
      </nav>
     </div>
     <div className="um-footer-bottom"><span>© {new Date().getFullYear()} SINTONE MEI. TODOS OS DIREITOS RESERVADOS.</span><span>DESENVOLVIDO PARA QUEM VIVE DE MÚSICA.</span></div>
    </div></footer>
  </div>
}
