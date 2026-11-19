import Link from 'next/link'
import Image from 'next/image'
import {ArrowUpRight} from 'lucide-react'
import {type BlogPost,readMinutes,isBlogImage} from '@/lib/blog'

function shortDate(value:string|null){
 return value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'America/Sao_Paulo'}).replace(/\./g,''):'Sem data'
}

export default function BlogCard({post,featured=false}:{post:BlogPost;featured?:boolean}){
 const href='/blog/'+post.slug
 return <article className={'sb-card group '+(featured?'sb-card-featured':'')}>
  <Link href={href} className="sb-card-image" aria-label={'Ler '+post.title}>
   {isBlogImage(post.cover_image)?<Image src={post.cover_image!} alt={'Capa do artigo '+post.title} fill unoptimized sizes={featured?'(max-width:800px) 100vw, 60vw':'(max-width:700px) 100vw, (max-width:1100px) 50vw, 33vw'}/>:<div className="sb-card-fallback"><span>SINTONE</span><strong>CONHECIMENTO<br/>INDEPENDENTE.</strong></div>}
  </Link>
  <div className="sb-card-content">
   <span className="sb-category">{post.category}</span>
   <div className="sb-card-meta"><time dateTime={post.published_at||undefined}>{shortDate(post.published_at)}</time><span aria-hidden="true">·</span><span>{readMinutes(post.content)} min de leitura</span></div>
   <Link href={href} className="sb-card-title-link"><h2>{post.title}</h2></Link>
   <p>{post.summary}</p>
   <Link href={href} className="sb-read-more">Ler matéria <ArrowUpRight size={16} aria-hidden="true"/></Link>
  </div>
 </article>
}
