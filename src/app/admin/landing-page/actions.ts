'use server'
import {revalidatePath} from 'next/cache'
import {getAdminContext} from '@/lib/admin-access'
import {normalizeLanding,type HeroBanner,type LandingConfig} from '@/lib/landing-config'

const MAX_BANNERS=6
const internalLink=(value:string)=>value.startsWith('/')&&!value.startsWith('//')&&!/[\\\r\n]/.test(value)&&value.length<=240
const safeBanner=(banner:HeroBanner)=>{
 const origin=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!origin||typeof banner.image_url!=='string')return false
 try{
  const u=new URL(banner.image_url)
  if(u.origin!==new URL(origin).origin||u.search||u.hash||
   !/^\/storage\/v1\/object\/public\/public-assets\/hero\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(u.pathname))return false
 }catch{return false}
 return typeof banner.title==='string'&&banner.title.trim().length>0&&banner.title.length<=170&&
  typeof banner.subtitle==='string'&&banner.subtitle.length<=240&&
  typeof banner.button_text==='string'&&banner.button_text.length<=65&&
  typeof banner.button_url==='string'&&banner.button_url.length<=240&&
  ((!banner.button_text&&!banner.button_url)||(!!banner.button_text&&!!banner.button_url&&internalLink(banner.button_url)))
}
const refresh=()=>{revalidatePath('/');revalidatePath('/admin/landing-page')}
export async function saveLandingBanners(banners:HeroBanner[]){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Acesso restrito à administração.'}
 if(!Array.isArray(banners)||banners.length>MAX_BANNERS||banners.some(b=>!b||!safeBanner(b))||
   new Set(banners.map(b=>b.image_url)).size!==banners.length)
  return {ok:false as const,error:'Confira imagens, títulos e links dos banners (máximo de 6).'}
 const clean=banners.map(b=>({image_url:b.image_url,title:b.title.trim(),subtitle:b.subtitle.trim(),
  button_text:b.button_text.trim(),button_url:b.button_url.trim()}))
 const {error}=await ctx.supabase.from('landing_page_config').update({
  hero_banners:clean,hero_image_url:clean[0]?.image_url||null,
  updated_by:ctx.user.id,updated_at:new Date().toISOString()
 }).eq('id',1)
 if(error)return {ok:false as const,error:'Falha ao salvar banners: '+error.message}
 refresh()
 return {ok:true as const,banners:clean}
}
export async function registerLandingBanner(publicUrl:string){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Sem permissão para salvar.'}
 const newBanner:HeroBanner={image_url:publicUrl,title:'DISTRIBUA SUA MÚSICA',
  subtitle:'',button_text:'',button_url:''}
 if(!safeBanner(newBanner))return {ok:false as const,error:'URL do Storage inválida.'}
 const {data:current,error:queryError}=await ctx.supabase.from('landing_page_config').select('*').eq('id',1).single()
 if(queryError||!current)return {ok:false as const,error:'Não foi possível consultar o carrossel.'}
 const existing=normalizeLanding(current as Partial<LandingConfig>).hero_banners
 if(existing.length>=MAX_BANNERS)return {ok:false as const,error:'Máximo de seis banners.'}
 if(existing.some(x=>x.image_url===publicUrl))return {ok:false as const,error:'A imagem já está cadastrada.'}
 // A chamada é feita somente depois do upload confirmado pelo Supabase Storage.
 // Não há listagem imediata do arquivo, que causava falsos erros de "Imagem não encontrada".
 const next=[...existing,newBanner]
 const {error}=await ctx.supabase.from('landing_page_config').update({
  hero_banners:next,hero_image_url:next[0].image_url,
  updated_by:ctx.user.id,updated_at:new Date().toISOString()
 }).eq('id',1)
 if(error)return {ok:false as const,error:'Falha ao cadastrar banner: '+error.message}
 refresh()
 return {ok:true as const,banners:next}
}
export async function saveLandingSection(section:'announcement'|'social',raw:unknown){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Sem permissão de administrador.'}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false as const,error:'Dados inválidos.'}
 const value=raw as Record<string,unknown>
 let payload:Record<string,unknown>
 if(section==='announcement'){
  if(typeof value.announcement_active!=='boolean'||typeof value.announcement_text!=='string'||
   value.announcement_text.trim().length>240||value.announcement_text.trim().length<1)
   return {ok:false as const,error:'Informe uma mensagem de até 240 caracteres.'}
  payload={announcement_active:value.announcement_active,announcement_text:value.announcement_text.trim()}
 }else if(section==='social'){
  if(!value.social_links||typeof value.social_links!=='object'||Array.isArray(value.social_links))
   return {ok:false as const,error:'Redes sociais inválidas.'}
  const incoming=value.social_links as Record<string,unknown>
  const domains:Record<string,string[]>={instagram:['instagram.com','www.instagram.com'],
   youtube:['youtube.com','www.youtube.com','youtu.be'],tiktok:['tiktok.com','www.tiktok.com']}
  const links:Record<string,string>={}
  for(const [key,hosts] of Object.entries(domains)){
   const input=incoming[key]
   if(input===undefined||input==='')continue
   if(typeof input!=='string'||input.length>300)return {ok:false as const,error:'Link de '+key+' inválido.'}
   try{const u=new URL(input);if(u.protocol!=='https:'||!hosts.includes(u.hostname)||u.username||u.password)throw Error()
    links[key]=u.toString()}catch{return {ok:false as const,error:'URL oficial HTTPS inválida em '+key+'.'}}
  }
  payload={social_links:links}
 }else return {ok:false as const,error:'Seção inválida.'}
 const {error}=await ctx.supabase.from('landing_page_config').update({
  ...payload,updated_by:ctx.user.id,updated_at:new Date().toISOString()
 }).eq('id',1)
 if(error)return {ok:false as const,error:'Falha ao salvar: '+error.message}
 refresh();return {ok:true as const}
}
