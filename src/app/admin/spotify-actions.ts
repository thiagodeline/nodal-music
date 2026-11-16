'use server'
import {revalidatePath} from 'next/cache'
import {getAdminContext} from '@/lib/admin-access'
import {parseSpotifyArtist} from '@/lib/spotify-profile'
export async function adminUpdateArtistSpotify(profileId:string,value:string,first:boolean){
 const ctx=await getAdminContext('a_and_r')
 if(!ctx)return {ok:false as const,error:'Apenas A&R ou administração geral podem editar o Spotify.'}
 if(!/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(profileId)||typeof first!=='boolean'||typeof value!=='string'||value.length>350)
  return {ok:false as const,error:'Dados inválidos.'}
 let id:string|null=null
 try{id=first?null:parseSpotifyArtist(value).spotify_id}catch(e){return {ok:false as const,error:e instanceof Error?e.message:'Spotify inválido.'}}
 const {error}=await ctx.supabase.rpc('sintone_admin_set_spotify_profile',{p_profile:profileId,p_spotify_id:id,p_first:first})
 if(error)return {ok:false as const,error:'Não foi possível atualizar o perfil: '+error.message}
 revalidatePath('/admin')
 revalidatePath('/dashboard')
 return {ok:true as const}
}
