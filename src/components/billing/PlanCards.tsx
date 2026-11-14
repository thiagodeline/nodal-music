'use client'
import Link from 'next/link'
import {useState} from 'react'
import {startBillingCheckout} from '@/app/dashboard/billing-actions'
export type PublicPlan={id:string;name:string;description:string|null;price_brl:number;frequency:number;benefits:string[]|null;is_default?:boolean}
export function PlanCards({plans,context='home',currentPlanId}:{plans:PublicPlan[];context?:'home'|'dashboard';currentPlanId?:string|null}){
 const [busy,setBusy]=useState<string|null>(null)
 const [error,setError]=useState('')
 async function subscribe(id:string){
  if(busy)return
  setBusy(id);setError('')
  try{const result=await startBillingCheckout(id)
   if(result.ok)window.location.assign(result.url)
   else setError(result.message)
  }catch{setError('Não foi possível iniciar a assinatura.')}
  finally{setBusy(null)}
 }
 return <div>{error&&<p className="st-plan-error" role="alert">{error}</p>}<div className="st-plan-grid">
 {plans.map((plan,i)=>{
  const free=Number(plan.price_brl)===0
  const current=currentPlanId===plan.id
  return <article key={plan.id} className={'st-plan '+(free?'st-plan-free':i%2?'st-plan-featured':'st-plan-premium')}>
   <div className="st-plan-band" aria-hidden="true"/>
   <div className="st-plan-content">
    <h3>{plan.name}{current&&<span className="st-plan-badge">Seu plano</span>}</h3>
    <p className="st-plan-desc">{plan.description||'Distribuição musical com a SINTONE.'}</p>
    <div className="st-plan-price">{free?'Grátis':Number(plan.price_brl).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
      {!free&&<span>/{plan.frequency===12?'ano':'mês'}</span>}
    </div>
    <p className="st-plan-cycle">{free?'Sem mensalidade':'Valor de assinatura '+(plan.frequency===12?'anual':'mensal')}</p>
    {context==='home'?<Link className="st-plan-action" href="/register">{free?'Criar conta grátis':'Conhecer o plano'}</Link>:
     current?<span className="st-plan-action st-plan-current">Plano atual</span>:
      free?<span className="st-plan-action st-plan-unavailable">Grátis</span>:
      <button className="st-plan-action" type="button" disabled={!!busy} onClick={()=>void subscribe(plan.id)}>{busy===plan.id?'Redirecionando...':'Assinar plano'}</button>}
    <ul>{(Array.isArray(plan.benefits)?plan.benefits:[]).map((item,index)=><li key={index}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
   </div>
  </article>
 })}
 </div></div>
}
