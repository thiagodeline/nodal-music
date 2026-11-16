import Link from 'next/link'
import {ArrowRight,ArrowUpRight,BarChart3,BadgeCheck,Check,CheckCircle2,ChevronDown,CloudUpload,FileAudio,Headphones,MessageCircle,ShieldCheck,Wallet,Activity,Disc3,Music2,CalendarClock,Radio,CheckCheck} from 'lucide-react'
import {PlanCards,type PublicPlan} from '@/components/billing/PlanCards'
import type {LandingConfig} from '@/lib/landing-config'
import {STREAMING_PLATFORMS,StreamingLogo} from './StreamingLogos'
import QCChecklist from './QCChecklist'
import './below-hero.css'

const insights=[
 {figure:'100%',title:'Seu som, sua identidade',copy:'Mantenha a titularidade de suas obras e gravações, conforme seus contratos e direitos.'},
 {figure:'64+',title:'Conexões com o mundo',copy:'Plataformas do catálogo de distribuição, sujeitas às condições de entrega de cada loja.'},
 {figure:'PIX',title:'Receba pelo seu painel',copy:'Consulte o saldo elegível e solicite seu saque via Pix.'},
 {figure:'REAL',title:'Pessoas de verdade',copy:'Suporte humano para acompanhar suas solicitações.'}
]
const showcase=[
 {genre:'TRAP',album:'FREQUÊNCIA',artist:'COLEÇÃO VISUAL 01',style:'trap',number:'01'},
 {genre:'MPB',album:'ENTRELINHAS',artist:'COLEÇÃO VISUAL 02',style:'mpb',number:'02'},
 {genre:'BOOM BAP',album:'CONCRETO',artist:'COLEÇÃO VISUAL 03',style:'boombap',number:'03'},
 {genre:'POP',album:'AMANHÃ',artist:'COLEÇÃO VISUAL 04',style:'pop',number:'04'}
]
const fallbackFaq=[{q:'Como funciona?',a:'Crie uma conta, envie seu lançamento e acompanhe a revisão pelo painel.'}]
function Label({children}:{children:React.ReactNode}){return <span className="sb-eyebrow">{children}</span>}
function SectionHead({label,title,description}:{label:string;title:React.ReactNode;description?:string}){return <div className="sb-heading"><Label>{label}</Label><h2>{title}</h2>{description&&<p>{description}</p>}</div>}
function PlatformMarquee({enabled}:{enabled:string[]}){
 const visible=STREAMING_PLATFORMS.filter(x=>enabled.includes(x.slug))
 if(!visible.length)return null
 return <section className="sb-platforms" aria-label="Plataformas de streaming"><div className="sb-container"><div className="sb-platform-heading"><p>SUA MÚSICA NAS MAIORES LOJAS DO MUNDO</p><span>Disponibilidade conforme o catálogo e o plano</span></div></div>
  <div className="sb-marquee" role="region" aria-label="Logotipos de plataformas"><div className="sb-marquee-track">
   {[...visible,...visible].map((item,i)=><div className="sb-platform-brand" key={item.slug+'-'+i} aria-hidden={i>=visible.length}><StreamingLogo slug={item.slug} size={34}/><strong>{item.name}</strong></div>)}
  </div></div>
 </section>
}
function Highlights(){return <section className="sb-highlights"><div className="sb-container sb-highlights-grid">
 {insights.map((x,i)=><article key={x.figure}><span className="sb-highlight-index">0{i+1}</span><strong>{x.figure}</strong><h3>{x.title}</h3><p>{x.copy}</p></article>)}
 </div></section>}
function AnalyticsPreview(){const bars=[24,32,27,44,37,55,51,60,49,71,64,84];return <div className="sb-analytics" aria-label="Prévia ilustrativa de relatórios"><div className="sb-analytics-top"><span><span className="sb-blue-dot"/> Painel SINTONE</span><span className="sb-demo">DEMONSTRAÇÃO</span></div><div className="sb-analytics-main">
 <div className="sb-analytics-balance"><div><small>Saldo acumulado · exemplo visual</small><strong>R$ 1.284,70</strong></div><span><Activity size={14}/> Visão de receitas</span></div>
 <div className="sb-chart" aria-hidden="true">{bars.map((x,i)=><i key={i} style={{height:x+'%'}}/>)}</div>
 <div className="sb-chart-dates"><span>JAN</span><span>JUN</span><span>DEZ</span></div>
 <div className="sb-analytics-footer"><span><CalendarClock size={15}/> Relatórios por período</span><span><CheckCircle2 size={15}/> Atualizações mensais</span></div>
 </div></div>}
function Features(){return <section className="sb-resources" id="recursos"><div className="sb-container">
 <SectionHead label="FEITO PARA QUEM FAZ MÚSICA" title={<>Tudo o que você precisa.<br/><span>Em um único painel.</span></>} description="Uma experiência simples para distribuir, acompanhar e administrar seu catálogo com mais autonomia."/>
 <div className="sb-bento">
  <article className="sb-bento-card sb-bento-report"><div className="sb-resource-copy"><span className="sb-card-index">01 / SEUS NÚMEROS</span><div className="sb-resource-icon"><BarChart3 size={23}/></div><h3>Transparência total<br/>&amp; relatórios.</h3><p>Streams, valores e histórico reunidos em uma visualização clara, com informações por plataforma e período.</p><span className="sb-inline-note"><span/> Atualizações conforme os relatórios recebidos</span></div><AnalyticsPreview/></article>
  <article className="sb-bento-card sb-bento-support"><span className="sb-card-index">02 / PESSOAS</span><div className="sb-resource-icon"><Headphones size={23}/></div><h3>Suporte humano.<br/>De verdade.</h3><p>Gente acompanhando seu lançamento, sem depender apenas de respostas automáticas.</p><div className="sb-chat-preview"><div><span className="sb-chat-avatar"><MessageCircle size={19}/></span><div><strong>Equipe SINTONE</strong><small>Atendimento por ticket</small></div><span className="sb-chat-online"/></div><p>Oi! Como podemos ajudar com seu lançamento?</p><small><span className="sb-green-dot"/> Atendimento em horário comercial</small></div></article>
  <article className="sb-bento-card sb-bento-pix"><span className="sb-card-index">03 / SEUS REPASSES</span><div className="sb-resource-icon"><Wallet size={23}/></div><h3>Saques via Pix.<br/>Direto no painel.</h3><p>Solicite o repasse do saldo elegível e acompanhe o processamento com praticidade.</p><div className="sb-pix-preview"><div className="sb-pix-icon"><Wallet size={28}/></div><div><strong>Pix</strong><span>Solicitação digital</span></div><CheckCircle2 size={22}/></div><small className="sb-small-disclaimer">Disponibilidade e prazos sujeitos à aprovação e às condições de saque.</small></article>
  <article className="sb-bento-card sb-bento-quality"><div><span className="sb-card-index">04 / QUALIDADE</span><div className="sb-resource-icon"><ShieldCheck size={23}/></div><h3>Validação técnica<br/>que faz diferença.</h3><p>Revisão de áudio, capa e metadados para reduzir erros antes da entrega às plataformas.</p></div><QCChecklist/></article>
 </div>
 </div></section>}
function Covers(){return <section className="sb-covers"><div className="sb-container">
 <div className="sb-covers-heading"><SectionHead label="O UNIVERSO É A MÚSICA" title={<>Cada lançamento tem<br/>uma história para contar.</>} description="Do trap ao MPB, novas ideias merecem chegar a novos públicos."/><span className="sb-covers-disclaimer">Capas conceituais ilustrativas, não são lançamentos de clientes.</span></div>
 <div className="sb-cover-grid">{showcase.map(x=><article key={x.number} className={'sb-cover-card sb-cover-'+x.style}>
  <div className="sb-cover-art" role="img" aria-label={'Capa conceitual de '+x.genre}><div className="sb-cover-visual"><span className="sb-cover-shape"/><span className="sb-cover-shape-two"/></div><div className="sb-cover-words"><span>ESTÚDIO / 20{Number(x.number)+26}</span><strong>{x.album}</strong><small>{x.artist}</small></div></div>
  <div className="sb-cover-caption"><span>{x.genre}</span><span>VISUAL CONCEITUAL</span></div></article>)}</div>
 </div></section>}
function Comparison(){const other=['Atendimento genérico que nem sempre resolve a dúvida','Falta de clareza nos relatórios de receitas','Pouca visibilidade sobre a etapa do lançamento'];const sintone=['Suporte humano para acompanhar suas solicitações','Relatórios organizados de streams e royalties','Status do catálogo visível no painel do artista'];
 return <section className="sb-compare" id="vantagens"><div className="sb-container"><SectionHead label="POR QUE SINTONE?" title={<>Mais clareza.<br/><span>Menos complicação.</span></>} description="Uma alternativa criada para simplificar sua rotina com a distribuição digital."/>
 <div className="sb-compare-grid"><article className="sb-compare-old"><span className="sb-compare-kicker">DIFICULDADES COMUNS DO MERCADO</span><h3>O jeito complicado.</h3><ul>{other.map(x=><li key={x}><span>×</span>{x}</li>)}</ul><small>Comparação ilustrativa; não se aplica a todas as distribuidoras.</small></article>
 <article className="sb-compare-new"><span className="sb-compare-badge"><CheckCheck size={16}/> O JEITO SINTONE</span><h3>Sua carreira,<br/>mais simples.</h3><ul>{sintone.map(x=><li key={x}><CheckCircle2 size={21}/>{x}</li>)}</ul><Link href="/register">Começar agora <ArrowUpRight size={18}/></Link></article></div></div></section>}
function Steps(){const steps=[{n:'01',icon:CloudUpload,title:'Envie seu projeto',copy:'Faça o upload de suas músicas e capas e complete os metadados.'},{n:'02',icon:ShieldCheck,title:'Acompanhe a revisão',copy:'Nossa equipe confere os arquivos e as informações do lançamento.'},{n:'03',icon:Radio,title:'Chegue às plataformas',copy:'Acompanhe a entrega e consulte os relatórios quando disponíveis.'}];return <section className="sb-journey" id="como"><div className="sb-container"><SectionHead label="DA IDEIA PARA O MUNDO" title="O caminho é simples." description="Você cuida da música. A SINTONE organiza o processo de distribuição."/><ol className="sb-journey-grid">{steps.map(({n,icon:Icon,title,copy})=><li key={n}><span className="sb-journey-number">{n}</span><div className="sb-journey-icon"><Icon size={25}/></div><h3>{title}</h3><p>{copy}</p></li>)}</ol></div></section>}
function FreePlan({plan,landing}:{plan:PublicPlan;landing:LandingConfig}){const limit=plan.monthly_releases_limit;const cap=limit===null?'Lançamentos ilimitados':limit===undefined?'Envios conforme as condições do plano':`Até ${limit} lançamento(s) por mês`;const features=[cap,...landing.pricing_features.filter(x=>!(/ilimitad/i.test(x)&&limit!==null)&&x!==cap)];
 return <article className="sb-price-card"><span className="sb-plan-badge"><BadgeCheck size={16}/>{landing.pricing_badge}</span><h3>{landing.pricing_title}</h3><strong className="sb-price-value">R$ 0,00</strong><p className="sb-price-subtitle">{landing.pricing_subtitle}</p><div className="sb-price-divider"/><span className="sb-price-include">TUDO PARA COMEÇAR</span><ul>{features.map((x,i)=><li key={i}><Check size={18}/>{x}</li>)}</ul><Link href="/register" className="sb-price-button">Criar conta grátis <ArrowRight size={18}/></Link><small>Sem mensalidade. Taxas de plataformas extras e demais condições do plano podem ser aplicáveis.</small></article>}
function Pricing({plans,landing,checkoutReady}:{plans:PublicPlan[];landing:LandingConfig;checkoutReady:boolean}){if(!plans.length)return null;const free=plans.filter(x=>Number(x.price_brl)===0),paid=plans.filter(x=>Number(x.price_brl)>0);return <section className="sb-pricing" id="planos"><div className="sb-container"><SectionHead label="COMECE DO SEU JEITO" title={<>Seu próximo lançamento<br/><span>começa aqui.</span></>} description="Planos flexíveis para cada etapa. Conheça os limites e condições antes de distribuir."/><div className="sb-pricing-cards">{free.map(p=><FreePlan key={p.id} plan={p} landing={landing}/>)}{paid.length>0&&<div className="sb-paid-plans"><PlanCards plans={paid} checkoutReady={checkoutReady}/></div>}</div></div></section>}
function FAQs({items}:{items:LandingConfig['faq_items']}){const entries=items.length?items:fallbackFaq;return <section className="sb-faq" id="faq"><div className="sb-container sb-faq-layout"><div><Label>DÚVIDAS FREQUENTES</Label><h2>Ficou alguma<br/>dúvida?</h2><p>Respostas simples sobre seu próximo lançamento.</p><Link href="/register">Começar gratuitamente <ArrowUpRight size={16}/></Link></div><div className="sb-faq-items">{entries.map((x,i)=><details key={i}><summary><span>{String(i+1).padStart(2,'0')}</span><strong>{x.q}</strong><ChevronDown size={20}/></summary><p>{x.a}</p></details>)}</div></div></section>}
function Closing(){return <section className="sb-closing"><div className="sb-container"><div className="sb-close-panel"><div className="sb-sound-waves" aria-hidden="true">{Array.from({length:29},(_,i)=><i key={i} style={{height:(15+(Math.sin(i*.81)+1)*32+(Math.sin(i*1.71)+1)*12)+'%'}}/>)}</div><div className="sb-close-copy"><span>O PRÓXIMO SOM É SEU</span><h2>O mundo precisa<br/>ouvir sua música.</h2><p>Crie sua conta e dê o primeiro passo para levar seu projeto às plataformas digitais.</p><Link href="/register">Começar gratuitamente <ArrowUpRight size={19}/></Link></div></div></div></section>}
export default function LandingBelowHero({landing,plans,checkoutReady}:{landing:LandingConfig;plans:PublicPlan[];checkoutReady:boolean}){return <><PlatformMarquee enabled={landing.dsp_enabled}/><Highlights/><Features/><Covers/><Comparison/><Steps/><Pricing plans={plans} landing={landing} checkoutReady={checkoutReady}/><FAQs items={landing.faq_items}/><Closing/></>}
