'use client'
import {useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import Image from 'next/image'
import {Trash2,Plus,Power} from 'lucide-react'
import {createDashboardPopup,toggleDashboardPopup,deleteDashboardPopup} from '@/app/admin/popups/actions'
import './popups-admin.css'
type Popup={id:string;image_url:string;is_active:boolean;created_at:string}
export default function PopupsManager({initial}:{initial:Popup[]}){
 const [popups,setPopups]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function upload(files:FileList|null){
  if(!files?.length||busy)return
  setBusy(true);setError('')
  try{
   for(const file of Array.from(files)){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024)
     throw Error('Envie JPG, PNG ou WebP com até 5 MB.')
    const sb=createClient()
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
    const path='popups/'+crypto.randomUUID()+'.'+ext
    const {error:uploadError}=await sb.storage.from('public-assets').upload(path,file,{
     contentType:file.type,upsert:false,cacheControl:'3600'
    })
    if(uploadError)throw Error('Falha no Storage: '+uploadError.message)
    const url=sb.storage.from('public-assets').getPublicUrl(path).data.publicUrl
    const result=await createDashboardPopup(url)
    if(!result.ok){
     await sb.storage.from('public-assets').remove([path])
     throw Error(result.error)
    }
    setPopups(rows=>[result.popup,...rows])
   }
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar o popup.')}
  finally{setBusy(false)}
 }
 async function toggle(id:string,current:boolean){
  setBusy(true);setError('')
  try{const result=await toggleDashboardPopup(id,!current)
   if(!result.ok)throw Error(result.error)
   setPopups(rows=>rows.map(p=>p.id===id?{...p,is_active:result.is_active}:p))
  }catch(e){setError(e instanceof Error?e.message:'Falha ao atualizar.')}
  finally{setBusy(false)}
 }
 async function remove(id:string){
  if(!window.confirm('Excluir este popup permanentemente?'))return
  setBusy(true);setError('')
  try{const result=await deleteDashboardPopup(id)
   if(!result.ok)throw Error(result.error)
   setPopups(rows=>rows.filter(p=>p.id!==id))
  }catch(e){setError(e instanceof Error?e.message:'Falha ao excluir.')}
  finally{setBusy(false)}
 }
 return <main className="sa-content sa-popup-admin">
  <div className="sa-module-description"><p>Envie imagens para o painel do artista. Popups ativados aparecem ao abrir o Dashboard (a imagem mais recente tem prioridade).</p></div>
  <section className="sa-mod-panel">
   <label className="sa-popup-upload"><Plus size={18}/> {busy?'Enviando…':'Adicionar popup (JPG, PNG ou WebP)'}
    <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files);e.target.value=''}}/>
   </label>
   {error&&<p role="alert" className="sa-popup-error">{error}</p>}
   {!popups.length&&<p className="sa-popup-empty">Nenhum popup cadastrado.</p>}
   <div className="sa-popup-grid">{popups.map(p=><article key={p.id} className="sa-popup-card">
    <div className="sa-popup-photo"><Image src={p.image_url} alt="Imagem do popup" fill sizes="(max-width:700px) 90vw, 330px" unoptimized style={{objectFit:'contain'}}/></div>
    <div className="sa-popup-card-actions">
     <label className="sa-popup-toggle"><input type="checkbox" checked={p.is_active} disabled={busy} onChange={()=>void toggle(p.id,p.is_active)}/>
      <Power size={16}/><span>{p.is_active?'Ativado':'Desativado'}</span></label>
     <button type="button" disabled={busy} onClick={()=>void remove(p.id)} className="sa-popup-delete"><Trash2 size={16}/> Excluir</button>
    </div>
    <small>Cadastrado em {new Date(p.created_at).toLocaleDateString('pt-BR')}</small>
   </article>)}</div>
  </section>
 </main>
}
