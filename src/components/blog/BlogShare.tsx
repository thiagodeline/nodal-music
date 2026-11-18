'use client'
import {useState} from 'react'
import {Copy,Check,MessageCircle,Share2} from 'lucide-react'
export default function BlogShare({title,url}:{title:string;url:string}){
 const [copied,setCopied]=useState(false)
 const share=title+' — '+url
 return <div className="sb-share" aria-label="Compartilhar artigo">
  <a href={'https://wa.me/?text='+encodeURIComponent(share)} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no WhatsApp"><MessageCircle size={18}/> WHATSAPP</a>
  <a href={'https://twitter.com/intent/tweet?text='+encodeURIComponent(title)+'&url='+encodeURIComponent(url)} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no X"><Share2 size={18}/> X</a>
  <button type="button" onClick={()=>void navigator.clipboard.writeText(url).then(()=>setCopied(true)).catch(()=>setCopied(false))}>{copied?<Check size={18}/>:<Copy size={18}/>} {copied?'COPIADO':'COPIAR LINK'}</button>
 </div>
}
