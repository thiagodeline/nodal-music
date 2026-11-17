'use server'
import {getAdminContext} from '@/lib/admin-access'

const uuid=/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const error=(message:string)=>({ok:false as const,message})

/** A tarefa usa URLs temporárias; nunca contém chaves do Supabase ou senha iMusics. */
export async function prepareImusicsSingle(releaseId:string){
 const ctx=await getAdminContext('ingestion_manager')
 if(!ctx)return error('Acesso restrito à equipe de ingestão.')
 if(!uuid.test(releaseId))return error('Lançamento inválido.')
 const sb=ctx.supabase
 const {data:release,error:releaseError}=await sb.from('releases')
  .select('id,artist_id,title,type,status,main_artist,genre,explicit,label_name,cover_path,audio_path,release_date')
  .eq('id',releaseId).maybeSingle()
 if(releaseError||!release)return error('Lançamento não encontrado.')
 if(release.status!=='approved')return error('Somente lançamentos aprovados podem ser preparados.')
 if(!['single','singles'].includes(String(release.type||'').toLowerCase()))
  return error('Esta versão do robô aceita apenas Single.')
 const {data:tracks,error:tracksError}=await sb.from('release_tracks')
  .select('title,audio_path,genre,explicit,position').eq('release_id',releaseId).order('position',{ascending:true})
 if(tracksError)return error('Falha ao consultar as faixas.')
 if((tracks||[]).length>1)return error('Mais de uma faixa: utilize o fluxo de álbum.')
 const track=tracks?.[0]
 const audioPath=track?.audio_path||release.audio_path
 if(!audioPath||!audioPath.startsWith(release.artist_id+'/'))return error('Áudio ausente ou com caminho inválido.')
 if(!release.cover_path||!release.cover_path.startsWith(release.artist_id+'/'))
  return error('Capa ausente ou com caminho inválido.')
 const [audio,cover]=await Promise.all([
  sb.storage.from('audio').createSignedUrl(audioPath,600),
  sb.storage.from('covers').createSignedUrl(release.cover_path,600)
 ])
 if(audio.error||!audio.data?.signedUrl)return error('Falha ao liberar temporariamente o arquivo de áudio.')
 if(cover.error||!cover.data?.signedUrl)return error('Falha ao liberar temporariamente a capa.')
 return {ok:true as const,job:{
  id:release.id,artist:String(release.main_artist||''),title:String(track?.title||release.title||''),
  genre:String(track?.genre||release.genre||''),explicit:track?.explicit??release.explicit??false,
  label:String(release.label_name||'SINTONE'),
  audioUrl:audio.data.signedUrl,coverUrl:cover.data.signedUrl
 }}
}
