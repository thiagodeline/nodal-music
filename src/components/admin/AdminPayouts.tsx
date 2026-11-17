'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {Copy,Paperclip,Wallet} from 'lucide-react'
import AdminSkeleton from './AdminSkeleton'
type Withdrawal={id:string;artist_id:string;amount:number;pix_key:string;status:string;created_at:string}
export default function AdminPayouts(){
 const sb=useMemo(()=>createClient(),[])
 const [rows,setRows]=useState<Withdrawal[]>([]),[users,setUsers]=useState<Record<string,string>>({})
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState('')
 const [selected,setSelected]=useState<string|null>(null),[reference,setReference]=useState('')
 const [receipt,setReceipt]=useState<File|null>(null),[copied,setCopied]=useState('')
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
  if(busy||reference.trim().length<8||!receipt)return
  if(!confirm('Confirma que o PIX foi efetivamente transferido fora da SINTONE e você possui comprovante?'))return
  setBusy(id);setError('')
  try{
   const form=new FormData()
   form.set('withdrawalId',id);form.set('reference',reference);form.set('receipt',receipt)
   const response=await fetch('/api/admin/payout-receipt',{method:'POST',body:form})
   const result=await response.json()
   if(!response.ok)setError(result.error||'Falha ao anexar comprovante')
   else{setSelected(null);setReference('');setReceipt(null);await load()}
  }catch{setError('Não foi possível registrar o repasse.')}
  finally{setBusy('')}
 }
 return <section className="sa-mod-panel">
  <p className="sa-x-note">A SINTONE não transfere PIX ou Stripe automaticamente. Marque como pago somente após executar o pagamento externo e conferir o comprovante.</p>
  {error&&<p role="alert" className="sa-error">{error}</p>}
  {loading?<AdminSkeleton/>:<div className="sa-table-scroll"><table className="sa-mod-table">
   <thead><tr><th>Artista</th><th>Data</th><th>Valor</th><th>Chave PIX</th><th>Status</th><th>Ação</th></tr></thead>
   <tbody>{rows.map(w=><tr key={w.id}><td>{users[w.artist_id]||w.artist_id}</td><td>{new Date(w.created_at).toLocaleDateString('pt-BR')}</td>
    <td>{Number(w.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span>{w.pix_key}</span><button type="button" className="sa-action-pill" onClick={()=>void navigator.clipboard.writeText(w.pix_key).then(()=>setCopied(w.id)).catch(()=>setError('Não foi possível copiar a chave PIX.'))}><Copy size={14}/>{copied===w.id?'Copiado':'Copiar chave PIX'}</button></div></td><td>{w.status==='pending'?'Pendente':w.status==='paid'?'Pago':'Rejeitado'}</td>
    <td>{w.status==='pending'&&<button type="button" onClick={()=>{setSelected(selected===w.id?null:w.id);setReceipt(null)}}>Registrar PIX pago</button>}
     {selected===w.id&&<div><label>Referência do comprovante<input value={reference} maxLength={240} onChange={e=>setReference(e.target.value)} placeholder="ID do comprovante bancário"/></label><label className="sa-payout-file"><span><Paperclip size={14}/> Anexar comprovante PIX (obrigatório)</span>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e=>setReceipt(e.target.files?.[0]||null)}/>
      <small>{receipt?receipt.name:'PDF, PNG ou JPG até 5 MB'}</small>
     </label>
     <button type="button" disabled={busy===w.id||reference.trim().length<8||!receipt} onClick={()=>void send(w.id)}>Confirmar repasse efetuado</button></div>}</td></tr>)}</tbody>
  </table>{!rows.length&&<div className="sa-empty"><Wallet size={36}/><h3>Nenhum saque pendente no momento</h3><p>As solicitações de saque aparecerão aqui.</p></div>}</div>}
 </section>
}
