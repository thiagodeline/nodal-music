'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {FileEdit,Trash2} from 'lucide-react'
type Draft={id:string;title:string;updated_at:string}
export default function ReleaseDrafts({userId}:{userId:string}){
 const [rows,setRows]=useState<Draft[]>([]),[error,setError]=useState('')
 const load=async()=>{const {data,error}=await createClient().from('release_drafts').select('id,title,updated_at')
  .eq('user_id',userId).order('updated_at',{ascending:false}).limit(50)
  if(error)setError(error.message);else setRows(data||[])}
 useEffect(()=>{void load()},[userId])
 const remove=async(id:string)=>{
  if(!confirm('Excluir este rascunho?'))return
  const {error}=await createClient().from('release_drafts').delete().eq('id',id).eq('user_id',userId)
  if(error)setError(error.message);else await load()
 }
 const resume=(id:string)=>{sessionStorage.setItem('sintone_resume_release_draft',id);window.location.hash='#new'}
 return <section className="card"><h3>Meus rascunhos</h3>
  <p className="mut">Metadados salvos na sua conta. Áudios e capas precisam ser selecionados novamente ao continuar.</p>
  {error&&<p role="alert">{error}</p>}
  {!rows.length?<p className="mut">Nenhum rascunho salvo.</p>:<div className="scroll"><table><thead><tr><th>Lançamento</th><th>Atualização</th><th>Ações</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.id}><td>{r.title}</td><td>{new Date(r.updated_at).toLocaleString('pt-BR')}</td>
    <td><button className="btn ghost sm" onClick={()=>resume(r.id)}><FileEdit size={14}/> Continuar</button>
    <button className="btn ghost sm" onClick={()=>void remove(r.id)}><Trash2 size={14}/> Excluir</button></td>
   </tr>)}</tbody></table></div>}
 </section>
}
