'use client'
import {useMemo,useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {Search,Trash2,Plus,ExternalLink,Edit3} from 'lucide-react'
import {type BlogPost,BLOG_CATEGORIES,blogDate,isBlogImage} from '@/lib/blog'
import {deleteBlogPost} from '@/app/admin/blog/actions'
import './blog-admin.css'
export default function BlogManager({initial}:{initial:BlogPost[]}){
 const [posts,setPosts]=useState(initial),[q,setQ]=useState(''),[status,setStatus]=useState(''),[cat,setCat]=useState('')
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState('')
 const filtered=useMemo(()=>posts.filter(p=>(!q||p.title.toLowerCase().includes(q.toLowerCase()))&&(!status||p.status===status)&&(!cat||p.category===cat)),[posts,q,status,cat])
 async function remove(id:string){
  if(!confirm('Excluir este artigo? A ação não pode ser desfeita.'))return
  setBusy(id);setError('')
  const res=await deleteBlogPost(id)
  if(res.ok)setPosts(x=>x.filter(p=>p.id!==id));else setError(res.error)
  setBusy(null)
 }
 return <main className="sa-content sa-blog-admin">
  <div className="sa-blog-heading"><p>Gerencie as matérias públicas, seus metadados de SEO e os rascunhos.</p><Link href="/admin/blog/new" className="sa-blog-primary"><Plus size={18}/> NOVO ARTIGO</Link></div>
  <div className="sa-blog-filters"><label><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar pelo título..." aria-label="Buscar título"/></label>
   <select aria-label="Status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos os status</option><option value="PUBLISHED">Publicado</option><option value="DRAFT">Rascunho</option></select>
   <select aria-label="Categoria" value={cat} onChange={e=>setCat(e.target.value)}><option value="">Todas as categorias</option>{BLOG_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
  </div>
  {error&&<p role="alert" className="sa-blog-error">{error}</p>}
  <div className="sa-blog-table-scroll"><table className="sa-blog-table"><thead><tr><th>Capa</th><th>Título</th><th>Categoria</th><th>Status</th><th>Visualizações</th><th>Criado em</th><th>Ações</th></tr></thead>
   <tbody>{filtered.map(p=><tr key={p.id}>
    <td><div className="sa-blog-thumbnail">{isBlogImage(p.cover_image)&&<Image src={p.cover_image!} fill unoptimized alt="" sizes="72px"/>}</div></td>
    <td><strong>{p.title}</strong><small>/blog/{p.slug}</small></td><td>{p.category}</td>
    <td><span className={'sa-blog-status '+(p.status==='PUBLISHED'?'published':'draft')}>{p.status==='PUBLISHED'?'Publicado':'Rascunho'}</span></td>
    <td>{p.views_count.toLocaleString('pt-BR')}</td><td>{blogDate(p.created_at)}</td>
    <td><div className="sa-blog-row-actions"><Link href={'/admin/blog/edit/'+p.id}><Edit3 size={16}/> EDITAR</Link>
     {p.status==='PUBLISHED'&&<Link target="_blank" href={'/blog/'+p.slug}><ExternalLink size={16}/> VER</Link>}
     <button type="button" disabled={busy===p.id} onClick={()=>void remove(p.id)}><Trash2 size={16}/> EXCLUIR</button></div></td>
   </tr>)}</tbody></table>
   {!filtered.length&&<p className="sa-blog-empty">Nenhum artigo encontrado.</p>}
  </div>
 </main>
}
