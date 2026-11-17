'use server'
import {revalidatePath} from 'next/cache'
import {getAdminContext} from '@/lib/admin-access'

export async function updateLandingHero(storagePath:string|null){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Acesso exclusivo de administrador.'}
 if(storagePath!==null && (!/^hero\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$/.test(storagePath)||storagePath.length>110))
  return {ok:false as const,error:'Caminho de imagem inválido.'}
 let url:string|null=null
 if(storagePath){
  const {data:file,error:filesError}=await ctx.supabase.storage.from('public-assets').list('hero',{search:storagePath.split('/')[1],limit:100})
  if(filesError||!file?.some(x=>x.name===storagePath.split('/')[1]))
   return {ok:false as const,error:'Imagem não encontrada no Storage.'}
  url=ctx.supabase.storage.from('public-assets').getPublicUrl(storagePath).data.publicUrl
 }
 const {data,error}=await ctx.supabase.from('landing_page_config')
  .update({hero_image_url:url,updated_at:new Date().toISOString(),updated_by:ctx.user.id}).eq('id',1).select('id').single()
 if(error||!data)return {ok:false as const,error:'Falha ao salvar configuração. '+(error?.message||'')}
 revalidatePath('/')
 revalidatePath('/admin/landing-page')
 return {ok:true as const,url}
}

type CmsSection='announcement'|'hero'|'pricing'|'faq'|'dsps'|'social'
import {DSP_CHOICES} from '@/lib/landing-config'

const internalLink=(x:unknown)=>typeof x==='string'&&x.startsWith('/')&&!x.startsWith('//')&&x.length<=200&&!/[\\\r\n]/.test(x)
const stringField=(x:unknown,max:number)=>typeof x==='string'&&x.trim().length>0&&x.length<=max
export async function saveLandingSection(section:CmsSection,raw:unknown){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Sem permissão de administrador.'}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false as const,error:'Dados inválidos.'}
 const v=raw as Record<string,unknown>
 let payload:Record<string,unknown>={}
 if(section==='announcement'){
  if(typeof v.announcement_active!=='boolean'||!stringField(v.announcement_text,240)||!internalLink(v.announcement_link))return {ok:false as const,error:'Verifique o alerta e o link interno.'}
  payload={announcement_active:v.announcement_active,announcement_text:(v.announcement_text as string).trim(),announcement_link:v.announcement_link}
 }else if(section==='hero'){
  if(!stringField(v.hero_title,170)||!stringField(v.hero_subtitle,240)||!stringField(v.hero_cta_text,65)||!internalLink(v.hero_cta_url))return {ok:false as const,error:'Confira os textos e o link do Hero.'}
  payload={hero_title:(v.hero_title as string).trim(),hero_subtitle:(v.hero_subtitle as string).trim(),hero_cta_text:(v.hero_cta_text as string).trim(),hero_cta_url:v.hero_cta_url}
 }else if(section==='pricing'){
  if(!stringField(v.pricing_badge,55)||!stringField(v.pricing_title,55)||v.pricing_price!=='R$ 0,00'||!stringField(v.pricing_subtitle,140)||
   !Array.isArray(v.pricing_features)||v.pricing_features.length>12||v.pricing_features.some(x=>!stringField(x,180)))
    return {ok:false as const,error:'O plano gratuito deve manter R$ 0,00; confira os benefícios.'}
  payload={pricing_badge:(v.pricing_badge as string).trim(),pricing_title:(v.pricing_title as string).trim(),pricing_price:'R$ 0,00',pricing_subtitle:(v.pricing_subtitle as string).trim(),pricing_features:v.pricing_features.map(x=>(x as string).trim())}
 }else if(section==='faq'){
  if(!Array.isArray(v.faq_items)||v.faq_items.length>20||v.faq_items.some(x=>!x||typeof x!=='object'||!stringField(x.q,220)||!stringField(x.a,1500)))
   return {ok:false as const,error:'Cada pergunta precisa de título e resposta; máximo de 20 perguntas.'}
  payload={faq_items:v.faq_items.map(x=>({q:String(x.q).trim(),a:String(x.a).trim()}))}
 }else if(section==='dsps'){
  if(!Array.isArray(v.dsp_enabled)||v.dsp_enabled.length>DSP_CHOICES.length||v.dsp_enabled.some(x=>typeof x!=='string'||!DSP_CHOICES.some(d=>d.slug===x))||new Set(v.dsp_enabled).size!==v.dsp_enabled.length)
   return {ok:false as const,error:'Seleção de plataformas inválida.'}
  payload={dsp_enabled:v.dsp_enabled}
 }else if(section==='social'){
  const links=v.social_links
  if(!links||typeof links!=='object'||Array.isArray(links))return {ok:false as const,error:'Redes sociais inválidas.'}
  const source=links as Record<string,unknown>
  const allowed:{[key:string]:string[]}={instagram:['instagram.com','www.instagram.com'],youtube:['youtube.com','www.youtube.com','youtu.be'],tiktok:['tiktok.com','www.tiktok.com']}
  const sanitized:Record<string,string>={}
  for(const [key,hosts] of Object.entries(allowed)){
   const value=source[key]
   if(value===undefined||value==='')continue
   if(typeof value!=='string'||value.length>300)return {ok:false as const,error:'Link '+key+' inválido.'}
   try{const url=new URL(value);if(url.protocol!=='https:'||!hosts.includes(url.hostname)||url.username||url.password)throw Error()
    sanitized[key]=url.toString()
   }catch{return {ok:false as const,error:'Informe uma URL HTTPS oficial para '+key+'.'}}
  }
  payload={social_links:sanitized}
 }else return {ok:false as const,error:'Seção inválida.'}
 const {error}=await ctx.supabase.from('landing_page_config')
  .update({...payload,updated_at:new Date().toISOString(),updated_by:ctx.user.id}).eq('id',1)
 if(error)return {ok:false as const,error:'Falha ao salvar: '+error.message}
 revalidatePath('/')
 revalidatePath('/admin/landing-page')
 return {ok:true as const}
}

/** Atualiza somente imagens públicas verificadas no bucket oficial; sem links arbitrários. */
export async function saveLandingBanners(urls:string[]){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Acesso restrito à administração.'}
 if(!Array.isArray(urls)||urls.length>6||new Set(urls).size!==urls.length)
  return {ok:false as const,error:'O carrossel aceita até 6 imagens distintas.'}
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!base)return {ok:false as const,error:'Storage não configurado.'}
 const verified:string[]=[]
 for(const raw of urls){
  if(typeof raw!=='string'||raw.length>550)return {ok:false as const,error:'URL inválida.'}
  let fileName:string
  try{
   const url=new URL(raw),root=new URL(base)
   const prefix='/storage/v1/object/public/public-assets/hero/'
   if(url.origin!==root.origin||!url.pathname.startsWith(prefix)||url.search||url.hash)throw Error()
   fileName=decodeURIComponent(url.pathname.slice(prefix.length))
   if(!/^[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$/.test(fileName))throw Error()
  }catch{return {ok:false as const,error:'O banner deve estar no Storage da SINTONE.'}}
  const {data,error}=await ctx.supabase.storage.from('public-assets').list('hero',{search:fileName,limit:10})
  if(error||!data?.some(item=>item.name===fileName))return {ok:false as const,error:'Imagem não encontrada: '+fileName}
  verified.push(ctx.supabase.storage.from('public-assets').getPublicUrl('hero/'+fileName).data.publicUrl)
 }
 const {error}=await ctx.supabase.from('landing_page_config')
  .update({hero_banners:verified,hero_image_url:verified[0]||null,updated_at:new Date().toISOString(),updated_by:ctx.user.id})
  .eq('id',1)
 if(error)return {ok:false as const,error:'Falha ao salvar banners: '+error.message}
 revalidatePath('/');revalidatePath('/admin/landing-page')
 return {ok:true as const,urls:verified}
}
