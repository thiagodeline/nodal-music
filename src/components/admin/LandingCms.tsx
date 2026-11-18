'use client'
import {useState} from 'react'
import Link from 'next/link'
import {ExternalLink} from 'lucide-react'
import LandingHeroEditor from './LandingHeroEditor'
import LandingVideoEditor from './LandingVideoEditor'
import {saveLandingSection} from '@/app/admin/landing-page/actions'
import type {LandingConfig} from '@/lib/landing-config'
import './landing-cms.css'

type Section='announcement'|'social'
export default function LandingCms({initial}:{initial:LandingConfig}){
 const [draft,setDraft]=useState(initial)
 const [messages,setMessages]=useState<Partial<Record<Section,string>>>({})
 const [busy,setBusy]=useState<Section|null>(null)
 async function save(section:Section){
  setBusy(section);setMessages(s=>({...s,[section]:''}))
  const payload=section==='announcement'?
   {announcement_active:draft.announcement_active,announcement_text:draft.announcement_text}:
   {social_links:draft.social_links}
  try{
   const result=await saveLandingSection(section,payload)
   setMessages(s=>({...s,[section]:result.ok?'Alterações salvas.':result.error}))
  }catch{setMessages(s=>({...s,[section]:'Falha de conexão.'}))}
  finally{setBusy(null)}
 }
 const footer=(section:Section)=><div className="st-cms-actions"><button type="button" disabled={busy!==null} onClick={()=>void save(section)}>{busy===section?'Salvando…':'Salvar seção'}</button><span role="status">{messages[section]}</span></div>
 return <div className="st-cms">
  <div className="st-cms-heading"><div><p>Gerencie os banners, vídeo institucional, anúncio de topo e links sociais da Landing Page.</p></div><Link href="/" target="_blank" rel="noopener noreferrer">Visualizar site <ExternalLink size={16}/></Link></div>
  <nav className="st-cms-navigation" aria-label="Seções do CMS">
   <a href="#cms-banners">Banners do Hero (Carrossel)</a>
   <a href="#cms-video">Vídeo Institucional</a>
   <a href="#cms-announcement">Alerta de Topo</a>
   <a href="#cms-social">Redes Sociais</a>
  </nav>
  <section id="cms-banners" className="st-cms-panel st-cms-image"><LandingHeroEditor initialBanners={draft.hero_banners}/></section>
  <section id="cms-video" className="st-cms-panel"><LandingVideoEditor initialUrl={draft.feature_video_url}/></section>
  <section id="cms-announcement" className="st-cms-panel">
   <h2>Alerta de Topo</h2>
   <label className="st-cms-toggle"><input type="checkbox" checked={draft.announcement_active} onChange={e=>setDraft(d=>({...d,announcement_active:e.target.checked}))}/> Exibir anúncio acima do Hero</label>
   <label className="st-cms-field"><span>Mensagem do anúncio</span><input maxLength={240} value={draft.announcement_text} onChange={e=>setDraft(d=>({...d,announcement_text:e.target.value}))}/></label>
   {footer('announcement')}
  </section>
  <section id="cms-social" className="st-cms-panel">
   <h2>Redes Sociais</h2><p>Adicione apenas os links oficiais. Campos vazios não aparecem no rodapé.</p>
   {(['instagram','youtube','tiktok'] as const).map(key=><label className="st-cms-field" key={key}><span>{key==='youtube'?'YouTube':key==='tiktok'?'TikTok':'Instagram'}</span>
    <input type="url" maxLength={300} placeholder="https://..." value={draft.social_links[key]||''} onChange={e=>setDraft(d=>({...d,social_links:{...d.social_links,[key]:e.target.value}}))}/></label>)}
   {footer('social')}
  </section>
 </div>
}
