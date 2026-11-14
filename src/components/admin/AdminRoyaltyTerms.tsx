'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {adminSetArtistRoyaltyRate} from '@/app/admin/operations-actions'
import type {AdminUser} from './AdminPanel'
export default function AdminRoyaltyTerms({users}:{users:AdminUser[]}){
 const sb=useMemo(()=>createClient(),[])
 const [rates,setRates]=useState<Record<string,number>>({}),[draft,setDraft]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(''),[message,setMessage]=useState('')
 const load=useCallback(async()=>{
  const {data,error}=await sb.from('artist_royalty_terms').select('artist_id,artist_percent')
  if(error){setMessage(error.message);return}
  setRates(Object.fromEntries((data||[]).map(r=>[r.artist_id,Number(r.artist_percent)])))
 },[sb])
 useEffect(()=>{void load()},[load])
 const save=async(id:string)=>{
  setBusy(id);setMessage('')
  try{
   const percent=Number((draft[id]??String(rates[id]??100)).replace(',','.'))
   const res=await adminSetArtistRoyaltyRate(id,percent)
   if(!res.ok)setMessage(res.error)
   else{setMessage('Condição salva.');await load()}
  }catch{setMessage('Falha ao salvar comissão')}
  finally{setBusy('')}
 }
 return <section className="sa-mod-panel"><h2>Comissões por artista</h2>
  <p className="sa-x-note">Defina a participação do artista na receita líquida contratual. A diferença é a comissão da SINTONE. A importação atual já exige valores líquidos do artista e NÃO aplica esta taxa automaticamente; não desconte duas vezes.</p>
  {message&&<p role="status">{message}</p>}
  <div className="sa-table-scroll"><table className="sa-mod-table"><thead><tr><th>Artista / conta</th><th>Participação artista</th><th>Comissão SINTONE</th><th>Ação</th></tr></thead>
  <tbody>{users.filter(u=>u.role==='artist').map(u=>{const pct=Number((draft[u.id]??String(rates[u.id]??100)).replace(',','.'));return <tr key={u.id}><td>{u.artist_name||u.name||u.email}</td>
   <td><input type="number" min={0} max={100} step=".01" value={draft[u.id]??String(rates[u.id]??100)} onChange={e=>setDraft(p=>({...p,[u.id]:e.target.value}))}/> %</td>
   <td>{Number.isFinite(pct)?Math.max(0,100-pct).toFixed(2)+'%':'—'}</td><td><button disabled={busy===u.id} onClick={()=>void save(u.id)}>Salvar</button></td></tr>})}</tbody></table></div>
 </section>
}
