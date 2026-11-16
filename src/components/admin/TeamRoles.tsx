'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import type {StaffRole} from '@/lib/admin-access'
import './team-roles.css'
import {ShieldCheck,Users,Save} from 'lucide-react'

const labels:Record<StaffRole,string>={
 admin:'Administrador Geral',qc_specialist:'Controle de Qualidade',
 ingestion_manager:'Ingestão e DSPs',customer_success:'Suporte / CS',
 a_and_r:'A&R / Selos',royalty_financial:'Financeiro / Royalties'
}
type Row={id:string;email:string;role:StaffRole;user_id:string}
export default function TeamRoles(){
 const sb=useMemo(()=>createClient(),[])
 const [email,setEmail]=useState(''),[selected,setSelected]=useState<StaffRole[]>([])
 const [rows,setRows]=useState<Row[]>([])
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const load=useCallback(async()=>{
  const {data,error}=await sb.from('admin_user_roles').select('id,user_id,email,role').order('created_at',{ascending:false})
  if(error)setMessage(error.message);else setRows((data||[]) as Row[])
 },[sb])
 useEffect(()=>{void load()},[load])
 const toggle=(role:StaffRole)=>setSelected(s=>s.includes(role)?s.filter(x=>x!==role):[...s,role])
 const chooseEmail=(mail:string)=>{setEmail(mail);setSelected(rows.filter(x=>x.email.toLowerCase()===mail.toLowerCase()).map(x=>x.role))}
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return
  if(!confirm('Confirmar os cargos de '+email+'? A seleção substituirá todos os cargos previamente atribuídos.'))return
  setBusy(true);setMessage('')
  const {error}=await sb.rpc('manage_sintone_team_roles',{p_email:email.trim().toLowerCase(),p_roles:selected})
  setBusy(false)
  setMessage(error?error.message:'Cargos atualizados. As permissões passam a valer na próxima navegação.')
  if(!error){setSelected([]);setEmail('');await load()}
 }
 return <section className="sa-mod-panel">
  <h1><Users size={23}/> Equipe & Cargos</h1>
  <p className="sa-x-note">Somente o administrador geral pode atribuir ou revogar cargos. Vários cargos podem ser atribuídos à mesma conta.</p>
  <form className="sa-x-edit" onSubmit={e=>void submit(e)}>
   <label>E-mail da conta cadastrada<input type="email" required maxLength={254} value={email}
    onChange={e=>setEmail(e.target.value)} placeholder="colaborador@exemplo.com"/></label>
   <div className="sa-team-grid">
    {(Object.keys(labels) as StaffRole[]).map(role=><label key={role} className="sa-team-option">
     <input type="checkbox" checked={selected.includes(role)} onChange={()=>toggle(role)}/><span>{labels[role]}</span>
    </label>)}
   </div>
   <p className="sa-x-note">Para revogar todos os cargos, deixe todas as opções desmarcadas.</p>
   <button className="sa-approve" type="submit" disabled={busy}><Save size={15}/> {busy?'Salvando...':'Salvar cargos'}</button>
  </form>
  {message&&<p role="status">{message}</p>}
  <h3>Atribuições atuais</h3>
  <div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>E-mail</th><th>Cargo</th><th>Ação</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.id}><td>{r.email}</td><td>{labels[r.role]||r.role}</td>
    <td><button className="sa-action-pill" type="button" onClick={()=>chooseEmail(r.email)}><ShieldCheck size={14}/> Editar cargos</button></td></tr>)}</tbody>
  </table></div>
 </section>
}
