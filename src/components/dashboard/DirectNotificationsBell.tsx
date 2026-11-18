'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {Bell,Check,CheckCheck,X,Trash2,Info,CheckCircle2,AlertTriangle,AlertCircle,ArrowRight,Handshake,Music2,Megaphone} from 'lucide-react'
import {useNotifications,type UnifiedNotification,type NotificationKind} from './useNotifications'
import './direct-notifications.css'
import NotificationBulkActions from './NotificationBulkActions'

const labels:Record<NotificationKind,string>={
 info:'Informação',success:'Conquista / Sucesso',warning:'Aviso / Ajuste',action:'Ação requerida',
 release_approved:'Lançamento aprovado',release_rejected:'Lançamento rejeitado',
 split_invite:'Convite de royalties',system:'Comunicado da equipe'
}
const icons={info:Info,success:CheckCircle2,warning:AlertTriangle,action:AlertCircle,
 release_approved:Music2,release_rejected:AlertTriangle,split_invite:Handshake,system:Megaphone}
const colors:Record<NotificationKind,'info'|'success'|'warning'|'action'>={
 info:'info',success:'success',warning:'warning',action:'action',
 release_approved:'success',release_rejected:'action',split_invite:'info',system:'info'
}
const routes=new Set(['overview','catalog','drafts','new','profiles','analytics','split','financial','account','plans','support','notifications','contracts','privacy'])
function validHref(raw:string|null){
 if(raw==='/dashboard')return raw
 if(raw?.startsWith('/dashboard#')&&routes.has(raw.slice('/dashboard#'.length)))return raw
 return null
}
export default function DirectNotificationsBell(){
 const {notifications,unreadCount,loading,error,fetchNotifications,markAsRead,deleteNotification}=useNotifications()
 const [open,setOpen]=useState(false),[busy,setBusy]=useState<string|null>(null)
 useEffect(()=>{
  if(!open)return
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)}
  document.addEventListener('keydown',onKey)
  const prior=document.body.style.overflow
  document.body.style.overflow='hidden'
  return ()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=prior}
 },[open])
 async function mark(item:UnifiedNotification){
  if(item.read||busy)return
  setBusy(item.source+item.id)
  await markAsRead(item)
  setBusy(null)
 }
 return <>
  <button className="nd-direct-trigger" type="button" aria-label={'Notificações: '+unreadCount+' não lidas'}
   aria-expanded={open} aria-controls="nd-direct-drawer" onClick={()=>{setOpen(true);void fetchNotifications()}}>
   <Bell size={21}/>{unreadCount>0&&<span className="nd-direct-unread">{unreadCount>99?'99+':unreadCount}</span>}
  </button>
  {open&&<div className="nd-direct-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <aside className="nd-direct-drawer" id="nd-direct-drawer" role="dialog" aria-modal="true" aria-label="Notificações">
    <header className="nd-direct-head"><div><span>AVISOS E COMUNICADOS</span><h2>NOTIFICAÇÕES <small>{unreadCount} NÃO LIDAS</small></h2></div>
     <button type="button" onClick={()=>setOpen(false)} aria-label="Fechar notificações"><X size={21}/></button></header>
    <NotificationBulkActions compact/>
    <div className="nd-direct-body">
     {error&&<p className="nd-direct-error" role="alert">{error}</p>}
     {loading?<p className="nd-direct-empty">Carregando notificações…</p>:
      !notifications.length?<div className="nd-direct-empty"><Bell size={31} style={{opacity:.4}}/><strong>Nenhuma notificação</strong><p>Você não possui novas notificações no momento.</p></div>:
      notifications.map(item=>{const Icon=icons[item.type];const href=validHref(item.action_url)
       return <article key={item.source+item.id} className={'nd-direct-item '+colors[item.type]+(item.read?' read':'')}>
        <div className="nd-direct-icon"><Icon size={20}/></div>
        <div className="nd-direct-content"><div className="nd-direct-item-top"><span>{labels[item.type]}</span>
         <div className="nd-notice-card-tools">{!item.read&&<span className="nd-direct-dot" aria-label="Não lida"/>}
          <button className="nd-notice-delete" type="button" aria-label={'Excluir notificação: '+item.title}
           title="Excluir notificação" onClick={()=>void deleteNotification(item)}><Trash2 size={16}/></button>
         </div></div>
         <h3>{item.title}</h3><p>{item.message}</p>
         <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('pt-BR')}</time>
         <div className="nd-direct-actions">{href&&<Link href={href} onClick={()=>{void mark(item);setOpen(false)}}>VER DETALHES <ArrowRight size={15}/></Link>}
          {!item.read&&<button type="button" disabled={busy!==null} onClick={()=>void mark(item)}><Check size={15}/> MARCAR COMO LIDA</button>}
         </div>
        </div>
       </article>})}
    </div>
    <footer className="nd-direct-foot"><Link href="/dashboard#notifications" onClick={()=>setOpen(false)}>VER CENTRAL DE NOTIFICAÇÕES <CheckCheck size={17}/></Link></footer>
   </aside>
  </div>}
 </>
}
