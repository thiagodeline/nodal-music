import Link from 'next/link'
import {ArrowUpRight,AudioLines,BarChart3,Headphones,ShieldCheck} from 'lucide-react'
const studioPhoto='https://images.unsplash.com/photo-1615458317538-72c46d9359d8?auto=format&fit=crop&w=1400&q=80'
const artistPhoto='https://images.unsplash.com/photo-1694881227511-ca3b9f69ea91?auto=format&fit=crop&w=1400&q=80'
export default function EditorialFeatures(){
 return <>
  <section className="um-statement" id="recursos"><div className="um-container">
   <span className="um-kicker um-kicker-light">[ NOSSA MISSÃO ]</span>
   <h2>O ARTISTA É O <em>CENTRO</em> DE TUDO.</h2>
   <div className="um-statement-bottom"><p>Do primeiro lançamento ao próximo grande passo. Distribuição, acompanhamento e ferramentas em um só lugar — com independência e transparência.</p>
    <Link href="/register" className="um-outline-cta">FAÇA PARTE <ArrowUpRight size={20}/></Link></div>
  </div></section>
  <section className="um-editorial" id="carreira"><div className="um-container">
   <div className="um-editorial-topline"><span>[ SINTONE / INDEPENDÊNCIA ]</span><span>01 — 03</span></div>
   <div className="um-editorial-grid">
    <div className="um-editorial-photo um-studio-photo" role="img" aria-label="Estúdio de gravação — imagem ilustrativa" style={{backgroundImage:'url('+studioPhoto+')'}}><span>CRIAR. LANÇAR. EVOLUIR.</span></div>
    <div className="um-editorial-copy"><span className="um-kicker">[ CARREIRA INDEPENDENTE ]</span>
     <h2>CONHECIMENTO REAL PARA IMPULSIONAR SUA CARREIRA INDEPENDENTE.</h2>
     <p>Entenda cada etapa do lançamento, organize suas informações e tome decisões melhores para sua música. Você produz a arte; a SINTONE ajuda a colocar seu catálogo em movimento.</p>
     <Link className="um-text-link" href="#como-funciona">SAIBA COMO FUNCIONA <ArrowUpRight size={19}/></Link>
    </div>
   </div>
  </div></section>
  <section className="um-editorial um-editorial-muted" id="direitos"><div className="um-container">
   <div className="um-editorial-topline"><span>[ SINTONE / PROTEÇÃO ]</span><span>02 — 03</span></div>
   <div className="um-editorial-grid um-editorial-reversed">
    <div className="um-editorial-photo um-artist-photo" role="img" aria-label="Profissional em estúdio — imagem ilustrativa" style={{backgroundImage:'url('+artistPhoto+')'}}><span>SUA OBRA. SEUS DIREITOS.</span></div>
    <div className="um-editorial-copy"><span className="um-kicker">[ DIREITOS AUTORAIS ]</span>
     <h2>SUA MÚSICA TEM VALOR. CONHEÇA SEUS DIREITOS.</h2>
     <p>Créditos corretos, ISRC e informações de titulares fazem diferença. A distribuição não substitui o registro de obras nem transfere automaticamente direitos autorais: confira os termos do seu contrato.</p>
     <Link className="um-text-link" href="/termos">ENTENDA AS CONDIÇÕES <ArrowUpRight size={19}/></Link>
    </div>
   </div>
  </div></section>
  <section className="um-benefits" id="como-funciona"><div className="um-container">
   <div className="um-benefits-heading"><span className="um-kicker">[ O QUE VOCÊ ENCONTRA AQUI ]</span><h2>FEITO PARA QUEM FAZ MÚSICA.</h2></div>
   <div className="um-benefit-grid">
    <article><AudioLines size={27}/><span>01</span><h3>ENVIE SUA MÚSICA</h3><p>Faça o upload do áudio, da capa e dos metadados pelo seu painel.</p></article>
    <article><ShieldCheck size={27}/><span>02</span><h3>REVISÃO DE QUALIDADE</h3><p>Nossa equipe confere os arquivos e os dados antes da entrega às lojas.</p></article>
    <article><BarChart3 size={27}/><span>03</span><h3>ACOMPANHE RESULTADOS</h3><p>Consulte relatórios e royalties conforme forem disponibilizados pelas plataformas.</p></article>
    <article><Headphones size={27}/><span>04</span><h3>SUPORTE HUMANO</h3><p>Abra solicitações e acompanhe o atendimento dentro da SINTONE.</p></article>
   </div>
  </div></section>
 </>
}
