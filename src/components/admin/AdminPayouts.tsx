'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {adminMarkPayoutPaid} from '@/app/admin/operations-actions'
type Withdrawal={id:string;artist_id:string;amount:number;pix_key:string;status:string;created_at:string}
export default function AdminPayouts(){
 const sb=useMemo(()=>createClient(),[])
 const [rows,setRows]=useState<Withdrawal[]>([]),[users,setUsers]=useState<Record<string,string>>({})
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState('')
 const [selected,setSelected]=useState<string|null>(null),[reference,setReference]=useState('')
 const load=useCallback(async()=>{
  const [{data,error:e},{data:profiles}]=await Promise.all([
   sb.from('withdrawals').select('id,artist_id,amount,pix_key,status,created_at').order('created_at',{ascending:false}).limit(300),
   sb.from('profiles').select('id,artist_name,email').limit(1000)
  ])
  if(e)setError('Erro ao carregar saques: '+e.message)
  else setRows((data||[]) as Withdrawal[])
  setUsers(Object.fromEntries((profiles||[]).map(p=>[p.id,p.artist_name||p.email||p.id])))
  setLoading(false)
 },[sb])
 useEffect(()=>{void load()},[load])
 const send=async(id:string)=>{
  if(busy||reference.trim().length<8)return
  if(!confirm('Confirma que o PIX foi efetivamente transferido fora da SINTONE e você possui comprovante?'))return
  setBusy(id);setError('')
  try{
   const result=await adminMarkPayoutPaid(id,reference)
   if(!result.ok)setError(result.error)
   else{setSelected(null);setReference('');await load()}
  }catch{setError('Não foi possível registrar o repasse.')}
  finally{setBusy('')}
 }
 return <section className="sa-mod-panel">
  <h2>Saques e repasses</h2><p className="sa-x-note">A SINTONE não transfere PIX ou Stripe automaticamente. Marque como pago somente após executar o pagamento externo e conferir o comprovante.</p>
  {error&&<p role="alert" className="sa-error">{error}</p>}
  {loading?<p>Carregando solicitações...</p>:<div className="sa-table-scroll"><table className="sa-mod-table">
   <thead><tr><th>Artista</th><th>Data</th><th>Valor</th><th>Chave PIX</th><th>Status</th><th>Ação</th></tr></thead>
   <tbody>{rows.map(w=><tr key={w.id}><td>{users[w.artist_id]||w.artist_id}</td><td>{new Date(w.created_at).toLocaleDateString('pt-BR')}</td>
    <td>{Number(w.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>{w.pix_key}</td><td>{w.status==='pending'?'Pendente':w.status==='paid'?'Pago':'Rejeitado'}</td>
    <td>{w.status==='pending'&&<button type="button" onClick={()=>setSelected(selected===w.id?null:w.id)}>Registrar PIX pago</button>}
     {selected===w.id&&<div><label>Referência do comprovante<input value={reference} maxLength={240} onChange={e=>setReference(e.target.value)} placeholder="ID do comprovante bancário"/></label><button type="button" disabled={busy===w.id||reference.trim().length<8} onClick={()=>void send(w.id)}>Confirmar repasse efetuado</button></div>}</td></tr>)}</tbody>
  </table>{!rows.length&&<p>Nenhuma solicitação de saque registrada.</p>}</div>}
 </section>
}
