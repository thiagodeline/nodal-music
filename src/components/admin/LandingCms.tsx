'use client'
import {useState} from 'react'
import Link from 'next/link'
import {Check,Plus,Trash2,ExternalLink} from 'lucide-react'
import LandingHeroEditor from './LandingHeroEditor'
import {saveLandingSection} from '@/app/admin/landing-page/actions'
import {DSP_CHOICES, type LandingConfig} from '@/lib/landing-config'
import './landing-cms.css'

type Section='announcement'|'hero'|'pricing'|'faq'|'dsps'
const groups:{key:Section;label:string}[]=[
 {key:'announcement',label:'Alerta de topo'},{key:'hero',label:'Hero'},{key:'pricing',label:'Plano gratuito'},
 {key:'faq',label:'Perguntas frequentes'},{key:'dsps',label:'Plataformas (DSPs)'}
]
export default function LandingCms({initial}:{initial:LandingConfig}){
 const [draft,setDraft]=useState(initial)
 const [messages,setMessages]=useState<Partial<Record<Section,string>>>({})
 const [busy,setBusy]=useState<Section|null>(null)
 const change=<K extends keyof LandingConfig>(key:K,value:LandingConfig[K])=>setDraft(d=>({...d,[key]:value}))
 async function save(section:Section){
  setBusy(section);setMessages(s=>({...s,[section]:''}))
  const fields:Record<Section,unknown>={
   announcement:{announcement_active:draft.announcement_active,announcement_text:draft.announcement_text,announcement_link:draft.announcement_link},
   hero:{hero_title:draft.hero_title,hero_subtitle:draft.hero_subtitle,hero_cta_text:draft.hero_cta_text,hero_cta_url:draft.hero_cta_url},
   pricing:{pricing_badge:draft.pricing_badge,pricing_title:draft.pricing_title,pricing_price:draft.pricing_price,pricing_subtitle:draft.pricing_subtitle,pricing_features:draft.pricing_features},
   faq:{faq_items:draft.faq_items},dsps:{dsp_enabled:draft.dsp_enabled}
  }
  try{const result=await saveLandingSection(section,fields[section]);setMessages(s=>({...s,[section]:result.ok?'Alterações publicadas na Landing Page.':result.error}))}
  catch{setMessages(s=>({...s,[section]:'Erro de conexão. Tente novamente.'}))}finally{setBusy(null)}
 }
 const field=(label:string,key:keyof LandingConfig,maxLength=200)=> <label className="st-cms-field"><span>{label}</span><input maxLength={maxLength} value={String(draft[key]??'')} onChange={e=>change(key as keyof LandingConfig,e.target.value as never)}/></label>
 const footer=(section:Section)=><div className="st-cms-actions"><button type="button" disabled={busy!==null} onClick={()=>void save(section)}>{busy===section?'Salvando…':'Salvar seção'}</button><span role="status">{messages[section]}</span></div>
 return <div className="st-cms">
  <div className="st-cms-heading"><div><h1>Gerenciamento da Landing Page</h1><p>Edite o conteúdo público da SINTONE por módulos. Cada seção é salva independentemente.</p></div><Link href="/" target="_blank" rel="noopener noreferrer">Visualizar site <ExternalLink size={16}/></Link></div>
  <nav className="st-cms-navigation" aria-label="Seções do CMS">{groups.map(s=><a key={s.key} href={'#cms-'+s.key}>{s.label}</a>)}<a href="#cms-image">Imagem do Hero</a></nav>
  <section id="cms-announcement" className="st-cms-panel"><h2>Alerta de topo</h2><label className="st-cms-toggle"><input type="checkbox" checked={draft.announcement_active} onChange={e=>change('announcement_active',e.target.checked)}/> Exibir faixa de anúncio acima do banner</label>
   {field('Mensagem do anúncio','announcement_text',240)}{field('Link do anúncio (rota interna)','announcement_link',200)}{footer('announcement')}
  </section>
  <section id="cms-hero" className="st-cms-panel"><h2>Textos do Hero</h2>{field('Título principal','hero_title',170)}<label className="st-cms-field"><span>Subtítulo</span><textarea rows={3} maxLength={240} value={draft.hero_subtitle} onChange={e=>change('hero_subtitle',e.target.value)}/></label>{field('Texto do botão','hero_cta_text',65)}{field('Destino do botão (rota interna)','hero_cta_url',200)}{footer('hero')}</section>
  <section id="cms-image" className="st-cms-panel st-cms-image"><LandingHeroEditor initialUrl={draft.hero_image_url}/></section>
  <section id="cms-pricing" className="st-cms-panel"><h2>Plano gratuito na Landing Page</h2><p>Os preços e limites reais vêm do cadastro de planos. Esta seção personaliza apenas a apresentação; não muda cobranças nem contratos.</p>
   {field('Badge','pricing_badge',55)}{field('Título do plano','pricing_title',55)}{field('Valor (fixo para plano gratuito)','pricing_price',20)}{field('Legenda do valor','pricing_subtitle',140)}
   <h3>Benefícios visíveis</h3>{draft.pricing_features.map((v,i)=><div className="st-cms-array-row" key={i}><input aria-label={'Benefício '+(i+1)} maxLength={180} value={v} onChange={e=>change('pricing_features',draft.pricing_features.map((x,j)=>j===i?e.target.value:x))}/><button type="button" aria-label={'Excluir benefício '+(i+1)} onClick={()=>change('pricing_features',draft.pricing_features.filter((_,j)=>i!==j))}><Trash2 size={17}/></button></div>)}
   <button className="st-cms-add" type="button" disabled={draft.pricing_features.length>=12} onClick={()=>change('pricing_features',[...draft.pricing_features,''])}><Plus size={16}/> Adicionar benefício</button>{footer('pricing')}
  </section>
  <section id="cms-faq" className="st-cms-panel"><h2>Perguntas frequentes (FAQ)</h2>{draft.faq_items.map((item,i)=><div className="st-cms-faq" key={i}><div className="st-cms-faq-title"><strong>Pergunta {i+1}</strong><button type="button" aria-label={'Excluir pergunta '+(i+1)} onClick={()=>change('faq_items',draft.faq_items.filter((_,j)=>j!==i))}><Trash2 size={17}/></button></div>
    <label className="st-cms-field"><span>Pergunta</span><input maxLength={220} value={item.q} onChange={e=>change('faq_items',draft.faq_items.map((x,j)=>j===i?{...x,q:e.target.value}:x))}/></label>
    <label className="st-cms-field"><span>Resposta</span><textarea rows={3} maxLength={1500} value={item.a} onChange={e=>change('faq_items',draft.faq_items.map((x,j)=>j===i?{...x,a:e.target.value}:x))}/></label>
   </div>)}
   <button className="st-cms-add" type="button" disabled={draft.faq_items.length>=20} onClick={()=>change('faq_items',[...draft.faq_items,{q:'',a:''}])}><Plus size={16}/> Nova pergunta</button>{footer('faq')}
  </section>
  <section id="cms-dsps" className="st-cms-panel"><h2>Logotipos das plataformas</h2><p>Ativar ou desativar controla somente os logos apresentados na Landing Page. Não altera a distribuição, contratos ou entregas das lojas.</p>
    <div className="st-cms-dsp-grid">{DSP_CHOICES.map(d=><label key={d.slug}><input type="checkbox" checked={draft.dsp_enabled.includes(d.slug)} onChange={e=>change('dsp_enabled',e.target.checked?[...draft.dsp_enabled,d.slug]:draft.dsp_enabled.filter(x=>x!==d.slug))}/><span>{d.name}</span>{draft.dsp_enabled.includes(d.slug)&&<Check size={16}/>}</label>)}</div>{footer('dsps')}
  </section>
 </div>
}
