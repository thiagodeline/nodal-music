'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {Bell,CheckCheck,CheckCircle2,XCircle,Handshake,Megaphone} from 'lucide-react'

type Notice={
 id:string;title:string;message:string;type:'release_approved'|'release_rejected'|'split_invite'|'system';
 read:boolean;link_url:string|null;created_at:string
}
type Invite={id:string;release_id:string;percentage:number;status:string;created_at:string}
type FeedItem={key:string;date:string;notice?:Notice;invite?:Invite;kind:Notice['type']}

const kindLabels:Record<Notice['type'],string>={
 release_approved:'Lançamento Aprovado',
 release_rejected:'Lançamento Rejeitado',
 split_invite:'Convite de Divisão de Royalties',
 system:'Comunicado da Equipe'
}
const kindIcons={release_approved:CheckCircle2,release_rejected:XCircle,split_invite:Handshake,system:Megaphone}

export default function NotificationsCenter(){
 const sb=useMemo(()=>createClient(),[])
 const [notices,setNotices]=useState<Notice[]>([])
 const [invites,setInvites]=useState<Invite[]>([])
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState<string|null>(null)
 const [loading,setLoading]=useState(true)

 const load=useCallback(async()=>{
  const {data:{user}}=await sb.auth.getUser()
  if(!user){setLoading(false);return}
  const [a,b]=await Promise.all([
   sb.from('notifications').select('id,title,message,type,read,link_url,created_at')
    .eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
   sb.from('royalty_splits').select('id,release_id,percentage,status,created_at')
    .eq('collaborator_user_id',user.id).order('created_at',{ascending:false}).limit(100)
  ])
  setLoading(false)
  if(a.error||b.error){setMessage('Não foi possível carregar os avisos.');return}
  setNotices((a.data||[]) as Notice[])
  setInvites((b.data||[]) as Invite[])
 },[sb])

 useEffect(()=>{void load()},[load])

 const feed=useMemo(()=>{
  const used=new Set<string>()
  const items:FeedItem[]=notices.map(n=>{
   const invite=n.type==='split_invite'?
    invites.filter(i=>!used.has(i.id))
     .sort((a,b)=>Math.abs(Date.parse(a.created_at)-Date.parse(n.created_at))-Math.abs(Date.parse(b.created_at)-Date.parse(n.created_at)))[0]
    :undefined
   // Correspondência temporal: cada convite gera seu aviso durante a mesma transação.
   const matched=invite&&Math.abs(Date.parse(invite.created_at)-Date.parse(n.created_at))<60000?invite:undefined
   if(matched)used.add(matched.id)
   return {key:'n-'+n.id,date:n.created_at,notice:n,invite:matched,kind:n.type}
  })
  for(const i of invites){
   if(!used.has(i.id))items.push({key:'i-'+i.id,date:i.created_at,invite:i,kind:'split_invite'})
  }
  return items.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))
 },[notices,invites])

 async function mark(id:string){
  setBusy(id)
  const {error}=await sb.rpc('mark_sintone_notification_read',{p_id:id})
  setBusy(null)
  if(error)setMessage(error.message)
  else setNotices(prev=>prev.map(n=>n.id===id?{...n,read:true}:n))
 }
 async function answer(id:string,accept:boolean,noticeId?:string){
  setBusy(id)
  const {error}=await sb.rpc('answer_royalty_split_invite',{p_id:id,p_accept:accept})
  if(!error&&noticeId)await sb.rpc('mark_sintone_notification_read',{p_id:noticeId})
  setBusy(null)
  if(error)setMessage(error.message)
  else{setMessage(accept?'Convite aceito.':'Convite recusado.');await load()}
 }

 return <section className="card nd-notice-feed">
  <div className="nd-notice-feed-head"><div><h2><Bell size={22}/> Notificações</h2><p className="mut">Acompanhe avisos, comunicados e convites da sua conta.</p></div>
   <span className="nd-notice-counter">{notices.filter(n=>!n.read).length} não lidas</span>
  </div>
  {message&&<p role="status" className="nd-notice-message">{message}</p>}
  {loading?<p className="mut">Carregando notificações…</p>:
   !feed.length?<div className="nd-notice-empty"><Bell size={24}/><h3>Nenhuma notificação</h3><p className="mut">Seus avisos vão aparecer aqui.</p></div>:
   <div className="nd-notice-list">{feed.map(item=>{
    const Icon=kindIcons[item.kind]
    const n=item.notice,i=item.invite
    return <article key={item.key} className={'nd-notice-row '+(n&&!n.read?'unread':'')}>
     <span className={'nd-notice-icon nd-notice-icon-'+item.kind}><Icon size={18}/></span>
     <div className="nd-notice-body">
      <div className="nd-notice-top"><span className={'nd-notice-type nd-notice-type-'+item.kind}>{kindLabels[item.kind]}</span>
       <time dateTime={item.date}>{new Date(item.date).toLocaleString('pt-BR')}</time></div>
      <strong>{n?.title||'Você recebeu uma divisão de royalties'}</strong>
      <p>{n?.message||(i?'Convite para receber '+Number(i.percentage).toLocaleString('pt-BR')+'% dos royalties.':'')}</p>
      {i&&<p className="nd-notice-split">Percentual: <strong>{Number(i.percentage).toLocaleString('pt-BR')}%</strong> · Status: {i.status==='accepted'?'Aceito':i.status==='rejected'?'Recusado':'Pendente'}. O aceite não realiza um pagamento automático.</p>}
      <div className="nd-notice-inline-actions">
       {i?.status==='pending'&&<>
        <button type="button" className="nd-notice-accept" disabled={busy!==null} onClick={()=>void answer(i.id,true,n?.id)}><CheckCircle2 size={15}/> Aceitar</button>
        <button type="button" className="nd-notice-decline" disabled={busy!==null} onClick={()=>void answer(i.id,false,n?.id)}><XCircle size={15}/> Recusar</button>
       </>}
       {n?.link_url?.startsWith('/dashboard#')&&<a href={n.link_url}>Ver detalhes</a>}
       {n&&!n.read&&<button type="button" disabled={busy!==null} onClick={()=>void mark(n.id)}><CheckCheck size={15}/> Marcar como lida</button>}
      </div>
     </div>
    </article>
   })}</div>}
 </section>
}
