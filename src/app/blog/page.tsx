import type {Metadata} from 'next'
import Link from 'next/link'
import {FileSearch} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {BLOG_CATEGORIES,type BlogPost} from '@/lib/blog'
import BlogCard from '@/components/blog/BlogCard'
import BlogSearch from '@/components/blog/BlogSearch'
import {JsonLd} from '@/lib/seo'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Blog: carreira e mercado da música',description:'Artigos sobre como lançar música no Spotify, direitos autorais, distribuição musical e marketing para artistas independentes.',alternates:{canonical:'/blog'},openGraph:{title:'Blog SINTONE | Mercado da Música',description:'Guias e notícias de distribuição musical para artistas independentes.',url:'/blog',type:'website'}}
const PER_PAGE=9

export default async function Blog({searchParams}:{searchParams:Promise<{q?:string;category?:string;page?:string}>}){
 const p=await searchParams,q=(p.q||'').slice(0,100).trim(),category=BLOG_CATEGORIES.includes(p.category as typeof BLOG_CATEGORIES[number])?p.category!:''
 const page=Math.min(1000,Math.max(1,Number.isFinite(Number(p.page))?Math.floor(Number(p.page)||1):1))
 const sb=await createClient()
 let query=sb.from('blog_posts').select('*',{count:'exact'}).eq('status','PUBLISHED')
 if(category)query=query.eq('category',category)
 if(q)query=query.or('title.ilike.%'+q.replace(/[%,().]/g,'')+'%,summary.ilike.%'+q.replace(/[%,().]/g,'')+'%')
 const {data,count,error}=await query.order('published_at',{ascending:false}).range((page-1)*PER_PAGE,page*PER_PAGE-1)
 const posts=(data||[]) as BlogPost[],total=count||0
 const featured=!q&&!category&&page===1?posts[0]:null
 const cardPosts=featured?posts.slice(1):posts
 const pageLink=(n:number)=>{const params=new URLSearchParams();if(q)params.set('q',q);if(category)params.set('category',category);if(n>1)params.set('page',String(n));return '/blog'+(params.size?'?'+params.toString():'')}
 const blogSchema={
  '@context':'https://schema.org','@type':'Blog',
  '@id':'https://sintone.com.br/blog#blog',
  name:'Blog SINTONE',url:'https://sintone.com.br/blog',inLanguage:'pt-BR',
  publisher:{'@id':'https://sintone.com.br/#organization'},
  blogPost:posts.map(post=>({'@type':'BlogPosting',headline:post.title,
   url:'https://sintone.com.br/blog/'+post.slug,
   datePublished:post.published_at||undefined,
   author:{'@type':'Person',name:post.author_name}}))
 }
 return <><JsonLd data={blogSchema}/><main className="sb-wrap sb-page bg-white text-slate-900 min-h-screen">
  <section className="sb-hero">
   <span className="sb-kicker">SINTONE / EDITORIAL</span>
   <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">CONHECIMENTO &amp;<br/>MERCADO DA MÚSICA.</h1>
   <p className="text-slate-600 text-sm md:text-base font-normal max-w-2xl mt-2">Estratégias, notícias e informação para quem constrói a própria carreira na música.</p>
   <BlogSearch q={q} category={category}/>
  </section>
  {error&&<p role="alert" className="sb-error">Não foi possível carregar os artigos agora.</p>}
  {featured&&<section className="sb-featured" aria-label="Matéria em destaque"><div className="sb-section-heading"><span>EM DESTAQUE</span><strong>EDITORIAL SINTONE</strong></div><BlogCard post={featured} featured/></section>}
  <section className="sb-articles" aria-label="Matérias"><div className="sb-section-heading"><span>{q||category?'RESULTADOS':'ÚLTIMAS MATÉRIAS'}</span><strong>{total} {total===1?'ARTIGO':'ARTIGOS'}</strong></div>
   {cardPosts.length?<div className="sb-grid">{cardPosts.map(post=><BlogCard key={post.id} post={post}/>)}</div>:!error&&!featured&&<div className="sb-empty"><FileSearch size={40} aria-hidden="true"/><p>Nenhuma matéria encontrada. Experimente outra busca ou categoria.</p></div>}
   {total>PER_PAGE&&<nav className="sb-pagination" aria-label="Paginação">
    {page>1&&<Link href={pageLink(page-1)}>Anterior</Link>}<span>Página {page} de {Math.ceil(total/PER_PAGE)}</span>
    {page*PER_PAGE<total&&<Link href={pageLink(page+1)}>Próxima →</Link>}
   </nav>}
  </section>
 </main></>
}
