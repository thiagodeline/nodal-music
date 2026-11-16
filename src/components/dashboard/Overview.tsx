'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import { Data, Kpi, Badge, Cover, Bars, brl, num, dt, money, sum, group } from './ui'
import {Info} from 'lucide-react'
import Link from 'next/link'
const iso = (d: Date) => d.toISOString().slice(0, 10)
export default function Overview({ d, can }: { d: Data; can: boolean }) {
  const { balance } = money(d)
  const [banner,setBanner]=useState<{headline:string;body:string;cta_label:string;cta_url:string;expires_at:string|null}|null>(null)
  useEffect(()=>{void createClient().from('dashboard_banners').select('headline,body,cta_label,cta_url,expires_at').eq('active',true).order('created_at',{ascending:false}).limit(20).then(({data})=>setBanner((data||[]).find(x=>!x.expires_at||new Date(x.expires_at)>new Date())||null))},[])
  const today = new Date(), months = Array.from({ length: 6 }, (_, i) => { const x = new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()-(5-i),1)); return iso(x) })
  const cur = d.reports.filter(r => r.month >= months[4])
  const map: Record<string, number> = {}; d.reports.forEach(r => map[r.month] = (map[r.month] || 0) + Number(r.streams))
  const chartMonths=months.map(x=>({label:new Date(x+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}).replace('.',''),streams:map[x]||0}))
  const chartMax=Math.max(0,...chartMonths.map(x=>x.streams))
  const monthKey = iso(today).slice(0, 7), monthRev = sum(d.reports.filter(r => r.month.startsWith(monthKey)), 'revenue')
  const active = d.releases.filter(r => r.status === 'approved' || r.status === 'live').length
  const dsp = group(d.reports, r => r.platform).slice(0, 5)
  return (<>
    <div className="nd-hpromo nd-hwelcome"><strong>Olá, {d.me?.artist_name?.trim()||d.me?.name?.trim()||'Artista'}</strong></div>
    {banner&&<div className="nd-hpromo"><div><strong>{banner.headline}</strong><p>{banner.body}</p></div>{banner.cta_url.startsWith('/')&&!banner.cta_url.startsWith('//')&&<a className="btn" href={banner.cta_url}>{banner.cta_label}</a>}</div>}
    <section className="card nd-weekly-analysis">
      <div className="nd-section-head"><h3>Análise — últimos 7 dias</h3>
        <span className="nd-info-help" title="Os relatórios atuais da SINTONE chegam por competência mensal. Ainda não há dados diários verificáveis de vídeos, visualizações ou streams para calcular os últimos 7 dias." aria-label="Sobre os dados dos últimos 7 dias" tabIndex={0}><Info size={17}/></span>
      </div>
      <div className="nd-weekly-grid">
       {(['Vídeos','Visualizações','Fluxos'] as const).map(label=><div className="nd-weekly-stat" key={label}>
        <span>{label}</span><strong>0</strong><small title="Variação demonstrativa: não há dados diários para comparar períodos.">0% <span className="nd-weekly-hint">sem dados diários</span></small>
       </div>)}
      </div>
    </section>
    <div className="grid4">
      <Kpi label="Saldo disponível" value={brl(balance)} action={<a className="btn sm" href="#financial">Sacar</a>} />
      <Kpi label="Streams nas 2 últimas competências" value={num(sum(cur, 'streams'))} delta={null} />
      <Kpi label="Lançamentos ativos" value={String(active)} />
      <Kpi label="Royalties reportados no mês" value={brl(monthRev)} />
    </div>
    <div className="grid2">
      <section className="card nd-monthly-card"><div className="nd-section-head"><h3>Streams por competência</h3><span className="mut">Últimos 6 meses</span></div>
       <div className="nd-monthly-chart" role="img" aria-label={'Streams mensais: '+chartMonths.map(m=>m.label+' '+m.streams).join(', ')}>
        {chartMonths.map((m,i)=><div className="nd-month-column" key={i}><div className="nd-month-bar-area"><span className="nd-month-bar" style={{height:chartMax?Math.max(3,m.streams/chartMax*100)+'%':'3px'}} title={m.label+': '+num(m.streams)+' streams'}/></div><span className="nd-month-label">{m.label}</span></div>)}
       </div>
       {!chartMax&&<p className="nd-month-empty">Aguardando primeiros dados de streams</p>}
      </section>
      <section className="card"><h3>Top lojas (DSPs)</h3><p className="mut">Participação nos streams reportados</p>{dsp.length?<Bars rows={dsp}/>:<p className="mut">Aguardando primeiros relatórios das lojas.</p>}</section>
    </div>
    <div className="card"><div className="row-h"><h3>Lançamentos recentes</h3><a className="link" href="/dashboard#catalog">Ver todos</a></div>
      {d.releases.length ? <table><thead><tr><th>Faixa</th><th>Artista</th><th>Data</th><th>Status</th></tr></thead><tbody>
        {d.releases.slice(0, 3).map(r => <tr key={r.id}><td><div className="cell"><Cover path={r.cover_path} />{r.title}</div></td><td>{r.main_artist || d.me?.artist_name || '—'}</td><td>{dt(r.release_date || r.created_at)}</td><td><Badge s={r.status} /></td></tr>)}</tbody></table>
        : <div className="nd-no-releases"><h4>Nenhum lançamento ainda</h4><p className="mut">Cadastre um artista para começar a organizar seu catálogo.</p><Link className="btn" href="/dashboard/artistas">Cadastrar artista</Link></div>}</div>
  </>)
}
