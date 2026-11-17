import {getAdminContext} from '@/lib/admin-access'
import {zipStream,zipTextEntry,zipRemoteEntry} from '@/lib/download-zip'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=300

const validId=/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const safe=(value:unknown)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch))
const display=(value:unknown)=>value===null||value===undefined||value===''?'Não informado':String(value)
const row=(key:string,value:unknown)=>'<tr><th>'+safe(key)+'</th><td>'+safe(display(value))+'</td></tr>'
const fmtList=(value:unknown)=>Array.isArray(value)?value.join(', '):value
const failure=(message:string,status:number)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}})
const fileName=(raw:string)=>raw.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,75)||'lancamento'
type Params={params:Promise<{id:string}>}
export async function GET(_request:Request,{params}:Params){
 const ctx=await getAdminContext('ingestion_manager')
 if(!ctx)return failure('Acesso restrito à equipe de ingestão.',403)
 const {id}=await params
 if(!validId.test(id))return failure('Identificador inválido.',400)
 const sb=ctx.supabase
 const [rel,tracks,artists]=await Promise.all([
  sb.from('releases').select('id,artist_id,title,type,main_artist,featured_artists,artists,genre,subgenre,language,explicit,upc,isrc,release_date,release_time,cover_path,audio_path,label_name,p_line,c_line,platforms,territories,composers,producers,lyricists,credits,status,delivery_status,release_mode').eq('id',id).maybeSingle(),
  sb.from('release_tracks').select('id,position,title,genre,subgenre,isrc,audio_path,featured_artists,composers,producers,lyricists,credits,contributors,explicit,language,is_original,is_instrumental,is_remix').eq('release_id',id).order('position',{ascending:true}),
  sb.from('release_artists').select('name,role,spotify_id,spotify_url,is_first_spotify_release').eq('release_id',id)
 ])
 if(rel.error||!rel.data)return failure('Lançamento não encontrado ou sem permissão.',404)
 if(tracks.error||artists.error)return failure('Não foi possível consultar todos os metadados.',500)
 const release=rel.data
 const participants=(artists.data||[]).length?artists.data:release.artists||[]
 const trackList=tracks.data||[]
 const metadata={exportedAt:new Date().toISOString(),source:'SINTONE — conferência manual para iMusics',
  release:{
   id:release.id,title:release.title,type:release.type,mainArtist:release.main_artist,
   featuredArtists:release.featured_artists,genre:release.genre,subgenre:release.subgenre,
   language:release.language,explicit:release.explicit,upc:release.upc,isrc:release.isrc,
   releaseDate:release.release_date,releaseTime:release.release_time,label:release.label_name,
   phonographicCopyright:release.p_line,copyright:release.c_line,platforms:release.platforms,
   territories:release.territories,composers:release.composers,producers:release.producers,
   lyricists:release.lyricists,credits:release.credits,releaseMode:release.release_mode,
   status:release.status,deliveryStatus:release.delivery_status
  },artists:participants,tracks:trackList.map(({audio_path,...track})=>track)}
 const r=metadata.release
 const releaseFields:[string,unknown][]=[
  ['Título do lançamento',r.title],['Tipo',r.type],['Artista principal',r.mainArtist],
  ['Participações',r.featuredArtists],['Gênero',r.genre],['Subgênero',r.subgenre],
  ['Idioma',r.language],['Explícito',r.explicit===null?'Não informado':r.explicit?'Sim':'Não'],
  ['UPC',r.upc],['ISRC',r.isrc],['Data de lançamento',r.releaseDate],['Horário',r.releaseTime],
  ['Selo',r.label],['Copyright ℗',r.phonographicCopyright],['Copyright ©',r.copyright],
  ['Compositores',r.composers],['Produtores',r.producers],['Letristas',r.lyricists],
  ['Créditos',r.credits],['Plataformas',fmtList(r.platforms)],['Territórios',fmtList(r.territories)],
  ['Modalidade',r.releaseMode],['Status SINTONE',r.status],['Entrega',r.deliveryStatus]
 ]
 const artistHtml=(Array.isArray(participants)?participants:[])
  .map((a:{name?:string;role?:string;spotify_id?:string|null;spotify_url?:string|null;is_first_spotify_release?:boolean})=>
   '<article><h3>'+safe(a.name)+'</h3><table>'+
   row('Função',a.role)+row('Spotify ID',a.spotify_id)+row('Spotify URL',a.spotify_url)+
   row('Primeiro lançamento no Spotify',a.is_first_spotify_release?'Sim':'Não')+'</table></article>').join('')
 const trackHtml=trackList.map((t,i)=>'<article><h3>'+safe((i+1)+'. '+t.title)+'</h3><table>'+[
  ['ISRC',t.isrc],['Gênero',t.genre||r.genre],['Subgênero',t.subgenre||r.subgenre],
  ['Participações',t.featured_artists],['Compositores',t.composers],
  ['Produtores',t.producers],['Letristas',t.lyricists],['Créditos',t.credits],
  ['Colaboradores',JSON.stringify(t.contributors||[])],
  ['Explícito',t.explicit?'Sim':'Não'],['Idioma',t.language],
  ['Original',t.is_original?'Sim':'Não'],['Instrumental',t.is_instrumental?'Sim':'Não'],
  ['Remix',t.is_remix?'Sim':'Não']
 ].map(([name,value])=>row(String(name),value)).join('')+'</table></article>').join('')
 const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>Metadados · '+safe(release.title)+'</title><style>'+
  'body{font:15px/1.55 system-ui,Arial,sans-serif;color:#1b2b3e;background:#f3f6fa;margin:0;padding:32px}main{max-width:900px;margin:auto}'+
  'header,section{background:white;border:1px solid #dee6ee;border-radius:13px;padding:24px;margin-bottom:18px}'+
  'h1{margin:0 0 6px;font-size:26px}h2{font-size:19px;margin:0 0 14px}h3{font-size:16px}'+
  'p{color:#526479}table{border-collapse:collapse;width:100%}th,td{padding:9px 12px;text-align:left;border-bottom:1px solid #e8edf2;vertical-align:top;overflow-wrap:anywhere}'+
  'th{width:32%;color:#47566b;font-weight:600}article+article{margin-top:24px}small{color:#64748b}'+
  '@media print{body{background:#fff;padding:0}header,section{break-inside:avoid}}'+
  '</style></head><body><main><header><small>SINTONE · Pacote para cadastro manual</small><h1>'+safe(release.title)+'</h1>'+
  '<p>Os metadados abaixo refletem o cadastro na SINTONE. Confira tudo antes de enviar à iMusics.</p></header>'+
  '<section><h2>Dados do lançamento</h2><table>'+releaseFields.map(([name,value])=>row(name,value)).join('')+
  '</table></section><section><h2>Artistas</h2>'+(artistHtml||'<p>Sem artistas vinculados.</p>')+
  '</section><section><h2>Faixas</h2>'+(trackHtml||'<p>Sem faixas individuais.</p>')+
  '</section></main></body></html>'
 const jobs:{name:string;bucket:'audio'|'covers';path:string}[]=[]
 if(release.cover_path){
  if(!release.cover_path.startsWith(release.artist_id+'/'))return failure('Caminho da capa inconsistente.',409)
  const ext=release.cover_path.toLowerCase().endsWith('.png')?'png':'jpg'
  jobs.push({name:'capa.'+ext,bucket:'covers',path:release.cover_path})
 }
 for(const [i,t] of trackList.entries()){
  if(!t.audio_path)continue
  if(!t.audio_path.startsWith(release.artist_id+'/'))return failure('Caminho de áudio inconsistente.',409)
  const ext=t.audio_path.toLowerCase().endsWith('.flac')?'flac':t.audio_path.toLowerCase().endsWith('.mp3')?'mp3':'wav'
  jobs.push({name:'audio/'+String(i+1).padStart(2,'0')+'-'+fileName(t.title)+'.'+ext,bucket:'audio',path:t.audio_path})
 }
 if(!trackList.length&&release.audio_path){
  if(!release.audio_path.startsWith(release.artist_id+'/'))return failure('Caminho de áudio inconsistente.',409)
  const ext=release.audio_path.toLowerCase().endsWith('.flac')?'flac':release.audio_path.toLowerCase().endsWith('.mp3')?'mp3':'wav'
  jobs.push({name:'audio/01-'+fileName(release.title)+'.'+ext,bucket:'audio',path:release.audio_path})
 }
 if(!jobs.length)return failure('Não existem arquivos de áudio ou capa para baixar.',409)
 // Confirma acesso aos arquivos antes de começar a enviar bytes ao navegador.
 const assets=await Promise.all(jobs.map(async job=>{
  const signed=await sb.storage.from(job.bucket).createSignedUrl(job.path,600)
  if(signed.error||!signed.data?.signedUrl)throw Error('Falha ao autorizar '+job.name)
  const downloaded=await fetch(signed.data.signedUrl,{cache:'no-store',redirect:'error'})
  if(!downloaded.ok||!downloaded.body)throw Error('Arquivo indisponível: '+job.name)
  return {name:job.name,body:downloaded.body}
 })).catch(()=>null)
 if(!assets)return failure('Um ou mais arquivos não puderam ser acessados. Confira o Storage e tente novamente.',502)
 const entries=[
  zipTextEntry('METADADOS-LEIA-ME.html',html),
  zipTextEntry('metadados.json',JSON.stringify(metadata,null,2)),
  ...assets.map(asset=>zipRemoteEntry(asset.name,asset.body))
 ]
 const filename='SINTONE-'+fileName(release.main_artist||'artista')+'-'+fileName(release.title)+'.zip'
 return new Response(zipStream(entries),{
  status:200,headers:{
   'Content-Type':'application/zip',
   'Content-Disposition':'attachment; filename="'+filename+'"',
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
  }
 })
}
