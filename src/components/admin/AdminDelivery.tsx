'use client'
import {useState} from 'react'
import {adminSetDeliveryStatus} from '@/app/admin/operations-actions'
import type {AdminRelease} from './AdminPanel'
const labels:Record<string,string>={awaiting:'Aguardando envio',sent:'Enviado para lojas',live:'Publicado'}
export default function AdminDelivery({releases}:{releases:AdminRelease[]}){
 const [current,setCurrent]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(''),[message,setMessage]=useState('')
 const update=async(r:AdminRelease,status:'awaiting'|'sent'|'live')=>{
  setBusy(r.id);setMessage('')
  try{const res=await adminSetDeliveryStatus(r.id,status)
   if(!res.ok)setMessage(res.error)
   else setCurrent(x=>({...x,[r.id]:status}))
  }catch{setMessage('Erro ao salvar status')}
  finally{setBusy('')}
 }
 const exportJson=(r:AdminRelease)=>{
  const payload={format:'SINTONE_INTERNAL_RELEASE_JSON',note:'Exportação interna de metadados. NÃO é pacote DDEX ERN validado.',
   release:{title:r.title,type:r.type,upc:r.upc,mainArtist:r.main_artist,releaseDate:r.release_date,
    label:r.label_name,pLine:r.p_line,cLine:r.c_line,platforms:r.platforms},
   tracks:r.tracks.map(t=>({title:t.title,isrc:t.isrc,position:t.position,composers:t.composers,producers:t.producers,language:t.language}))}
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}))
  const a=document.createElement('a');a.href=url;a.download='sintone-release-'+r.id+'.json';a.click()
  URL.revokeObjectURL(url)
 }
 return <section className="sa-mod-panel">
  <h2>Pipeline de distribuição</h2><p className="sa-x-note">Acompanhamento manual do envio à agregadora. Os estados aqui não confirmam automaticamente publicação nas DSPs. Exportação JSON de metadados para conferência; DDEX XML requer conversor e validação de perfil ERN.</p>
  {message&&<p role="status">{message}</p>}
  <div className="sa-table-scroll"><table className="sa-mod-table"><thead><tr><th>Lançamento</th><th>UPC</th><th>Status da entrega</th><th>Metadados</th></tr></thead><tbody>
  {releases.map(r=><tr key={r.id}><td>{r.title}</td><td>{r.upc||'Pendente'}</td><td>
   <select value={current[r.id]||r.delivery_status||'awaiting'} disabled={busy===r.id} onChange={e=>void update(r,e.target.value as 'awaiting'|'sent'|'live')} aria-label={'Status de '+r.title}>
    {Object.entries(labels).map(([key,label])=><option value={key} key={key}>{label}</option>)}
   </select></td><td><button type="button" onClick={()=>exportJson(r)}>Exportar JSON</button></td></tr>)}
  </tbody></table></div>
 </section>
}
