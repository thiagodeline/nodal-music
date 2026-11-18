'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {Bell,Check,CheckCheck,X,Info,CheckCircle2,AlertTriangle,AlertCircle,ArrowRight} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import './direct-notifications.css'

export type DirectNotification={
 id:string;title:string;message:string;type:'info'|'success'|'warning'|'action';
 action_url:string|null;read:boolean;created_at:string;artist_profile_id:string|null
}
type Kind=DirectNotification['type']
const labels:Record<Kind,string>={
 info:'Informação',success:'Conquista / Sucesso',warning:'Aviso / Ajuste',action:'Ação requerida'
}
const icons={info:Info,success:CheckCircle2,warning:AlertTriangle,action:AlertCircle}
function validHref(url:string|null){
 if(url==='/dashboard')return url
 if(url?.startsWith('/dashboard#')&&/^[a-z-]+$/.test(url.slice(11)))return url
 return null
}
export default function DirectNotificationsBell({userId,onUnreadChange}:{userId:string;onUnreadChange?:(count:number)=>void}){
 const [open,setOpen]=useState(false),[items,setItems]=useState<DirectNotification[]>([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState('')
 const load=useCallback(async()=>{
  const sb=createClient()
  const {data,error}=await sb.from('artist_notifications')
   .select('id,title,message,type,action_url,read,created_at,artist_profile_id')
   .eq('user_id',userId).order('created_at',{ascending:false}).limit(100)
  if(error){setError('Não foi possível carregar as notificações.');setLoading(false);return}
  setItems((data||[]) as DirectNotification[])
  setError('');setLoading(false)
 },[userId])
 useEffect(()=>{
  void load()
  const onFocus=()=>{void load()}
  window.addEventListener('focus',onFocus)
  const interval=window.setInterval(()=>{void load()},45000)
  return ()=>{window.removeEventListener('focus',onFocus);window.clearInterval(interval)}
 },[load])
 const unread=items.filter(item=>!item.read).length
 useEffect(()=>{onUnreadChange?.(unread)},[unread,onUnreadChange])
 useEffect(()=>{
  if(!open)return
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)}
  document.addEventListener('keydown',onKey)
  const prior=document.body.style.overflow
  document.body.style.overflow='hidden'
  return ()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=prior}
 },[open])
 async function mark(item:DirectNotification){
  if(item.read||busy)return
  setBusy(item.id)
  const sb=createClient()
  const {error}=await sb.rpc('mark_artist_direct_notification_read',{p_id:item.id})
  if(error)setError('Não foi possível marcar como lida.')
  else{setItems(old=>old.map(n=>n.id===item.id?{...n,read:true}:n));setError('')}
  setBusy(null)
 }
 return <>
  <button className="nd-direct-trigger" type="button" aria-label={'Notificações diretas: '+unread+' não lidas'}
   aria-expanded={open} aria-controls="nd-direct-drawer" onClick={()=>setOpen(true)}>
   <Bell size={21}/>{unread>0&&<span className="nd-direct-unread">{unread>99?'99+':unread}</span>}
  </button>
  {open&&<div className="nd-direct-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <aside className="nd-direct-drawer" id="nd-direct-drawer" role="dialog" aria-modal="true" aria-label="Notificações diretas">
    <header className="nd-direct-head"><div><span>COMUNICADOS EXCLUSIVOS</span><h2>NOTIFICAÇÕES <small>{unread} NÃO LIDAS</small></h2></div>
     <button type="button" onClick={()=>setOpen(false)} aria-label="Fechar notificações"><X size={21}/></button></header>
    <div className="nd-direct-body">
     {error&&<p className="nd-direct-error" role="alert">{error}</p>}
     {loading?<p className="nd-direct-empty">Carregando notificações…</p>:
      !items.length?<div className="nd-direct-empty"><Bell size={31}/><strong>Você está em dia!</strong><p>Novas mensagens exclusivas da equipe SINTONE aparecerão aqui.</p></div>:
      items.map(item=>{const Icon=icons[item.type];const href=validHref(item.action_url)
       return <article key={item.id} className={'nd-direct-item '+item.type+(item.read?' read':'')}>
        <div className="nd-direct-icon"><Icon size={20}/></div>
        <div className="nd-direct-content"><div className="nd-direct-item-top"><span>{labels[item.type]}</span>
         {!item.read&&<span className="nd-direct-dot" aria-label="Não lida"/>}</div>
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
