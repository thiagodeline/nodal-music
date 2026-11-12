'use client'
import { useState } from 'react'
import { Data, Bars, Donut, Empty, Kpi, brl, num, sum, group } from './ui'
export default function Analytics({ d }: { d: Data }) {
  const [days, setDays] = useState(28), [plat, setPlat] = useState('all')
  const from = new Date(); from.setDate(from.getDate() - days); const f = from.toISOString().slice(0, 10)
  const all = d.reports.filter(r => r.month >= f), rows = plat === 'all' ? all : all.filter(r => r.platform === plat)
  const plats = Array.from(new Set(d.reports.map(r => r.platform)))
  const byDsp = group(rows, r => r.platform), byCountry = group(rows.filter(r => r.country), r => r.country!).slice(0, 6)
  const title = (id: string | null) => d.releases.find(x => x.id === id)?.title ?? 'Outros'
  const byRel = group(rows, r => title(r.release_id)).slice(0, 6)
  return (<>
    <div className="toolbar">
      <div className="pills">{[[7, '7 dias'], [28, '28 dias'], [365, '12 meses']].map(([n, l]) => <button key={n} className={days === n ? 'on' : ''} onClick={() => setDays(n as number)}>{l}</button>)}</div>
      <select className="sel" value={plat} onChange={e => setPlat(e.target.value)}><option value="all">Todas as plataformas</option>{plats.map(p => <option key={p}>{p}</option>)}</select></div>
    {!rows.length ? <div className="card"><Empty title="Sem dados neste período" text="Tente um período maior ou aguarde os próximos relatórios das lojas." /></div> : <>
      <div className="grid3"><Kpi label="Streams no período" value={num(sum(rows, 'streams'))} /><Kpi label="Receita no período" value={brl(sum(rows, 'revenue'))} /><Kpi label="Plataformas ativas" value={String(byDsp.length)} /></div>
      <div className="grid2"><div className="card"><h3>Streams por plataforma</h3><Bars rows={byDsp} /></div>
        <div className="card"><h3>Ouvintes por país</h3>{byCountry.length ? <Donut rows={byCountry} /> : <p className="mut">Os relatórios deste período não trazem país.</p>}</div></div>
      <div className="card"><h3>Consumo do catálogo</h3><Bars rows={byRel} /></div></>}
  </>)
}
