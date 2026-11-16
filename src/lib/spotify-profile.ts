/** Normaliza somente identificadores oficiais de perfis de ARTISTA do Spotify. */
export type SpotifyProfile={spotify_id:string|null;spotify_url:string|null;is_first_spotify_release:boolean}
export function parseSpotifyArtist(raw:string):SpotifyProfile{
 const s=raw.trim()
 if(!s)return {spotify_id:null,spotify_url:null,is_first_spotify_release:false}
 let id=s
 const uri=s.match(/^spotify:artist:([A-Za-z0-9]{22})$/)
 if(uri)id=uri[1]
 else if(/^https?:/i.test(s)){
   let url:URL
   try{url=new URL(s)}catch{throw new Error('Informe um link válido do perfil de artista no Spotify.')}
   if(url.protocol!=='https:'||url.hostname!=='open.spotify.com'||!/^\/artist\/[A-Za-z0-9]{22}\/?$/.test(url.pathname)||url.username||url.password)
    throw new Error('O endereço precisa ser um perfil oficial de artista do Spotify.')
   id=url.pathname.split('/')[2]
 }else if(s.startsWith('spotify:')||s.includes('/')||s.includes('.')||s.includes('?')||s.includes('#')){
   throw new Error('Informe o ID de 22 caracteres, URI spotify:artist: ou link oficial do artista.')
 }
 if(!/^[A-Za-z0-9]{22}$/.test(id))throw new Error('O Spotify Artist ID deve ter 22 letras e números.')
 return {spotify_id:id,spotify_url:'https://open.spotify.com/artist/'+id,is_first_spotify_release:false}
}
export function spotifyDisplay(data:Partial<SpotifyProfile>|null|undefined):SpotifyProfile{
 if(data?.is_first_spotify_release)return {spotify_id:null,spotify_url:null,is_first_spotify_release:true}
 try{return parseSpotifyArtist(data?.spotify_id||data?.spotify_url||'')}catch{return {spotify_id:null,spotify_url:null,is_first_spotify_release:false}}
}
