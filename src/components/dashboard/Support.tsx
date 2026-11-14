'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Data, Badge, Empty, dt } from './ui'
export const CAT: Record<string, string> = { lancamentos: 'Lançamentos', financeiro: 'Financeiro', outros: 'Outros' }
export default function Support({ d }: { d: Data }) {
  const sb = useMemo(() => createClient(), []); const [rows, setRows] = useState<any[]>([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [expanded,setExpanded]=useState<string|null>(null), [replies,setReplies]=useState<any[]>([])
  const load = useCallback(async () => { const { data } = await sb.from('tickets').select('*').eq('user_id', d.me.id).order('created_at', { ascending: false }); setRows(data ?? []) }, [sb, d.me.id])
  useEffect(() => { load() }, [load])
  async function showTicket(id:string){
    if(expanded===id){setExpanded(null);return}
    setExpanded(id);setReplies([])
    const {data,error}=await sb.from('ticket_messages').select('id,body,created_at,sender_role').eq('ticket_id',id).order('created_at',{ascending:true})
    if(error)setMsg('Não foi possível carregar as respostas.')
    else setReplies(data??[])
  }
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget, f = new FormData(form); setBusy(true); setMsg('')
    const { error } = await sb.from('tickets').insert({ user_id: d.me.id, subject: f.get('subject'), category: f.get('category'), message: f.get('message') })
    setBusy(false); if (error) return setMsg('Não foi possível abrir o chamado.'); form.reset(); setMsg('Chamado aberto. Acompanhe as respostas nesta página.'); load()
  }
  return (<div className="two-col">
    <div className="card"><h3>Tickets anteriores</h3>
      {rows.length ? <div className="scroll"><table><thead><tr><th>Data</th><th>Assunto</th><th>Categoria</th><th>Status</th></tr></thead><tbody>
        {rows.map(t => <tr key={t.id}><td>{dt(t.created_at)}</td><td><button type="button" className="sr-ticket-link" onClick={()=>void showTicket(t.id)}>{t.subject}</button>{expanded===t.id&&<div className="sr-ticket-history"><strong>Sua mensagem</strong><p>{t.message}</p>{replies.map(r=><div key={r.id}><strong>{r.sender_role==='admin'?'Equipe SINTONE':'Artista'} · {dt(r.created_at)}</strong><p>{r.body}</p></div>)}</div>}</td><td>{CAT[t.category]}</td><td><Badge s={t.status} /></td></tr>)}</tbody></table></div>
        : <Empty title="Nenhum chamado ainda" text="Quando você abrir um chamado, ele aparece aqui com o status." />}</div>
    <form className="card form" onSubmit={send}><h3>Abrir chamado</h3>
      <label>Assunto<input name="subject" required maxLength={140} /></label>
      <label>Categoria<select name="category"><option value="lancamentos">Lançamentos</option><option value="financeiro">Financeiro</option><option value="outros">Outros</option></select></label>
      <label>Mensagem<textarea name="message" rows={6} required maxLength={3000} /></label>
      {msg && <p className={msg.startsWith('Chamado') ? 'ok' : 'err'}>{msg}</p>}<div><button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar chamado'}</button></div></form>
  </div>)
}

