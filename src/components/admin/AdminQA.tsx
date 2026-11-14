'use client'
import {useEffect,useState} from 'react'
import type {AdminRelease} from './AdminPanel'
export default function AdminQA({release}:{release:AdminRelease}){
 const [cover,setCover]=useState<{w:number;h:number}|null>(null)
 const [failed,setFailed]=useState(false)
 useEffect(()=>{
  setCover(null);setFailed(false)
  if(!release.cover_url)return
  const img=new Image()
  img.onload=()=>setCover({w:img.naturalWidth,h:img.naturalHeight})
  img.onerror=()=>setFailed(true)
  img.src=release.cover_url
  return ()=>{img.onload=null;img.onerror=null}
 },[release.cover_url])
 const badTerms=/\b(?:official spotify|official apple music|free download|instagram\.com|youtube\.com)\b/i.test([release.title,release.main_artist,...release.tracks.map(t=>t.title)].join(' '))
 const metadata=!!release.title&&!!release.main_artist&&!!release.genre&&!!release.release_date&&release.platforms.length>0
 return <section className="sa-qa" aria-label="Checklist de qualidade"><h3>QA — pré-validação editorial</h3>
  <div className="sa-qa-row"><strong>{metadata?'✓':'⚠'} Metadados obrigatórios</strong><small>{metadata?'Campos básicos presentes':'Faltam campos obrigatórios'}</small></div>
  <div className="sa-qa-row"><strong>{cover?.w===3000&&cover?.h===3000?'✓':'⚠'} Dimensão da capa</strong><small>{cover?cover.w+' × '+cover.h+' px':failed?'Não foi possível ler a imagem':'Aguardando análise'} — requisito 3000 × 3000</small></div>
  <div className="sa-qa-row"><strong className="sa-qa-pending">Pendente: DPI e RGB</strong><small>Dimensões de pixel não comprovam DPI nem perfil de cor; conferir arquivo original</small></div>
  <div className="sa-qa-row"><strong className="sa-qa-pending">Pendente: áudio WAV/FLAC 16/24-bit e 44,1 kHz</strong><small>Exige inspeção técnica dos arquivos, não apenas extensão</small></div>
  <div className="sa-qa-row"><strong>{badTerms?'⚠ Termos potencialmente restritos':'✓ Varredura textual básica'}</strong><small>{badTerms?'Revisar marcas/URLs nos títulos':'Nenhum padrão da lista simples identificado; direitos autorais exigem revisão humana'}</small></div>
  <p className="sa-x-note">Este checklist é auxiliar e não aprova direitos autorais, marcas, qualidade de áudio ou conformidade automaticamente.</p>
 </section>
}
