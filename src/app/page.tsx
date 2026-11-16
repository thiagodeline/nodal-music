import Link from 'next/link'
import Image from 'next/image'
import {ArrowRight} from 'lucide-react'
import './landing.css'
import '@/components/legal.css'
import {createClient} from '@/lib/supabase/server'
import type {PublicPlan} from '@/components/billing/PlanCards'
import {normalizeLanding,type LandingConfig} from '@/lib/landing-config'
import '@/components/billing/plans.css'
import LandingBelowHero from '@/components/landing/LandingBelowHero'

export const dynamic='force-dynamic'

export default async function Home() {
  const sb = await createClient()
  const { data } = await sb.from('billing_plans')
    .select('id,name,description,price_brl,frequency,benefits,mp_plan_id,is_default,monthly_releases_limit,max_artists')
    .eq('published', true).eq('archived', false).order('price_brl', { ascending: true })
  const plans = (data || []) as PublicPlan[]
  const {data:heroConfig}=await sb.from('landing_page_config').select('*').eq('id',1).maybeSingle()
  const landing=normalizeLanding(heroConfig as Partial<LandingConfig>|null)
  const configuredUrl=heroConfig?.hero_image_url
  const allowedOrigin=process.env.NEXT_PUBLIC_SUPABASE_URL||''
  let heroImageUrl: string|null=null
  if(configuredUrl && allowedOrigin){
    try {
      const source=new URL(configuredUrl)
      const origin=new URL(allowedOrigin)
      if(source.origin===origin.origin && source.pathname.startsWith('/storage/v1/object/public/public-assets/hero/'))heroImageUrl=source.toString()
    } catch {}
  }
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
      <section className="st-hero-banner" aria-labelledby="st-main-title">
        {heroImageUrl && <div className="st-hero-image" role="img" aria-label="Imagem de fundo da SINTONE" style={{backgroundImage:`url("${heroImageUrl}")`}} />}
        <div className="st-hero-overlay" aria-hidden="true"/>
        <div className="st-hero-banner-inner">
          <h1 id="st-main-title">{landing.hero_title}</h1>
          <p>{landing.hero_subtitle}</p><Link className="st-hero-cms-cta" href={landing.hero_cta_url}>{landing.hero_cta_text} <ArrowRight size={18}/></Link>
        </div>
      </section>

      <LandingBelowHero landing={landing} plans={plans} checkoutReady={checkoutReady}/>
    </main>

    <footer className="st-footer"><div className="wrap st-footer-inner"><div className="st-footer-brand"><Link href="/" aria-label="SINTONE — Página inicial"><Image src="/sintone-logo.svg" width={150} height={43} alt="SINTONE"/></Link><p>Distribuição musical com transparência, clareza e pessoas do seu lado.</p></div>
      <div className="st-footer-nav"><div><strong>Plataforma</strong><Link href="/register">Criar conta</Link><Link href="/login">Acessar painel</Link><a href="#recursos">Recursos</a></div><div><strong>Informações</strong><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Privacidade</Link><Link href="/cookies">Cookies</Link><Link href="/reembolso">Reembolso</Link><Link href="/lgpd">LGPD</Link></div></div>
    </div><div className="wrap st-footer-bottom"><span>© {new Date().getFullYear()} SINTONE. Todos os direitos reservados.</span><span>Tecnologia SINTONE · Feito para música independente.</span></div></footer>
  </div>
}
