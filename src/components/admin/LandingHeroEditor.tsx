'use client'
import {useState} from 'react'
import Image from 'next/image'
import {createClient} from '@/lib/supabase/client'
import {updateLandingHero} from '@/app/admin/landing-page/actions'

export default function LandingHeroEditor({initialUrl}:{initialUrl:string|null}){
 const [imageUrl,setImageUrl]=useState(initialUrl)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 async function upload(file:File|undefined){
  if(!file)return
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return setMessage('Envie PNG, JPG ou WebP.')
  if(file.size>5*1024*1024)return setMessage('A imagem deve ter no máximo 5 MB.')
  setBusy(true);setMessage('')
  try{
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
   const path='hero/'+crypto.randomUUID()+'.'+ext
   const sb=createClient()
   const {error}=await sb.storage.from('public-assets').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'})
   if(error)throw new Error(error.message)
   const result=await updateLandingHero(path)
   if(!result.ok)throw new Error(result.error)
   setImageUrl(result.url);setMessage('Imagem do Hero atualizada com sucesso.')
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao enviar imagem.')}
  finally{setBusy(false)}
 }
 async function clearImage(){
  setBusy(true);setMessage('')
  try{const result=await updateLandingHero(null);if(!result.ok)throw new Error(result.error)
   setImageUrl(null);setMessage('Imagem removida. O Hero exibirá o fundo azul padrão.')
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao redefinir imagem.')}finally{setBusy(false)}
 }
 return <div style={{maxWidth:820,margin:'24px auto',background:'#fff',padding:28,border:'1px solid #e2e8f0',borderRadius:18}}>
  <h1 style={{fontSize:27,fontWeight:800,marginBottom:10}}>Imagem do Hero — Landing Page</h1>
  <p style={{color:'#64748b',marginBottom:22}}>Envie uma imagem horizontal (recomendado: 1920 × 800 px). JPG, PNG ou WebP; máximo 5 MB. A página mantém um filtro azul para legibilidade.</p>
  <div style={{height:260,background:'#2563eb',borderRadius:14,position:'relative',overflow:'hidden',marginBottom:24}}>
   {imageUrl&&<Image src={imageUrl} alt="Prévia da imagem atual" fill sizes="(max-width: 820px) 100vw, 820px" style={{objectFit:'cover'}} unoptimized/>}
   <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,rgba(29,78,216,.91),rgba(29,78,216,.35))'}}/>
   <div style={{position:'absolute',left:25,top:'50%',transform:'translateY(-50%)',maxWidth:500,color:'#fff',fontWeight:800,fontSize:26}}>Envie sua música para mais de 50 plataformas de streaming!</div>
  </div>
  <label style={{display:'block',fontWeight:700,color:'#334155',marginBottom:9}} htmlFor="landing-hero-file">Carregar imagem do banner</label>
  <input id="landing-hero-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}} style={{width:'100%',maxWidth:520,display:'block',marginBottom:16}}/>
  <button type="button" disabled={busy||!imageUrl} onClick={()=>void clearImage()} style={{padding:'11px 15px',borderRadius:9,border:'1px solid #cbd5e1',color:'#334155',background:'#fff',cursor:'pointer'}}>Restaurar fundo azul padrão</button>
  <p role="status" aria-live="polite" style={{marginTop:16,color:'#334155'}}>{busy?'Enviando e salvando imagem…':message}</p>
  {imageUrl&&<p style={{fontSize:12,color:'#64748b',overflowWrap:'anywhere'}}>Imagem atual: {imageUrl}</p>}
 </div>
}
