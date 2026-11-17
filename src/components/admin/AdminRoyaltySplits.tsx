'use client'
import {useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {ShieldAlert} from 'lucide-react'
type Split={id:string;release_id:string;creator_user_id:string;collaborator_email:string;percentage:number;status:string;created_at:string}
export default function AdminRoyaltySplits(){
 const sb=useMemo(()=>createClient(),[]),[rows,setRows]=useState<Split[]>([])
 const [emails,setEmails]=useState<Record<string,string>>({}),[msg,setMsg]=useState(''),[busy,setBusy]=useState('')
 const load=async()=>{
  const {data,error}=await sb.from('royalty_splits').select('id,release_id,creator_user_id,collaborator_email,percentage,status,created_at').order('created_at',{ascending:false}).limit(500)
  if(error){setMsg(error.message);return}
  setRows(data||[])
  const ids=[...new Set((data||[]).map(x=>x.creator_user_id))]
  if(ids.length){const {data:users}=await sb.from('profiles').select('id,email').in('id',ids)
   setEmails(Object.fromEntries((users||[]).map(x=>[x.id,x.email||x.id])))}
 }
 useEffect(()=>{void load()},[sb])
 const cancel=async(id:string)=>{
  const reason=window.prompt('Justificativa para cancelar o split (mínimo 10 caracteres):')
  if(!reason)return
  if(reason.trim().length<10){setMsg('Justificativa muito curta.');return}
  setBusy(id)
  const {error}=await sb.rpc('admin_cancel_royalty_split',{p_id:id,p_reason:reason.trim()})
  setBusy('');setMsg(error?error.message:'Divisão cancelada e registrada para auditoria.')
  if(!error)await load()
 }
 return <section className="sa-mod-panel">
  <h3 className="sa-module-minor-title"><ShieldAlert size={18}/> Auditoria de divisões</h3>
  <p className="sa-x-note">Convites e aceites ainda não alteram automaticamente os repasses financeiros. Cancelamentos ficam registrados na auditoria.</p>
  {msg&&<p role="status">{msg}</p>}
  <div className="sa-table-scroll"><table className="sa-table">
   <thead><tr><th>Lançamento</th><th>Criador</th><th>Colaborador</th><th>Percentual</th><th>Situação</th><th>Ação</th></tr></thead>
   <tbody>{rows.map(s=><tr key={s.id}>
    <td>{s.release_id.slice(0,8)}</td><td>{emails[s.creator_user_id]||s.creator_user_id}</td>
    <td>{s.collaborator_email}</td><td>{s.percentage}%</td>
    <td>{s.status==='pending'?'Pendente':s.status==='accepted'?'Aceito':'Rejeitado'}</td>
    <td>{s.status!=='rejected'&&<button className="sa-action-pill reject" disabled={busy===s.id} onClick={()=>void cancel(s.id)}>Cancelar divisão</button>}</td>
   </tr>)}</tbody>
  </table></div>
 </section>
}
