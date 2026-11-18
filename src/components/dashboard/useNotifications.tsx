'use client'
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {CheckCircle2} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'

export type NotificationKind='info'|'success'|'warning'|'action'|'release_approved'|'release_rejected'|'split_invite'|'system'
export type UnifiedNotification={
 id:string;source:'direct'|'legacy';title:string;message:string;type:NotificationKind;
 read:boolean;action_url:string|null;created_at:string;artist_profile_id:string|null
}
type ClearMode='all'|'read'
type NotificationContextValue={
 notifications:UnifiedNotification[];unreadCount:number;loading:boolean;error:string;
 fetchNotifications:()=>Promise<void>;markAsRead:(notice:UnifiedNotification)=>Promise<boolean>;
 deleteNotification:(notice:UnifiedNotification)=>Promise<boolean>;
 clearNotifications:(mode:ClearMode)=>Promise<boolean>;
 deleting:boolean;toast:string
}
const Context=createContext<NotificationContextValue|null>(null)

export function NotificationsProvider({userId,children}:{userId:string|null;children:ReactNode}){
 const sb=useMemo(()=>createClient(),[])
 const [notifications,setNotifications]=useState<UnifiedNotification[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const generation=useRef(0)
 const inFlight=useRef<Set<string>>(new Set())
 // Tombstones prevent Realtime/polling responses from reintroducing optimistic deletions.
 const deletingKeys=useRef(new Set<string>())
 const [deleting,setDeleting]=useState(false)
 const [toast,setToast]=useState('')
 const toastTimeout=useRef<ReturnType<typeof setTimeout>|null>(null)
 const notify=useCallback((text:string)=>{
  setToast(text)
  if(toastTimeout.current)clearTimeout(toastTimeout.current)
  toastTimeout.current=setTimeout(()=>setToast(''),3500)
 },[])
 useEffect(()=>()=>{if(toastTimeout.current)clearTimeout(toastTimeout.current)},[])

 const fetchNotifications=useCallback(async()=>{
  if(!userId){setNotifications([]);setLoading(false);return}
  const request=++generation.current
  const [direct,legacy]=await Promise.all([
   sb.from('artist_notifications').select('id,title,message,type,action_url,read,created_at,artist_profile_id')
    .eq('user_id',userId).is('deleted_at',null).order('created_at',{ascending:false}).limit(100),
   sb.from('notifications').select('id,title,message,type,link_url,read,created_at')
     .eq('user_id',userId).is('deleted_at',null).order('created_at',{ascending:false}).limit(100)
  ])
  if(request!==generation.current)return
  if(direct.error||legacy.error){
   setError('Não foi possível atualizar as notificações.')
   setLoading(false)
   return
  }
  const all:UnifiedNotification[]=[
   ...(direct.data||[]).map(n=>({...n,source:'direct' as const,type:n.type as NotificationKind})),
   ...(legacy.data||[]).map(n=>({id:n.id,title:n.title,message:n.message,
    type:n.type as NotificationKind,source:'legacy' as const,read:n.read,
    action_url:n.link_url as string|null,created_at:n.created_at,artist_profile_id:null}))
  ]
  // Never overwrite optimistic read state during an in-flight mutation.
  setNotifications(all.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))
   .filter(n=>!deletingKeys.current.has(n.source+':'+n.id))
   .map(n=>inFlight.current.has(n.source+':'+n.id)?{...n,read:true}:n))
  setLoading(false);setError('')
 },[sb,userId])

 useEffect(()=>{
  let alive=true
  generation.current++
  setNotifications([]);setLoading(true)
  if(!userId){setLoading(false);return}
  void fetchNotifications()
  const focus=()=>{if(alive)void fetchNotifications()}
  window.addEventListener('focus',focus)
  const poll=window.setInterval(()=>{if(alive&&document.visibilityState==='visible')void fetchNotifications()},30000)
  // Supabase Realtime is an enhancement; polling remains a fallback where publication is disabled.
  const channel=sb.channel('sintone-notifications-'+userId)
   .on('postgres_changes',{event:'*',schema:'public',table:'artist_notifications',filter:'user_id=eq.'+userId},()=>{void fetchNotifications()})
   .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},()=>{void fetchNotifications()})
   .subscribe()
  return ()=>{alive=false;generation.current++;window.clearInterval(poll);window.removeEventListener('focus',focus);void sb.removeChannel(channel)}
 },[userId,sb,fetchNotifications])

 const markAsRead=useCallback(async(notice:UnifiedNotification)=>{
  if(notice.read)return true
  const key=notice.source+':'+notice.id
  if(inFlight.current.has(key))return false
  inFlight.current.add(key)
  setNotifications(old=>old.map(n=>n.id===notice.id&&n.source===notice.source?{...n,read:true}:n))
  const rpc=notice.source==='direct'?'mark_artist_direct_notification_read':'mark_sintone_notification_read'
  const {error:rpcError}=await sb.rpc(rpc,{p_id:notice.id})
  inFlight.current.delete(key)
  if(rpcError){
   setNotifications(old=>old.map(n=>n.id===notice.id&&n.source===notice.source?{...n,read:false}:n))
   setError('Não foi possível marcar a notificação como lida.')
   return false
  }
  setError('')
  return true
 },[sb])
 const deleteNotification=useCallback(async(notice:UnifiedNotification)=>{
  const key=notice.source+':'+notice.id
  if(deletingKeys.current.has(key))return false
  const snapshot=notice
  deletingKeys.current.add(key)
  generation.current++ // Discard any request started before this optimistic mutation.
  setNotifications(old=>old.filter(n=>n.source+':'+n.id!==key))
  setError('')
  const {data,error:rpcError}=await sb.rpc('delete_sintone_notification',{
   p_id:notice.id,p_source:notice.source
  })
  if(rpcError||data!==true){
   deletingKeys.current.delete(key)
   setNotifications(old=>[...old,snapshot].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)))
   setError('Não foi possível excluir a notificação. Ela foi restaurada.')
   return false
  }
  notify('Notificação removida')
  // Keep tombstone until the next successful refresh (DB now filters deleted rows).
  void fetchNotifications().finally(()=>deletingKeys.current.delete(key))
  return true
 },[sb,fetchNotifications,notify])

 const clearNotifications=useCallback(async(mode:ClearMode)=>{
  if(deleting)return false
  setDeleting(true)
  const selection=notifications.filter(n=>mode==='all'||n.read)
  if(!selection.length){setDeleting(false);return true}
  const keys=new Set(selection.map(n=>n.source+':'+n.id))
  for(const key of keys)deletingKeys.current.add(key)
  generation.current++
  setNotifications(old=>old.filter(n=>!keys.has(n.source+':'+n.id)))
  setError('')
  const {error:rpcError}=await sb.rpc('clear_sintone_notifications',{p_mode:mode})
  if(rpcError){
   for(const key of keys)deletingKeys.current.delete(key)
   setNotifications(old=>{
    const existing=new Set(old.map(n=>n.source+':'+n.id))
    return [...old,...selection.filter(n=>!existing.has(n.source+':'+n.id))]
     .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))
   })
   setError('Não foi possível limpar as notificações. A lista foi restaurada.')
   setDeleting(false)
   return false
  }
  notify(mode==='all'?'Todas as notificações foram removidas':'Notificações lidas removidas')
  setDeleting(false)
  void fetchNotifications().finally(()=>{for(const key of keys)deletingKeys.current.delete(key)})
  return true
 },[deleting,notifications,sb,fetchNotifications,notify])

 const unreadCount=notifications.filter(n=>!n.read).length
 const value=useMemo(()=>({notifications,unreadCount,loading,error,fetchNotifications,markAsRead,
  deleteNotification,clearNotifications,deleting,toast}),
  [notifications,unreadCount,loading,error,fetchNotifications,markAsRead,
   deleteNotification,clearNotifications,deleting,toast])
 return <Context.Provider value={value}>{children}{toast&&<div className="nd-notice-toast" role="status"><CheckCircle2 size={17}/>{toast}</div>}</Context.Provider>
}
export function useNotifications(){
 const value=useContext(Context)
 if(!value)throw Error('useNotifications requer NotificationsProvider')
 return value
}
