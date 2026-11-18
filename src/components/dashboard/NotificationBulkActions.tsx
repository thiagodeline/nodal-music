'use client'
import {useState} from 'react'
import {Trash2,CheckCheck,X} from 'lucide-react'
import {useNotifications} from './useNotifications'

export default function NotificationBulkActions({compact=false}:{compact?:boolean}){
 const {notifications,clearNotifications,deleting}=useNotifications()
 const [confirm,setConfirm]=useState<'all'|'read'|null>(null)
 const readCount=notifications.filter(n=>n.read).length
 if(!notifications.length)return null
 async function run(){
  if(!confirm)return
  await clearNotifications(confirm)
  setConfirm(null)
 }
 return <div className={'nd-notice-bulk '+(compact?'compact':'')}>
  {!confirm?<>
   {readCount>0&&<button type="button" disabled={deleting} onClick={()=>setConfirm('read')}><CheckCheck size={14}/> Excluir lidas</button>}
   <button type="button" className="danger" disabled={deleting} onClick={()=>setConfirm('all')}><Trash2 size={14}/> Limpar todas</button>
  </>:<div className="nd-notice-confirm" role="group" aria-label="Confirmar exclusão de notificações">
   <span>{confirm==='all'?'Excluir todas as notificações?':'Excluir todas as notificações lidas?'}</span>
   <button type="button" className="danger" disabled={deleting} onClick={()=>void run()}>{deleting?'Excluindo…':'Confirmar'}</button>
   <button type="button" disabled={deleting} onClick={()=>setConfirm(null)} aria-label="Cancelar exclusão"><X size={15}/> Cancelar</button>
  </div>}
 </div>
}
