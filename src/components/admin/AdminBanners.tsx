'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
type Banner={id:string;headline:string;body:string;cta_label:string;cta_url:string;active:boolean}
export default function AdminBanners(){
 const [rows,setRows]=useState<Banner[]>([])
 const [headline,setHeadline]=useState(''),[body,setBody]=useState('')
 const [ctaLabel,setCtaLabel]=useState('Conhecer planos'),[ctaUrl,setCtaUrl]=useState('/dashboard#plans')
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const sb=createClient()
 const load=async()=>{const {data,error}=await sb.from('dashboard_banners').select('id,headline,body,cta_label,cta_url,active').order('created_at',{ascending:false})
  if(error)setMessage(error.message);else setRows(data||[])}
 useEffect(()=>{void load()},[])
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(!ctaUrl.startsWith('/')||ctaUrl.startsWith('//'))return setMessage('Utilize um endereço interno da SINTONE.')
  setBusy(true);setMessage('')
  const {error}=await sb.from('dashboard_banners').insert({headline:headline.trim(),body:body.trim(),cta_label:ctaLabel.trim(),cta_url:ctaUrl.trim(),active:false})
  setBusy(false);setMessage(error?error.message:'Banner salvo. Ative-o na lista.')
  if(!error){setHeadline('');setBody('');await load()}
 }
 const activate=async(b:Banner)=>{
  setBusy(true);setMessage('')
  // atualização sequencial; apenas um banner ativo é utilizado (mais recente).
  if(!b.active){await sb.from('dashboard_banners').update({active:false}).eq('active',true)}
  const {error}=await sb.from('dashboard_banners').update({active:!b.active}).eq('id',b.id)
  setBusy(false);setMessage(error?error.message:'Estado atualizado.');await load()
 }
 return <section className="sa-mod-panel"><h2>Banners promocionais do artista</h2>
  <p className="sa-x-note">Crie mensagens para a página inicial. Os banners são exibidos somente quando ativados.</p>
  <form className="sa-x-edit" onSubmit={e=>void save(e)}>
   <label>Título<input required maxLength={120} value={headline} onChange={e=>setHeadline(e.target.value)}/></label>
   <label>Texto<input maxLength={700} value={body} onChange={e=>setBody(e.target.value)}/></label>
   <label>Texto do botão<input required maxLength={60} value={ctaLabel} onChange={e=>setCtaLabel(e.target.value)}/></label>
   <label>Destino interno<input required maxLength={200} value={ctaUrl} onChange={e=>setCtaUrl(e.target.value)}/></label>
   <button className="sa-approve" type="submit" disabled={busy}>Criar banner</button>
  </form>
  {message&&<p role="status">{message}</p>}
  <div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>Título</th><th>Destino</th><th>Status</th><th>Ação</th></tr></thead>
   <tbody>{rows.map(b=><tr key={b.id}><td>{b.headline}</td><td>{b.cta_url}</td><td>{b.active?'Ativo':'Inativo'}</td><td>
    <button className="sa-action-pill" disabled={busy} onClick={()=>void activate(b)}>{b.active?'Desativar':'Ativar'}</button>
   </td></tr>)}</tbody>
  </table></div>
 </section>
}
