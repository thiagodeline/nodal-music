'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {Plus,Trash2} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {parseSpotifyArtist} from '@/lib/spotify-profile'
import SpotifyProfileFields from './SpotifyProfileFields'
import {Data,Empty} from './ui'
type ArtistRow={id:string;name:string;spotify_id:string|null;spotify_url:string|null;spotify_artist_id:string|null;apple_artist_id:string|null;is_first_spotify_release:boolean}
const apId=(s:string)=>{const m=s.match(/(\d{5,})\D*$/);return m?m[1]:s.trim()}
export default function Artists({d}:{d:Data}){
 const sb=useMemo(()=>createClient(),[])
 const [rows,setRows]=useState<ArtistRow[]>([]),[adding,setAdding]=useState(false),[name,setName]=useState(''),[msg,setMsg]=useState('')
 const load=useCallback(async()=>{const {data,error}=await sb.from('artist_profiles').select('id,name,spotify_id,spotify_url,spotify_artist_id,apple_artist_id,is_first_spotify_release').eq('owner_id',d.me.id).order('created_at');if(error)setMsg(error.message);else setRows(data||[])},[sb,d.me.id])
 useEffect(()=>{void load()},[load])
 async function add(){if(!name.trim())return setMsg('Informe o nome do artista.');const {error}=await sb.from('artist_profiles').insert({owner_id:d.me.id,name:name.trim()});if(error)return setMsg(error.message);setName('');setAdding(false);setMsg('Perfil criado. Informe o Spotify antes de enviar lançamentos.');void load()}
 async function save(row:ArtistRow,spotify:string,first:boolean,apple:string){
  let parsed
  try{parsed=first?{spotify_id:null,spotify_url:null,is_first_spotify_release:true}:parseSpotifyArtist(spotify)}catch(e){throw e}
  const ap=apId(apple)
  if(ap&&!/^\d+$/.test(ap))throw Error('O ID do Apple Music precisa conter somente números.')
  const {error}=await sb.from('artist_profiles').update({...parsed,spotify_artist_id:parsed.spotify_id,apple_artist_id:ap||null}).eq('id',row.id).eq('owner_id',d.me.id)
  if(error)throw Error(error.message)
  setMsg('Perfil atualizado.');await load()
 }
 async function remove(id:string){if(!confirm('Remover este perfil artístico?'))return;const {error}=await sb.from('artist_profiles').delete().eq('id',id).eq('owner_id',d.me.id);if(error)setMsg(error.message);void load()}
 return <div className="card"><div className="head-row"><div><h3>Meus artistas</h3><p className="mut">Identifique corretamente os perfis do Spotify antes de distribuir.</p></div><button className="btn" type="button" onClick={()=>setAdding(!adding)}><Plus size={15}/> Adicionar artista</button></div>
 {adding&&<div className="ap"><label>Nome do artista<input maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn" type="button" onClick={()=>void add()}>Criar perfil</button></div>}
 {msg&&<p role="status">{msg}</p>}
 {rows.length?<div style={{display:'grid',gap:18}}>{rows.map(row=><div key={row.id} className="nd-artist-profile-card">
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:14}}><strong>{row.name}</strong><button className="btn bad sm" type="button" onClick={()=>void remove(row.id)}><Trash2 size={14}/> Excluir</button></div>
 <SpotifyProfileFields key={row.id} initial={row} includeApple save={(spotify,first,apple)=>save(row,spotify,first,apple)} />
 </div>)}</div>:<Empty title="Nenhum artista cadastrado" text="Cadastre um perfil para vincular o Spotify ao seu lançamento."/>}</div>
}
