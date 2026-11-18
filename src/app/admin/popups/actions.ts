'use server'
import {revalidatePath} from 'next/cache'
import {getAdminContext} from '@/lib/admin-access'
type Popup={id:string;image_url:string;is_active:boolean;created_at:string}
const BUCKET='public-assets'
function isPopupUrl(raw:string){
 try{
  const origin=process.env.NEXT_PUBLIC_SUPABASE_URL
  const url=new URL(raw)
  return !!origin&&url.origin===new URL(origin).origin&&!url.search&&!url.hash&&
   /^\/storage\/v1\/object\/public\/public-assets\/popups\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(url.pathname)
 }catch{return false}
}
export async function createDashboardPopup(image_url:string){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Acesso negado.'}
 if(!isPopupUrl(image_url))return {ok:false as const,error:'A imagem deve estar no Storage oficial da SINTONE.'}
 const {data,error}=await ctx.supabase.from('dashboard_popups')
  .insert({image_url,is_active:false}).select('id,image_url,is_active,created_at').single()
 if(error||!data)return {ok:false as const,error:'Falha ao cadastrar popup: '+(error?.message||'')}
 revalidatePath('/admin/popups')
 return {ok:true as const,popup:data as Popup}
}
export async function toggleDashboardPopup(id:string,is_active:boolean){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Acesso negado.'}
 if(!/^[0-9a-f-]{36}$/.test(id)||typeof is_active!=='boolean')
  return {ok:false as const,error:'Dados inválidos.'}
 const {data,error}=await ctx.supabase.from('dashboard_popups').update({is_active}).eq('id',id)
  .select('id,is_active').single()
 if(error||!data)return {ok:false as const,error:'Erro ao alterar status: '+(error?.message||'')}
 revalidatePath('/admin/popups')
 return {ok:true as const,id:data.id,is_active:data.is_active}
}
export async function deleteDashboardPopup(id:string){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Acesso negado.'}
 if(!/^[0-9a-f-]{36}$/.test(id))return {ok:false as const,error:'ID inválido.'}
 const {data,error}=await ctx.supabase.from('dashboard_popups').delete().eq('id',id)
  .select('image_url').single()
 if(error||!data)return {ok:false as const,error:'Não foi possível excluir: '+(error?.message||'')}
 if(isPopupUrl(data.image_url)){
  const path='popups/'+data.image_url.split('/').pop()
  await ctx.supabase.storage.from(BUCKET).remove([path])
 }
 revalidatePath('/admin/popups')
 return {ok:true as const}
}
