'use server'
import {revalidatePath} from 'next/cache'
import {getAdminContext} from '@/lib/admin-access'
import {BLOG_CATEGORIES,isBlogImage,slugify,blogCanonical} from '@/lib/blog'
type Input={
 id?:string;title:string;slug:string;summary:string;content:string;cover_image:string|null;
 category:string;tags:string[];author_name:string;seo_title:string;seo_description:string;
 focus_keywords:string[];canonical_url:string|null;is_indexable:boolean;
 status:'DRAFT'|'PUBLISHED'
}
const uuid=/^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$/i
function validate(value:Input){
 if(!value||typeof value!=='object')throw Error('Dados inválidos.')
 const title=String(value.title||'').trim(),slug=slugify(String(value.slug||'')),
 summary=String(value.summary||'').trim(),content=String(value.content||'').trim(),
 category=String(value.category||''),author=String(value.author_name||'').trim()
 if(title.length<3||title.length>180||slug.length<3||summary.length>500||
  content.length>100000||!BLOG_CATEGORIES.includes(category as typeof BLOG_CATEGORIES[number])||
  author.length<2||author.length>100||!['DRAFT','PUBLISHED'].includes(value.status))
  throw Error('Confira título, slug, categoria e autor.')
 if(value.status==='PUBLISHED'&&(!summary||content.length<100))
  throw Error('Para publicar, adicione um resumo e pelo menos 100 caracteres de conteúdo.')
 if(value.cover_image&&!isBlogImage(value.cover_image))throw Error('A imagem deve estar no Storage oficial da SINTONE.')
 if(value.tags?.length>15||value.focus_keywords?.length>15||
  value.tags?.some(x=>typeof x!=='string'||x.length>35)||
  value.focus_keywords?.some(x=>typeof x!=='string'||x.length>45))
  throw Error('Excesso de tags ou palavras-chave.')
 if(String(value.seo_title||'').length>100||String(value.seo_description||'').length>250)
  throw Error('Meta título ou descrição muito longos.')
 const canonical=value.canonical_url?.trim()||null
 if(canonical&&blogCanonical(canonical,slug)!==canonical)throw Error('A URL canônica precisa ser HTTPS e pertencer ao blog da SINTONE.')
 return {title,slug,summary,content,cover_image:value.cover_image||null,category,
  tags:(value.tags||[]).map(x=>x.trim()).filter(Boolean),
  author_name:author,seo_title:String(value.seo_title||'').trim(),
  seo_description:String(value.seo_description||'').trim(),
  focus_keywords:(value.focus_keywords||[]).map(x=>x.trim()).filter(Boolean),
  canonical_url:canonical,is_indexable:value.is_indexable!==false,status:value.status}
}
export async function saveBlogPost(raw:Input){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Acesso restrito.'}
 try{
  const values=validate(raw)
  const sb=ctx.supabase
  const id=raw.id
  if(id&&!uuid.test(id))throw Error('Identificador inválido.')
  let published_at:string|null=null
  let previousSlug:string|null=null
  if(id){
   const {data:previous,error}=await sb.from('blog_posts').select('published_at,slug').eq('id',id).single()
   if(error||!previous)throw Error('Artigo não encontrado.')
   published_at=previous.published_at;previousSlug=previous.slug
  }
  const payload={...values,published_at:values.status==='PUBLISHED'?
    published_at||new Date().toISOString():published_at,
    updated_at:new Date().toISOString()}
  const result=id?
   await sb.from('blog_posts').update(payload).eq('id',id).select('id,slug,status').single():
   await sb.from('blog_posts').insert(payload).select('id,slug,status').single()
  if(result.error||!result.data){
   if(result.error?.code==='23505')throw Error('Este slug já está em uso. Escolha outro.')
   throw Error(result.error?.message||'Falha ao salvar.')
  }
  revalidatePath('/blog');revalidatePath('/admin/blog')
  if(previousSlug)revalidatePath('/blog/'+previousSlug)
  revalidatePath('/blog/'+result.data.slug)
  revalidatePath('/sitemap.xml')
  return {ok:true as const,post:result.data}
 }catch(e){return {ok:false as const,error:e instanceof Error?e.message:'Falha inesperada.'}}
}
export async function deleteBlogPost(id:string){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Sem permissão.'}
 if(!uuid.test(id))return {ok:false as const,error:'Identificador inválido.'}
 const {data,error}=await ctx.supabase.from('blog_posts').delete().eq('id',id).select('slug').single()
 if(error||!data)return {ok:false as const,error:error?.message||'Artigo não encontrado.'}
 revalidatePath('/blog');revalidatePath('/blog/'+data.slug);revalidatePath('/admin/blog');revalidatePath('/sitemap.xml')
 return {ok:true as const}
}
