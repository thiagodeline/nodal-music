import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, Check, CheckCircle2, CircleHelp, Headphones, Music2, ShieldCheck, UploadCloud, Wallet, Zap } from 'lucide-react'
import './landing.css'
import '@/components/legal.css'
import { createClient } from '@/lib/supabase/server'
import { PlanCards, type PublicPlan } from '@/components/billing/PlanCards'
import '@/components/billing/plans.css'

export const dynamic = 'force-dynamic'

const platformPaths: Record<string, string> = {"spotify":"M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z","applemusic":"M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z","youtubemusic":"M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z","tiktok":"M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z","deezer":"M.693 10.024c.381 0 .693-1.256.693-2.807 0-1.55-.312-2.807-.693-2.807C.312 4.41 0 5.666 0 7.217s.312 2.808.693 2.808ZM21.038 1.56c-.364 0-.684.805-.91 2.096C19.765 1.446 19.184 0 18.526 0c-.78 0-1.464 2.036-1.784 5-.312-2.158-.788-3.536-1.325-3.536-.745 0-1.386 2.704-1.62 6.472-.442-1.932-1.083-3.145-1.793-3.145s-1.35 1.213-1.793 3.145c-.242-3.76-.874-6.463-1.628-6.463-.537 0-1.013 1.378-1.325 3.535C6.938 2.036 6.262 0 5.474 0c-.658 0-1.247 1.447-1.602 3.665-.217-1.291-.546-2.105-.91-2.105-.675 0-1.221 2.807-1.221 6.272 0 3.466.546 6.273 1.221 6.273.277 0 .537-.476.736-1.273.32 2.928.996 4.938 1.776 4.938.606 0 1.143-1.204 1.507-3.11.251 3.622.875 6.195 1.602 6.195.46 0 .875-1.023 1.187-2.677C10.142 21.6 11 24 12.004 24c1.005 0 1.863-2.4 2.235-5.822.312 1.654.727 2.677 1.186 2.677.728 0 1.352-2.573 1.603-6.195.364 1.906.9 3.11 1.507 3.11.78 0 1.455-2.01 1.775-4.938.208.797.46 1.273.737 1.273.675 0 1.22-2.807 1.22-6.273-.008-3.457-.553-6.272-1.23-6.272ZM23.307 10.024c.381 0 .693-1.256.693-2.807 0-1.55-.312-2.807-.693-2.807-.381 0-.693 1.256-.693 2.807s.312 2.808.693 2.808Z","tidal":"M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zM16.042 7.996l3.979-3.979L24 7.996l-3.979 3.979z","instagram":"M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"}
function PlatformIcon({ slug, color }: { slug: string; color: string }) {
  const path = platformPaths[slug]
  if (!path) return <Music2 size={29} aria-hidden="true" style={{ color: '#' + color }} />
  return <svg width="30" height="30" viewBox="0 0 24 24" fill={'#' + color} aria-hidden="true" focusable="false"><path d={path}/></svg>
}

const platforms = [
  { name: 'Spotify', slug: 'spotify', color: '1DB954' },
  { name: 'Apple Music', slug: 'applemusic', color: 'FA243C' },
  { name: 'YouTube Music', slug: 'youtubemusic', color: 'FF0033' },
  { name: 'TikTok', slug: 'tiktok', color: '111827' },
  { name: 'Deezer', slug: 'deezer', color: 'A238FF' },
  { name: 'TIDAL', slug: 'tidal', color: '111827' },
  { name: 'Amazon Music', slug: 'amazonmusic', color: '25A7DA' },
  { name: 'Instagram', slug: 'instagram', color: 'E4405F' },
] as const

const comparisons = [
  { problem: 'Respostas automáticas e genéricas', solution: 'Atendimento humano e acompanhamento próximo' },
  { problem: 'Relatórios difíceis de entender', solution: 'Royalties organizados por loja e período' },
  { problem: 'Solicitações de saque complicadas', solution: 'Pedido de saque via Pix direto pelo painel' },
]

const steps = [
  { number: '01', title: 'Crie sua conta', description: 'Comece com um cadastro simples e conclua seu perfil para distribuir.' },
  { number: '02', title: 'Envie seu lançamento', description: 'Cadastre singles ou projetos com múltiplas faixas e capa 3000 × 3000 px.' },
  { number: '03', title: 'Acompanhe e receba', description: 'Consulte os status, acompanhe royalties disponíveis e solicite saques.' },
]

const faq = [
  ['O que é a SINTONE?', 'Uma distribuidora musical independente com envio de lançamentos, acompanhamento do catálogo e relatórios de royalties no mesmo painel.'],
  ['Como funcionam os saques?', 'Quando houver saldo elegível, você poderá solicitar um saque informando sua chave Pix. Os prazos dependem da análise e do processamento da solicitação.'],
  ['Preciso ter um selo?', 'Não. Artistas independentes também podem criar uma conta.'],
  ['Quando minha música fica disponível?', 'A equipe revisa os dados e arquivos antes da entrega. O prazo de publicação depende da aprovação e do processamento de cada plataforma.'],
  ['Quais arquivos devo enviar?', 'Áudio em WAV ou FLAC e capa em JPG ou PNG de 3000 × 3000 pixels.'],
]

function PlatformLogos() {
  const items = [...platforms, ...platforms]
  return <div className="st-dsp-section">
    <div className="wrap st-dsp-header"><p>Seu som nas plataformas que seu público usa</p><span>Disponibilidade conforme cada loja</span></div>
    <div className="st-dsp-window" role="region" aria-label="Plataformas de música">
      <div className="st-dsp-track">
        {items.map((platform, i) => <div className="st-dsp-brand" key={platform.slug + i} aria-hidden={i >= platforms.length}>
          <PlatformIcon slug={platform.slug} color={platform.color} />
          <span>{platform.name}</span>
        </div>)}
      </div>
    </div>
  </div>
}

function HeroPreview() {
  return <div className="st-preview" aria-label="Prévia ilustrativa do painel da SINTONE">
    <div className="st-preview-top"><div className="st-preview-dots"><i/><i/><i/></div><span>Painel do artista</span><span className="st-preview-tag">DEMONSTRAÇÃO</span></div>
    <div className="st-preview-body">
      <div className="st-preview-heading"><span>Visão geral</span><span className="st-preview-online"><i/> Seu catálogo, em um só lugar</span></div>
      <div className="st-preview-kpis">
        <div className="st-preview-kpi"><small>Receita ilustrativa</small><strong>R$ 1.280,40</strong><span>Exemplo visual</span></div>
        <div className="st-preview-kpi"><small>Streams ilustrativos</small><strong>24.810</strong><span>Exemplo visual</span></div>
      </div>
      <div className="st-preview-graph"><div className="st-preview-graph-head"><strong>Evolução de resultados</strong><span>Exemplo</span></div>
        <div className="st-preview-bars">{[34,49,44,66,52,76,68,88,73,96,83,100].map((height,i)=><div key={i}><i style={{height:height+'%'}} /></div>)}</div>
        <div className="st-preview-axis"><span>Jan</span><span>Jun</span><span>Dez</span></div>
      </div>
      <div className="st-preview-release"><div className="st-preview-cover"><Music2 size={24}/></div><div><strong>Meu próximo lançamento</strong><small>Status ilustrativo</small></div><span className="st-preview-approved"><CheckCircle2 size={13}/> Aprovado</span></div>
    </div>
    <span className="st-floating-badge"><ShieldCheck size={17}/> Mais clareza. Mais controle.</span>
  </div>
}


function FreeLandingPlan({ plan }: { plan: PublicPlan }) {
  const limit = plan.monthly_releases_limit
  const benefits = [
    limit === null ? 'Distribuição de músicas ilimitada' : limit === undefined ? 'Envio de lançamentos conforme as condições do plano' : `Até ${limit} lançamento(s) por mês`,
    'Painel do artista com estatísticas',
    'Acompanhamento de lançamentos',
    'Relatórios detalhados de royalties',
    'Solicitação de saques via Pix',
  ]
  return <article className="st-free-plan">
    <span className="st-free-badge"><CheckCircle2 size={15}/> Plano Gratuito</span>
    <h3>Grátis</h3>
    <div className="st-free-price">R$ 0,00</div>
    <p className="st-free-cycle">Sem mensalidade ou taxa de adesão</p>
    <p className="st-free-description">Distribua suas músicas nas principais plataformas de streaming sem pagar mensalidade.</p>
    <Link className="st-free-action" href="/register">Criar conta grátis <ArrowRight size={17}/></Link>
    <div className="st-free-benefits-title">O que está incluído</div>
    <ul>{benefits.map(benefit=><li key={benefit}><Check size={18} aria-hidden="true"/>{benefit}</li>)}</ul>
    <p className="st-free-terms">Sujeito aos limites e condições do plano. Saques dependem de saldo elegível e processamento.</p>
  </article>
}

export default async function Home() {
  const sb = await createClient()
  const { data } = await sb.from('billing_plans')
    .select('id,name,description,price_brl,frequency,benefits,mp_plan_id,is_default,monthly_releases_limit,max_artists')
    .eq('published', true).eq('archived', false).order('price_brl', { ascending: true })
  const plans = (data || []) as PublicPlan[]
  const checkoutReady = process.env.SINTONE_ENABLE_PAID_CHECKOUT === 'true'
    && process.env.SINTONE_PAYMENT_MODE === 'one_time'
    && !!(process.env.MERCADOPAGO_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.MERCADOPAGO_ACCESS_TOKEN)

  return <div className="st-home">
    <header className="l-head"><div className="wrap l-bar">
      <Link href="/" aria-label="SINTONE — Página inicial"><Image src="/sintone-logo.svg" alt="SINTONE" width={154} height={44} priority /></Link>
      <nav className="l-links st-top-links" aria-label="Navegação principal">
        <a href="#vantagens">Por que SINTONE?</a><a href="#recursos">Recursos</a><a href="#como">Como funciona</a>{plans.length > 0 && <a href="#planos">Planos</a>}<a href="#faq">FAQ</a>
      </nav>
      <div className="l-act"><Link className="btn ghost sm" href="/login">Entrar</Link><Link className="btn sm" href="/register">Criar conta <ArrowUpRight size={15}/></Link></div>
    </div></header>

    <main id="conteudo">
      <section className="wrap st-hero">
        <div className="st-hero-copy">
          <span className="st-eyebrow"><Zap size={15} fill="currentColor"/> Distribuição rápida para +64 plataformas</span>
          <h1>Sua música no ar, com <span>dados claros</span> e gente do seu lado.</h1>
          <p>Distribua sua música sem complicação. Acompanhe lançamentos, entenda seus royalties e conte com uma equipe que fala a sua língua.</p>
          <div className="st-hero-actions"><Link className="st-primary-btn" href="/register">Criar conta grátis <ArrowRight size={18}/></Link><a className="st-secondary-btn" href="#como">Veja como funciona</a></div>
          <div className="st-hero-assurances"><span><CheckCircle2 size={16}/> Painel simples</span><span><CheckCircle2 size={16}/> Suporte humano</span><span><CheckCircle2 size={16}/> Relatórios claros</span></div>
        </div>
        <HeroPreview/>
      </section>

      <PlatformLogos/>

      <section className="wrap st-comparison-section" id="vantagens">
        <div className="st-section-intro"><span className="st-kicker">UMA EXPERIÊNCIA DIFERENTE</span><h2>Distribuir música não precisa ser complicado.</h2><p>Menos burocracia e mais clareza em cada etapa da sua jornada.</p></div>
        <div className="st-comparison">
          <article className="st-compare-card st-compare-other"><div className="st-compare-head"><span className="st-compare-icon st-compare-no">×</span><div><small>O que você quer evitar</small><h3>Problemas comuns</h3></div></div>
            <ul>{comparisons.map(item=><li key={item.problem}><span className="st-compare-cross" aria-hidden="true">×</span><span>{item.problem}</span></li>)}</ul>
          </article>
          <article className="st-compare-card st-compare-sintone"><span className="st-compare-ideal"><BadgeCheck size={14}/> Ideal para você</span><div className="st-compare-head"><span className="st-compare-icon st-compare-yes"><Check size={22}/></span><div><small>A proposta da SINTONE</small><h3>Feita para artistas</h3></div></div>
            <ul>{comparisons.map(item=><li key={item.solution}><CheckCircle2 size={20} aria-hidden="true"/><span>{item.solution}</span></li>)}</ul>
          </article>
        </div>
        <p className="st-compare-note">Comparação ilustrativa de experiências comuns; não representa todas as distribuidoras. Taxas, prazos e serviços da SINTONE seguem os planos e termos vigentes.</p>
      </section>

      <section className="st-features-back" id="recursos"><div className="wrap st-features-section">
        <div className="st-section-intro"><span className="st-kicker">TUDO EM UM SÓ LUGAR</span><h2>Tudo que você precisa para crescer, num só painel.</h2><p>Uma experiência direta, com ferramentas para acompanhar sua música de ponta a ponta.</p></div>
        <div className="st-feature-grid">
          <article className="st-feature-card"><div className="st-feature-icon"><Headphones size={23}/></div><h3>Suporte humano, de verdade</h3><p>Quando surgir uma dúvida, você pode falar com a equipe e acompanhar seu atendimento.</p><div className="st-feature-mini st-support-mini"><div className="st-mini-avatar"><Headphones size={17}/></div><div><strong>Equipe SINTONE</strong><small>Atendimento via ticket</small></div><span className="st-mini-status"><i/> Atendimento</span></div></article>
          <article className="st-feature-card"><div className="st-feature-icon"><BarChart3 size={23}/></div><h3>Dados e relatórios claros</h3><p>Entenda streams e receitas por loja, com informações reunidas em um só lugar.</p><div className="st-feature-mini st-revenue-mini"><div><small>Receita mensal · exemplo</small><strong>R$ 842,50</strong></div><div className="st-mini-bars">{[34,48,41,63,57,79,91].map((n,i)=><i key={i} style={{height:n+'%'}} />)}</div></div></article>
          <article className="st-feature-card"><div className="st-feature-icon"><Wallet size={23}/></div><h3>Saques via Pix</h3><p>Visualize o saldo disponível e solicite seus saques pelo próprio painel.</p><div className="st-feature-mini st-pix-mini"><span className="st-pix-symbol">◇</span><div><strong>Solicitação via Pix</strong><small>Consulte o status no painel</small></div><CheckCircle2 size={20}/></div></article>
          <article className="st-feature-card"><div className="st-feature-icon"><UploadCloud size={23}/></div><h3>Status de cada lançamento</h3><p>Veja quando sua música está em análise, aprovada ou disponível nas lojas.</p><div className="st-feature-mini st-release-mini"><div className="st-mini-cover"><Music2 size={17}/></div><div><strong>Seu lançamento</strong><small>Exemplo de acompanhamento</small></div><span className="st-mini-approved"><CheckCircle2 size={13}/> Aprovado</span></div></article>
        </div>
      </div></section>

      <section className="wrap st-steps-section" id="como">
        <div className="st-section-intro"><span className="st-kicker">SIMPLES DO INÍCIO AO FIM</span><h2>Do arquivo ao primeiro pagamento.</h2><p>Três passos para colocar seu projeto em movimento.</p></div>
        <ol className="st-steps">{steps.map(step=><li key={step.number}><div className="st-step-number">{step.number}</div><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
      </section>

      {plans.length > 0 && <section className="st-plans-section" id="planos"><div className="wrap st-plan-area">
        <div className="st-section-intro"><span className="st-kicker">ESCOLHA SEU PLANO</span><h2>Seu próximo lançamento começa aqui.</h2><p>Planos e benefícios exibidos conforme as condições cadastradas na plataforma.</p></div>
        <div className="st-home-plans">{plans.filter(plan => Number(plan.price_brl) === 0).map(plan=><FreeLandingPlan key={plan.id} plan={plan}/>)}{plans.some(plan => Number(plan.price_brl) > 0) && <div className="st-home-paid-plans"><PlanCards plans={plans.filter(plan => Number(plan.price_brl) > 0)} checkoutReady={checkoutReady}/></div>}</div>
        <p className="st-plan-disclaimer"><ShieldCheck size={15}/> Limites, valores e condições são os indicados em cada plano. Consulte os termos antes de contratar.</p>
      </div></section>}

      <section className="wrap st-faq-section" id="faq"><div className="st-section-intro"><span className="st-kicker">DÚVIDAS FREQUENTES</span><h2>Alguma dúvida antes de começar?</h2></div>
        <div className="l-faq">{faq.map(([question, answer])=><details key={question}><summary>{question}<CircleHelp size={18}/></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="wrap st-final-section"><div className="st-final-cta"><div className="st-cta-deco" aria-hidden="true"><Music2 size={140}/></div><span>O PRÓXIMO PASSO É SEU</span><h2>Pronto para colocar sua música no mundo?</h2><p>Crie sua conta e comece a construir seu catálogo com a SINTONE.</p><Link href="/register" className="st-final-button">Criar conta grátis <ArrowRight size={18}/></Link></div></section>
    </main>

    <footer className="st-footer"><div className="wrap st-footer-inner"><div className="st-footer-brand"><Link href="/" aria-label="SINTONE — Página inicial"><Image src="/sintone-logo.svg" width={150} height={43} alt="SINTONE"/></Link><p>Distribuição musical com transparência, clareza e pessoas do seu lado.</p></div>
      <div className="st-footer-nav"><div><strong>Plataforma</strong><Link href="/register">Criar conta</Link><Link href="/login">Acessar painel</Link><a href="#recursos">Recursos</a></div><div><strong>Informações</strong><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Privacidade</Link><Link href="/cookies">Cookies</Link><Link href="/reembolso">Reembolso</Link><Link href="/lgpd">LGPD</Link></div></div>
    </div><div className="wrap st-footer-bottom"><span>© {new Date().getFullYear()} SINTONE. Todos os direitos reservados.</span><span>Tecnologia SINTONE · Feito para música independente.</span></div></footer>
  </div>
}
