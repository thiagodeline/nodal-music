'use client'
import {useState} from 'react'
import {createClient} from '@/lib/supabase/client'

type Provider='google'|'apple'
const enabled:{[key in Provider]:boolean}={
 google:process.env.NEXT_PUBLIC_SINTONE_GOOGLE_OAUTH_ENABLED==='true',
 apple:process.env.NEXT_PUBLIC_SINTONE_APPLE_OAUTH_ENABLED==='true'
}
function ProviderIcon({provider}:{provider:Provider}){
 if(provider==='apple')return <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.536c.02 2.144 1.883 2.858 1.904 2.868-.015.046-.3 1.032-.981 2.052-.589.88-1.2 1.757-2.163 1.777-.947.02-1.25-.574-2.333-.574-1.082 0-1.418.554-2.315.594-.928.034-1.635-.95-2.23-1.827-1.214-1.783-2.144-5.038-.897-7.234a3.456 3.456 0 0 1 2.934-1.79c.914-.02 1.778.632 2.337.632.56 0 1.61-.78 2.712-.665.461.019 1.755.187 2.589 1.392-.067.04-1.545.904-1.528 2.775ZM15.566 7.204c.494-.606.827-1.447.737-2.285-.713.03-1.573.488-2.084 1.088-.457.524-.859 1.375-.75 2.194.795.065 1.61-.402 2.097-.997Z"/></svg>
 return <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.22c0-.68-.06-1.33-.18-1.95H12v3.69h5.24a4.49 4.49 0 0 1-1.95 2.95v2.45h3.15c1.85-1.71 2.91-4.22 2.91-7.14Z"/><path fill="#34A853" d="M12 21.75c2.64 0 4.85-.87 6.47-2.39l-3.15-2.45c-.87.58-1.98.92-3.32.92-2.54 0-4.7-1.72-5.47-4.04H3.28v2.53A9.75 9.75 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.53 13.79a5.86 5.86 0 0 1 0-3.58V7.68H3.28a9.75 9.75 0 0 0 0 8.64l3.25-2.53Z"/><path fill="#EA4335" d="M12 6.17c1.43 0 2.72.49 3.73 1.48l2.8-2.8A9.26 9.26 0 0 0 12 2.25a9.75 9.75 0 0 0-8.72 5.43l3.25 2.53c.77-2.32 2.93-4.04 5.47-4.04Z"/></svg>
}
export default function SocialAuthButtons({requireTerms=false,termsAccepted=false}:{requireTerms?:boolean;termsAccepted?:boolean}){
 const [busy,setBusy]=useState<Provider|null>(null),[error,setError]=useState('')
 async function start(provider:Provider){
  if(!enabled[provider]||busy||(requireTerms&&!termsAccepted))return
  setBusy(provider);setError('')
  try{
   const {error}=await createClient().auth.signInWithOAuth({provider,options:{
    redirectTo:window.location.origin+'/auth/callback?next=/dashboard'
   }})
   if(error)throw error
  }catch{
   setError('Não foi possível conectar a este provedor. Tente usar e-mail e senha.')
   setBusy(null)
  }
 }
 return <div className="rg-social-area">
  <div className="rg-social-divider"><span>OU</span></div>
  {(['apple','google'] as const).map(provider=><button type="button" key={provider}
   className="rg-social-button" disabled={!enabled[provider]||busy!==null||(requireTerms&&!termsAccepted)}
   onClick={()=>void start(provider)} title={!enabled[provider]?'Aguardando configuração do provedor no Supabase Auth':undefined}>
   <ProviderIcon provider={provider}/>
   {busy===provider?'Conectando…':'Continuar com '+(provider==='apple'?'Apple':'Google')}
   {!enabled[provider]&&<small>Em breve</small>}
  </button>)}
  {requireTerms&&!termsAccepted&&(enabled.apple||enabled.google)&&<small className="rg-social-note">Aceite os termos para continuar com uma conta social.</small>}
  {error&&<p className="rg-alert" role="alert">{error}</p>}
 </div>
}
