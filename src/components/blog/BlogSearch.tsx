'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {Search} from 'lucide-react'
import {BLOG_CATEGORIES} from '@/lib/blog'
export default function BlogSearch({q,category}:{q:string;category:string}){
 const [query,setQuery]=useState(q)
 const router=useRouter()
 function navigate(nextQ=query,nextCategory=category){
  const p=new URLSearchParams()
  if(nextQ.trim())p.set('q',nextQ.trim())
  if(nextCategory)p.set('category',nextCategory)
  router.push('/blog'+(p.size?'?'+p.toString():''))
 }
 return <div className="sb-search-panel">
  <form role="search" onSubmit={e=>{e.preventDefault();navigate()}}>
   <Search size={19}/><input aria-label="Pesquisar artigos" value={query} onChange={e=>setQuery(e.target.value)} placeholder="BUSQUE POR ARTIGOS, TEMAS, ARTISTAS..." maxLength={100}/>
   <button type="submit">BUSCAR</button>
  </form>
  <div className="sb-categories" aria-label="Filtrar por categoria">
   {['',...BLOG_CATEGORIES].map(x=><button key={x} type="button" className={x===category?'selected':''} onClick={()=>navigate(query,x)}>{x||'Todos'}</button>)}
  </div>
 </div>
}
