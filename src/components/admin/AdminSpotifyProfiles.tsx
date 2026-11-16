'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {adminUpdateArtistSpotify} from '@/app/admin/spotify-actions'
import SpotifyBadge,{type SpotifyArtist} from './SpotifyBadge'
import {spotifyDisplay,parseSpotifyArtist} from '@/lib/spotify-profile'
export type AdminSpotifyProfile=SpotifyArtist&{id:string;owner_id:string}
export default function AdminSpotifyProfiles({profiles}:{profiles:AdminSpotifyProfile[]}){
 const router=useRouter()
 const [editing,setEditing]=useState<string|null>(null)
 const [value,setValue]=useState(''),[first,setFirst]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const open=(p:AdminSpotifyProfile)=>{const sp=spotifyDisplay(p);setEditing(p.id);setValue(sp.spotify_url||'');setFirst(sp.is_first_spotify_release);setMessage('')}
 async function save(){if(!editing)return;setBusy(true);setMessage('')
  try{const parsed=first?null:parseSpotifyArtist(value);void parsed
   const result=await adminUpdateArtistSpotify(editing,value,first)
   if(!result.ok)throw Error(result.error)
   setEditing(null);router.refresh()
  }catch(e){setMessage(e instanceof Error?e.message:'Erro ao salvar')}finally{setBusy(false)}
 }
 return <section style={{margin:'22px 0',padding:'17px',border:'1px solid #dbeafe',borderRadius:14}}>
 <h4 style={{fontSize:15,fontWeight:800,marginBottom:8}}>Perfis de artistas e Spotify</h4>
 {profiles.length===0?<p style={{color:'#64748b',fontSize:13}}>Nenhum perfil artístico vinculado a esta conta.</p>:profiles.map(p=><div key={p.id} style={{marginBottom:14}}>
  <SpotifyBadge artist={p}/><button type="button" className="sa-action-pill" onClick={()=>open(p)}>Editar Spotify de {p.name}</button>
  {editing===p.id&&<div style={{padding:13,marginTop:12,background:'#f8fafc',borderRadius:10,display:'grid',gap:12}}>
   <label style={{fontSize:13,fontWeight:700}}>Link / URI / ID do Spotify<input className="sa-x-input" value={value} disabled={first||busy} onChange={e=>setValue(e.target.value)} placeholder="https://open.spotify.com/artist/..." maxLength={350}/></label>
   <label style={{display:'flex',alignItems:'center',gap:9,fontSize:13}}><input type="checkbox" checked={first} disabled={busy} onChange={e=>setFirst(e.target.checked)}/> Primeiro lançamento no Spotify</label>
   <div style={{display:'flex',gap:9}}><button className="sa-x-button" type="button" disabled={busy} onClick={()=>void save()}>{busy?'Salvando…':'Salvar Spotify'}</button><button type="button" className="sa-action-pill" onClick={()=>setEditing(null)}>Cancelar</button></div>
   {message&&<p role="status">{message}</p>}
  </div>}</div>)}
 </section>
}
