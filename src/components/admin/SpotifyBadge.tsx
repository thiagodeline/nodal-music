'use client'
import {useState} from 'react'
import {Check,Copy,ExternalLink,Sparkles} from 'lucide-react'
import {spotifyDisplay,type SpotifyProfile} from '@/lib/spotify-profile'
export type SpotifyArtist={profile_id?:string;name:string;role:string;spotify_id?:string|null;spotify_url?:string|null;is_first_spotify_release?:boolean}
export default function SpotifyBadge({artist}:{artist:SpotifyArtist}){
 const [copied,setCopied]=useState(false)
 const sp=spotifyDisplay({spotify_id:artist.spotify_id,spotify_url:artist.spotify_url,is_first_spotify_release:!!artist.is_first_spotify_release})
 return <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:9,margin:'9px 0',padding:'12px 14px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:11}}>
  <strong style={{marginRight:6,fontSize:13}}>{artist.name} <span style={{fontWeight:400,color:'#64748b'}}>({artist.role})</span></strong>
  {sp.is_first_spotify_release?<span style={{display:'inline-flex',alignItems:'center',gap:5,borderRadius:30,background:'#dbeafe',color:'#1d4ed8',fontSize:12,fontWeight:700,padding:'6px 9px'}}><Sparkles size={14}/> Primeiro lançamento · perfil novo a criar</span>:
  sp.spotify_id?<><span style={{color:'#15803d',fontSize:12,fontWeight:750}}>● Spotify ID: {sp.spotify_id}</span><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(sp.spotify_id!);setCopied(true)}catch{setCopied(false)}}} style={{border:'1px solid #cbd5e1',borderRadius:8,padding:'7px 9px',background:'white',display:'inline-flex',alignItems:'center',gap:5,cursor:'pointer'}}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copiado':'Copiar ID'}</button><a target="_blank" rel="noopener noreferrer" href={sp.spotify_url!} style={{color:'#15803d',fontSize:12,fontWeight:800,display:'inline-flex',alignItems:'center',gap:5}}><ExternalLink size={14}/> Abrir perfil no Spotify</a></>:
  <span style={{color:'#b45309',fontSize:12}}>Spotify não informado</span>}
 </div>
}
