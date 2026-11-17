'use client'
import {useState} from 'react'
import Image from 'next/image'
import {ArrowDown,ArrowUp,Plus,Trash2} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import '../landing/carousel-admin.css'
import {saveLandingBanners} from '@/app/admin/landing-page/actions'

export default function LandingHeroEditor({initialUrls}:{initialUrls:string[]}){
 const [images,setImages]=useState(initialUrls)
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const commit=async(next:string[],success:string)=>{
  const result=await saveLandingBanners(next)
  if(!result.ok)throw Error(result.error)
  setImages(result.urls);setMessage(success)
 }
 async function upload(file:File|undefined){
  if(!file)return
  if(images.length>=6)return setMessage('Limite de 6 banners atingido.')
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return setMessage('Envie JPG, PNG ou WebP.')
  if(file.size>5*1024*1024)return setMessage('Máximo de 5 MB por imagem.')
  setBusy(true);setMessage('')
  try{
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
   const path='hero/'+crypto.randomUUID()+'.'+ext
   const sb=createClient()
   const {error}=await sb.storage.from('public-assets').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'})
   if(error)throw Error(error.message)
   const url=sb.storage.from('public-assets').getPublicUrl(path).data.publicUrl
   await commit([...images,url],'Banner adicionado ao carrossel.')
  }catch(e){setMessage(e instanceof Error?e.message:'Falha no upload.')}
  finally{setBusy(false)}
 }
 async function change(next:string[],success:string){
  setBusy(true);setMessage('')
  try{await commit(next,success)}
  catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar a ordem.')}
  finally{setBusy(false)}
 }
 return <div className="st-carousel-admin">
  <h2>Carrossel de banners</h2>
  <p>Adicione até 6 imagens horizontais (recomendado: 1920 × 800 px). O primeiro banner aparece primeiro. Sem imagens, o Hero usa fundo escuro #09090b.</p>
  <div className="st-carousel-admin-list">{images.map((url,index)=><div className="st-carousel-admin-item" key={url}>
   <div className="st-carousel-admin-preview"><Image src={url} alt={'Banner '+(index+1)} fill sizes="(max-width: 700px) 100vw, 420px" unoptimized style={{objectFit:'cover'}}/></div>
   <div className="st-carousel-admin-actions"><strong>Banner {index+1}</strong>
    <button type="button" disabled={busy||index===0} onClick={()=>void change(images.map((v,i)=>i===index?images[index-1]:i===index-1?url:v),'Ordem atualizada.')} aria-label={'Mover banner '+(index+1)+' para cima'}><ArrowUp size={16}/></button>
    <button type="button" disabled={busy||index===images.length-1} onClick={()=>void change(images.map((v,i)=>i===index?images[index+1]:i===index+1?url:v),'Ordem atualizada.')} aria-label={'Mover banner '+(index+1)+' para baixo'}><ArrowDown size={16}/></button>
    <button type="button" disabled={busy} onClick={()=>void change(images.filter(x=>x!==url),'Banner removido do carrossel.')}><Trash2 size={16}/> Remover</button>
   </div>
  </div>)}</div>
  <label className="st-carousel-upload"><Plus size={18}/>{busy?'Salvando…':'Adicionar banner'}
   <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||images.length>=6} onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/>
  </label>
  <p role="status" aria-live="polite">{message||(!images.length?'Nenhum banner cadastrado. O fundo escuro está ativo.':'')}</p>
 </div>
}
