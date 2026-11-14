'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createBillingPlan,registerMercadoPagoPlan } from '@/app/admin/actions'
import { CreditCard, LoaderCircle } from 'lucide-react'
type Plan={id:string;name:string;description:string;price_brl:number;frequency:number;frequency_type:string;active:boolean;mp_plan_id:string|null}
export default function AdminBilling(){
 const sb=useMemo(()=>createClient(),[])
 const [plans,setPlans]=useState<Plan[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [msg,setMsg]=useState('')
 const [name,setName]=useState('')
 const [description,setDescription]=useState('')
 const [price,setPrice]=useState('')
 const [frequency,setFrequency]=useState<1|12>(1)
 const load=useCallback(async()=>{
  const {data,error}=await sb.from('billing_plans')
    .select('id,name,description,price_brl,frequency,frequency_type,active,mp_plan_id')
    .order('created_at',{ascending:false})
  if(error)setMsg('Falha ao carregar os planos: '+error.message)
  else setPlans((data??[]) as Plan[])
  setLoading(false)
 },[sb])
 useEffect(()=>{void load()},[load])
 async function save(e:React.FormEvent){
  e.preventDefault()
  if(busy)return
  setBusy('create');setMsg('')
  try{
   const result=await createBillingPlan({name,description,price:Number(price.replace(',','.')),frequency})
   setMsg(result.message||'')
   if(result.ok){setName('');setDescription('');setPrice('');await load()}
  }finally{setBusy('')}
 }
 async function sync(id:string){
  setBusy(id);setMsg('')
  try{const result=await registerMercadoPagoPlan(id);setMsg(result.message||'');await load()}
  finally{setBusy('')}
 }
 return <div className="sa-billing">
  <div className="sa-billing-heading"><CreditCard size={24}/><div><h2>Planos e assinaturas</h2><p>Mercado Pago · Catálogo em preparação. Planos novos ficam inativos até a integração de cobrança ser validada.</p></div></div>
  <form className="sa-billing-form" onSubmit={e=>void save(e)}>
   <h3>Criar plano</h3>
   <div className="sa-billing-grid">
    <label>Nome do plano<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Profissional"/></label>
    <label>Preço em reais<input required inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Ex.: 29,90"/></label>
    <label>Periodicidade<select value={frequency} onChange={e=>setFrequency(Number(e.target.value) as 1|12)}><option value={1}>Mensal</option><option value={12}>Anual</option></select></label>
   </div>
   <label>Descrição<input maxLength={500} value={description} onChange={e=>setDescription(e.target.value)}/></label>
   <button type="submit" className="sa-approve" disabled={!!busy}>{busy==='create'?<LoaderCircle size={16}/>:null} Salvar rascunho</button>
  </form>
  {msg&&<p role="status" className="sa-billing-msg">{msg}</p>}
  <div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>Plano</th><th>Preço</th><th>Período</th><th>Integração</th><th>Status</th><th>Ação</th></tr></thead>
   <tbody>{plans.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small className="sa-ticket-email">{p.description}</small></td><td>{Number(p.price_brl).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>{p.frequency===12?'Anual':'Mensal'}</td><td>{p.mp_plan_id?'Registrado':'Não vinculado'}</td><td>{p.active?'Ativo':'Rascunho'}</td><td>{!p.mp_plan_id&&<button type="button" className="sa-download" disabled={!!busy} onClick={()=>void sync(p.id)}>Registrar no Mercado Pago</button>}</td></tr>)}</tbody>
  </table></div>
  {!loading&&!plans.length&&<div className="sa-empty"><CreditCard size={32}/><h3>Nenhum plano cadastrado</h3><p>Crie o primeiro plano acima. Nenhuma cobrança será efetuada.</p></div>}
 </div>
}
