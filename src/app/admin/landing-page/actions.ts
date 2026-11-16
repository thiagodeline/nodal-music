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
