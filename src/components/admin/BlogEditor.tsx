'use client'
import {useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {Bold,Italic,Heading2,Heading3,Table2,Link2,ImagePlus,Quote,Code2,Save,Send,Eye,ArrowLeft} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {BLOG_CATEGORIES,slugify,isBlogImage,type BlogPost} from '@/lib/blog'
import MarkdownArticle from '@/components/blog/MarkdownArticle'
import './blog-admin.css'
import '../blog/blog.css'
import {saveBlogPost} from '@/app/admin/blog/actions'
type Editable=Pick<BlogPost,'title'|'slug'|'summary'|'content'|'cover_image'|'category'|'tags'|'author_name'|'seo_title'|'seo_description'|'focus_keywords'|'canonical_url'|'is_indexable'|'status'>
const empty:Editable={
 title:'',slug:'',summary:'',content:'',cover_image:null,category:'Tutoriais',
 tags:[],author_name:'Equipe Sintone',seo_title:'',seo_description:'',focus_keywords:[],
 canonical_url:null,is_indexable:true,status:'DRAFT'
}
export default function BlogEditor({initial}:{initial?:BlogPost}){
 const router=useRouter()
 const [draft,setDraft]=useState<Editable>(initial||empty)
 const [tab,setTab]=useState<'edit'|'preview'>('edit')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('')
 const [slugTouched,setSlugTouched]=useState(!!initial)
 const textarea=useRef<HTMLTextAreaElement>(null)
 const set=<K extends keyof Editable>(key:K,value:Editable[K])=>setDraft(d=>({...d,[key]:value}))
 const tags=(values:string)=>values.split(',').map(x=>x.trim()).filter(Boolean)
 function insert(before:string,after='',sample='texto'){
  const el=textarea.current,start=el?.selectionStart??draft.content.length,end=el?.selectionEnd??draft.content.length
  const selected=draft.content.slice(start,end)||sample
  const value=draft.content.slice(0,start)+before+selected+after+draft.content.slice(end)
  set('content',value)
  requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(start+before.length,start+before.length+selected.length)})
 }
 async function upload(file:File|undefined,asCover:boolean){
  if(!file)return
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||!file.size){
   setError('Imagem inválida. Use JPG, PNG ou WebP de até 5 MB.');return
  }
  setBusy(true);setError('')
  try{
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
   const path='blog/'+crypto.randomUUID()+'.'+ext
   const sb=createClient()
   const {error}=await sb.storage.from('public-assets').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false})
   if(error)throw Error(error.message)
   const url=sb.storage.from('public-assets').getPublicUrl(path).data.publicUrl
   if(asCover)set('cover_image',url)
   else insert('![Descrição da imagem](',')',url)
  }catch(e){setError(e instanceof Error?e.message:'Falha no upload.')}
  finally{setBusy(false)}
 }
 async function save(status:'DRAFT'|'PUBLISHED'){
  setBusy(true);setError('');setSuccess('')
  try{
   const result=await saveBlogPost({...draft,status,id:initial?.id})
   if(!result.ok)throw Error(result.error)
   setSuccess(status==='DRAFT'?'Rascunho salvo.':'Artigo publicado.')
   router.push('/admin/blog/edit/'+result.post.id)
   router.refresh()
  }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar artigo.')}
  finally{setBusy(false)}
 }
 const field=(key:'title'|'summary'|'author_name'|'seo_title'|'seo_description',label:string,limit:number,textareaField=false)=>
  <label className="sa-blog-field"><span>{label} <small>{draft[key].length}/{limit}</small></span>
   {textareaField?<textarea maxLength={limit} rows={3} value={draft[key]} onChange={e=>set(key,e.target.value)}/>:
    <input maxLength={limit} value={draft[key]} onChange={e=>{
     set(key,e.target.value)
     if(key==='title'&&!slugTouched)set('slug',slugify(e.target.value))
    }}/>}</label>
 return <main className="sa-content sa-blog-admin sa-blog-editor">
  <div className="sa-blog-heading"><Link href="/admin/blog" className="sa-blog-back"><ArrowLeft size={17}/> ARTIGOS</Link><span>{initial?'EDITAR ARTIGO':'NOVO ARTIGO'}</span></div>
  {error&&<p role="alert" className="sa-blog-error">{error}</p>}
  {success&&<p role="status" className="sa-blog-success">{success}</p>}
  <div className="sa-blog-editor-grid">
   <div className="sa-blog-editor-main">
    <section className="sa-blog-panel"><h2>01 / DADOS PRINCIPAIS</h2>
     {field('title','Título do artigo',180)}
     <label className="sa-blog-field"><span>Slug da URL <small>Gerado automaticamente, editável</small></span>
      <input maxLength={160} value={draft.slug} onChange={e=>{setSlugTouched(true);set('slug',slugify(e.target.value))}}/></label>
     {field('summary','Subtítulo / Resumo',500,true)}
     <div className="sa-blog-field-row"><label className="sa-blog-field"><span>Categoria</span>
      <select value={draft.category} onChange={e=>set('category',e.target.value as Editable['category'])}>{BLOG_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
      <label className="sa-blog-field"><span>Autor</span><select value={draft.author_name} onChange={e=>set('author_name',e.target.value)}>
       {[...new Set(['Equipe Sintone','Thyago Melo',draft.author_name])].map(x=><option key={x}>{x}</option>)}</select></label></div>
     <label className="sa-blog-field"><span>Tags (separadas por vírgula)</span><input value={draft.tags.join(', ')} onChange={e=>set('tags',tags(e.target.value))} placeholder="distribuição, carreira, streaming"/></label>
    </section>
    <section className="sa-blog-panel"><div className="sa-blog-content-heading"><h2>02 / CONTEÚDO MARKDOWN</h2>
     <div className="sa-blog-toggle"><button type="button" className={tab==='edit'?'active':''} onClick={()=>setTab('edit')}>EDITOR</button><button type="button" className={tab==='preview'?'active':''} onClick={()=>setTab('preview')}><Eye size={15}/> PRÉVIA</button></div></div>
     {tab==='edit'?<><div className="sa-blog-toolbar">
      <button type="button" title="Negrito" onClick={()=>insert('**','**')}><Bold size={17}/></button>
      <button type="button" title="Itálico" onClick={()=>insert('*','*')}><Italic size={17}/></button>
      <button type="button" title="Título H2" onClick={()=>insert('\n## ','','Título da seção')}><Heading2 size={17}/></button>
      <button type="button" title="Título H3" onClick={()=>insert('\n### ','','Subtítulo')}><Heading3 size={17}/></button>
      <button type="button" title="Link" onClick={()=>insert('[','](https://exemplo.com)','texto do link')}><Link2 size={17}/></button>
      <button type="button" title="Citação" onClick={()=>insert('\n> ','','Citação')}><Quote size={17}/></button>
      <button type="button" title="Código" onClick={()=>insert('\n```\n','\n```\n','código')}><Code2 size={17}/></button>
      <button type="button" title="Tabela comparativa" onClick={()=>insert('\n| Critério | SINTONE | Outra distribuidora |\n| --- | --- | --- |\n| Exemplo | Informação verificável | Informação verificável |\n','', '')}><Table2 size={17}/></button>
      <button type="button" title="CTA da SINTONE" onClick={()=>insert('\n[CTA]\n','','')}>CTA</button>
      <label title="Inserir imagem no conteúdo"><ImagePlus size={17}/><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0],false);e.target.value=''}}/></label>
     </div>
     <textarea ref={textarea} className="sa-blog-markdown" value={draft.content} onChange={e=>set('content',e.target.value)} rows={23} placeholder="## Introdução\n\nEscreva sua matéria aqui...\n\n| Critério | SINTONE | Concorrente |\n| --- | --- | --- |\n| Preço | Consulte planos | Consulte site oficial |"/>
     <p className="sa-blog-help">Suporta H2/H3, negrito, itálico, links HTTPS, listas, tabelas, citações, imagens do Storage, código e [CTA].</p>
     </>:<div className="sa-blog-live-preview"><MarkdownArticle content={draft.content}/></div>}
    </section>
   </div>
   <div className="sa-blog-editor-side">
    <section className="sa-blog-panel"><h2>03 / IMAGEM DE CAPA</h2>
     {isBlogImage(draft.cover_image)&&<div className="sa-blog-cover"><Image src={draft.cover_image!} alt="Prévia de capa" fill unoptimized sizes="340px"/></div>}
     <label className="sa-blog-upload"><ImagePlus size={18}/>{busy?'ENVIANDO…':'ENVIAR IMAGEM'}<input type="file" disabled={busy} accept="image/png,image/jpeg,image/webp" onChange={e=>{void upload(e.target.files?.[0],true);e.target.value=''}}/></label>
     <label className="sa-blog-field"><span>URL de imagem do Storage</span><input value={draft.cover_image||''} onChange={e=>set('cover_image',e.target.value||null)}/></label>
    </section>
    <section className="sa-blog-panel"><h2>04 / SEO & GOOGLE</h2>
     {field('seo_title','Meta Title (ideal: até 60 caracteres)',100)}
     {field('seo_description','Meta Description (ideal: até 160 caracteres)',250,true)}
     <label className="sa-blog-field"><span>Palavras-chave de foco</span><input value={draft.focus_keywords.join(', ')} onChange={e=>set('focus_keywords',tags(e.target.value))}/></label>
     <label className="sa-blog-field"><span>URL canônica (opcional)</span><input placeholder="https://sintone.com.br/blog/seu-slug" value={draft.canonical_url||''} onChange={e=>set('canonical_url',e.target.value||null)}/></label>
     <label className="sa-blog-check"><input type="checkbox" checked={draft.is_indexable} onChange={e=>set('is_indexable',e.target.checked)}/> Permitir indexação (index, follow)</label>
     <p className="sa-blog-help">Somente matérias publicadas entram no sitemap. Não use afirmações comparativas sem fontes verificáveis.</p>
    </section>
    <section className="sa-blog-panel sa-blog-save"><h2>PUBLICAÇÃO</h2>
     <span className={'sa-blog-status '+(draft.status==='PUBLISHED'?'published':'draft')}>{draft.status==='PUBLISHED'?'Publicado':'Rascunho'}</span>
     <button className="sa-blog-secondary" type="button" disabled={busy} onClick={()=>void save('DRAFT')}><Save size={17}/> SALVAR RASCUNHO</button>
     <button className="sa-blog-secondary" type="button" onClick={()=>setTab('preview')}><Eye size={17}/> VISUALIZAR PRÉVIA</button>
     <button className="sa-blog-primary" type="button" disabled={busy} onClick={()=>void save('PUBLISHED')}><Send size={17}/> {busy?'SALVANDO…':'PUBLICAR ARTIGO'}</button>
     {initial?.status==='PUBLISHED'&&<Link href={'/blog/'+initial.slug} target="_blank">VER ARTIGO PUBLICADO</Link>}
    </section>
   </div>
  </div>
 </main>
}
