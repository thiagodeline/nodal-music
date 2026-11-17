'use client'
import {useState} from 'react'
import {ExternalLink,Save} from 'lucide-react'
import {parseSpotifyArtist,spotifyDisplay,type SpotifyProfile} from '@/lib/spotify-profile'
type Props={initial:Partial<SpotifyProfile>&{spotify_artist_id?:string|null;apple_artist_id?:string|null};save:(spotify:string,first:boolean,apple:string)=>Promise<void>;includeApple?:boolean}
export default function SpotifyProfileFields({initial,save,includeApple=false}:Props){
 const current=spotifyDisplay({spotify_id:initial.spotify_id||initial.spotify_artist_id||null,spotify_url:initial.spotify_url||null,is_first_spotify_release:!!initial.is_first_spotify_release})
 const [spotify,setSpotify]=useState(current.spotify_url||''),[first,setFirst]=useState(current.is_first_spotify_release),[apple,setApple]=useState(initial.apple_artist_id||'')
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('')
 async function submit(){setStatus('');try{
  if(!first)parseSpotifyArtist(spotify)
  setBusy(true);await save(spotify,first,apple);setStatus('Spotify salvo com sucesso.')
 }catch(e){setStatus(e instanceof Error?e.message:'Falha ao salvar.')}finally{setBusy(false)}}
 let preview:ReturnType<typeof spotifyDisplay>|null=null
 try{preview=first?spotifyDisplay({is_first_spotify_release:true}):parseSpotifyArtist(spotify)}catch{}
 return <div className="spotify-fields spotify-fields-dark">
 <label style={{display:'grid',gap:6,fontWeight:700,fontSize:13}}>Link do perfil no Spotify
 <input value={spotify} disabled={first||busy} placeholder="https://open.spotify.com/artist/..." onChange={e=>setSpotify(e.target.value)} maxLength={300} className="spotify-profile-input"/></label>
 <label style={{display:'flex',gap:9,alignItems:'center',margin:'12px 0',fontSize:13}}><input type="checkbox" checked={first} disabled={busy} onChange={e=>setFirst(e.target.checked)}/> Este é o primeiro lançamento deste artista no Spotify</label>
 {includeApple&&<label style={{display:'grid',gap:6,fontWeight:650,fontSize:13}}>Apple Music Artist ID<input value={apple} disabled={busy} onChange={e=>setApple(e.target.value)} placeholder="ID ou link Apple Music" className="spotify-profile-input"/></label>}
 <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',marginTop:12}}>
 {first?<small style={{color:'#93c5fd'}}>Primeiro lançamento · novo perfil a ser criado pela plataforma</small>:preview?.spotify_url?<><small>Spotify ID: {preview.spotify_id}</small><a href={preview.spotify_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',gap:5,alignItems:'center',color:'#1DB954'}}><ExternalLink size={14}/> Abrir perfil</a></>:<small>Informe o perfil existente ou marque primeiro lançamento.</small>}
 <button type="button" disabled={busy} onClick={()=>void submit()} style={{display:'inline-flex',gap:6,alignItems:'center',border:'0',padding:'10px 14px',borderRadius:9,background:'#2563eb',color:'#fff',fontWeight:700,cursor:'pointer'}}><Save size={15}/>{busy?'Salvando…':'Salvar Spotify'}</button></div>
 {status&&<p role="status" style={{fontSize:12,marginTop:8}}>{status}</p>}
 </div>
}
