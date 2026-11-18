'use client'
import {useState} from 'react'
import Image from 'next/image'
import {ArrowDown,ArrowUp,Plus,Trash2,Save} from 'lucide-react'
import type {HeroBanner} from '@/lib/landing-config'
import {createClient} from '@/lib/supabase/client'
import {saveLandingBanners,registerLandingBanner} from '@/app/admin/landing-page/actions'
import './hero-editor.css'

export default function LandingHeroEditor({initialBanners}:{initialBanners:HeroBanner[]}){
 const [banners,setBanners]=useState(initialBanners)
 const [busy,setBusy]=useState(false)
 const [status,setStatus]=useState('')
 const [error,setError]=useState(false)
 const change=(i:number,key:keyof HeroBanner,value:string)=>setBanners(old=>old.map((b,j)=>i===j?{...b,[key]:value}:b))
 async function save(next=banners,success='Carrossel salvo.'){
  setBusy(true);setStatus('');setError(false)
  try{
   const result=await saveLandingBanners(next)
   if(!result.ok)throw Error(result.error)
   setBanners(result.banners);setStatus(success)
  }catch(e){setStatus(e instanceof Error?e.message:'Não foi possível salvar.');setError(true)}
  finally{setBusy(false)}
 }
 async function upload(files:FileList|null){
  if(!files?.length)return
  if(busy)return
  const selected=Array.from(files)
  if(selected.length+banners.length>6){setError(true);setStatus('Máximo de seis imagens no carrossel.');return}
  setBusy(true);setError(false);setStatus('')
  let saved=banners
  try{
   // Preservar os textos digitados antes de acrescentar novas imagens.
   const pending=await saveLandingBanners(banners)
   if(!pending.ok)throw Error(pending.error)
   saved=pending.banners
   for(const file of selected){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024||!file.size)
     throw Error('Arquivo inválido. Envie JPG, PNG ou WebP com até 5 MB.')
    const sb=createClient()
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
    const path='hero/'+crypto.randomUUID()+'.'+ext
    const {error:storageError}=await sb.storage.from('public-assets').upload(path,file,{
     contentType:file.type,upsert:false,cacheControl:'3600'
    })
    if(storageError)throw Error('Falha no Storage: '+storageError.message)
    const publicUrl=sb.storage.from('public-assets').getPublicUrl(path).data.publicUrl
    const result=await registerLandingBanner(publicUrl)
    if(!result.ok){
     await sb.storage.from('public-assets').remove([path])
     throw Error(result.error)
    }
    saved=result.banners
    setBanners(saved)
   }
   setStatus(selected.length+' imagem(ns) adicionada(s). Configure os textos e salve.')
  }catch(e){setStatus(e instanceof Error?e.message:'Falha no upload.');setError(true)}
  finally{setBusy(false)}
 }
 function move(i:number,offset:number){
  const next=[...banners],j=i+offset
  if(j<0||j>=next.length)return
  ;[next[i],next[j]]=[next[j],next[i]]
  setBanners(next)
 }
 return <div className="st-hero-editor">
  <h2>Banners do Hero (Carrossel)</h2>
  <p>Adicione até seis imagens. Cada banner pode ter seu título, subtítulo e botão próprio. Os campos do botão são opcionais; quando usados, informe texto e rota interna juntos.</p>
  <div className="st-hero-editor-list">{banners.map((banner,index)=><article className="st-hero-editor-item" key={banner.image_url}>
   <div className="st-hero-editor-thumb"><Image src={banner.image_url} alt={'Banner '+(index+1)} fill sizes="(max-width: 650px) 90vw, 240px" unoptimized style={{objectFit:'cover'}}/></div>
   <div className="st-hero-editor-fields">
    <strong>Imagem {index+1}</strong>
    <label>Título sobreposto<input maxLength={170} value={banner.title} onChange={e=>change(index,'title',e.target.value)}/></label>
    <label>Subtítulo<textarea rows={2} maxLength={240} value={banner.subtitle} onChange={e=>change(index,'subtitle',e.target.value)}/></label>
    <label>Texto do botão (opcional)<input maxLength={65} value={banner.button_text} onChange={e=>change(index,'button_text',e.target.value)}/></label>
    <label>Link interno do botão (opcional)<input maxLength={240} placeholder="/register" value={banner.button_url} onChange={e=>change(index,'button_url',e.target.value)}/></label>
    <div className="st-hero-editor-actions">
     <button type="button" disabled={busy||index===0} onClick={()=>move(index,-1)}><ArrowUp size={15}/> Acima</button>
     <button type="button" disabled={busy||index===banners.length-1} onClick={()=>move(index,1)}><ArrowDown size={15}/> Abaixo</button>
     <button type="button" disabled={busy} className="danger" onClick={()=>setBanners(old=>old.filter((_,i)=>i!==index))}><Trash2 size={15}/> Remover</button>
    </div>
   </div>
  </article>)}</div>
  <div className="st-hero-editor-toolbar">
   <label className="st-hero-editor-upload"><Plus size={17}/>{busy?'Enviando…':'Adicionar imagens'}
    <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy||banners.length>=6} onChange={e=>{void upload(e.target.files);e.currentTarget.value=''}}/>
   </label>
   <button type="button" className="st-hero-editor-submit" onClick={()=>void save()} disabled={busy}><Save size={17}/>{busy?'Salvando…':'Salvar carrossel'}</button>
   <span className="st-hero-editor-feedback" role={error?'alert':'status'} aria-live="polite">{status||(!banners.length?'Sem banners: a Landing exibe o Hero de fallback.':'')}</span>
  </div>
 </div>
}
