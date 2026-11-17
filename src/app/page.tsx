import Link from 'next/link'
import Image from 'next/image'
import {ArrowRight,Instagram,Youtube,Music2} from 'lucide-react'
import './landing.css'
import '@/components/legal.css'
import {createClient} from '@/lib/supabase/server'
import type {PublicPlan} from '@/components/billing/PlanCards'
import {normalizeLanding,type LandingConfig} from '@/lib/landing-config'
import '@/components/billing/plans.css'
import LandingBelowHero from '@/components/landing/LandingBelowHero'
import HeroCarousel from '@/components/landing/HeroCarousel'
import '@/components/landing/landing-refresh.css'

export const dynamic='force-dynamic'

export default async function Home() {
  const sb = await createClient()
  const { data } = await sb.from('billing_plans')
    .select('id,name,description,price_brl,frequency,benefits,mp_plan_id,is_default,monthly_releases_limit,max_artists')
    .eq('published', true).eq('active', true).eq('archived', false).order('price_brl', { ascending: true })
  const plans = (data || []) as PublicPlan[]
  const {data:heroConfig}=await sb.from('landing_page_config').select('*').eq('id',1).maybeSingle()
  const landing=normalizeLanding(heroConfig as Partial<LandingConfig>|null)
  const allowedOrigin=process.env.NEXT_PUBLIC_SUPABASE_URL||''
  const heroImages=landing.hero_banners.filter(value=>{
   if(!allowedOrigin)return false
   try{const url=new URL(value),origin=new URL(allowedOrigin)
    return url.origin===origin.origin&&url.pathname.startsWith('/storage/v1/object/public/public-assets/hero/')
   }catch{return false}
  })
  const checkoutReady = process.env.SINTONE_ENABLE_PAID_CHECKOUT === 'true'
    && process.env.SINTONE_PAYMENT_MODE === 'one_time'
    && !!(process.env.MERCADOPAGO_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.MERCADOPAGO_ACCESS_TOKEN)

  return <div className="st-home">
    <header className="st-simple-header">
      <div className="st-simple-header-inner">
        <Link href="/" aria-label="Página inicial da SINTONE"><Image src="/sintone-logo.svg" alt="SINTONE" width={156} height={44} priority /></Link>
        <nav className="st-simple-auth" aria-label="Acesso à plataforma">
          <Link href="/login">ENTRAR</Link>
          <Link href="/register">INSCREVA-SE</Link>
        </nav>
      </div>
    </header>

    <main id="conteudo">
      {landing.announcement_active&&<div className="st-announcement"><Link href={landing.announcement_link}>{landing.announcement_text} <ArrowRight size={15}/></Link></div>}
      <HeroCarousel images={heroImages} landing={landing}/>

      <LandingBelowHero landing={landing} plans={plans.length>1?plans:[]} checkoutReady={checkoutReady}/>
    </main>

    <footer className="st-footer"><div className="wrap st-footer-inner"><div className="st-footer-brand"><Link href="/" aria-label="SINTONE — Página inicial"><Image src="/sintone-logo.svg" width={150} height={43} alt="SINTONE"/></Link><p>Distribuição musical com transparência, clareza e pessoas do seu lado.</p></div>
      <div className="st-footer-nav"><div><strong>Plataforma</strong><Link href="/register">Criar conta</Link><Link href="/login">Acessar painel</Link><a href="#recursos">Recursos</a></div><div><strong>Informações</strong><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Privacidade</Link><Link href="/cookies">Cookies</Link><Link href="/reembolso">Reembolso</Link><Link href="/lgpd">LGPD</Link></div>
      <div className="st-footer-social"><strong>Redes sociais</strong>
       {landing.social_links.instagram&&<a href={landing.social_links.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={17}/> Instagram</a>}
       {landing.social_links.youtube&&<a href={landing.social_links.youtube} target="_blank" rel="noopener noreferrer"><Youtube size={17}/> YouTube</a>}
       {landing.social_links.tiktok&&<a href={landing.social_links.tiktok} target="_blank" rel="noopener noreferrer"><Music2 size={17}/> TikTok</a>}
       {!Object.values(landing.social_links).some(Boolean)&&<span className="st-social-pending">Canais oficiais em breve</span>}
      </div></div>
    </div><div className="wrap st-footer-bottom"><span>© {new Date().getFullYear()} SINTONE. Todos os direitos reservados.</span><span>Tecnologia SINTONE · Feito para música independente.</span></div></footer>
  </div>
}
