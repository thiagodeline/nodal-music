'use client'
import {useEffect,useState} from 'react'
import {prepareImusicsSingle} from '@/app/admin/imusics-bridge-actions'
const LOCAL='http://127.0.0.1:4371'
type State={phase:string;detail:string;releaseId?:string}
export default function ImusicsLocalBridge({id,title}:{id:string;title:string}){
 const [busy,setBusy]=useState(false)
 const [msg,setMsg]=useState('')
 const [state,setState]=useState<State|null>(null)
 useEffect(()=>{
  if(!state||!['accepted','running'].includes(state.phase))return
  const timer=setInterval(async()=>{
   try{
    const res=await fetch(LOCAL+'/status',{cache:'no-store'})
    if(res.ok){const s=await res.json() as State;setState(s);
      if(s.phase==='error')setMsg(s.detail||'Falha no robô.')
      if(s.phase==='manual')setMsg('Preenchimento assistido concluído. Revise os campos na janela da iMusics e conclua manualmente.')
    }
   }catch{setMsg('O programa local parou ou perdeu conexão.')}
  },3000)
  return ()=>clearInterval(timer)
 },[state?.phase])
 async function send(){
  setBusy(true);setMsg('');setState(null)
  try{
   const health=await fetch(LOCAL+'/health',{cache:'no-store'})
   if(!health.ok)throw Error('O robô local não respondeu. Abra o programa no computador antes de clicar.')
   const prepared=await prepareImusicsSingle(id)
   if(!prepared.ok)throw Error(prepared.message)
   const sent=await fetch(LOCAL+'/job',{
    method:'POST',headers:{'Content-Type':'application/json','X-Sintone-Bridge':'1'},
    body:JSON.stringify(prepared.job)
   })
   const response=await sent.json().catch(()=>({message:'Resposta inválida do robô.'}))
   if(!sent.ok)throw Error(response.message||'O robô não aceitou a tarefa.')
   setState({phase:'accepted',detail:'Abrindo o navegador da iMusics...',releaseId:id})
   setMsg('Tarefa iniciada. Faça login na janela do navegador, se necessário. Não feche o programa local.')
  }catch(e){
   setMsg(e instanceof TypeError?
     'Não foi possível acessar o robô local. Execute npm start na pasta tools/imusics-worker e permita acesso ao dispositivo local no navegador.':
     e instanceof Error?e.message:'Falha ao preparar o lançamento.')
  }finally{setBusy(false)}
 }
 return <div style={{display:'grid',gap:4,minWidth:170}}>
  <button type="button" disabled={busy} onClick={()=>void send()} title={'Preparar '+title+' no painel da iMusics'}>
   {busy?'Preparando...':'Enviar para iMusics (robô local)'}
  </button>
  {msg&&<small role="status" style={{maxWidth:270,color:'#52647c'}}>{msg}</small>}
 </div>
}
