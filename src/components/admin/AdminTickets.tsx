'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { replyToTicket, closeTicket } from '@/app/admin/actions'
import { MessageSquare, X, Send } from 'lucide-react'
import AdminSkeleton from './AdminSkeleton'

type Ticket = {
  id:string;user_id:string;subject:string;category:string;message:string;
  status:string;created_at:string;
  profiles:{name:string|null;artist_name:string|null;email:string|null}|null
}
type Reply = {id:string;ticket_id:string;sender_role:string;body:string;created_at:string}
const labels:Record<string,string>={open:'Pendente',in_progress:'Respondido',closed:'Fechado'}
const date=(v:string)=>new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})
export default function AdminTickets(){
  const sb=useMemo(()=>createClient(),[])
  const [tickets,setTickets]=useState<Ticket[]>([])
  const [selected,setSelected]=useState<Ticket|null>(null)
  const [history,setHistory]=useState<Reply[]>([])
  const [reply,setReply]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const load=useCallback(async()=>{
    const [result,contacts]=await Promise.all([
     sb.from('tickets').select('id,user_id,subject,category,message,status,created_at')
      .order('created_at',{ascending:false}).limit(500),
     sb.rpc('sintone_ticket_contacts')
    ])
    if(result.error||contacts.error){
     setError('Falha ao carregar tickets e contatos do suporte.')
    }else{
     const lookup=new Map((contacts.data||[]).map((x:{user_id:string;contact_name:string|null;artist_name:string|null;email:string|null})=>
      [x.user_id,{name:x.contact_name,artist_name:x.artist_name,email:x.email}]))
     setTickets((result.data||[]).map(x=>({...x,profiles:lookup.get(x.user_id)||null})) as Ticket[])
     setError('')
    }
    setLoading(false)
  },[sb])
  useEffect(()=>{void load()},[load])
  const open=async(t:Ticket)=>{
    setSelected(t);setReply('');setHistory([]);setError('')
    const {data,error}=await sb.from('ticket_messages').select('id,ticket_id,sender_role,body,created_at')
      .eq('ticket_id',t.id).order('created_at',{ascending:true})
    if(error)setError('Falha ao carregar o histórico: '+error.message)
    else setHistory(data??[])
  }
  const send=async()=>{
    if(!selected||!reply.trim()||busy)return
    setBusy(true);setError('')
    try{
      const result=await replyToTicket(selected.id,reply)
      if(!result.ok){setError(result.message);return}
      setReply('')
      await open({...selected,status:'in_progress'})
      await load()
    }catch{setError('Falha ao enviar a resposta.')}
    finally{setBusy(false)}
  }
  const close=async()=>{
    if(!selected||busy)return
    setBusy(true);setError('')
    try{
      const result=await closeTicket(selected.id)
      if(!result.ok){setError(result.message);return}
      setSelected(null);await load()
    }catch{setError('Falha ao fechar o chamado.')}
    finally{setBusy(false)}
  }
  return <div className="sa-ticket-module">
    {error&&<p className="sa-feedback error" role="alert">{error}</p>}
    {loading?<AdminSkeleton/>:
      tickets.length===0?<div className="sa-empty"><MessageSquare size={36}/><h3>Nenhum chamado recebido</h3><p>Os tickets dos artistas aparecerão aqui.</p></div>:
      <div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>Assunto</th><th>Artista / Email</th><th>Data de abertura</th><th>Status</th></tr></thead>
      <tbody>{tickets.map(t=><tr key={t.id} className="sa-ticket-row" onClick={()=>void open(t)}>
        <td><button type="button" className="sa-ticket-open" onClick={e=>{e.stopPropagation();void open(t)}}>{t.subject}</button></td>
        <td>{t.profiles?.artist_name||t.profiles?.name||'Artista'}<small className="sa-ticket-email">{t.profiles?.email||'—'}</small></td>
        <td>{date(t.created_at)}</td><td><span className={'sa-tag sa-ticket-'+t.status}>{labels[t.status]||t.status}</span></td>
      </tr>)}</tbody></table></div>}
    {selected&&<div className="sa-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
      <section className="sa-dialog" role="dialog" aria-modal="true" aria-label={'Ticket: '+selected.subject}>
        <header className="sa-dialog-header"><div><span className="sa-kicker">CENTRAL DE SUPORTE</span><h2>{selected.subject}</h2><small>{selected.profiles?.artist_name||selected.profiles?.name||'Artista'} · {selected.profiles?.email||'—'}</small></div><button type="button" aria-label="Fechar painel" onClick={()=>setSelected(null)}><X size={20}/></button></header>
        <div className="sa-dialog-body">
          <div className="sa-ticket-message"><strong>Mensagem inicial · {date(selected.created_at)}</strong><p>{selected.message}</p></div>
          {history.map(m=><div className="sa-ticket-message" key={m.id}><strong>{m.sender_role==='admin'?'Equipe SINTONE':'Artista'} · {date(m.created_at)}</strong><p>{m.body}</p></div>)}
          {error&&<p className="sa-error" role="alert">{error}</p>}
        </div>
        <footer className="sa-ticket-footer">
          {selected.status!=='closed'?<>
            <label htmlFor="sa-ticket-reply">Resposta da equipe SINTONE</label>
            <textarea id="sa-ticket-reply" rows={4} maxLength={3000} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Escreva sua resposta..."/>
            <div className="sa-ticket-actions"><button type="button" className="sa-cancel" disabled={busy} onClick={()=>void close()}>Fechar ticket</button>
              <button type="button" className="sa-approve" disabled={busy||!reply.trim()} onClick={()=>void send()}><Send size={16}/> {busy?'Enviando...':'Enviar Resposta'}</button></div>
          </>:<p>Este ticket está fechado.</p>}
        </footer>
      </section>
    </div>}
  </div>
}
