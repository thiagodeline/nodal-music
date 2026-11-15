'use client'
import {useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {Bell,CheckCheck} from 'lucide-react'
type Notice={id:string;title:string;message:string;type:string;read:boolean;link_url:string|null;created_at:string}
type Invite={id:string;release_id:string;percentage:number;status:string;creator_user_id:string;collaborator_email:string}
export default function NotificationsCenter(){
 const sb=useMemo(()=>createClient(),[])
 const [rows,setRows]=useState<Notice[]>([]),[invites,setInvites]=useState<Invite[]>([])
 const [message,setMessage]=useState(''),[busy,setBusy]=useState('')
 const load=async()=>{
  const {data:{user}}=await sb.auth.getUser()
  if(!user)return
  const [n,s]=await Promise.all([
   sb.from('notifications').select('id,title,message,type,read,link_url,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
   sb.from('royalty_splits').select('id,release_id,percentage,status,creator_user_id,collaborator_email').eq('collaborator_user_id',user.id).order('created_at',{ascending:false}).limit(100)
  ])
  if(n.error||s.error){setMessage('Não foi possível carregar avisos e convites.');return}
  setRows(n.data||[]);setInvites(s.data||[])
 }
 useEffect(()=>{void load()},[sb])
 const mark=async(id:string)=>{
  const {error}=await sb.rpc('mark_sintone_notification_read',{p_id:id})
  if(error)setMessage(error.message);else await load()
 }
 const answer=async(id:string,accept:boolean)=>{
  setBusy(id)
  const {error}=await sb.rpc('answer_royalty_split_invite',{p_id:id,p_accept:accept})
  setBusy('');if(error)setMessage(error.message);else {setMessage(accept?'Convite aceito.':'Convite recusado.');await load()}
 }
 return <section className="nd-notice-center">
  <div className="card"><div className="row-h"><h3><Bell size={19}/> Notificações</h3><small>{rows.filter(n=>!n.read).length} não lidas</small></div>
   {message&&<p role="status" className="mut">{message}</p>}
   {rows.length?rows.map(n=><article className={'nd-notice '+(!n.read?'unread':'')} key={n.id}>
    <div><strong>{n.title}</strong><small>{new Date(n.created_at).toLocaleString('pt-BR')}</small></div>
    <p>{n.message}</p><div className="nd-notice-actions">
    {n.link_url&&n.link_url.startsWith('/dashboard')&&<a href={n.link_url}>Ver detalhes</a>}
    {!n.read&&<button type="button" onClick={()=>void mark(n.id)}><CheckCheck size={14}/> Marcar como lida</button>}
    </div></article>):<p className="mut">Nenhuma notificação por enquanto.</p>}
  </div>
  <div className="card"><h3>Convites de royalties recebidos</h3>
   {invites.length?invites.map(i=><article className="nd-notice" key={i.id}>
    <strong>{i.percentage}% · Lançamento {i.release_id.slice(0,8)}</strong>
    <p className="mut">Verifique o acordo com o responsável pelo lançamento. O aceite não realiza pagamento automático.</p>
    <small>Situação: {i.status==='pending'?'Pendente':i.status==='accepted'?'Aceito':'Recusado'}</small>
    {i.status==='pending'&&<div className="nd-notice-actions">
     <button disabled={busy===i.id} onClick={()=>void answer(i.id,true)}>Aceitar</button>
     <button disabled={busy===i.id} onClick={()=>void answer(i.id,false)}>Rejeitar</button>
    </div>}
   </article>):<p className="mut">Nenhum convite recebido.</p>}
  </div>
 </section>
}
