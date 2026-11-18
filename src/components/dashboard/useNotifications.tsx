'use client'
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import {createClient} from '@/lib/supabase/client'

export type NotificationKind='info'|'success'|'warning'|'action'|'release_approved'|'release_rejected'|'split_invite'|'system'
export type UnifiedNotification={
 id:string;source:'direct'|'legacy';title:string;message:string;type:NotificationKind;
 read:boolean;action_url:string|null;created_at:string;artist_profile_id:string|null
}
type NotificationContextValue={
 notifications:UnifiedNotification[];unreadCount:number;loading:boolean;error:string;
 fetchNotifications:()=>Promise<void>;markAsRead:(notice:UnifiedNotification)=>Promise<boolean>
}
const Context=createContext<NotificationContextValue|null>(null)

export function NotificationsProvider({userId,children}:{userId:string|null;children:ReactNode}){
 const sb=useMemo(()=>createClient(),[])
 const [notifications,setNotifications]=useState<UnifiedNotification[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const generation=useRef(0)
 const inFlight=useRef<Set<string>>(new Set())

 const fetchNotifications=useCallback(async()=>{
  if(!userId){setNotifications([]);setLoading(false);return}
  const request=++generation.current
  const [direct,legacy]=await Promise.all([
   sb.from('artist_notifications').select('id,title,message,type,action_url,read,created_at,artist_profile_id')
    .eq('user_id',userId).order('created_at',{ascending:false}).limit(100),
   sb.from('notifications').select('id,title,message,type,link_url,read,created_at')
    .eq('user_id',userId).order('created_at',{ascending:false}).limit(100)
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
  setNotifications(all.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).map(n=>
   inFlight.current.has(n.source+':'+n.id)?{...n,read:true}:n))
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
 const unreadCount=notifications.filter(n=>!n.read).length
 const value=useMemo(()=>({notifications,unreadCount,loading,error,fetchNotifications,markAsRead}),
  [notifications,unreadCount,loading,error,fetchNotifications,markAsRead])
 return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useNotifications(){
 const value=useContext(Context)
 if(!value)throw Error('useNotifications requer NotificationsProvider')
 return value
}
