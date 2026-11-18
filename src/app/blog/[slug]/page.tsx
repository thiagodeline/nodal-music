import type {Metadata} from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {notFound} from 'next/navigation'
import {ArrowUpRight,ChevronRight} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {BLOG_SITE,type BlogPost,blogDate,readMinutes,isBlogImage,blogCanonical} from '@/lib/blog'
import BlogCard from '@/components/blog/BlogCard'
import BlogShare from '@/components/blog/BlogShare'
import BlogView from '@/components/blog/BlogView'
import MarkdownArticle from '@/components/blog/MarkdownArticle'
export const dynamic='force-dynamic'
async function getPost(slug:string){
 const sb=await createClient()
 const {data}=await sb.from('blog_posts').select('*').eq('slug',slug).eq('status','PUBLISHED').maybeSingle()
 return data as BlogPost|null
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params,post=await getPost(slug)
 if(!post)return {title:'Artigo não encontrado',robots:{index:false}}
 return {title:post.seo_title||post.title,description:post.seo_description||post.summary,
  alternates:{canonical:blogCanonical(post.canonical_url,post.slug)},
  robots:{index:post.is_indexable,follow:true},
  keywords:post.focus_keywords,
  openGraph:{title:post.seo_title||post.title,description:post.seo_description||post.summary,type:'article',
   url:BLOG_SITE+'/blog/'+post.slug,publishedTime:post.published_at||undefined,
   images:isBlogImage(post.cover_image)?[{url:post.cover_image!}]:[]}}
}
export default async function Article({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params
 if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))notFound()
 const post=await getPost(slug);if(!post)notFound()
 const sb=await createClient()
 const {data}=await sb.from('blog_posts').select('*').eq('status','PUBLISHED').eq('category',post.category)
  .neq('id',post.id).order('published_at',{ascending:false}).limit(3)
 const related=(data||[]) as BlogPost[]
 const url=BLOG_SITE+'/blog/'+post.slug
 const jsonld={'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,
  description:post.summary,datePublished:post.published_at,dateModified:post.updated_at,
  author:{'@type':'Person',name:post.author_name},publisher:{'@type':'Organization',name:'SINTONE',url:BLOG_SITE},
  mainEntityOfPage:url,image:isBlogImage(post.cover_image)?post.cover_image:undefined}
 return <main className="sb-wrap sb-article-page"><BlogView id={post.id}/>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonld).replace(/</g,'\\u003c')}}/>
  <nav className="sb-breadcrumb"><Link href="/">HOME</Link><ChevronRight size={13}/><Link href="/blog">BLOG</Link><ChevronRight size={13}/><span>{post.category}</span></nav>
  <header className="sb-article-header"><span className="sb-category">{post.category}</span><h1>{post.title}</h1><p>{post.summary}</p>
   <div className="sb-article-meta"><strong>{post.author_name}</strong><span>·</span><span>{blogDate(post.published_at)}</span><span>·</span><span>{readMinutes(post.content)} MIN DE LEITURA</span></div>
   <BlogShare title={post.title} url={url}/>
  </header>
  {isBlogImage(post.cover_image)&&<div className="sb-article-cover"><Image src={post.cover_image!} fill unoptimized priority sizes="(max-width:1000px) 100vw, 1080px" alt={'Capa de '+post.title}/></div>}
  <div className="sb-reading"><MarkdownArticle content={post.content}/></div>
  <section className="sb-article-cta"><span>[ SUA CARREIRA, SUAS REGRAS ]</span><h2>PRONTO PARA LANÇAR SUAS MÚSICAS SEM PEGADINHAS?</h2>
   <p>Conheça os planos, condições e ferramentas da SINTONE para artistas independentes.</p>
   <Link href="/register">CRIAR CONTA GRÁTIS NA SINTONE <ArrowUpRight size={19}/></Link>
  </section>
  {related.length>0&&<section className="sb-related"><div className="sb-section-heading"><span>CONTINUE LENDO</span><strong>ARTIGOS RELACIONADOS</strong></div>
   <div className="sb-grid">{related.map(p=><BlogCard key={p.id} post={p}/>)}</div></section>}
 </main>
}
