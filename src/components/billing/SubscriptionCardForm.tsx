'use client'
import Script from 'next/script'
import {useCallback,useEffect,useRef,useState} from 'react'
import {startBillingCheckout} from '@/app/dashboard/billing-actions'
declare global{interface Window{MercadoPago?:new(key:string)=>{cardForm:(options:unknown)=>{getCardFormData:()=>{token?:string};unmount?:()=>void}}}}
type Plan={id:string;name:string;price_brl:number;frequency:number}
export function SubscriptionCardForm({plan,onClose}:{plan:Plan;onClose:()=>void}){
 const [sdkReady,setSdkReady]=useState(false)
 const [ready,setReady]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const instance=useRef<{unmount?:()=>void}|null>(null)
 const active=useRef(true)
 const key=process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
 const submit=useCallback(async(token:string)=>{
  if(busy||!token)return
  setBusy(true);setError('')
  try{
   const result=await startBillingCheckout(plan.id,token)
   if(!active.current)return
   if(result.ok)setMessage(result.message)
   else setError(result.message)
  }catch{if(active.current)setError('Falha ao processar assinatura. Verifique no Mercado Pago antes de tentar novamente.')}
  finally{if(active.current)setBusy(false)}
 },[plan.id,busy])
 useEffect(()=>{
  active.current=true
  return ()=>{active.current=false;try{instance.current?.unmount?.()}catch{}}
 },[])
 useEffect(()=>{
  if(!sdkReady||!key||!window.MercadoPago||instance.current)return
  try{
   const mp=new window.MercadoPago(key)
   const card=mp.cardForm({
    amount:Number(plan.price_brl).toFixed(2),
    iframe:true,
    form:{
     id:'st-checkout-form',
     cardNumber:{id:'st-card-number',placeholder:'Número do cartão'},
     expirationDate:{id:'st-card-expiration',placeholder:'MM/AA'},
     securityCode:{id:'st-card-cvv',placeholder:'Código de segurança'},
     cardholderName:{id:'st-cardholder',placeholder:'Nome no cartão'},
     issuer:{id:'st-card-issuer',placeholder:'Banco emissor'},
     installments:{id:'st-card-installments',placeholder:'Parcelas'},
     identificationType:{id:'st-card-id-type',placeholder:'Documento'},
     identificationNumber:{id:'st-card-id-number',placeholder:'CPF'},
     cardholderEmail:{id:'st-card-email',placeholder:'E-mail'}
    },
    callbacks:{
     onFormMounted:(err:unknown)=>{if(err)setError('Não foi possível carregar os campos de cartão.');else setReady(true)},
     onSubmit:(event:Event)=>{
      event.preventDefault()
      const token=card.getCardFormData().token
      if(!token){setError('Não foi possível validar o cartão. Confira os dados.');return}
      void submit(token)
     }
    }
   })
   instance.current=card
  }catch{setError('Falha na inicialização segura do cartão. Recarregue a página.')}
 },[sdkReady,key,plan.price_brl,submit])
 return <div className="st-checkout-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <section className="st-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="st-checkout-title">
   <button type="button" className="st-checkout-close" onClick={onClose} disabled={busy} aria-label="Fechar">×</button>
   <h2 id="st-checkout-title">Assinar {plan.name}</h2>
   <p>Valor recorrente: <strong>{Number(plan.price_brl).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}/{plan.frequency===12?'ano':'mês'}</strong></p>
   <p className="st-checkout-note">Seus dados de cartão são enviados diretamente ao Mercado Pago. A assinatura será ativada após a confirmação da cobrança.</p>
   {message?<div role="status" className="st-checkout-success">{message}<p><a href="/dashboard#plans">Voltar aos planos</a></p></div>:<>
    <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onReady={()=>setSdkReady(true)} onError={()=>setError('Não foi possível carregar o Mercado Pago.')}/>
    {!ready&&!error&&<p role="status">Carregando formulário seguro...</p>}
    <form id="st-checkout-form" className="st-checkout-form">
     <label>Número do cartão<div id="st-card-number" className="st-secure-field"/></label>
     <div className="st-checkout-cols">
      <label>Validade<div id="st-card-expiration" className="st-secure-field"/></label>
      <label>CVV<div id="st-card-cvv" className="st-secure-field"/></label>
     </div>
     <label>Nome no cartão<input id="st-cardholder" type="text" autoComplete="cc-name" required/></label>
     <label>Banco emissor<select id="st-card-issuer"/></label>
     <label>Parcelas<select id="st-card-installments"/></label>
     <div className="st-checkout-cols">
      <label>Documento<select id="st-card-id-type"/></label>
      <label>Número do documento<input id="st-card-id-number" autoComplete="off" required/></label>
     </div>
     <label>E-mail<input id="st-card-email" type="email" autoComplete="email" required/></label>
     {error&&<p className="st-plan-error" role="alert">{error}</p>}
     <button type="submit" className="st-plan-action" disabled={busy||!ready}>{busy?'Processando...':'Confirmar assinatura'}</button>
    </form>
   </>}
  </section>
 </div>
}
