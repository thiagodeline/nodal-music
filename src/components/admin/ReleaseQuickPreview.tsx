'use client'
import {useRef,useState} from 'react'
import {Play,Pause,LoaderCircle,Volume2,X} from 'lucide-react'
import {getReleaseAudioUrl} from '@/app/admin/actions'
export default function ReleaseQuickPreview({releaseId,trackId,enabled}:{releaseId:string;trackId?:string;enabled:boolean}){
 const [busy,setBusy]=useState(false),[playing,setPlaying]=useState(false)
 const [error,setError]=useState(''),[open,setOpen]=useState(false),[volume,setVolume]=useState(80)
 const audio=useRef<HTMLAudioElement|null>(null)
 const start=async()=>{
  if(audio.current&&!audio.current.paused){audio.current.pause();setPlaying(false);setOpen(true);return}
  setBusy(true);setError('');setOpen(true)
  try{
   if(!audio.current?.getAttribute('src')){
    const r=await getReleaseAudioUrl(releaseId,trackId)
    if(!r.ok||!r.url)throw Error(r.ok?'Áudio indisponível':r.message)
    audio.current!.src=r.url
   }
   if(audio.current)audio.current.volume=volume/100
   await audio.current?.play();setPlaying(true)
  }catch(e){setError(e instanceof Error?e.message:'Erro ao reproduzir')}
  finally{setBusy(false)}
 }
 return <div className="sa-preview">
  <button type="button" className="sa-preview-button" disabled={!enabled||busy} title={error||'Prévia de até 30 segundos'} onClick={()=>void start()}>
   {busy?<LoaderCircle size={15}/>:playing?<Pause size={15}/>:<Play size={15}/>} 30s
  </button>
  <div className="sa-preview-panel" role="dialog" aria-label="Pré-escuta de lançamento" style={{display:open?'grid':'none'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <strong>Pré-escuta de 30 segundos</strong>
    <button type="button" onClick={()=>{audio.current?.pause();setOpen(false)}} aria-label="Fechar pré-escuta"><X size={18}/></button>
   </div>
   <audio ref={audio} controls preload="none" onTimeUpdate={e=>{
    if(e.currentTarget.currentTime>=30){e.currentTarget.pause();e.currentTarget.currentTime=0;setPlaying(false)}
   }} onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)} onPlay={()=>setPlaying(true)}/>
   <label style={{display:'flex',gap:8,alignItems:'center'}}><Volume2 size={18}/> Volume
    <input aria-label="Volume" type="range" min="0" max="100" value={volume}
     onChange={e=>{const n=Number(e.target.value);setVolume(n);if(audio.current)audio.current.volume=n/100}}/>
   </label>
   {error&&<span role="alert" className="sa-error">{error}</span>}
  </div>
  {error&&!open&&<small title={error} className="sa-subline">Indisponível</small>}
 </div>
}
