'use client'
import {useEffect,useState} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {ArrowRight,ChevronLeft,ChevronRight} from 'lucide-react'
import type {LandingConfig} from '@/lib/landing-config'

export default function HeroCarousel({images,landing}:{images:string[];landing:LandingConfig}){
 const [index,setIndex]=useState(0)
 const count=images.length
 useEffect(()=>{
  if(count<=1||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const timer=window.setInterval(()=>setIndex(i=>(i+1)%count),6500)
  return ()=>window.clearInterval(timer)
 },[count])
 const active=count>0?images[index%count]:null
 return <section className={'um-hero'+(active?' um-hero-has-image':' um-hero-no-image')} aria-labelledby="st-main-title">
  {active&&<div className="um-hero-photo" key={active}><Image src={active} alt="Banner promocional da SINTONE" fill priority={index===0} unoptimized sizes="100vw" style={{objectFit:'cover'}}/></div>}
  <div className="um-hero-shade" aria-hidden="true"/>
  <div className="um-container um-hero-inner">
   <span className="um-hero-tag">SINTONE · DISTRIBUIÇÃO DIGITAL</span>
   <h1 id="st-main-title">DISTRIBUA SUAS MÚSICAS EM MAIS DE <span>50 PLATAFORMAS</span> DE STREAMING RENOMADAS.</h1><p>{landing.hero_subtitle}</p>
   <Link className="um-hero-cta" href={landing.hero_cta_url}>{landing.hero_cta_text}<ArrowRight size={18}/></Link>
  </div>
  {count>1&&<div className="um-carousel-controls" aria-label="Navegação dos banners">
   <button type="button" aria-label="Banner anterior" onClick={()=>setIndex(i=>(i-1+count)%count)}><ChevronLeft size={22}/></button>
   <div className="um-carousel-dots">{images.map((_,i)=><button type="button" key={i} onClick={()=>setIndex(i)} aria-label={'Ir para o banner '+(i+1)} aria-current={i===index}/>)}</div>
   <button type="button" aria-label="Próximo banner" onClick={()=>setIndex(i=>(i+1)%count)}><ChevronRight size={22}/></button>
  </div>}
 </section>
}
