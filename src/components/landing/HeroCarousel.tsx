'use client'
import {useEffect,useState} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {ArrowRight,ChevronLeft,ChevronRight} from 'lucide-react'
import type {HeroBanner} from '@/lib/landing-config'

export default function HeroCarousel({banners}:{banners:HeroBanner[]}){
 const [index,setIndex]=useState(0)
 const count=banners.length
 useEffect(()=>{
  if(count<=1||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const timer=window.setInterval(()=>setIndex(i=>(i+1)%count),6500)
  return ()=>window.clearInterval(timer)
 },[count])
 const active=count>0?banners[index%count]:null
 return <section className={'um-hero'+(active?' um-hero-has-image':' um-hero-no-image')} aria-labelledby="st-main-title">
  {!active&&<div className="um-hero-fallback-photo" role="img" aria-label="Cantora em estúdio de gravação, fotografia ilustrativa"/>}
  {active&&<div className="um-hero-photo" key={active.image_url}><Image src={active.image_url} alt="Banner promocional da SINTONE" fill priority={index===0} unoptimized sizes="100vw" style={{objectFit:'cover'}}/></div>}
  <div className="um-hero-shade" aria-hidden="true"/>
  <div className="um-container um-hero-inner">
   <span className="um-hero-tag">SINTONE · DISTRIBUIÇÃO DIGITAL</span>
   <h1 id="st-main-title">{active?.title||'SUA MÚSICA EM MAIS DE 50 PLATAFORMAS.'}</h1>
   {(active?.subtitle||!active)&&<p>{active?.subtitle||'Distribua sua música de forma independente com a SINTONE.'}</p>}
   {active?.button_text&&active.button_url&&<Link className="um-hero-cta" href={active.button_url}>{active.button_text}<ArrowRight size={18}/></Link>}
   {!active&&<Link className="um-hero-cta" href="/register">CRIAR CONTA GRÁTIS <ArrowRight size={18}/></Link>}
  </div>
  {count>1&&<div className="um-carousel-controls" aria-label="Navegação dos banners">
   <button type="button" aria-label="Banner anterior" onClick={()=>setIndex(i=>(i-1+count)%count)}><ChevronLeft size={22}/></button>
   <div className="um-carousel-dots">{banners.map((_,i)=><button type="button" key={i} onClick={()=>setIndex(i)} aria-label={'Ir para o banner '+(i+1)} aria-current={i===index}/>)}</div>
   <button type="button" aria-label="Próximo banner" onClick={()=>setIndex(i=>(i+1)%count)}><ChevronRight size={22}/></button>
  </div>}
 </section>
}
