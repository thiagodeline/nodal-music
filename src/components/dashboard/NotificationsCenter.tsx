'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {Bell,CheckCheck,CheckCircle2,XCircle,Handshake,Megaphone,Info,AlertTriangle,AlertCircle} from 'lucide-react'
import {useNotifications,type UnifiedNotification,type NotificationKind} from './useNotifications'

type Invite={id:string;release_id:string;percentage:number;status:string;created_at:string}
type FeedItem={key:string;date:string;notice?:UnifiedNotification;invite?:Invite;kind:NotificationKind}

const kindLabels:Record<NotificationKind,string>={
 info:'Informação',success:'Conquista / Sucesso',warning:'Aviso / Ajuste',action:'Ação requerida',
 release_approved:'Lançamento Aprovado',release_rejected:'Lançamento Rejeitado',
 split_invite:'Convite de Divisão de Royalties',system:'Comunicado da Equipe'
}
const kindIcons={info:Info,success:CheckCircle2,warning:AlertTriangle,action:AlertCircle,
 release_approved:CheckCircle2,release_rejected:XCircle,split_invite:Handshake,system:Megaphone}
const colorClass:Record<NotificationKind,string>={
 info:'system',success:'release_approved',warning:'release_rejected',action:'release_rejected',
 release_approved:'release_approved',release_rejected:'release_rejected',split_invite:'split_invite',system:'system'
}
const routes=new Set(['overview','catalog','drafts','new','profiles','analytics','split','financial','account','plans','support','notifications','contracts','privacy'])
function validLink(raw:string|null){
 if(raw==='/dashboard')return raw
 if(raw?.startsWith('/dashboard#')&&routes.has(raw.slice('/dashboard#'.length)))return raw
 return null
}
export default function NotificationsCenter(){
 const sb=useMemo(()=>createClient(),[])
 const {notifications,unreadCount,loading,error,markAsRead,fetchNotifications}=useNotifications()
 const [invites,setInvites]=useState<Invite[]>([])
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState<string|null>(null)
 const [invitesLoading,setInvitesLoading]=useState(true)

 const loadInvites=useCallback(async()=>{
  const {data:{user}}=await sb.auth.getUser()
  if(!user){setInvitesLoading(false);return}
  const {data,error}=await sb.from('royalty_splits')
   .select('id,release_id,percentage,status,created_at')
   .eq('collaborator_user_id',user.id).order('created_at',{ascending:false}).limit(100)
  setInvitesLoading(false)
  if(error){setMessage('Não foi possível carregar os convites.');return}
  setInvites((data||[]) as Invite[])
 },[sb])
 useEffect(()=>{void loadInvites();void fetchNotifications()},[loadInvites,fetchNotifications])

 const feed=useMemo(()=>{
  const used=new Set<string>()
  const items:FeedItem[]=notifications.map(n=>{
   const invite=n.source==='legacy'&&n.type==='split_invite'?
    invites.filter(i=>!used.has(i.id))
     .sort((a,b)=>Math.abs(Date.parse(a.created_at)-Date.parse(n.created_at))-Math.abs(Date.parse(b.created_at)-Date.parse(n.created_at)))[0]
    :undefined
   const matched=invite&&Math.abs(Date.parse(invite.created_at)-Date.parse(n.created_at))<60000?invite:undefined
   if(matched)used.add(matched.id)
   return {key:n.source+'-'+n.id,date:n.created_at,notice:n,invite:matched,kind:n.type}
  })
  for(const i of invites)if(!used.has(i.id))items.push({key:'i-'+i.id,date:i.created_at,invite:i,kind:'split_invite'})
  return items.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))
 },[notifications,invites])

 async function mark(n:UnifiedNotification){
  setBusy(n.source+n.id)
  const ok=await markAsRead(n)
  if(!ok)setMessage('Não foi possível marcar como lida.')
  else setMessage('')
  setBusy(null)
 }
 async function answer(id:string,accept:boolean,notice?:UnifiedNotification){
  setBusy(id)
  const {error}=await sb.rpc('answer_royalty_split_invite',{p_id:id,p_accept:accept})
  if(!error&&notice)await markAsRead(notice)
  setBusy(null)
  if(error)setMessage(error.message)
  else{
   setMessage(accept?'Convite aceito.':'Convite recusado.')
   await Promise.all([loadInvites(),fetchNotifications()])
  }
 }

 return <section className="card nd-notice-feed">
  <div className="nd-notice-feed-head"><div><h2><Bell size={22}/> Notificações</h2><p className="mut">Acompanhe notificações diretas, avisos e convites da sua conta.</p></div>
   <span className="nd-notice-counter">{unreadCount} não lidas</span>
  </div>
  {(message||error)&&<p role="status" className="nd-notice-message">{message||error}</p>}
  {loading||invitesLoading?<p className="mut">Carregando notificações…</p>:
   !feed.length?<div className="nd-notice-empty"><Bell size={24}/><h3>Nenhuma notificação</h3><p className="mut">Seus avisos vão aparecer aqui.</p></div>:
   <div className="nd-notice-list">{feed.map(item=>{
    const Icon=kindIcons[item.kind],n=item.notice,i=item.invite
    const cls=colorClass[item.kind]
    const href=n?validLink(n.action_url):null
    return <article key={item.key} className={'nd-notice-row '+(n&&!n.read?'unread':'')}>
     <span className={'nd-notice-icon nd-notice-icon-'+cls}><Icon size={18}/></span>
     <div className="nd-notice-body">
      <div className="nd-notice-top"><span className={'nd-notice-type nd-notice-type-'+cls}>{kindLabels[item.kind]}</span>
       <time dateTime={item.date}>{new Date(item.date).toLocaleString('pt-BR')}</time></div>
      <strong>{n?.title||'Você recebeu uma divisão de royalties'}</strong>
      <p style={{whiteSpace:'pre-wrap'}}>{n?.message||(i?'Convite para receber '+Number(i.percentage).toLocaleString('pt-BR')+'% dos royalties.':'')}</p>
      {i&&<p className="nd-notice-split">Percentual: <strong>{Number(i.percentage).toLocaleString('pt-BR')}%</strong> · Status: {i.status==='accepted'?'Aceito':i.status==='rejected'?'Recusado':'Pendente'}. O aceite não realiza um pagamento automático.</p>}
      <div className="nd-notice-inline-actions">
       {i?.status==='pending'&&<>
        <button type="button" className="nd-notice-accept" disabled={busy!==null} onClick={()=>void answer(i.id,true,n)}><CheckCircle2 size={15}/> Aceitar</button>
        <button type="button" className="nd-notice-decline" disabled={busy!==null} onClick={()=>void answer(i.id,false,n)}><XCircle size={15}/> Recusar</button>
       </>}
       {href&&<a href={href} onClick={()=>{if(n&&!n.read)void markAsRead(n)}}>Ver detalhes</a>}
       {n&&!n.read&&<button type="button" disabled={busy!==null} onClick={()=>void mark(n)}><CheckCheck size={15}/> Marcar como lida</button>}
      </div>
     </div>
    </article>
   })}</div>}
 </section>
}
