'use client'
import {useEffect} from 'react'
export default function AdminError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error('Falha no painel administrativo',error)},[error])
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f5f7fb',padding:24,color:'#0b1020',fontFamily:'system-ui'}}>
  <section style={{maxWidth:520,background:'#fff',border:'1px solid #cbd5e1',borderRadius:16,padding:32}}>
   <h1>Não foi possível carregar o painel</h1>
   <p>Uma falha de interface interrompeu a página. Antes de repetir qualquer cadastro, confira se ele já foi salvo.</p>
   <button type="button" onClick={reset} style={{padding:'12px 18px',border:0,borderRadius:10,background:'#0646bd',color:'#fff',cursor:'pointer'}}>Tentar novamente</button>
  </section>
 </main>
}
