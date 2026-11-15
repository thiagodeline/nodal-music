'use client'
import Script from 'next/script'
import {useCallback,useEffect,useRef,useState} from 'react'
import {checkOneTimeOrder,startOneTimeCheckout} from '@/app/dashboard/billing-actions'
type Plan={id:string;name:string;price_brl:number;frequency:number}
type BrickForm={token:string;payment_method_id:string;installments:number;payer:{identification:{type:string;number:string}}}
type Controller={unmount:()=>void}
type MP={bricks:()=>{create:(name:string,id:string,settings:unknown)=>Promise<Controller>}}
declare global{interface Window{MercadoPago?:new (key:string,opts?:{locale:string})=>MP}}
export function SubscriptionCardForm({plan,onClose,addonReleaseId,addonPrice,selectedStores}:{plan:Plan;onClose:()=>void;addonReleaseId?:string;addonPrice?:number;selectedStores?:string[]}){
 const [method,setMethod]=useState<'card'|'pix'>(selectedStores?'pix':'card')
 const [sdkReady,setSdkReady]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [resultId,setResultId]=useState('')
 const [pix,setPix]=useState<{code:string;qrBase64:string;ticketUrl:string}|null>(null)
 const [ready,setReady]=useState(false)
 const controller=useRef<Controller|null>(null)
 const mounted=useRef(true)
 const inFlight=useRef(false)
 const completed=useRef(false)
 const total=addonReleaseId?Number(addonPrice):Number(plan.price_brl)
 const price=total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
 const submit=useCallback(async(payment:Parameters<typeof startOneTimeCheckout>[1])=>{
  if(inFlight.current||completed.current)return false
  inFlight.current=true
  setBusy(true);setError('')
  try{
   const res=await startOneTimeCheckout(plan.id,payment,addonReleaseId,selectedStores)
   if(!mounted.current)return false
   if(!res.ok){setError(res.message);return false}
   completed.current=true
   setMessage(res.message);setResultId(res.orderId)
   if(res.pix)setPix(res.pix)
   if(res.status==='paid'&&!addonReleaseId)window.setTimeout(()=>window.location.reload(),1200)
   return true
  }catch{if(mounted.current)setError('Erro de comunicação. Confira seu histórico de pagamentos antes de tentar novamente.');return false}
  finally{inFlight.current=false;if(mounted.current)setBusy(false)}
 },[plan.id,addonReleaseId,selectedStores])
 useEffect(()=>{
  mounted.current=true
  return()=>{mounted.current=false;try{controller.current?.unmount()}catch{}}
 },[])
 useEffect(()=>{
  if(!sdkReady||method!=='card'||!window.MercadoPago||controller.current||!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY)return
  let disposed=false
  const mp=new window.MercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,{locale:'pt-BR'})
  void mp.bricks().create('cardPayment','st-brick-card',{
   initialization:{amount:total},
   customization:{visual:{style:{theme:'default'}}},
   callbacks:{
    onReady:()=>{if(!disposed)setReady(true)},
    onSubmit:(formData:BrickForm,additional:{paymentTypeId?:string})=>new Promise<void>((resolve,reject)=>{
     void submit({method:'card',card:{
      token:formData.token,paymentMethodId:formData.payment_method_id,
      paymentTypeId:additional.paymentTypeId==='debit_card'?'debit_card':'credit_card',
      installments:formData.installments,
      identification:formData.payer.identification
     }}).then(ok=>ok?resolve():reject(new Error('Pagamento não concluído')))
    }),
    onError:()=>{if(!disposed)setError('Não foi possível carregar os campos seguros do Mercado Pago.')}
   }
  }).then(instance=>{if(disposed)instance.unmount();else controller.current=instance})
   .catch(()=>{if(!disposed)setError('Erro ao iniciar o formulário de pagamento.')})
  return()=>{disposed=true;try{controller.current?.unmount()}catch{}controller.current=null;setReady(false)}
 },[sdkReady,method,total,submit])
 async function check(){
  if(!resultId||busy)return
  setBusy(true)
  try{const res=await checkOneTimeOrder(resultId);setMessage(res.message);if(res.paid&&!addonReleaseId)window.location.reload()}
  finally{setBusy(false)}
 }
 return <div className="st-checkout-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <section className="st-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="st-checkout-title">
   <button className="st-checkout-close" type="button" onClick={onClose} disabled={busy} aria-label="Fechar">×</button>
   <h2 id="st-checkout-title">{selectedStores?'Plataformas extras':addonReleaseId?'Instagram/Facebook — adicional':'Pagar '+plan.name}</h2>
   <p><strong>{price}</strong> {selectedStores?'para adicionar as lojas extras selecionadas. Pix único por lançamento.':addonReleaseId?'para adicionar Instagram/Facebook neste lançamento. Pagamento único.':'por 30 dias de acesso. Pagamento único, sem renovação automática.'}</p>
   {resultId?<div className="st-checkout-success" role="status">
    <p>{message}</p>
    {pix&&<div>
     {pix.qrBase64&&<img style={{maxWidth:230,display:'block',margin:'12px auto'}} src={'data:image/png;base64,'+pix.qrBase64} alt="QR Code Pix"/>}
     <label>Código Pix Copia e Cola<textarea readOnly rows={3} value={pix.code}/></label>
     <button type="button" onClick={()=>void navigator.clipboard.writeText(pix.code)}>Copiar código Pix</button>
     {pix.ticketUrl?.startsWith('https://www.mercadopago.com.br/')&&<p><a target="_blank" rel="noopener noreferrer" href={pix.ticketUrl}>Abrir instruções no Mercado Pago</a></p>}
    </div>}
    <button type="button" onClick={()=>void check()} disabled={busy}>{busy?'Consultando...':'Verificar confirmação'}</button>
   </div>:<>
    {!selectedStores&&<div className="st-checkout-methods">
     <button type="button" aria-pressed={method==='card'} onClick={()=>setMethod('card')}>Cartão</button>
     <button type="button" aria-pressed={method==='pix'} onClick={()=>setMethod('pix')}>Pix</button>
    </div>}
    {error&&<p className="st-plan-error" role="alert">{error}</p>}
    {method==='card'&&!selectedStores?<>
     <p className="st-checkout-note">Dados protegidos pelo Mercado Pago. A SINTONE recebe apenas um token do pagamento, nunca o número do cartão.</p>
     <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onReady={()=>setSdkReady(true)} onError={()=>setError('Falha ao carregar o Mercado Pago.')}/>
     {!ready&&!error&&<p>Carregando checkout...</p>}
     <div id="st-brick-card"/>
    </>:<div>
     <p className="st-checkout-note">Gere um Pix para pagar uma única vez. O serviço será liberado após a confirmação do pagamento.</p>
     <button type="button" className="st-plan-action" onClick={()=>void submit({method:'pix'})} disabled={busy}>{busy?'Gerando Pix...':'Gerar Pix de '+price}</button>
    </div>}
   </>}
  </section>
 </div>
}
