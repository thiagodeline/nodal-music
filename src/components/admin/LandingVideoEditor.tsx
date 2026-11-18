'use client'
import {useState} from 'react'
import {UploadCloud,Save,Trash2} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {saveLandingVideo} from '@/app/admin/landing-page/actions'
import {parseLandingVideo} from '@/lib/landing-video'
import './landing-video-editor.css'

export default function LandingVideoEditor({initialUrl}:{initialUrl:string|null}){
 const [url,setUrl]=useState(initialUrl||'')
 const [saved,setSaved]=useState(initialUrl||'')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [progress,setProgress]=useState('')
 const video=parseLandingVideo(url)
 async function upload(file:File|undefined){
  if(!file)return
  if(!['video/mp4','video/webm'].includes(file.type)||file.size===0||file.size>50*1024*1024){
   setError('Escolha MP4 ou WebM com até 50 MB. Para vídeos maiores, use link do YouTube/Vimeo.')
   return
  }
  setBusy(true);setError('');setMessage('');setProgress('Enviando vídeo ao Supabase Storage...')
  try{
   const ext=file.type==='video/webm'?'webm':'mp4'
   const path='landing/'+crypto.randomUUID()+'.'+ext
   const supabase=createClient()
   const {error:uploadError}=await supabase.storage.from('landing-videos').upload(path,file,{
    contentType:file.type,upsert:false,cacheControl:'3600'
   })
   if(uploadError)throw Error(uploadError.message)
   const publicUrl=supabase.storage.from('landing-videos').getPublicUrl(path).data.publicUrl
   setUrl(publicUrl)
   setProgress('Upload concluído. Clique em Salvar vídeo para publicar.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar o vídeo.');setProgress('')}
  finally{setBusy(false)}
 }
 async function save(next=url){
  if(busy)return
  setBusy(true);setError('');setMessage('')
  try{
   const result=await saveLandingVideo(next.trim()||null)
   if(!result.ok)throw Error(result.error)
   setSaved(result.url||'');setUrl(result.url||'')
   setMessage(result.url?'Vídeo publicado na Landing Page.':'Vídeo removido da Landing Page.')
   setProgress('')
  }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar o vídeo.')}
  finally{setBusy(false)}
 }
 return <div className="st-video-editor">
  <h2>Vídeo Institucional</h2>
  <p>Publique um vídeo na seção da Landing Page. Envie MP4/WebM de até 50 MB ou cole uma URL HTTPS direta, do YouTube ou Vimeo.</p>
  <label className="st-video-editor-upload"><UploadCloud size={19}/> {busy?'Enviando…':'Selecionar vídeo do dispositivo'}
   <input type="file" accept="video/mp4,video/webm" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/>
  </label>
  <label className="st-cms-field"><span>URL do vídeo</span>
   <input type="url" value={url} maxLength={1500} placeholder="https://.../video.mp4 ou https://youtu.be/..." onChange={e=>{setUrl(e.target.value);setError('');setMessage('')}}/>
  </label>
  {video?<div className="st-video-editor-preview">
    {video.kind==='embed'?<iframe title="Prévia do vídeo da Landing" src={video.url} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen/>:
     <video controls preload="metadata" src={video.url} playsInline aria-label="Prévia do vídeo da Landing"/>}
   </div>:<div className="st-video-editor-empty">Nenhum vídeo válido selecionado. A Landing mostrará um fallback até o vídeo ser publicado.</div>}
  {progress&&<p className="st-video-editor-status" role="status">{progress}</p>}
  {error&&<p className="st-video-editor-error" role="alert">{error}</p>}
  {message&&<p className="st-video-editor-status" role="status">{message}</p>}
  <div className="st-video-editor-buttons">
   <button className="primary" type="button" disabled={busy||!!url.trim()&&!video} onClick={()=>void save()}><Save size={17}/> {busy?'Aguarde…':'Salvar vídeo'}</button>
   {(url||saved)&&<button className="secondary" type="button" disabled={busy} onClick={()=>{if(window.confirm('Remover o vídeo da Landing Page?'))void save('')}}><Trash2 size={16}/> Remover vídeo</button>}
  </div>
 </div>
}
