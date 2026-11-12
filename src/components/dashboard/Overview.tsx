'use client'
import { Data, Kpi, Badge, Cover, Bars, Area, Empty, brl, num, dt, money, sum, group } from './ui'
const iso = (d: Date) => d.toISOString().slice(0, 10)
export default function Overview({ d }: { d: Data }) {
  const { balance } = money(d)
  const today = new Date(), days = Array.from({ length: 30 }, (_, i) => { const x = new Date(today); x.setDate(x.getDate() - (29 - i)); return iso(x) })
  const cut = (n: number) => { const x = new Date(today); x.setDate(x.getDate() - n); return iso(x) }
  const cur = d.reports.filter(r => r.month >= cut(29)), prev = d.reports.filter(r => r.month >= cut(59) && r.month < cut(29))
  const delta = (a: number, b: number) => b > 0 ? (a - b) / b * 100 : null
  const map: Record<string, number> = {}; d.reports.forEach(r => map[r.month] = (map[r.month] || 0) + Number(r.streams))
  const pts: [string, number][] = days.map(x => [x.slice(8) + '/' + x.slice(5, 7), map[x] || 0])
  const monthKey = iso(today).slice(0, 7), monthRev = sum(d.reports.filter(r => r.month.startsWith(monthKey)), 'revenue')
  const active = d.releases.filter(r => r.status === 'approved' || r.status === 'live').length
  const dsp = group(d.reports, r => r.platform).slice(0, 5)
  return (<>
    <div className="grid4">
      <Kpi label="Saldo disponível" value={brl(balance)} action={<a className="btn sm" href="#financial">Sacar</a>} />
      <Kpi label="Total de streams (30 dias)" value={num(sum(cur, 'streams'))} delta={delta(sum(cur, 'streams'), sum(prev, 'streams'))} />
      <Kpi label="Lançamentos ativos" value={String(active)} />
      <Kpi label="Receita estimada do mês" value={brl(monthRev)} />
    </div>
    <div className="grid2">
      <div className="card"><h3>Streams por dia</h3><p className="mut">Últimos 30 dias</p>{sum(cur, 'streams') ? <Area pts={pts} /> : <Empty title="Sem dados ainda" text="Os números aparecem aqui assim que as lojas enviarem os primeiros relatórios." />}</div>
      <div className="card"><h3>Top lojas (DSPs)</h3><p className="mut">Participação nos streams</p>{dsp.length ? <Bars rows={dsp} /> : <p className="mut">Sem dados de lojas ainda.</p>}</div>
    </div>
    <div className="card"><div className="row-h"><h3>Lançamentos recentes</h3><a className="link" href="#catalog">Ver todos</a></div>
      {d.releases.length ? <table><thead><tr><th>Faixa</th><th>Artista</th><th>Data</th><th>Status</th></tr></thead><tbody>
        {d.releases.slice(0, 3).map(r => <tr key={r.id}><td><div className="cell"><Cover path={r.cover_path} />{r.title}</div></td><td>{r.main_artist || d.me?.artist_name || '—'}</td><td>{dt(r.release_date || r.created_at)}</td><td><Badge s={r.status} /></td></tr>)}</tbody></table>
        : <Empty title="Nenhum lançamento ainda" text="Envie sua primeira faixa e acompanhe tudo por aqui."><a className="btn" href="#new">+ Criar primeiro lançamento</a></Empty>}</div>
  </>)
}
