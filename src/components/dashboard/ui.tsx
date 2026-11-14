import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown } from 'lucide-react'
export type Release = { id: string; title: string; type: string; main_artist: string | null; genre: string | null; subgenre?: string | null; featured_artists?: string | null; composers?: string | null; producers?: string | null; lyricists?: string | null; rejection_reason?: string | null; credits: string | null; isrc: string | null; upc: string | null; release_date: string | null; cover_path: string | null; status: string; created_at: string }
export type Report = { id: string; release_id: string | null; platform: string; month: string; streams: number; revenue: number; country: string | null }
export type Wd = { id: string; amount: number; pix_key: string; status: string; created_at: string }
export type Data = { me: any; email: string; releases: Release[]; reports: Report[]; wds: Wd[] }

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const num = (n: number) => n.toLocaleString('pt-BR')
export const dt = (s?: string | null) => s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('pt-BR') : '—'
export const MIN_SAQUE = 50
export function money(d: Data) {
  const earned = d.reports.reduce((s, r) => s + Number(r.revenue), 0)
  const paid = d.wds.filter(w => w.status === 'paid').reduce((s, w) => s + Number(w.amount), 0)
  const held = d.wds.filter(w => w.status !== 'rejected').reduce((s, w) => s + Number(w.amount), 0)
  return { earned, paid, balance: earned - held }
}
export const sum = (a: Report[], k: 'streams' | 'revenue') => a.reduce((s, r) => s + Number(r[k]), 0)
export const group = (a: Report[], key: (r: Report) => string) => { const m: Record<string, number> = {}; a.forEach(r => { const k = key(r) || 'Outros'; m[k] = (m[k] || 0) + Number(r.streams) }); return Object.entries(m).sort((x, y) => y[1] - x[1]) }

const ST: Record<string, [string, string]> = { pending: ['Em Revisão', 'amber'], approved: ['Aprovado', 'green'], live: ['No ar', 'green'], draft: ['Rascunho', 'gray'], rejected: ['Reprovado', 'red'], paid: ['Pago', 'green'], wpending: ['Pendente', 'orange'], open: ['Aberto', 'amber'], in_progress: ['Em Atendimento', 'blue'], closed: ['Fechado', 'gray'], credited: ['Creditado', 'green'] }
export const Badge = ({ s }: { s: string }) => { const [t, c] = ST[s] ?? [s, 'gray']; return <span className={`bd ${c}`}>{t}</span> }
export function Cover({ path, size = 40 }: { path: string | null; size?: number }) {
  if (!path) return <div className="cov" style={{ width: size, height: size }} />
  const url = createClient().storage.from('covers').getPublicUrl(path).data.publicUrl
  return <img className="cov" src={url} width={size} height={size} alt="" />
}
export function Kpi({ label, value, delta, action }: { label: string; value: string; delta?: number | null; action?: React.ReactNode }) {
  return (<div className="card kpi"><small>{label}</small><strong>{value}</strong>
    <div className="kpi-foot">{delta != null && <span className={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {Math.abs(delta).toFixed(0)}% vs. período anterior</span>}{action}</div></div>)
}
export function Empty({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (<div className="empty">
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true"><circle cx="48" cy="48" r="38" stroke="rgba(11,16,32,.14)" strokeWidth="2" /><circle cx="48" cy="48" r="14" fill="#0045dd" /><circle cx="48" cy="48" r="4" fill="#ffffff" /><path d="M48 34V12l18 6" stroke="#0045dd" strokeWidth="2.5" strokeLinecap="round" /></svg>
    <h3>{title}</h3>{text && <p>{text}</p>}{children}</div>)
}
export function Area({ pts }: { pts: [string, number][] }) {
  const w = 600, h = 200, max = Math.max(1, ...pts.map(p => p[1])), step = w / Math.max(1, pts.length - 1)
  const xy = pts.map((p, i) => [i * step, h - 20 - (p[1] / max) * (h - 40)])
  const line = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return (<svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Streams por dia nos últimos 30 dias">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0045dd" stopOpacity=".28" /><stop offset="1" stopColor="#0045dd" stopOpacity="0" /></linearGradient></defs>
    {[0, 1, 2].map(i => <line key={i} x1="0" x2={w} y1={20 + i * 80} y2={20 + i * 80} stroke="rgba(11,16,32,.08)" />)}
    <path d={`${line} L${w} ${h - 20} L0 ${h - 20} Z`} fill="url(#ag)" /><path d={line} fill="none" stroke="#0045dd" strokeWidth="2.5" strokeLinejoin="round" />
    {[0, Math.floor(pts.length / 2), pts.length - 1].map(i => <text key={i} x={i === 0 ? 0 : i === pts.length - 1 ? w : xy[i][0]} y={h - 3} fill="#566080" fontSize="11" textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}>{pts[i][0]}</text>)}
    <text x="0" y="12" fill="#566080" fontSize="11">{num(max)}</text></svg>)
}
export function Bars({ rows }: { rows: [string, number][] }) {
  const tot = rows.reduce((s, r) => s + r[1], 0) || 1, max = Math.max(1, ...rows.map(r => r[1]))
  return (<div className="bars">{rows.map(([n, v]) => <div key={n} className="bar"><div className="bar-h"><span>{n}</span><b>{(v / tot * 100).toFixed(0)}%</b></div><div className="track"><i style={{ width: (v / max * 100) + '%' }} /></div></div>)}</div>)
}
export const COL = ['#0045dd', '#5b8def', '#8a6cf0', '#14b8c8', '#e08a00', '#64748b']
export function Donut({ rows }: { rows: [string, number][] }) {
  const tot = rows.reduce((s, r) => s + r[1], 0) || 1, R = 52, C = 2 * Math.PI * R; let off = 0
  return (<div className="donut"><svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Distribuição por país"><g transform="rotate(-90 70 70)">
    {rows.map(([n, v], i) => { const len = v / tot * C, el = <circle key={n} cx="70" cy="70" r={R} fill="none" stroke={COL[i % COL.length]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />; off += len; return el })}</g></svg>
    <ul>{rows.map(([n, v], i) => <li key={n}><i style={{ background: COL[i % COL.length] }} />{n}<b>{(v / tot * 100).toFixed(0)}%</b></li>)}</ul></div>)
}
