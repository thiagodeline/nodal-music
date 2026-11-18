import Image from 'next/image'
import Link from 'next/link'
import {ArrowUpRight,AudioLines,BarChart3,Headphones,ShieldCheck,CheckCircle2} from 'lucide-react'
import {parseLandingVideo} from '@/lib/landing-video'

export default function EditorialFeatures({videoUrl}:{videoUrl:string|null}){
 const video=parseLandingVideo(videoUrl)
 const benefits=[
  'Distribuição sem taxas abusivas',
  'Acesso direto a mais de 45 lojas digitais e serviços de streaming',
  'Suporte rápido e humanizado para te auxiliar durante sua jornada conosco',
  'Dashboard detalhado e responsivo para te ajudar avaliar o desempenho de suas faixas'
 ]
 return <>
  <section className="um-mission" id="recursos"><div className="um-container um-mission-inner">
   <div className="um-mission-logo"><Image src="/sintone-mark-transparent.svg" alt="Símbolo S da SINTONE" width={160} height={160} sizes="(max-width:768px) 112px, 160px"/></div>
   <h2>SUA MÚSICA É NOSSA PRIORIDADE</h2>
   <p>Artistas independentes escolhem a Sintone para alavancar suas carreiras</p>
   <Link href="/register" className="um-mission-cta">SAIBA MAIS <ArrowUpRight size={18}/></Link>
  </div></section>
  {video&&<section className="um-video-section" id="carreira" aria-label="Vídeo da SINTONE"><div className="um-container">
   <div className="um-video-frame">
    {video.kind==='embed'?<iframe src={video.url} title="Vídeo institucional da SINTONE" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/>:
     <video src={video.url} controls preload="metadata" playsInline aria-label="Vídeo institucional da SINTONE"/>}
   </div>
  </div></section>}
  <section className="um-choice-section" id={video?"direitos":"carreira"}><div className="um-container"><div className="um-choice-card">
   <h2>POR QUE DEVO ESCOLHER A SINTONE?</h2>
   <ul>{benefits.map(text=><li key={text}><CheckCircle2 size={23} aria-hidden="true"/><span>{text}</span></li>)}</ul>
  </div></div></section>
  <section className="um-benefits" id="como-funciona"><div className="um-container">
   <div className="um-benefits-heading"><span className="um-kicker">[ O QUE VOCÊ ENCONTRA AQUI ]</span><h2>FEITO PARA QUEM FAZ MÚSICA.</h2></div>
   <div className="um-benefit-grid">
    <article><AudioLines size={27}/><span>01</span><h3>ENVIE SUA MÚSICA</h3><p>Faça o upload do áudio, da capa e dos metadados pelo seu painel.</p></article>
    <article><ShieldCheck size={27}/><span>02</span><h3>REVISÃO DE QUALIDADE</h3><p>Nossa equipe confere os arquivos e os dados antes da entrega às lojas.</p></article>
    <article><BarChart3 size={27}/><span>03</span><h3>ACOMPANHE RESULTADOS</h3><p>Consulte relatórios e royalties conforme forem disponibilizados pelas plataformas.</p></article>
    <article><Headphones size={27}/><span>04</span><h3>SUPORTE HUMANO</h3><p>Abra solicitações e acompanhe o atendimento dentro da SINTONE.</p></article>
   </div>
  </div></section>
 </>
}
