import Link from 'next/link'
import Image from 'next/image'
import {ArrowUpRight,UserRound} from 'lucide-react'
import {BlogPost,blogDate,readMinutes,isBlogImage} from '@/lib/blog'
export default function BlogCard({post,featured=false}:{post:BlogPost;featured?:boolean}){
 return <article className={'sb-card '+(featured?'sb-card-featured':'')}>
  <Link href={'/blog/'+post.slug} className="sb-card-image" aria-label={'Ler '+post.title}>
   {isBlogImage(post.cover_image)?<Image src={post.cover_image!} alt={'Capa do artigo '+post.title} fill unoptimized sizes={featured?'(max-width:800px) 100vw, 60vw':'(max-width:700px) 100vw, 33vw'}/>:<div className="sb-card-fallback"><span>SINTONE</span><strong>CONHECIMENTO<br/>INDEPENDENTE.</strong></div>}
  </Link>
  <div className="sb-card-content">
   <span className="sb-category">{post.category}</span>
   <Link href={'/blog/'+post.slug}><h2>{post.title}</h2></Link>
   <p>{post.summary}</p>
   <div className="sb-card-meta"><span className="sb-author-icon"><UserRound size={16}/></span><span>{post.author_name}</span><span>·</span><span>{readMinutes(post.content)} MIN DE LEITURA</span><span>·</span><span>{blogDate(post.published_at)}</span></div>
   {featured&&<Link href={'/blog/'+post.slug} className="sb-read-more">LER MATÉRIA <ArrowUpRight size={18}/></Link>}
  </div>
 </article>
}
