'use client'
import {useEffect,useRef,useState} from 'react'

const BARS=68
function peaks(data:Float32Array) {
  const step=Math.max(1,Math.floor(data.length/BARS))
  return Array.from({length:BARS},(_,i)=>{
    let max=0
    for(let j=i*step;j<Math.min((i+1)*step,data.length);j+=Math.max(1,Math.floor(step/120))){
      max=Math.max(max,Math.abs(data[j]||0))
    }
    return Math.max(.04,max)
  })
}
export default function WaveformPreview({file}:{file:File|null}) {
  const [url,setUrl]=useState('')
  const [bars,setBars]=useState<number[]>([])
  const [notice,setNotice]=useState('')
  const audioRef=useRef<HTMLAudioElement|null>(null)
  const canvasRef=useRef<HTMLCanvasElement|null>(null)
  const contextRef=useRef<AudioContext|null>(null)
  const analyserRef=useRef<AnalyserNode|null>(null)
  const animationRef=useRef(0)

  useEffect(()=>{
    if(!file){setUrl('');setBars([]);setNotice('');return}
    const objectUrl=URL.createObjectURL(file)
    setUrl(objectUrl);setBars([]);setNotice('')
    let canceled=false
    const run=async()=>{
      if(file.size>35*1024*1024){
        if(!canceled)setNotice('Forma de onda em tempo real durante a reprodução.')
        return
      }
      try{
        const context=new AudioContext()
        try{
          const decoded=await context.decodeAudioData(await file.arrayBuffer())
          if(!canceled)setBars(peaks(decoded.getChannelData(0)))
        }finally{await context.close()}
      }catch{
        if(!canceled)setNotice('Visualização de onda em tempo real ao reproduzir (quando o navegador suportar o formato).')
      }
    }
    void run()
    return()=>{
      canceled=true
      cancelAnimationFrame(animationRef.current)
      void contextRef.current?.close().catch(()=>undefined)
      contextRef.current=null;analyserRef.current=null
      URL.revokeObjectURL(objectUrl)
    }
  },[file])

  async function onPlay(){
    if(bars.length||!audioRef.current||!canvasRef.current)return
    try{
      if(!contextRef.current){
        const context=new AudioContext()
        const source=context.createMediaElementSource(audioRef.current)
        const analyser=context.createAnalyser()
        analyser.fftSize=2048
        source.connect(analyser);analyser.connect(context.destination)
        contextRef.current=context;analyserRef.current=analyser
      }
      await contextRef.current.resume()
      const canvas=canvasRef.current,ctx=canvas.getContext('2d')
      if(!ctx)return
      const analyser=analyserRef.current!
      const samples=new Uint8Array(analyser.fftSize)
      const draw=()=>{
        analyser.getByteTimeDomainData(samples)
        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.beginPath();ctx.lineWidth=2;ctx.strokeStyle='#2563eb'
        for(let i=0;i<samples.length;i+=6){
          const x=i/samples.length*canvas.width
          const y=samples[i]/255*canvas.height
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)
        }
        ctx.stroke()
        animationRef.current=requestAnimationFrame(draw)
      }
      cancelAnimationFrame(animationRef.current);draw()
    }catch{setNotice('Forma de onda indisponível neste navegador; a pré-escuta ainda pode funcionar.')}
  }
  if(!file)return null
  return <div className="sr-wave" aria-label={'Pré-escuta: '+file.name}>
    <strong>{file.name}</strong>
    {!!bars.length?<svg viewBox="0 0 680 90" preserveAspectRatio="none" role="img" aria-label="Forma de onda da faixa">
      {bars.map((v,i)=><rect key={i} x={i*10+2} y={45-v*40} width="6" height={Math.max(2,v*80)} rx="2" fill="#2563eb"/>)}
    </svg>:<canvas ref={canvasRef} width={680} height={90} aria-label="Forma de onda em tempo real"
      style={{width:'100%',height:90,background:'#eff5ff',borderRadius:7}}/>}
    {notice&&<small className="mut">{notice}</small>}
    <audio key={url} ref={audioRef} src={url} controls preload="metadata" aria-label="Ouvir arquivo enviado"
      onPlay={()=>void onPlay()} onPause={()=>cancelAnimationFrame(animationRef.current)} onEnded={()=>cancelAnimationFrame(animationRef.current)}/>
  </div>
}
