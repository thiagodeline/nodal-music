import type {Metadata} from 'next'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/server'
import {BLOG_CATEGORIES,type BlogPost} from '@/lib/blog'
import BlogCard from '@/components/blog/BlogCard'
import BlogSearch from '@/components/blog/BlogSearch'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Blog: carreira e mercado da música',description:'Artigos, comparativos de distribuidoras, direitos autorais, marketing musical e tutoriais para artistas independentes.',alternates:{canonical:'https://sintone.com.br/blog'}}
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
 const pageLink=(n:number)=>{const p=new URLSearchParams();if(q)p.set('q',q);if(category)p.set('category',category);if(n>1)p.set('page',String(n));return '/blog'+(p.size?'?'+p.toString():'')}
 return <main className="sb-wrap sb-page">
  <section className="sb-hero"><span className="sb-kicker">[ SINTONE / BLOG ]</span><h1>CONHECIMENTO &<br/><em>MERCADO DA MÚSICA.</em></h1>
   <p>ESTRATÉGIAS, INFORMAÇÃO E VISÃO PARA QUEM CONSTRÓI A PRÓPRIA CARREIRA.</p>
   <BlogSearch q={q} category={category}/>
  </section>
  {error&&<p className="sb-error">Não foi possível carregar os artigos agora.</p>}
  {featured&&<section className="sb-featured"><div className="sb-section-heading"><span>01 / EM DESTAQUE</span><strong>EDITORIAL SINTONE</strong></div><BlogCard post={featured} featured/></section>}
  <section className="sb-articles"><div className="sb-section-heading"><span>02 / {q||category?'RESULTADOS':'ÚLTIMAS MATÉRIAS'}</span><strong>{total} ARTIGO(S)</strong></div>
   {cardPosts.length?<div className="sb-grid">{cardPosts.map(post=><BlogCard key={post.id} post={post}/>)}</div>:!error&&<div className="sb-empty">Nenhuma matéria encontrada. Experimente outra busca ou categoria.</div>}
   {total>PER_PAGE&&<nav className="sb-pagination" aria-label="Paginação">
    {page>1&&<Link href={pageLink(page-1)}>ANTERIOR</Link>}<span>PÁGINA {page} DE {Math.ceil(total/PER_PAGE)}</span>
    {page*PER_PAGE<total&&<Link href={pageLink(page+1)}>PRÓXIMA →</Link>}
   </nav>}
  </section>
 </main>
}
