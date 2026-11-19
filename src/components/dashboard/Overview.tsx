'use client'
import { Data, Kpi, Badge, Cover, Bars, brl, num, dt, money, sum, group, MIN_SAQUE } from './ui'
import {Info,Music2,UserRound,Wallet} from 'lucide-react'
import Link from 'next/link'
import {createClient} from '@/lib/supabase/client'
const iso = (d: Date) => d.toISOString().slice(0, 10)
export default function Overview({ d, can, unread=0, reload }: { d: Data; can: boolean; unread?:number; reload:()=>void }) {
  const { balance } = money(d)
  const artistName=d.me?.artist_name?.trim()||d.me?.name?.trim()||'ARTISTA'
  const avatarPath=d.me?.avatar_path as string|undefined
  const avatarUrl=avatarPath?createClient().storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl:null
  const canWithdraw=Number.isFinite(balance)&&balance>=MIN_SAQUE
  const today = new Date(), months = Array.from({ length: 6 }, (_, i) => { const x = new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()-(5-i),1)); return iso(x) })
  const cur = d.reports.filter(r => r.month >= months[4])
  const map: Record<string, number> = {}; d.reports.forEach(r => map[r.month] = (map[r.month] || 0) + Number(r.streams))
  const chartMonths=months.map(x=>({label:new Date(x+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}).replace('.',''),streams:map[x]||0}))
  const chartMax=Math.max(0,...chartMonths.map(x=>x.streams))
  const monthKey = iso(today).slice(0, 7), monthRev = sum(d.reports.filter(r => r.month.startsWith(monthKey)), 'revenue')
  const active = d.releases.filter(r => r.status === 'approved' || r.status === 'live').length
  const dsp = group(d.reports, r => r.platform).slice(0, 5)
  return (<>
    <section className="nd-premium-welcome">
     <div className="nd-welcome-profile">
      <div className="nd-avatar-upload nd-avatar-static" aria-label="Foto de perfil do artista">
       {avatarUrl?<img src={avatarUrl} alt="Foto de perfil do artista"/>:<UserRound size={34} aria-hidden="true"/>}
      </div>
      <div className="nd-welcome-text"><span>SINTONE / VISÃO GERAL</span>
       <h2>QUE BOM VER VOCÊ, {artistName.toLocaleUpperCase('pt-BR')}.</h2>
       <p>Seu catálogo, suas oportunidades e seus próximos lançamentos estão aqui.</p>
      </div>
     </div>
     <div className="nd-welcome-wallet">
      <Wallet size={23} aria-hidden="true"/>
      <h3>SALDO DISPONÍVEL</h3>
      <strong className="nd-wallet-balance">{brl(balance)}</strong>
      {canWithdraw?<a href="/dashboard#financial" className="nd-withdraw-action">Solicitar Saque via PIX</a>:
       <button type="button" className="nd-withdraw-action is-disabled" disabled>Saque disponível a partir de {brl(MIN_SAQUE)}</button>}
     </div>
    </section>
    <section className="nd-release-launch nd-launch-simple">
     <a className={'nd-launch-cta '+(!can?'is-locked':'')} href={can?'/novo-lancamento':'/dashboard#contracts'} aria-disabled={!can}><Music2 size={20}/>{can?'LANÇAR MÚSICA':'LANÇAMENTO INDISPONÍVEL'}</a>
     {!can&&<p className="nd-launch-lock-note">Conclua os requisitos da conta, contrato ou plano para liberar os lançamentos.</p>}
    </section>
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
    <div className="grid3">
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
      {d.releases.length ? <div className="nd-table-scroll" role="region" aria-label="Lançamentos recentes" tabIndex={0}><table><thead><tr><th>Faixa</th><th>Artista</th><th>Data</th><th>Status</th></tr></thead><tbody>
        {d.releases.slice(0, 3).map(r => <tr key={r.id}><td><div className="cell"><Cover path={r.cover_path} />{r.title}</div></td><td>{r.main_artist || d.me?.artist_name || '—'}</td><td>{dt(r.release_date || r.created_at)}</td><td><Badge s={r.status} /></td></tr>)}</tbody></table></div>
        : <div className="nd-no-releases"><h4>Nenhum lançamento ainda</h4><p className="mut">Cadastre um artista para começar a organizar seu catálogo.</p><Link className="btn" href="/dashboard/artistas">Cadastrar artista</Link></div>}</div>
  </>)
}
