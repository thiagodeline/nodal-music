'use client'
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { NewReleaseCta } from './ContractBanner'
import { Data, Release, Badge, Cover, Empty, dt } from './ui'
const F: [string, string, (s: string) => boolean][] = [['all', 'Todos', () => true], ['ok', 'Aprovados', s => s === 'approved' || s === 'live'], ['pending', 'Em Revisão', s => s === 'pending'], ['rejected', 'Reprovados', s => s === 'rejected']]
export default function Catalog({ d, can }: { d: Data; can: boolean }) {
  const [q, setQ] = useState(''), [f, setF] = useState('all'), [sel, setSel] = useState<Release | null>(null)
  const fn = F.find(x => x[0] === f)![2], t = q.trim().toLowerCase()
  const rows = d.releases.filter(r => fn(r.status) && (!t || [r.title, r.isrc, r.upc].some(x => (x || '').toLowerCase().includes(t))))
  if (!d.releases.length) return <div className="card"><Empty title="Seu catálogo está vazio" text="Cada faixa ou álbum que você enviar aparece aqui, com status e códigos."><NewReleaseCta can={can} label="+ Criar Primeiro Lançamento" /></Empty></div>
  return (<div className="card">
    <div className="toolbar"><label className="search"><Search size={16} /><input placeholder="Buscar por título, ISRC ou UPC" value={q} onChange={e => setQ(e.target.value)} /></label>
      <div className="pills">{F.map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div></div>
    <div className="scroll"><table><thead><tr><th>Capa e título</th><th>Artista principal</th><th>ISRC / UPC</th><th>Envio</th><th>Status</th><th></th></tr></thead><tbody>
      {rows.map(r => <tr key={r.id}><td><div className="cell"><Cover path={r.cover_path} size={44} /><div>{r.title}<small className="mut block">{r.type}</small>{r.status === 'rejected' && <small className="err block" style={{maxWidth:280,whiteSpace:'normal'}}>{r.rejection_reason || 'Consulte o suporte para saber o motivo da rejeição.'}</small>}</div></div></td><td>{r.main_artist || d.me?.artist_name || '—'}</td>
        <td className="mono">{r.isrc || '—'}<small className="mut block">{r.upc || '—'}</small></td><td>{dt(r.created_at)}</td><td><Badge s={r.status} /></td><td><button className="btn ghost sm" onClick={() => setSel(r)}>Ver detalhes</button></td></tr>)}</tbody></table></div>
    {!rows.length && <p className="mut pad">Nenhum resultado para esse filtro.</p>}
    {sel && <div className="modal" onClick={() => setSel(null)}><div className="sheet" onClick={e => e.stopPropagation()}>
      <button className="x" onClick={() => setSel(null)} aria-label="Fechar"><X size={18} /></button><Cover path={sel.cover_path} size={96} /><h3>{sel.title}</h3><Badge s={sel.status} />
      <dl>{[['Artista', sel.main_artist || d.me?.artist_name], ['Tipo', sel.type], ['Gênero', sel.genre], ['Lançamento', dt(sel.release_date)], ['ISRC', sel.isrc], ['UPC', sel.upc], ['Enviado em', dt(sel.created_at)]].map(([k, v]) => <div key={k as string}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
      {sel.status === 'rejected' && <div className="err" role="status" style={{padding:'12px 0',whiteSpace:'pre-line'}}><strong>Motivo da rejeição</strong><p>{sel.rejection_reason || 'A equipe não registrou um motivo. Entre em contato com o suporte.'}</p></div>}
      <p className="mut">ISRC e UPC são gerados pela equipe após a aprovação. Os links das lojas aparecem quando o lançamento entra no ar.</p></div></div>}
  </div>)
}
