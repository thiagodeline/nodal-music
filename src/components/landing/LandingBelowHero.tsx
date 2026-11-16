import Link from 'next/link'
import {ArrowRight,ArrowUpRight,BarChart3,BadgeCheck,Check,CheckCircle2,ChevronDown,CloudUpload,FileAudio,Headphones,MessageCircle,Music2,ShieldCheck,Wallet,Radio,Activity,Disc3,LockKeyhole,Send} from 'lucide-react'
import {PlanCards,type PublicPlan} from '@/components/billing/PlanCards'
import type {LandingConfig} from '@/lib/landing-config'
import './below-hero.css'

const platformNames:Record<string,string>={
 spotify:'Spotify',applemusic:'Apple Music',youtubemusic:'YouTube Music',deezer:'Deezer',
 amazonmusic:'Amazon Music',tiktok:'TikTok',tidal:'TIDAL',instagram:'Instagram'
}
const benefits=[
 {figure:'100%',headline:'Sua música, seu patrimônio.',description:'O artista mantém a titularidade de suas obras e gravações, conforme seus direitos e contratos.'},
 {figure:'+64',headline:'Seu som vai mais longe.',description:'Alcance anunciado de plataformas e lojas digitais, sujeito à disponibilidade de cada uma.'},
 {figure:'PIX',headline:'Repasses em um só lugar.',description:'Acompanhe o saldo e solicite saques via Pix, conforme os prazos e critérios aplicáveis.'},
 {figure:'HUMANO',headline:'Suporte de verdade.',description:'Atendimento realizado pela equipe SINTONE, com acompanhamento por tickets.'}
]
const faqsDefault=[{q:'Como funciona a distribuição?',a:'Crie uma conta, envie os arquivos e acompanhe a análise do seu lançamento.'}]
function Eyebrow({children,invert=false}:{children:React.ReactNode;invert?:boolean}){return <span className={'sb-eyebrow'+(invert?' sb-eyebrow-light':'')}>{children}</span>}
function Impact(){return <section className="sb-impact" aria-label="A SINTONE em quatro pontos"><div className="sb-container sb-impact-grid">
 {benefits.map(s=><article key={s.figure}><strong>{s.figure}</strong><h2>{s.headline}</h2><p>{s.description}</p></article>)}
 </div></section>}
function AnalyticsPreview(){const bars=[20,29,25,39,34,52,48,60,57,74,68,88];return <div className="sb-analytics" aria-label="Visualização ilustrativa do painel de analytics">
 <div className="sb-analytics-bar"><span><span className="sb-light-dot"/> SINTONE ANALYTICS</span><span>EXEMPLO VISUAL</span></div>
 <div className="sb-analytics-body"><div className="sb-analytics-top"><div><small>Visão ilustrativa de royalties</small><strong>Receitas, sem mistério.</strong></div><span className="sb-chart-tag"><Activity size={13}/> Histórico</span></div>
 <div className="sb-analytics-chart"><div className="sb-gridlines" aria-hidden="true"/>{bars.map((v,i)=><i aria-hidden="true" key={i} style={{height:v+'%'}}/>)}</div>
 <div className="sb-analytics-bottom"><span>JAN</span><span>JUN</span><span>DEZ</span></div>
 <div className="sb-analytics-payment"><span><Wallet size={17}/> Solicitações de saque via Pix</span><span><CheckCircle2 size={15}/> Pelo painel</span></div></div>
 </div>}
function Resources({enabled}:{enabled:string[]}){const logos=enabled.filter(s=>['spotify','applemusic','deezer'].includes(s));
 return <section className="sb-resources" id="recursos"><div className="sb-container">
 <div className="sb-heading sb-heading-dark"><Eyebrow invert>TECNOLOGIA PARA ARTISTAS</Eyebrow><h2>Seu catálogo. Seus números.<br/><em>Um único lugar.</em></h2><p>Da primeira faixa ao acompanhamento dos royalties, uma estrutura feita para quem vive de música.</p></div>
 <div className="sb-bento">
 <article className="sb-bento-card sb-bento-analytics"><div className="sb-bento-copy"><span className="sb-index">01 / INTELIGÊNCIA</span><div className="sb-bento-icon"><BarChart3 size={23}/></div><h3>Analytics &amp;<br/>transparência real.</h3><p>Consulte relatórios de desempenho e receitas organizadas por loja e período. Tudo sem planilhas complicadas.</p></div><AnalyticsPreview/></article>
 <article className="sb-bento-card sb-bento-support"><span className="sb-index">02 / PESSOAS</span><div className="sb-bento-icon"><Headphones size={23}/></div><h3>Suporte humano.<br/>Sem labirintos.</h3><p>Uma conversa direta com quem acompanha seu catálogo — sem depender apenas de respostas automáticas.</p><div className="sb-chat-preview"><div className="sb-chat-person"><span><MessageCircle size={20}/></span><div><strong>Equipe SINTONE</strong><small>Atendimento por ticket</small></div><i/></div><p>Olá! Como podemos ajudar com seu lançamento?</p><span className="sb-chat-foot"><span className="sb-light-dot"/> Atendimento em horário comercial</span></div></article>
 <article className="sb-bento-card sb-bento-qc"><span className="sb-index">03 / QUALIDADE</span><div className="sb-bento-icon"><ShieldCheck size={23}/></div><h3>Revisão técnica<br/>em cada etapa.</h3><p>Uma equipe confere arquivos, metadados e informações essenciais antes da entrega.</p><div className="sb-qc-list"><span><FileAudio size={16}/> Áudio WAV / FLAC</span><span><Disc3 size={16}/> Capa 3000 × 3000 px</span><span><BadgeCheck size={16}/> ISRC / UPC</span></div></article>
 <article className="sb-bento-card sb-bento-publish"><div><span className="sb-index">04 / DISTRIBUIÇÃO</span><div className="sb-bento-icon"><Radio size={22}/></div><h3>Uma rota para seu<br/>próximo lançamento.</h3><p>Envie singles, EPs e álbuns. A quantidade permitida depende do plano e a presença nas lojas depende de cada plataforma.</p></div><div className="sb-publish-display"><span>PLATAFORMAS DO SEU PÚBLICO</span><div>{logos.length?logos.map(x=><strong key={x}>{platformNames[x]}</strong>):<strong>Distribuição digital</strong>}</div><small>Escolha de lojas e entrega conforme seu plano</small></div></article>
 </div></div></section>
}
function Comparison(){const old=['Atendimento limitado a canais genéricos','Informações de royalties nem sempre fáceis de encontrar','Processos pouco claros para acompanhar a entrega'];
const fresh=['Equipe acessível para acompanhar suas solicitações','Relatórios de streaming e receitas organizados','Status de lançamentos visíveis no painel'];
return <section id="vantagens" className="sb-compare"><div className="sb-container"><div className="sb-heading"><Eyebrow>OUTRA FORMA DE DISTRIBUIR</Eyebrow><h2>A distribuição evoluiu.<br/>Seu controle também pode.</h2><p>Uma comparação ilustrativa entre dificuldades comuns e a proposta da SINTONE.</p></div>
<div className="sb-compare-grid"><article className="sb-compare-old"><span className="sb-compare-label">O JEITO COMPLICADO</span><h3>Mais dúvidas.<br/>Menos visibilidade.</h3><ul>{old.map(x=><li key={x}><span aria-hidden="true">×</span>{x}</li>)}</ul><small>Exemplos gerais; não se aplicam a todas as distribuidoras.</small></article>
<article className="sb-compare-new"><span className="sb-compare-ribbon"><Activity size={15}/> UMA EXPERIÊNCIA MAIS DIRETA</span><span className="sb-compare-label">A PROPOSTA SINTONE</span><h3>Mais clareza.<br/>Mais autonomia.</h3><ul>{fresh.map(x=><li key={x}><CheckCircle2 size={21} aria-hidden="true"/>{x}</li>)}</ul><Link href="/register">Comece com sua conta <ArrowUpRight size={18}/></Link></article></div>
</div></section>}
function Timeline(){const steps=[
 {step:'01',icon:CloudUpload,title:'Upload & metadados',copy:'Envie áudio WAV/FLAC, capa e as informações do seu single, EP ou álbum.'},
 {step:'02',icon:ShieldCheck,title:'Revisão de qualidade',copy:'A equipe confere os metadados e os arquivos antes da entrega às lojas.'},
 {step:'03',icon:Wallet,title:'Streaming & Pix',copy:'Acompanhe o status, consulte os relatórios e solicite saques quando houver saldo elegível.'}
];return <section className="sb-journey" id="como"><div className="sb-container"><div className="sb-heading"><Eyebrow>SIMPLIFIQUE O PROCESSO</Eyebrow><h2>Do upload ao streaming.</h2><p>Três etapas para transformar seus arquivos em um lançamento acompanhado do início ao fim.</p></div>
<ol className="sb-journey-grid">{steps.map(({step,icon:Icon,title,copy})=><li key={step}><span className="sb-journey-no">{step}</span><div className="sb-journey-icon"><Icon size={26}/></div><h3>{title}</h3><p>{copy}</p></li>)}</ol></div></section>}
function FreePlan({plan,landing}:{plan:PublicPlan;landing:LandingConfig}){const limit=plan.monthly_releases_limit;
 const cap=limit===null?'Distribuição de músicas ilimitada':limit===undefined?'Lançamentos conforme o plano':`Até ${limit} lançamento(s) por mês`;
 const benefits=[cap,...landing.pricing_features.filter(x=>!(/ilimitad/i.test(x)&&limit!==null)&&x!==cap)];
 return <article className="sb-price-card"><div className="sb-price-card-top"><span className="sb-plan-label"><BadgeCheck size={16}/>{landing.pricing_badge}</span><span className="sb-pricing-tag">SEM MENSALIDADE</span></div><h3>{landing.pricing_title}</h3><strong className="sb-price-number">R$ 0,00</strong><p className="sb-price-subtitle">{landing.pricing_subtitle}</p><p className="sb-price-description">Comece a construir seu catálogo com distribuição digital e acompanhamento em um só painel.</p><Link href="/register" className="sb-price-button">Começar meu lançamento agora <ArrowRight size={19}/></Link><div className="sb-price-divider"/><span className="sb-price-include">O QUE ESTÁ INCLUÍDO</span><ul>{benefits.map((x,i)=><li key={i}><Check size={18}/><span>{x}</span></li>)}</ul><p className="sb-price-small">Recursos sujeitos às condições, aos limites e às taxas extras aplicáveis ao plano. Saques dependem de saldo elegível.</p></article>}
function Pricing({plans,landing,checkoutReady}:{plans:PublicPlan[];landing:LandingConfig;checkoutReady:boolean}){const free=plans.filter(x=>Number(x.price_brl)===0),paid=plans.filter(x=>Number(x.price_brl)>0);
 if(!plans.length)return null;
 return <section className="sb-pricing" id="planos"><div className="sb-container"><div className="sb-heading sb-heading-dark"><Eyebrow invert>O SEU PRÓXIMO PASSO</Eyebrow><h2>Seu talento não precisa<br/>esperar por mensalidades.</h2><p>Comece com o plano gratuito e conheça as condições disponíveis para seu catálogo.</p></div>
 <div className="sb-pricing-cards">{free.map(p=><FreePlan key={p.id} plan={p} landing={landing}/>)}{paid.length>0&&<div className="sb-paid-plans"><PlanCards plans={paid} checkoutReady={checkoutReady}/></div>}</div></div></section>
}
function FAQs({items}:{items:LandingConfig['faq_items']}){const entries=items.length?items:faqsDefault;return <section className="sb-faq" id="faq"><div className="sb-container sb-faq-layout"><div className="sb-faq-intro"><Eyebrow>RESPOSTAS DIRETAS</Eyebrow><h2>Dúvidas?<br/>A gente explica.</h2><p>Entenda o funcionamento da distribuição antes de publicar o seu projeto.</p><Link href="/register">Criar conta grátis <ArrowUpRight size={16}/></Link></div><div className="sb-faq-items">{entries.map((x,i)=><details key={i}><summary><span>{String(i+1).padStart(2,'0')}</span><strong>{x.q}</strong><ChevronDown size={20}/></summary><p>{x.a}</p></details>)}</div></div></section>}
function Closing(){return <section className="sb-closing"><div className="sb-container"><div className="sb-close-panel"><div className="sb-close-waves" aria-hidden="true">{Array.from({length:33},(_,i)=><i key={i} style={{height:(18+(Math.sin(i*.8)+1)*35+(Math.sin(i*1.7)+1)*13)+'%'}}/>)}</div><div className="sb-close-copy"><span>SUA PRÓXIMA MÚSICA COMEÇA AQUI</span><h2>O próximo capítulo<br/>é seu.</h2><p>Da primeira faixa ao próximo lançamento: conte com um lugar feito para sua música avançar.</p><Link href="/register">Criar minha conta grátis <ArrowUpRight size={19}/></Link></div></div></div></section>}
export default function LandingBelowHero({landing,plans,checkoutReady}:{landing:LandingConfig;plans:PublicPlan[];checkoutReady:boolean}){
 return <><Impact/><Resources enabled={landing.dsp_enabled}/><Comparison/><Timeline/><Pricing plans={plans} landing={landing} checkoutReady={checkoutReady}/><FAQs items={landing.faq_items}/><Closing/></>
}
