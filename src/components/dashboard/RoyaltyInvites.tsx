'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {Plus,Send} from 'lucide-react'
import type {Data} from './ui'
type Split={id:string;release_id:string;track_id:string|null;collaborator_email:string;percentage:number;status:string}
export default function RoyaltyInvites({d}:{d:Data}){
 const [rid,setRid]=useState(d.releases[0]?.id||''),[trackId,setTrackId]=useState(''),[email,setEmail]=useState(''),[percent,setPercent]=useState('')
 const [rows,setRows]=useState<Split[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const sb=createClient()
 const load=async()=>{
  if(!rid){setRows([]);return}
  const {data,error}=await sb.from('royalty_splits').select('id,release_id,track_id,collaborator_email,percentage,status')
   .eq('release_id',rid).eq('creator_user_id',d.me.id).order('created_at',{ascending:false})
  if(error)setMessage(error.message);else setRows(data||[])
 }
 useEffect(()=>{void load()},[rid])
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();setMessage('')
  if(!rid)return
  setBusy(true)
  const {error}=await sb.rpc('create_royalty_split_invite',{p_release_id:rid,p_track_id:trackId||null,
   p_email:email.trim().toLowerCase(),p_percentage:Number(percent)})
  setBusy(false)
  if(error)setMessage(error.message)
  else{setMessage('Convite registrado. Se o e-mail tiver conta na SINTONE, o aviso aparece nas notificações.');setEmail('');setPercent('');await load()}
 }
 const relevant=rows.filter(x=>(x.track_id||'')===trackId)
 const total=relevant.filter(x=>x.status!=='rejected').reduce((n,x)=>n+Number(x.percentage),0)
 const tracks=d.releases.find(r=>r.id===rid)?.tracks||[]
 return <section className="card nd-splits">
  <h3>Divisões de royalties</h3><p className="mut">Convide colaboradores para dividir os royalties. O aceite não efetua repasse automático.</p>
  {!d.releases.length?<p className="mut">Crie um lançamento para iniciar uma divisão.</p>:<>
   <label>Lançamento<select value={rid} onChange={e=>{setRid(e.target.value);setTrackId('')}}>{d.releases.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
   <label>Aplicar divisão<select value={trackId} onChange={e=>setTrackId(e.target.value)}><option value="">Lançamento completo</option>{tracks.filter(t=>t.id).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
   <p><strong>{total.toFixed(2)}%</strong> destinados a colaboradores · {(100-total).toFixed(2)}% reservados para o titular.</p>
   <form onSubmit={e=>void submit(e)} className="nd-split-form">
    <label>E-mail do colaborador<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Percentual (%)<input type="number" min=".01" max="100" step=".01" required value={percent} onChange={e=>setPercent(e.target.value)}/></label>
    <button type="submit" className="btn" disabled={busy}><Send size={15}/> Enviar convite</button>
   </form>
   {message&&<p role="status">{message}</p>}
   <div className="scroll"><table><thead><tr><th>Colaborador</th><th>Percentual</th><th>Status</th></tr></thead>
    <tbody>{relevant.map(r=><tr key={r.id}><td>{r.collaborator_email}</td><td>{r.percentage}%</td><td>{r.status==='pending'?'Pendente':r.status==='accepted'?'Aceito':'Rejeitado'}</td></tr>)}</tbody></table></div>
  </>}
 </section>
}
