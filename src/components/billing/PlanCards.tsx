'use client'
import Link from 'next/link'
import {useState} from 'react'
import {Check,ShieldCheck} from 'lucide-react'
import {SubscriptionCardForm} from './SubscriptionCardForm'
export type PublicPlan={id:string;name:string;description:string|null;price_brl:number;frequency:number;benefits:string[]|null;mp_plan_id?:string|null;is_default?:boolean;monthly_releases_limit?:number|null;max_artists?:number|null}
export function PlanCards({plans,context='home',currentPlanId,checkoutReady=false}:{plans:PublicPlan[];context?:'home'|'dashboard';currentPlanId?:string|null;checkoutReady?:boolean}){
 const [selected,setSelected]=useState<PublicPlan|null>(null)
 return <div className={context==='dashboard'?'st-plan-dashboard-area':undefined}><div className={context==='dashboard'?'st-plan-grid st-plan-grid-dashboard':'st-plan-grid'}>
 {plans.map((plan,i)=>{
  const free=Number(plan.price_brl)===0
  const current=currentPlanId===plan.id
  const sellable=checkoutReady&&!free
  return <article key={plan.id} className={'st-plan '+(context==='dashboard'?'st-plan-sintone':free?'st-plan-free':i%2?'st-plan-featured':'st-plan-premium')}>
   <div className="st-plan-band" aria-hidden="true"/>
   <div className="st-plan-content">
    <h3>{plan.name}{current&&<span className="st-plan-badge"><ShieldCheck size={12}/> Plano Atual</span>}</h3>
    <p className="st-plan-desc">{plan.description||'Distribuição musical com a SINTONE.'}</p>
    <div className="st-plan-price">{free?'Grátis':Number(plan.price_brl).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
      {!free&&<span> /30 dias</span>}
    </div>
    <p className="st-plan-cycle">{free?'Sem mensalidade':'Pagamento avulso · renovação manual'}</p>
    {context==='home'?(free||sellable?<Link className="st-plan-action" href="/register">{free?'Criar conta grátis':'Conhecer o plano'}</Link>:<span className="st-plan-action st-plan-unavailable">Em breve</span>):
     current?<span className="st-plan-action st-plan-current">Plano atual</span>:
      free?<span className="st-plan-action st-plan-unavailable">Grátis</span>:
      sellable?<button className="st-plan-action" type="button" onClick={()=>setSelected(plan)}>Pagar 30 dias</button>:<span className="st-plan-action st-plan-unavailable">Em breve</span>}
    <ul>{[...(Array.isArray(plan.benefits)?plan.benefits:[]),
      ...(context==='dashboard'&&plan.monthly_releases_limit!==undefined?[plan.monthly_releases_limit===null?'Lançamentos ilimitados':plan.monthly_releases_limit+' lançamentos por mês']:[]),
      ...(context==='dashboard'&&plan.max_artists!=null?['Até '+plan.max_artists+' perfis artísticos']:[])
     ].map((item,index)=><li key={index}>{context==='dashboard'?<Check size={16} aria-hidden="true"/>:<span aria-hidden="true">✓</span>}{item}</li>)}</ul>
   </div>
  </article>
 })}
 </div>{selected&&<SubscriptionCardForm key={selected.id} plan={selected} onClose={()=>setSelected(null)}/>}</div>
}
