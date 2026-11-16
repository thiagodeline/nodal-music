import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, Check, CheckCircle2, CircleHelp, Headphones, Music2, ShieldCheck, UploadCloud, Wallet, Zap } from 'lucide-react'
import './landing.css'
import '@/components/legal.css'
import { createClient } from '@/lib/supabase/server'
import { PlanCards, type PublicPlan } from '@/components/billing/PlanCards'
import '@/components/billing/plans.css'

export const dynamic = 'force-dynamic'

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
          <Image unoptimized src={`https://cdn.simpleicons.org/${platform.slug}/${platform.color}`} alt="" width={30} height={30} />
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
      <nav className="l-links" aria-label="Navegação principal">
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
        <PlanCards plans={plans} checkoutReady={checkoutReady}/>
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
