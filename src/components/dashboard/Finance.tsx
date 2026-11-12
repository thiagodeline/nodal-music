'use client'
import { useState } from 'react'
import { requestWithdrawal } from '@/app/actions'
import { Data, Badge, Empty, brl, dt, money, MIN_SAQUE } from './ui'
export default function Finance({ d, reload }: { d: Data; reload: () => void }) {
  const { balance, paid } = money(d); const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(''); const fd = new FormData(e.currentTarget); const a = Number(fd.get('amount'))
    if (a < MIN_SAQUE) return setMsg(`O saque mínimo é ${brl(MIN_SAQUE)}.`)
    if (a > balance) return setMsg('O valor é maior que o seu saldo.')
    setBusy(true); await requestWithdrawal(fd); setBusy(false); setMsg('Pedido enviado. Acompanhe o status no histórico.'); reload()
  }
  const hist = [
    ...d.reports.map(r => ({ id: r.id, date: r.month, desc: `Royalties ${r.platform}`, amount: Number(r.revenue), status: 'credited' })),
    ...d.wds.map(w => ({ id: w.id, date: w.created_at, desc: 'Saque via Pix', amount: -Number(w.amount), status: w.status === 'pending' ? 'wpending' : w.status })),
  ].sort((a, b) => b.date.localeCompare(a.date))
  return (<div className="grid2 fin">
    <div>
      <div className="card hero-card"><small>Saldo atual</small><strong>{brl(balance)}</strong>
        <div className="mini"><div><small>Total já sacado</small><b>{brl(paid)}</b></div><div><small>Mínimo para saque</small><b>{brl(MIN_SAQUE)}</b></div></div></div>
      <form className="card form" onSubmit={submit} style={{ marginTop: 16 }}><h3>Solicitar saque via Pix</h3>
        <label>Tipo de chave<select name="ptype"><option>CPF/CNPJ</option><option>E-mail</option><option>Telefone</option><option>Chave aleatória</option></select></label>
        <label>Chave Pix<input name="pix" defaultValue={d.me?.pix_key ?? ''} required /></label>
        <label>Valor (R$)<input name="amount" type="number" step="0.01" min={MIN_SAQUE} max={balance} required /></label>
        {msg && <p className={msg.startsWith('Pedido') ? 'ok' : 'err'}>{msg}</p>}
        <button className="btn" disabled={busy || balance < MIN_SAQUE}>{busy ? 'Enviando…' : 'Pedir saque'}</button>
        {balance < MIN_SAQUE && <p className="mut">Você precisa de pelo menos {brl(MIN_SAQUE)} de saldo para sacar.</p>}</form>
    </div>
    <div className="card"><h3>Histórico de transações</h3>
      {hist.length ? <div className="scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Status</th></tr></thead><tbody>
        {hist.map(h => <tr key={h.id}><td>{dt(h.date)}</td><td>{h.desc}</td><td className={h.amount < 0 ? 'neg' : 'pos'}>{brl(h.amount)}</td><td><Badge s={h.status} /></td></tr>)}</tbody></table></div>
        : <Empty title="Sem movimentações" text="Royalties e saques aparecem aqui." />}</div>
  </div>)
}
