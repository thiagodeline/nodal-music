'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import {saveBillingDraft,archiveBillingDraft,setBillingPlanPublished,registerMercadoPagoPlan,testMercadoPagoConnection} from '@/app/admin/actions'
import {CreditCard,LoaderCircle,Pencil,Archive} from 'lucide-react'
type Plan={id:string;name:string;description:string;price_brl:number;frequency:number;active:boolean;archived:boolean;published:boolean;is_default:boolean;mp_plan_id:string|null;benefits:string[]}
export default function AdminBilling(){
 const sb=useMemo(()=>createClient(),[])
 const [plans,setPlans]=useState<Plan[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [msg,setMsg]=useState('')
 const [editing,setEditing]=useState<string|null>(null)
 const [name,setName]=useState('')
 const [description,setDescription]=useState('')
 const [price,setPrice]=useState('')
 const [frequency,setFrequency]=useState<1|12>(1)
 const [benefits,setBenefits]=useState('')
 const [connectionStatus,setConnectionStatus]=useState('')
 const load=useCallback(async()=>{
  const {data,error}=await sb.from('billing_plans')
   .select('id,name,description,price_brl,frequency,active,archived,published,is_default,mp_plan_id,benefits')
   .order('created_at',{ascending:false})
  if(error)setMsg('Falha ao carregar planos: '+error.message)
  else setPlans((data??[]).map(p=>({...p,benefits:Array.isArray(p.benefits)?p.benefits:[]})) as Plan[])
  setLoading(false)
 },[sb])
 useEffect(()=>{void load()},[load])
 const reset=()=>{setEditing(null);setName('');setDescription('');setPrice('');setBenefits('');setFrequency(1)}
 function edit(p:Plan){
  if(p.active)return
  setEditing(p.id);setName(p.name);setDescription(p.description)
  setPrice(String(p.price_brl));setFrequency(p.frequency===12?12:1)
  setBenefits((Array.isArray(p.benefits)?p.benefits:[]).join('\n'))
 }
 async function save(e:React.FormEvent){
  e.preventDefault();if(busy)return
  setBusy('saving');setMsg('')
  try{
   const result=await saveBillingDraft({
    name,description,price:Number(price.replace(',','.')),frequency,
    benefits:benefits.split('\n').map(s=>s.trim()).filter(Boolean)
   },editing||undefined)
   setMsg(result.message||'')
   if(result.ok){reset();try{await load()}catch{setMsg('Plano salvo, mas não foi possível atualizar a lista. Recarregue a aba Planos.')}}
  }catch(e){setMsg('Não foi possível atualizar o painel. O cadastro pode ter sido salvo; confira a lista antes de tentar novamente.')}
  finally{setBusy('')}
 }
 async function archive(id:string){
  if(busy||!confirm('Arquivar este plano? Ele deixará de aparecer na vitrine.'))return
  setBusy(id);setMsg('')
  try{
   const result=await archiveBillingDraft(id);setMsg(result.message||'')
   if(result.ok){if(editing===id)reset();await load()}
  }catch{setMsg('Falha ao arquivar.')}
  finally{setBusy('')}
 }
 async function togglePublished(p:Plan){
  if(busy)return
  setBusy(p.id);setMsg('')
  try{const res=await setBillingPlanPublished(p.id,!p.published);setMsg(res.message||'');await load()}
  catch{setMsg('Falha ao atualizar a visibilidade.')}
  finally{setBusy('')}
 }
 async function testConnection(){
  if(busy)return
  setBusy('connection');setConnectionStatus('')
  try{const r=await testMercadoPagoConnection();setConnectionStatus(r.message||'')}
  catch{setConnectionStatus('Não foi possível testar a conexão.')}
  finally{setBusy('')}
 }
 async function sync(id:string){
  if(busy||!confirm('Registrar o plano no Mercado Pago? Após registrar, preços e benefícios financeiros não poderão ser editados por aqui. Não haverá cobrança automática.'))return
  setBusy(id);setMsg('')
  try{const r=await registerMercadoPagoPlan(id);setMsg(r.message||'');await load()}
  catch{setMsg('Falha ao registrar o plano.')}
  finally{setBusy('')}
 }
 return <div className="sa-billing">
  <div className="sa-billing-heading"><CreditCard size={24}/><div><h2>Gestão de planos</h2><p>Cadastre planos gratuitos ou pagos, edite os benefícios e controle quais aparecem na vitrine. Nenhum pagamento é ativado automaticamente.</p></div></div>
  <div className="sa-billing-form"><h3>Mercado Pago</h3><p className="sa-x-note">Conexão reservada à equipe. O teste não gera pagamentos.</p>
   <button type="button" className="sa-download" disabled={!!busy} onClick={()=>void testConnection()}>Testar conexão</button>
   {connectionStatus&&<p role="status">{connectionStatus}</p>}</div>
  <form className="sa-billing-form" onSubmit={e=>void save(e)}>
   <h3>{editing?'Editar rascunho':'Criar plano'}</h3>
   <div className="sa-billing-grid">
    <label>Nome<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Preço (R$)<input required inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0,00 para Grátis"/></label>
    <label>Recorrência<select value={frequency} onChange={e=>setFrequency(Number(e.target.value) as 1|12)}><option value={1}>Mensal</option><option value={12}>Anual</option></select></label>
   </div>
   <label>Descrição<input maxLength={500} value={description} onChange={e=>setDescription(e.target.value)}/></label>
   <label>Benefícios (um por linha, até 20)<textarea rows={5} value={benefits} onChange={e=>setBenefits(e.target.value)} maxLength={3500} placeholder="Distribuição digital&#10;Relatórios de desempenho"/></label>
   <div className="sa-billing-buttons"><button className="sa-approve" disabled={!!busy} type="submit">{busy==='saving'?<LoaderCircle size={16}/>:null} Salvar rascunho</button>
    {editing&&<button type="button" className="sa-download" onClick={reset}>Cancelar edição</button>}</div>
  </form>
  {msg&&<p role="status" className="sa-billing-msg">{msg}</p>}
  {loading?<p>Carregando planos...</p>:<div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>Plano</th><th>Preço</th><th>Periodicidade</th><th>Benefícios</th><th>Mercado Pago</th><th>Status</th><th>Ações</th></tr></thead>
   <tbody>{plans.filter(p=>!p.archived).map(p=><tr key={p.id}>
    <td><strong>{p.name}</strong><small className="sa-ticket-email">{p.description}</small></td>
    <td>{Number(p.price_brl)===0?'Grátis':Number(p.price_brl).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
    <td>{p.frequency===12?'Anual':'Mensal'}</td>
    <td>{p.benefits?.length||0} cadastrados</td>
    <td>{p.mp_plan_id?'Vinculado':'Não vinculado'}</td>
    <td><span className={'sa-tag '+(p.published?'sa-tag-approved':'sa-tag-draft')}>{p.published?'Visível':'Oculto'}</span>{p.is_default&&<small className="sa-ticket-email">Plano padrão</small>}</td>
    <td><div className="sa-billing-buttons">
     {!p.active&&<>
      <button type="button" className="sa-download" disabled={!!busy} onClick={()=>edit(p)}><Pencil size={15}/> Editar</button>
      <button type="button" className="sa-download" disabled={!!busy} onClick={()=>void togglePublished(p)}>{p.published?'Ocultar':'Publicar'}</button>
      {!p.is_default&&<button type="button" className="sa-download" disabled={!!busy} onClick={()=>void archive(p.id)}><Archive size={15}/> Arquivar</button>}
      {Number(p.price_brl)>0&&!p.mp_plan_id&&<button type="button" className="sa-download" disabled={!!busy} onClick={()=>void sync(p.id)}>Registrar no MP</button>}
     </>}</div></td>
   </tr>)}</tbody></table></div>}
  {!loading&&!plans.some(p=>!p.archived)&&<div className="sa-empty"><CreditCard size={32}/><h3>Nenhum plano preparado</h3><p>Cadastre um plano. Planos gratuitos são publicados por padrão; os pagos precisam de configuração de cobrança.</p></div>}
 </div>
}
