'use client'
import {useRef,useState} from 'react'
import {Play,Pause,LoaderCircle} from 'lucide-react'
import {getReleaseAudioUrl} from '@/app/admin/actions'
export default function ReleaseQuickPreview({releaseId,trackId,enabled}:{releaseId:string;trackId?:string;enabled:boolean}){
 const [busy,setBusy]=useState(false),[playing,setPlaying]=useState(false),[error,setError]=useState('')
 const audio=useRef<HTMLAudioElement|null>(null)
 const start=async()=>{
  if(audio.current&&!audio.current.paused){audio.current.pause();setPlaying(false);return}
  setBusy(true);setError('')
  try{
   if(!audio.current?.src){
    const r=await getReleaseAudioUrl(releaseId,trackId)
    if(!r.ok||!r.url)throw Error(r.ok?'Áudio indisponível':r.message)
    audio.current!.src=r.url
   }
   await audio.current?.play();setPlaying(true)
  }catch(e){setError(e instanceof Error?e.message:'Erro ao reproduzir')}
  finally{setBusy(false)}
 }
 return <div className="sa-preview">
  <button type="button" className="sa-preview-button" disabled={!enabled||busy} title={error||'Prévia de até 30 segundos'} onClick={()=>void start()}>
   {busy?<LoaderCircle size={15}/>:playing?<Pause size={15}/>:<Play size={15}/>} 30s
  </button>
  <audio ref={audio} preload="none" onTimeUpdate={e=>{if(e.currentTarget.currentTime>=30){e.currentTarget.pause();setPlaying(false);e.currentTarget.currentTime=0}}} onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)}/>
  {error&&<small title={error} className="sa-subline">Indisponível</small>}
 </div>
}
