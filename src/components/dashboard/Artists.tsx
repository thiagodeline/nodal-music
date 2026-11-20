'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Plus,Trash2} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {parseSpotifyArtist} from '@/lib/spotify-profile'
import SpotifyProfileFields from './SpotifyProfileFields'
import {Data,Empty} from './ui'
type ArtistRow={id:string;name:string;spotify_id:string|null;spotify_url:string|null;spotify_artist_id:string|null;is_first_spotify_release:boolean}
export default function Artists({d}:{d:Data}){
 const sb=useMemo(()=>createClient(),[])
 const [rows,setRows]=useState<ArtistRow[]>([]),[adding,setAdding]=useState(false),[name,setName]=useState(''),[msg,setMsg]=useState('')
 const load=useCallback(async()=>{const {data,error}=await sb.from('artist_profiles').select('id,name,spotify_id,spotify_url,spotify_artist_id,is_first_spotify_release').eq('owner_id',d.me.id).order('created_at');if(error)setMsg(error.message);else setRows(data||[])},[sb,d.me.id])
 useEffect(()=>{void load()},[load])
 async function add(){if(!name.trim())return setMsg('Informe o nome do artista.');const {error}=await sb.from('artist_profiles').insert({owner_id:d.me.id,name:name.trim()});if(error)return setMsg(error.message);setName('');setAdding(false);setMsg('Perfil criado. Informe o Spotify antes de enviar lançamentos.');void load()}
 async function save(row:ArtistRow,spotify:string,first:boolean){
  let parsed
  try{parsed=first?{spotify_id:null,spotify_url:null,is_first_spotify_release:true}:parseSpotifyArtist(spotify)}catch(e){throw e}
  const {error}=await sb.from('artist_profiles').update({...parsed,spotify_artist_id:parsed.spotify_id}).eq('id',row.id).eq('owner_id',d.me.id)
  if(error)throw Error(error.message)
  setMsg('Perfil atualizado.');await load()
 }
 async function remove(id:string){if(!confirm('Remover este perfil artístico?'))return;const {error}=await sb.from('artist_profiles').delete().eq('id',id).eq('owner_id',d.me.id);if(error)setMsg(error.message);void load()}
 return <section className="nd-artists-page"><div className="nd-artists-header"><div><span className="nd-artists-kicker">SINTONE / PERFIS</span><h2>Meus artistas</h2><p>Organize seus artistas e vincule o perfil correto do Spotify antes de distribuir.</p></div><button className="nd-artists-add" type="button" onClick={()=>setAdding(!adding)} aria-expanded={adding}><Plus size={16}/> Adicionar artista</button></div>
 {adding&&<div className="nd-artist-add-form"><label>Nome do artista<input maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><button className="nd-artists-add" type="button" onClick={()=>void add()}>Criar perfil</button></div>}
 {msg&&<p role="status">{msg}</p>}
 {rows.length?<div className="nd-artists-list">{rows.map(row=><article key={row.id} className="nd-artist-profile-card">
 <div className="nd-artist-card-header"><strong>{row.name}</strong><button className="nd-artist-delete" type="button" onClick={()=>void remove(row.id)}><Trash2 size={15}/> Excluir</button></div>
 <SpotifyProfileFields key={row.id} initial={row} save={(spotify,first)=>save(row,spotify,first)} />
 </article>)}</div>:<Empty title="Nenhum artista cadastrado" text="Cadastre um perfil para vincular o Spotify ao seu lançamento."/>}</section>
}
