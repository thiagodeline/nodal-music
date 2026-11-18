import Link from 'next/link'
import {ArrowUpRight} from 'lucide-react'
import type {PublicPlan} from '@/components/billing/PlanCards'
const money=(n:number)=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export default function EditorialPlans({plans,checkoutReady}:{plans:PublicPlan[];checkoutReady:boolean}){
 if(plans.length<=1)return null
 return <section className="um-plans" id="planos"><div className="um-container">
  <span className="um-kicker">[ PLANOS E CONDIÇÕES ]</span>
  <div className="um-plans-heading"><h2>SEU SOM. SEU PLANO.</h2><p>Encontre o formato ideal para seu catálogo. Compare os benefícios e confira os termos antes de contratar.</p></div>
  <div className="um-plan-grid">{plans.map(plan=>{
   const free=Number(plan.price_brl)===0
   return <article className="um-plan" key={plan.id}>
    <div className="um-plan-top"><span>{free?'COMECE AGORA':'PARA IR ALÉM'}</span><h3>{plan.name}</h3><p>{plan.description||'Distribuição musical pela SINTONE.'}</p></div>
    <div className="um-plan-price">{free?'GRÁTIS':money(plan.price_brl)}{!free&&<small> / 30 dias</small>}</div>
    <ul>{(Array.isArray(plan.benefits)?plan.benefits:[]).map(item=>item.trim()).filter(Boolean).map((benefit,i)=><li key={i}><span aria-hidden="true" className="um-plan-check">✓</span>{benefit}</li>)}</ul>
    {(free||checkoutReady)?<Link className="um-plan-cta" href="/register">{free?'CRIAR CONTA GRÁTIS':'CONHECER O PLANO'}<ArrowUpRight size={17}/></Link>:
    <span className="um-plan-cta um-plan-cta-disabled">DISPONÍVEL EM BREVE</span>}
    <small>Serviços e limites sujeitos às condições do plano.</small>
   </article>
  })}</div>
 </div></section>
}
