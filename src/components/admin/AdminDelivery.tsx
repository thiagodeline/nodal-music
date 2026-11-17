'use client'
import {useState} from 'react'
import {adminSetDeliveryStatusBulk} from '@/app/admin/operations-actions'
import {adminSetDeliveryStatus} from '@/app/admin/operations-actions'
import type {AdminRelease} from './AdminPanel'
import SpotifyBadge from './SpotifyBadge'
const labels:Record<string,string>={awaiting:'Aguardando envio',sent:'Enviado para lojas',live:'Publicado'}
export default function AdminDelivery({releases}:{releases:AdminRelease[]}){
 const [current,setCurrent]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(''),[message,setMessage]=useState('')
 const [checked,setChecked]=useState<string[]>([])
 const [bulkStatus,setBulkStatus]=useState<'awaiting'|'sent'|'live'>('sent')
 const eligible=releases.filter(r=>['approved','live'].includes(r.status))
 const update=async(r:AdminRelease,status:'awaiting'|'sent'|'live')=>{
  setBusy(r.id);setMessage('')
  try{const res=await adminSetDeliveryStatus(r.id,status)
   if(!res.ok)setMessage(res.error)
   else setCurrent(x=>({...x,[r.id]:status}))
  }catch{setMessage('Erro ao salvar status')}
  finally{setBusy('')}
 }
 const saveBulk=async()=>{
  if(!checked.length||busy)return
  const selected=releases.filter(r=>checked.includes(r.id))
  if(!confirm('Atualizar '+selected.length+' lançamentos para '+labels[bulkStatus]+'? Essa atualização registra o status geral na agregadora, não confirma entrega ao Spotify individualmente.'))return
  setBusy('bulk');setMessage('')
  try{
   const res=await adminSetDeliveryStatusBulk(selected.map(r=>r.id),bulkStatus)
   if(!res.ok)throw Error(res.error)
   setCurrent(prev=>({...prev,...Object.fromEntries(selected.map(r=>[r.id,bulkStatus]))}))
   setChecked([]);setMessage(res.updated+' lançamentos atualizados.')
  }catch(e){setMessage(e instanceof Error?e.message:'Falha na atualização em massa')}
  finally{setBusy('')}
 }
 return <section className="sa-mod-panel">
  <h2>Pipeline de distribuição</h2><p className="sa-x-note">Envio manual à iMusics: baixe um pacote ZIP com metadados em HTML, JSON, capa e áudio(s) originais. Os status abaixo são registrados manualmente e não confirmam automaticamente publicação nas plataformas.</p>
  {message&&<p role="status">{message}</p>}
  <div className="sa-bulkbar"><strong>{checked.length} selecionados</strong>
   <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as 'awaiting'|'sent'|'live')} aria-label="Status em massa">{Object.entries(labels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select>
   <button type="button" disabled={!checked.length||!!busy} onClick={()=>void saveBulk()}>Atualizar selecionados</button>
   <small>Seleção apenas de lançamentos aprovados ou publicados</small>
  </div>
  <div className="sa-table-scroll"><table className="sa-mod-table"><thead><tr><th><input type="checkbox" aria-label="Selecionar todos os elegíveis" checked={eligible.length>0&&eligible.every(r=>checked.includes(r.id))} onChange={e=>setChecked(e.target.checked?eligible.map(r=>r.id):[])}/></th><th>Lançamento</th><th>Spotify dos artistas</th><th>UPC</th><th>Status da entrega</th><th>Arquivos e metadados</th></tr></thead><tbody>
  {releases.map(r=><tr key={r.id}><td><input type="checkbox" aria-label={'Selecionar '+r.title} disabled={!['approved','live'].includes(r.status)||!!busy} checked={checked.includes(r.id)} onChange={e=>setChecked(prev=>e.target.checked?[...prev,r.id]:prev.filter(id=>id!==r.id))}/></td><td>{r.title}</td><td>{r.artists.map((a,i)=><SpotifyBadge key={a.profile_id||i} artist={a}/>)}</td><td>{r.upc||'Pendente'}</td><td>
   <select value={current[r.id]||r.delivery_status||'awaiting'} disabled={busy===r.id} onChange={e=>void update(r,e.target.value as 'awaiting'|'sent'|'live')} aria-label={'Status de '+r.title}>
    {Object.entries(labels).map(([key,label])=><option value={key} key={key}>{label}</option>)}
   </select></td><td><a href={"/api/admin/ingestao/"+r.id+"/pacote"} download aria-label={"Baixar pacote de "+r.title} style={{display:"inline-block",padding:"8px 12px",borderRadius:8,background:"#0b4cc2",color:"#fff",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Baixar pacote ZIP</a></td></tr>)}
  </tbody></table></div>
 </section>
}
