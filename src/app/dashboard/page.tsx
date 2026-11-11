import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requestWithdrawal } from '../actions'
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const label: Record<string, string> = { pending: 'Em análise', approved: 'Aprovado', live: 'No ar', rejected: 'Recusado', paid: 'Pago' }
export default async function Dashboard() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser(); if (!user) redirect('/login')
  const [{ data: me }, { data: releases }, { data: reports }, { data: wds }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('releases').select('*').eq('artist_id', user.id).order('created_at', { ascending: false }),
    sb.from('reports').select('*').eq('artist_id', user.id),
    sb.from('withdrawals').select('*').eq('artist_id', user.id).order('created_at', { ascending: false }),
  ])
  const streams = (reports ?? []).reduce((s, r) => s + Number(r.streams), 0)
  const earned = (reports ?? []).reduce((s, r) => s + Number(r.revenue), 0)
  const balance = earned - (wds ?? []).filter(w => w.status !== 'rejected').reduce((s, w) => s + Number(w.amount), 0)
  const byPlat: Record<string, number> = {}; (reports ?? []).forEach(r => byPlat[r.platform] = (byPlat[r.platform] || 0) + Number(r.streams))
  return (<main className="panel">
      <h1>Olá, {me?.artist_name || 'artista'}</h1>
      <div className="stats">
        <div className="stat gold"><small>Saldo disponível</small><strong>{brl(balance)}</strong></div>
        <div className="stat"><small>Streams no total</small><strong>{streams.toLocaleString('pt-BR')}</strong></div>
        <div className="stat"><small>Receita no total</small><strong>{brl(earned)}</strong></div>
      </div>
      <h2 className="h">Lançamentos</h2>
      <p style={{ marginBottom: 12 }}><Link className="btn sm" href="/dashboard/lancamentos/novo">Novo lançamento</Link></p>
      {releases?.length ? <table><thead><tr><th>Título</th><th>Tipo</th><th>Data</th><th>Status</th></tr></thead><tbody>
        {releases.map(r => <tr key={r.id}><td>{r.title}</td><td>{r.type}</td><td>{r.release_date ?? '—'}</td><td><span className={`tag ${r.status}`}>{label[r.status]}</span></td></tr>)}</tbody></table>
        : <p className="empty">Você ainda não enviou nenhuma faixa. Clique em Novo lançamento para começar.</p>}
      <h2 className="h">Streams por plataforma</h2>
      {Object.keys(byPlat).length ? <table><tbody>{Object.entries(byPlat).sort((a, b) => b[1] - a[1]).map(([p, n]) => <tr key={p}><td>{p}</td><td>{n.toLocaleString('pt-BR')}</td></tr>)}</tbody></table>
        : <p className="empty">Os relatórios aparecem aqui depois que as lojas enviarem os primeiros números.</p>}
      <h2 className="h">Saques</h2>
      <form className="f" action={requestWithdrawal}>
        <label>Valor (R$)<input name="amount" type="number" step="0.01" min="1" max={balance} required /></label>
        <label>Chave Pix<input name="pix" defaultValue={me?.pix_key ?? ''} required /></label>
        <button className="btn" disabled={balance <= 0}>Pedir saque</button>
      </form>
      {wds?.length ? <table style={{ marginTop: 20 }}><tbody>{wds.map(w => <tr key={w.id}><td>{new Date(w.created_at).toLocaleDateString('pt-BR')}</td><td>{brl(Number(w.amount))}</td><td><span className={`tag ${w.status}`}>{label[w.status]}</span></td></tr>)}</tbody></table> : null}
    </main>)
}
