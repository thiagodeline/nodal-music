'use client'
import {useEffect,useState} from 'react'
import Image from 'next/image'
import {X} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import './dashboard-popup.css'
type Popup={id:string;image_url:string}
export default function DashboardPopup(){
 const [popup,setPopup]=useState<Popup|null>(null)
 useEffect(()=>{
  let active=true
  const sb=createClient()
  void sb.from('dashboard_popups').select('id,image_url').eq('is_active',true)
   .order('created_at',{ascending:false}).limit(1).then(({data,error})=>{
    if(!active||error||!data?.[0])return
    const record=data[0]
    // Exibir uma vez por aba do navegador, sem incomodar em cada navegação interna.
    try{if(sessionStorage.getItem('sintone-popup-seen-'+record.id))return}catch{}
    setPopup(record)
   })
  return ()=>{active=false}
 },[])
 useEffect(()=>{
  if(!popup)return
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')close()}
  document.addEventListener('keydown',onKey)
  return ()=>document.removeEventListener('keydown',onKey)
 },[popup])
 function close(){
  if(popup){try{sessionStorage.setItem('sintone-popup-seen-'+popup.id,'1')}catch{}}
  setPopup(null)
 }
 if(!popup)return null
 return <div className="nd-popup-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)close()}}>
  <div className="nd-popup-modal" role="dialog" aria-modal="true" aria-label="Novidade da SINTONE">
   <button type="button" className="nd-popup-close" onClick={close} aria-label="Fechar popup"><X size={23}/></button>
   <div className="nd-popup-image"><Image src={popup.image_url} alt="Comunicado da SINTONE" fill sizes="(max-width:720px) 94vw, 720px" unoptimized priority style={{objectFit:'contain'}}/></div>
  </div>
 </div>
}
