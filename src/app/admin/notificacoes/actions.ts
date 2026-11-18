'use server'
import {revalidatePath} from 'next/cache'
import {getAdminContext} from '@/lib/admin-access'

export type DirectNoticeType='info'|'success'|'warning'|'action'
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
const ALLOWED=new Set(['info','success','warning','action'])
const ROUTES=new Set(['overview','catalog','drafts','new','profiles','analytics','split','financial','account','plans','support','notifications','contracts','privacy'])
function actionUrl(raw:string){
 const url=raw.trim()
 if(!url)return null
 if(url==='/dashboard')return url
 if(url.startsWith('/dashboard#')&&ROUTES.has(url.slice('/dashboard#'.length)))return url
 throw Error('O link deve ser /dashboard ou /dashboard#nome-da-aba.')
}
export async function sendDirectArtistNotification(input:{
 user_id:string;artist_profile_id:string|null;title:string;message:string;type:DirectNoticeType;action_url:string
}){
 const ctx=await getAdminContext('admin')
 if(!ctx)return {ok:false as const,error:'Acesso exclusivo ao administrador geral.'}
 try{
  const title=input.title.trim(),message=input.message.trim()
  if(!UUID.test(input.user_id)||input.artist_profile_id&&!UUID.test(input.artist_profile_id))
   throw Error('Selecione uma conta válida.')
  if(title.length<3||title.length>160||message.length<1||message.length>3000||!ALLOWED.has(input.type))
   throw Error('Confira o título, mensagem e tipo da notificação.')
  const {data:owner,error:ownerError}=await ctx.supabase.from('profiles').select('id').eq('id',input.user_id).single()
  if(ownerError||!owner)throw Error('Artista não encontrado.')
  if(input.artist_profile_id){
   const {data:artist,error:artistError}=await ctx.supabase.from('artist_profiles').select('id').eq('id',input.artist_profile_id).eq('owner_id',input.user_id).single()
   if(artistError||!artist)throw Error('O perfil artístico não pertence à conta selecionada.')
  }
  const {data:created,error}=await ctx.supabase.from('artist_notifications').insert({
   user_id:input.user_id,artist_profile_id:input.artist_profile_id||null,
   title,message,type:input.type,action_url:actionUrl(input.action_url)
  }).select('id,user_id,artist_profile_id,title,message,type,action_url,read,created_at').single()
  if(error||!created)throw Error(error?.message||'Falha ao enviar.')
  revalidatePath('/admin/notificacoes')
  return {ok:true as const,notification:created}
 }catch(e){return {ok:false as const,error:e instanceof Error?e.message:'Falha ao enviar.'}}
}
