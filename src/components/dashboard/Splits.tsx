'use client'
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Data, Empty, COL } from './ui'
const ROLES = ['Produtor / Beatmaker', 'Compositor', 'Featuring', 'Mixagem / Master', 'Outro']
type R = { email: string; role: string; percent: string }
export default function Splits({ d }: { d: Data }) {
  const sb = useMemo(() => createClient(), []); const [rid, setRid] = useState(d.releases[0]?.id ?? ''), [rows, setRows] = useState<R[]>([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => { if (!rid) return; sb.from('splits').select('*').eq('release_id', rid).order('created_at').then(({ data }) => setRows((data ?? []).map((x: any) => ({ email: x.email, role: x.role, percent: String(x.percent) })))) }, [rid, sb])
  if (!d.releases.length) return <div className="card"><Empty title="Envie um lançamento primeiro" text="O split é definido por faixa. Depois de enviar um lançamento, ele aparece aqui."><a className="btn" href="#new">+ Novo lançamento</a></Empty></div>
  const others = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0), mine = Math.round((100 - others) * 100) / 100
  const upd = (i: number, k: keyof R, v: string) => setRows(rows.map((r, j) => j === i ? { ...r, [k]: v } : r))
  async function save() {
    setMsg('')
    const em = rows.map(r => r.email.trim().toLowerCase())
    if (rows.some(r => !/^\S+@\S+\.\S+$/.test(r.email.trim()))) return setMsg('Confira os e-mails dos colaboradores.')
    if (rows.some(r => !(Number(r.percent) > 0))) return setMsg('Cada colaborador precisa de uma porcentagem maior que zero.')
    if (new Set(em).size !== em.length) return setMsg('Há e-mails repetidos.')
    if (em.includes((d.email || '').toLowerCase())) return setMsg('O seu e-mail não entra na lista: a sua parte é o que sobra.')
    if (mine < 0) return setMsg('A soma passa de 100%.')
    setBusy(true)
    await sb.from('splits').delete().eq('release_id', rid)
    const { error } = rows.length ? await sb.from('splits').insert(rows.map((r, i) => ({ owner_id: d.me.id, release_id: rid, email: em[i], role: r.role, percent: Number(r.percent) }))) : { error: null }
    setBusy(false); setMsg(error ? 'Não foi possível salvar.' : 'Split salvo.')
  }
  const segs: [string, number][] = [['Artista principal', mine], ...rows.map((r, i): [string, number] => [r.email || `Colaborador ${i + 1}`, Number(r.percent) || 0])]
  return (<div className="card form"><div className="head-row"><div><h3>Split de royalties</h3><p className="mut" style={{ margin: 0 }}>Defina quanto cada pessoa recebe da receita da faixa.</p></div>
    <select style={{ width: 'auto', maxWidth: 280 }} value={rid} onChange={e => setRid(e.target.value)}>{d.releases.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
    <div className="stack" role="img" aria-label="Divisão de porcentagens">{segs.map(([n, v], i) => v > 0 && <i key={i} style={{ width: v + '%', background: COL[i % COL.length] }} title={n} />)}</div>
    <div className="legend">{segs.map(([n, v], i) => <span key={i}><i style={{ background: COL[i % COL.length] }} />{n}: {v}%</span>)}</div>
    <p className={mine < 0 ? 'err' : 'mut'} style={{ margin: '8px 0 0' }}>Sua parte (artista principal): <b>{mine}%</b></p>
    {rows.map((r, i) => <div key={i} className="rowf"><input type="email" placeholder="E-mail do colaborador" value={r.email} onChange={e => upd(i, 'email', e.target.value)} />
      <select value={r.role} onChange={e => upd(i, 'role', e.target.value)}>{ROLES.map(x => <option key={x}>{x}</option>)}</select>
      <input type="number" min="0.01" max="100" step="0.01" placeholder="%" value={r.percent} onChange={e => upd(i, 'percent', e.target.value)} />
      <button className="btn bad sm" aria-label="Remover colaborador" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 size={14} /></button></div>)}
    <div className="acts"><button className="btn ghost" onClick={() => setRows([...rows, { email: '', role: ROLES[0], percent: '' }])}><Plus size={15} /> Adicionar colaborador</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar split'}</button></div>
    {msg && <p className={msg === 'Split salvo.' ? 'ok' : 'err'}>{msg}</p>}
    <p className="mut" style={{ margin: 0 }}>O registro serve de base para o repasse. Os colaboradores ainda não recebem convite automático, então combine a divisão com eles antes.</p></div>)
}
