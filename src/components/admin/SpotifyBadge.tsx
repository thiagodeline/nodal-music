'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {adminUpdateArtistSpotify} from '@/app/admin/spotify-actions'
import {Check,Copy,ExternalLink,Sparkles,Pencil,Save,X} from 'lucide-react'
import {spotifyDisplay} from '@/lib/spotify-profile'
export type SpotifyArtist={profile_id?:string;name:string;role:string;spotify_id?:string|null;spotify_url?:string|null;is_first_spotify_release?:boolean}
export default function SpotifyBadge({artist,profileId,canEdit=false}:{artist:SpotifyArtist;profileId?:string;canEdit?:boolean}){
 const router=useRouter()
 const [editing,setEditing]=useState(false),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [updated,setUpdated]=useState<string|null>(null)
 const [copied,setCopied]=useState(false)
 const sp=spotifyDisplay({spotify_id:updated||artist.spotify_id,spotify_url:updated?'https://open.spotify.com/artist/'+updated:artist.spotify_url,is_first_spotify_release:updated?false:!!artist.is_first_spotify_release})
 const quickSave=async(e:React.FormEvent)=>{e.preventDefault();if(!profileId||busy)return;setBusy(true);setError('')
  try{const result=await adminUpdateArtistSpotify(profileId,value.trim(),false)
   if(!result.ok)throw Error(result.error)
   const parsed=value.trim().match(/(?:spotify:artist:|\/artist\/)?([A-Za-z0-9]{22})(?:[?\/]|$)/)
   if(parsed)setUpdated(parsed[1]);setEditing(false);router.refresh()
  }catch(err){setError(err instanceof Error?err.message:'Não foi possível salvar o Spotify ID.')}
  finally{setBusy(false)}
 }
 return <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:9,margin:'9px 0',padding:'12px 14px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:11}}>
  <strong style={{marginRight:6,fontSize:13}}>{artist.name} <span style={{fontWeight:400,color:'#64748b'}}>({artist.role})</span></strong>
  {sp.is_first_spotify_release?<span style={{display:'inline-flex',alignItems:'center',gap:5,borderRadius:30,background:'#dbeafe',color:'#1d4ed8',fontSize:12,fontWeight:700,padding:'6px 9px'}}><Sparkles size={14}/> Primeiro lançamento · perfil novo a criar</span>:
  sp.spotify_id?<><span style={{color:'#15803d',fontSize:12,fontWeight:750}}>● Spotify ID: {sp.spotify_id}</span><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(sp.spotify_id!);setCopied(true)}catch{setCopied(false)}}} style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'7px 9px',background:'white',display:'inline-flex',alignItems:'center',gap:5,cursor:'pointer'}}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copiado':'Copiar ID'}</button><a target="_blank" rel="noopener noreferrer" href={sp.spotify_url!} style={{color:'#15803d',fontSize:12,fontWeight:800,display:'inline-flex',alignItems:'center',gap:5}}><ExternalLink size={14}/> Abrir perfil no Spotify</a></>:
  <><span className="sa-spotify-missing">Spotify não informado</span>
  {canEdit&&profileId&&<div className="sa-spotify-quick">
   <button type="button" className="sa-spotify-edit" onClick={()=>{setEditing(!editing);setError('')}} aria-expanded={editing} aria-label={'Editar Spotify de '+artist.name}><Pencil size={13}/> Editar</button>
   {editing&&<form className="sa-spotify-popover" onSubmit={e=>void quickSave(e)}>
     <label htmlFor={'spotify-'+profileId}>Spotify URL, URI ou ID</label>
     <input id={'spotify-'+profileId} autoFocus value={value} onChange={e=>setValue(e.target.value)} required maxLength={350} placeholder="https://open.spotify.com/artist/..." disabled={busy}/>
     {error&&<small role="alert" className="sa-spotify-error">{error}</small>}
     <div className="sa-spotify-popover-actions"><button type="button" onClick={()=>setEditing(false)} disabled={busy}><X size={13}/> Cancelar</button><button type="submit" disabled={busy||!value.trim()}><Save size={13}/> {busy?'Salvando':'Salvar'}</button></div>
   </form>}
  </div>}</>}
 </div>
}
