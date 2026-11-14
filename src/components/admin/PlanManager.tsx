'use client'
import {useEffect,useState} from 'react'
import {DSP,META_STORES} from '@/lib/dsp-catalog'
import './plan-manager.css'
type Plan={
 id:string;name:string;description:string;price_brl:number;royalty_commission:number;
 monthly_releases_limit:number|null;max_artists:number;included_stores:string[];
 has_instagram_included:boolean;instagram_addon_fee:number;
 benefits:string[];is_default:boolean;published:boolean;archived:boolean
}
type Draft={
 name:string;description:string;price:number;royaltyCommission:number;monthlyReleasesLimit:number|null;
 maxArtists:number;includedStores:string[];hasInstagramIncluded:boolean;instagramAddonFee:number;
 benefits:string[];published:boolean
}
const initial:Draft={name:'',description:'',price:0,royaltyCommission:0,monthlyReleasesLimit:null,
 maxArtists:1,includedStores:[],hasInstagramIncluded:false,instagramAddonFee:0,benefits:[],published:true}
const fromDb=(p:Plan):Draft=>({
 name:p.name,description:p.description,price:Number(p.price_brl),
 royaltyCommission:Number(p.royalty_commission),monthlyReleasesLimit:p.monthly_releases_limit,
 maxArtists:p.max_artists,includedStores:p.included_stores||[],
 hasInstagramIncluded:p.has_instagram_included,instagramAddonFee:Number(p.instagram_addon_fee),
 benefits:p.benefits||[],published:p.published
})
export default function PlanManager(){
 const [plans,setPlans]=useState<Plan[]>([]),[loading,setLoading]=useState(true)
 const [editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState<Draft>(initial)
 const [benefitsText,setBenefitsText]=useState(''),[storesAll,setStoresAll]=useState(true)
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const load=async()=>{
  const response=await fetch('/api/admin/plans',{cache:'no-store'})
  const data=await response.json()
  if(!response.ok)throw Error(data.error||'Falha ao carregar os planos')
  setPlans(data.plans||[]);setLoading(false)
 }
 useEffect(()=>{void load().catch(e=>{setLoading(false);setMessage(e.message)})},[])
 function edit(p?:Plan){
  if(!p){setEditing(null);setDraft(initial);setBenefitsText('');setStoresAll(true);return}
  setEditing(p.id);setDraft(fromDb(p));setBenefitsText((p.benefits||[]).join('\n'))
  setStoresAll(!p.included_stores?.length)
 }
 const set=<K extends keyof Draft,>(key:K,value:Draft[K])=>setDraft(x=>({...x,[key]:value}))
 const toggle=(store:string)=>setDraft(x=>({...x,includedStores:x.includedStores.includes(store)?
   x.includedStores.filter(y=>y!==store):[...x.includedStores,store]}))
 async function save(e:React.FormEvent){
  e.preventDefault();if(busy)return
  setBusy(true);setMessage('')
  try{
   const body={...draft,includedStores:storesAll?[]:draft.includedStores,
    benefits:benefitsText.split('\n').map(s=>s.trim()).filter(Boolean)}
   if(!storesAll&&!body.includedStores.length)throw Error('Selecione pelo menos uma loja ou marque Todas.')
   const response=await fetch(editing?'/api/admin/plans/'+editing:'/api/admin/plans',{
    method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
   const result=await response.json()
   if(!response.ok)throw Error(result.error||'Não foi possível salvar.')
   setMessage('Plano salvo.');edit();await load()
  }catch(e){setMessage(e instanceof Error?e.message:'Erro ao salvar')}
  finally{setBusy(false)}
 }
 async function archive(p:Plan){
  if(!confirm('Arquivar este plano? Ele deixará de estar disponível para novas contratações. Os pagamentos anteriores permanecem preservados.'))return
  setBusy(true)
  try{
   const response=await fetch('/api/admin/plans/'+p.id,{method:'DELETE'})
   const data=await response.json()
   if(!response.ok)throw Error(data.error||'Falha ao arquivar')
   setMessage('Plano arquivado.');await load()
  }catch(e){setMessage(e instanceof Error?e.message:'Erro')}
  finally{setBusy(false)}
 }
 const fmt=(n:number)=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
 return <div className="pm">
  <header><div><small>ADMINISTRAÇÃO / PLANOS</small><h1>Planos da SINTONE</h1><p>Configurações de distribuição, royalties, limites e Instagram/Facebook.</p></div>
   <a href="/admin">Voltar ao painel</a></header>
  {message&&<p role="status" className="pm-alert">{message}</p>}
  <div className="pm-layout">
   <section className="pm-list"><h2>Planos cadastrados</h2>
    {loading?<p>Carregando...</p>:plans.filter(p=>!p.archived).map(p=><article className={'pm-plan '+(editing===p.id?'selected':'')} key={p.id}>
      <div><strong>{p.name}</strong><small>{p.published?'Publicado':'Oculto'}{p.is_default?' · Plano padrão':''}</small></div>
      <b>{fmt(p.price_brl)}</b>
      <p>{p.monthly_releases_limit==null?'Lançamentos ilimitados':p.monthly_releases_limit+' lançamentos/mês'} · {p.max_artists} artistas</p>
      <div className="pm-actions"><button onClick={()=>edit(p)}>Editar</button>{!p.is_default&&<button disabled={busy} onClick={()=>void archive(p)}>Arquivar</button>}</div>
     </article>)}
    <button className="pm-create" onClick={()=>edit()}>+ Criar novo plano</button>
   </section>
   <section className="pm-editor"><h2>{editing?'Editar plano':'Novo plano'}</h2>
    <form onSubmit={e=>void save(e)} className="pm-form">
     <div className="pm-grid">
      <label>Nome<input required maxLength={80} value={draft.name} onChange={e=>set('name',e.target.value)}/></label>
      <label>Preço por 30 dias (R$)<input type="number" required min={0} max={100000} step=".01" value={draft.price} onChange={e=>set('price',Number(e.target.value))}/></label>
      <label>Comissão da SINTONE (%)<input type="number" required min={0} max={100} step=".01" value={draft.royaltyCommission} onChange={e=>set('royaltyCommission',Number(e.target.value))}/></label>
      <label>Perfis de artista permitidos<input type="number" required min={1} max={1000} value={draft.maxArtists} onChange={e=>set('maxArtists',Number(e.target.value))}/></label>
      <label>Limite de lançamentos no mês<input type="number" disabled={draft.monthlyReleasesLimit===null} min={0} value={draft.monthlyReleasesLimit??''} onChange={e=>set('monthlyReleasesLimit',Number(e.target.value))}/></label>
      <label className="pm-switch"><input type="checkbox" checked={draft.monthlyReleasesLimit===null} onChange={e=>set('monthlyReleasesLimit',e.target.checked?null:1)}/> Ilimitado</label>
     </div>
     <label>Descrição<input maxLength={500} value={draft.description} onChange={e=>set('description',e.target.value)}/></label>
     <label>Benefícios (um por linha)<textarea rows={3} value={benefitsText} onChange={e=>setBenefitsText(e.target.value)}/></label>
     <div className="pm-addon"><h3>Instagram / Facebook</h3>
      <label className="pm-switch"><input type="checkbox" checked={draft.hasInstagramIncluded} onChange={e=>set('hasInstagramIncluded',e.target.checked)}/> Incluído sem taxa adicional</label>
      {!draft.hasInstagramIncluded&&<label>Adicional por lançamento (R$)<input type="number" min={0} max={100000} step=".01" value={draft.instagramAddonFee} onChange={e=>set('instagramAddonFee',Number(e.target.value))}/></label>}
      <p>Se o adicional custar R$ 0, a seleção fica disponível gratuitamente. Para cobrar, configure um valor maior que zero.</p>
     </div>
     <section className="pm-stores"><h3>Lojas e plataformas incluídas</h3>
      <label className="pm-switch"><input type="checkbox" checked={storesAll} onChange={e=>setStoresAll(e.target.checked)}/> Todas as plataformas do catálogo</label>
      {!storesAll&&<div className="pm-store-grid">{DSP.map(name=><label key={name}>
       <input type="checkbox" checked={draft.includedStores.includes(name)} onChange={()=>toggle(name)}/>
       {META_STORES.some(x=>x===name)?'Instagram/Facebook · '+name:name}
      </label>)}</div>}
     </section>
     <label className="pm-switch"><input type="checkbox" checked={draft.published} onChange={e=>set('published',e.target.checked)}/> Publicado para novas contratações</label>
     <div className="pm-actions"><button className="pm-save" type="submit" disabled={busy}>{busy?'Salvando...':'Salvar configurações'}</button><button type="button" onClick={()=>edit()}>Cancelar</button></div>
    </form>
   </section>
  </div>
 </div>
}
