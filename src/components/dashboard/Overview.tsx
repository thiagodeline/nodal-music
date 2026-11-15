'use client'
import { NewReleaseCta } from './ContractBanner'
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import { Data, Kpi, Badge, Cover, Bars, Area, Empty, brl, num, dt, money, sum, group } from './ui'
const iso = (d: Date) => d.toISOString().slice(0, 10)
export default function Overview({ d, can }: { d: Data; can: boolean }) {
  const { balance } = money(d)
  const [banner,setBanner]=useState<{headline:string;body:string;cta_label:string;cta_url:string}|null>(null)
  useEffect(()=>{void createClient().from('dashboard_banners').select('headline,body,cta_label,cta_url').eq('active',true).order('created_at',{ascending:false}).limit(1).maybeSingle().then(({data})=>setBanner(data))},[])
  const today = new Date(), months = Array.from({ length: 6 }, (_, i) => { const x = new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()-(5-i),1)); return iso(x) })
  const cut = (n: number) => { const x = new Date(today); x.setDate(x.getDate() - n); return iso(x) }
  const cur = d.reports.filter(r => r.month >= months[4]), prev = d.reports.filter(r => r.month >= months[2] && r.month < months[4])
  const delta = (a: number, b: number) => b > 0 ? (a - b) / b * 100 : null
  const map: Record<string, number> = {}; d.reports.forEach(r => map[r.month] = (map[r.month] || 0) + Number(r.streams))
  const pts: [string, number][] = months.map(x => [x.slice(5,7)+'/'+x.slice(0,4), map[x] || 0])
  const monthKey = iso(today).slice(0, 7), monthRev = sum(d.reports.filter(r => r.month.startsWith(monthKey)), 'revenue')
  const active = d.releases.filter(r => r.status === 'approved' || r.status === 'live').length
  const dsp = group(d.reports, r => r.platform).slice(0, 5)
  return (<>
    <div className="nd-hpromo"><div><strong>Distribua sua música com a SINTONE</strong><p>Envie suas faixas, acompanhe aprovações e gerencie suas receitas em um só lugar.</p></div><NewReleaseCta can={can} label="Carregue sua música" /></div>
    {banner&&<div className="nd-hpromo"><div><strong>{banner.headline}</strong><p>{banner.body}</p></div>{banner.cta_url.startsWith('/')&&<a className="btn" href={banner.cta_url}>{banner.cta_label}</a>}</div>}
    <div className="card"><h3>Análise — últimos 7 dias</h3><p className="mut">Streams e receita estão disponíveis apenas por competência mensal nos relatórios atuais. Para mostrar valores e uma tendência reais dos últimos 7 dias (ou visualizações de vídeos), será necessário importar dados diários dessas plataformas. Não exibimos estimativas inventadas.</p></div>
    <div className="grid4">
      <Kpi label="Saldo disponível" value={brl(balance)} action={<a className="btn sm" href="#financial">Sacar</a>} />
      <Kpi label="Streams nas 2 últimas competências" value={num(sum(cur, 'streams'))} delta={null} />
      <Kpi label="Lançamentos ativos" value={String(active)} />
      <Kpi label="Royalties reportados no mês" value={brl(monthRev)} />
    </div>
    <div className="grid2">
      <div className="card"><h3>Streams por competência</h3><p className="mut">Últimos 6 meses, conforme relatórios recebidos</p>{sum(d.reports, 'streams') ? <Area pts={pts} /> : <Empty title="Sem dados ainda" text="Os números aparecem aqui assim que as lojas enviarem os primeiros relatórios." />}</div>
      <div className="card"><h3>Top lojas (DSPs)</h3><p className="mut">Participação nos streams</p>{dsp.length ? <Bars rows={dsp} /> : <p className="mut">Sem dados de lojas ainda.</p>}</div>
    </div>
    <div className="card"><div className="row-h"><h3>Lançamentos recentes</h3><a className="link" href="#catalog">Ver todos</a></div>
      {d.releases.length ? <table><thead><tr><th>Faixa</th><th>Artista</th><th>Data</th><th>Status</th></tr></thead><tbody>
        {d.releases.slice(0, 3).map(r => <tr key={r.id}><td><div className="cell"><Cover path={r.cover_path} />{r.title}</div></td><td>{r.main_artist || d.me?.artist_name || '—'}</td><td>{dt(r.release_date || r.created_at)}</td><td><Badge s={r.status} /></td></tr>)}</tbody></table>
        : <Empty title="Nenhum lançamento ainda" text="Envie sua primeira faixa e acompanhe tudo por aqui."><NewReleaseCta can={can} label="+ Criar primeiro lançamento" /></Empty>}</div>
  </>)
}
