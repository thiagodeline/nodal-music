'use client'
import {useEffect,useRef,useState} from 'react'
import {Play,Pause} from 'lucide-react'
const fmt=(v:number)=>Number.isFinite(v)?Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0'):'0:00'
export default function ReleaseAudioMini({file,onDuration}:{file:File|null;onDuration:(value:number)=>void}){
 const audio=useRef<HTMLAudioElement|null>(null)
 const [url,setUrl]=useState(''),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0)
 useEffect(()=>{
  if(!file){setUrl('');return}
  const link=URL.createObjectURL(file);setUrl(link);setPlaying(false);setTime(0)
  return()=>URL.revokeObjectURL(link)
 },[file])
 const play=async()=>{if(!audio.current)return;try{if(audio.current.paused)await audio.current.play();else audio.current.pause()}catch{}}
 return <div className="sr-mini-audio">
  <audio ref={audio} src={url} preload="metadata" onLoadedMetadata={e=>{
   const seconds=e.currentTarget.duration;if(Number.isFinite(seconds)&&seconds>0){setDuration(seconds);onDuration(Math.round(seconds))}
  }} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}/>
  <button type="button" aria-label={playing?'Pausar faixa':'Reproduzir faixa'} onClick={()=>void play()} disabled={!file}>{playing?<Pause size={17}/>:<Play size={17}/>}</button>
  <input type="range" min={0} max={Math.max(1,duration)} step=".1" value={Math.min(time,Math.max(1,duration))}
   aria-label="Posição do áudio" onChange={e=>{if(audio.current)audio.current.currentTime=Number(e.target.value);setTime(Number(e.target.value))}}/>
  <small>{fmt(time)} / {fmt(duration)}</small>
 </div>
}
