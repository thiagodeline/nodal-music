'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Headphones, Check, X, Paperclip, Eye, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge, Cover, Kpi, Empty, brl, dt } from './ui'
import { CAT } from './Support'
export default function Admin() {
  const sb = useMemo(() => createClient(), [])
  const [rels, setRels] = useState<any[]>([]), [wds, setWds] = useState<any[]>([]), [lg, setLg] = useState<any[]>([]), [tk, setTk] = useState<any[]>([]), [n, setN] = useState(0)
  const [arts, setArts] = useState<any[]>([]), [cts, setCts] = useState<any[]>([]), [dl, setDl] = useState('')
  const [all, setAll] = useState({ r: false, w: false }), [player, setPlayer] = useState<{ t: string; u: string } | null>(null), [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null), tgt = useRef<any>(null)
  const load = useCallback(async () => {
    const q = (t: string, sel = '*') => sb.from(t).select(sel).order('created_at', { ascending: false }).limit(100)
    const [r, w, l, t, c, a, k] = await Promise.all([q('releases', '*, profiles(artist_name)'), q('withdrawals', '*, profiles(artist_name)'), q('lgpd_requests'), q('tickets', '*, profiles(artist_name)'), sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('profiles').select('id, artist_name').order('artist_name').limit(500), sb.from('user_contracts').select('user_id, signed_name, signed_at, ip_address, pdf_url').limit(500)])
    setRels(r.data ?? []); setWds(w.data ?? []); setLg(l.data ?? []); setTk(t.data ?? []); setN(c.count ?? 0); setArts(a.data ?? []); setCts(k.data ?? [])
  }, [sb])
  useEffect(() => { load() }, [load])
  const upd = async (table: string, id: string, patch: object) => { setErr(''); const { error } = await sb.from(table).update(patch).eq('id', id); if (error) setErr('Não foi possível atualizar: ' + error.message); load() }
  const play = async (r: any) => { const { data, error } = await sb.storage.from('audio').createSignedUrl(r.audio_path, 3600); if (error || !data) return setErr('Não foi possível abrir o áudio.'); setPlayer({ t: r.title, u: data.signedUrl }) }
  const openRcpt = async (p: string) => { const win = window.open('', '_blank'); const { data } = await sb.storage.from('receipts').createSignedUrl(p, 600); if (win && data) win.location.href = data.signedUrl; else win?.close() }
  // Contrato assinado: bucket privado 'contracts' -> URL assinada temporária (60 s) com download forçado
  const ctByUser = useMemo(() => new Map(cts.map(c => [c.user_id, c])), [cts])
  const dlContract = async (a: any, c: any) => {
    setErr(''); setDl(a.id)
    const nome = (a.artist_name || 'artista').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')
    const { data, error } = await sb.storage.from('contracts').createSignedUrl(c.pdf_url, 60, { download: `contrato_${nome}.pdf` })
    setDl('')
    if (error || !data) return setErr('Não foi possível gerar o link do contrato.')
    const el = document.createElement('a'); el.href = data.signedUrl; el.rel = 'noopener'; document.body.appendChild(el); el.click(); el.remove()
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0], w = tgt.current; e.target.value = ''; if (!f || !w) return
    const p = `${w.artist_id}/${w.id}-${f.name.replace(/[^\w.-]/g, '_')}`; const { error } = await sb.storage.from('receipts').upload(p, f)
    if (error) return setErr('Falha no envio do comprovante: ' + error.message); await upd('withdrawals', w.id, { receipt_path: p })
  }
  const who = (x: any) => x.profiles?.artist_name || '—'
  const pr = all.r ? rels : rels.filter(r => r.status === 'pending'), pw = all.w ? wds : wds.filter(w => w.status === 'pending')
  const pendW = wds.filter(w => w.status === 'pending'), openL = lg.filter(l => l.status === 'open').length, openT = tk.filter(t => t.status !== 'closed').length
  return (<div className="adm">
    <div className="grid4"><Kpi label="Artistas" value={String(n)} /><Kpi label="Lançamentos para revisar" value={String(rels.filter(r => r.status === 'pending').length)} />
      <Kpi label="Saques pendentes" value={brl(pendW.reduce((s, w) => s + Number(w.amount), 0))} /><Kpi label="Pedidos LGPD abertos" value={String(openL)} /></div>
    {err && <p className="err">{err}</p>}
    <div className="card"><div className="head-row"><h3>Lançamentos {all.r ? '' : 'pendentes'}</h3><button className="btn ghost sm" onClick={() => setAll({ ...all, r: !all.r })}>{all.r ? 'Só pendentes' : 'Mostrar todos'}</button></div>
      {pr.length ? <div className="scroll"><table><thead><tr><th>Capa</th><th>Artista</th><th>Título</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        {pr.map(r => <tr key={r.id}><td><Cover path={r.cover_path} size={44} /></td><td>{who(r)}</td><td>{r.title}</td><td>{dt(r.created_at)}</td><td><Badge s={r.status} /></td>
          <td><div className="acts"><button className="btn ghost sm" onClick={() => play(r)}><Headphones size={14} />Ouvir Áudio</button>
            <button className="btn green sm" onClick={() => upd('releases', r.id, { status: 'approved' })}><Check size={14} />Aprovar</button>
            <button className="btn bad sm" onClick={() => upd('releases', r.id, { status: 'rejected' })}><X size={14} />Rejeitar</button></div></td></tr>)}</tbody></table></div>
        : <Empty title="Nada para revisar" text="Os novos lançamentos dos artistas aparecem aqui." />}</div>
    <div className="card"><div className="head-row"><h3>Saques {all.w ? '' : 'pendentes'}</h3><button className="btn ghost sm" onClick={() => setAll({ ...all, w: !all.w })}>{all.w ? 'Só pendentes' : 'Mostrar todos'}</button></div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={upload} />
      {pw.length ? <div className="scroll"><table><thead><tr><th>Artista</th><th>Valor</th><th>Chave Pix</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        {pw.map(w => <tr key={w.id}><td>{who(w)}</td><td>{brl(Number(w.amount))}</td><td className="mono">{w.pix_key}</td><td>{dt(w.created_at)}</td><td><Badge s={w.status === 'pending' ? 'wpending' : w.status} /></td>
          <td><div className="acts">{w.status === 'pending' && <button className="btn green sm" onClick={() => upd('withdrawals', w.id, { status: 'paid' })}><Check size={14} />Marcar como Pago</button>}
            {w.receipt_path ? <button className="btn ghost sm" onClick={() => openRcpt(w.receipt_path)}><Eye size={14} />Ver comprovante</button> : <button className="btn ghost sm" onClick={() => { tgt.current = w; fileRef.current?.click() }}><Paperclip size={14} />Comprovante</button>}
            {w.status === 'pending' && <button className="btn bad sm" onClick={() => upd('withdrawals', w.id, { status: 'rejected' })}><X size={14} />Recusar</button>}</div></td></tr>)}</tbody></table></div>
        : <Empty title="Nenhum saque pendente" />}</div>
    <div className="card"><h3>Artistas cadastrados ({arts.length})</h3>
      {arts.length ? <div className="scroll"><table><thead><tr><th>Artista</th><th>Contrato</th><th>Assinado por</th><th>Assinado em</th><th>IP</th><th>Ações</th></tr></thead><tbody>
        {arts.map(a => { const c = ctByUser.get(a.id); return <tr key={a.id}><td>{a.artist_name || '—'}</td>
          <td><span className={'bd ' + (c ? 'green' : 'amber')}>{c ? 'Assinado' : 'Pendente'}</span></td>
          <td>{c?.signed_name ?? '—'}</td><td>{c ? dt(c.signed_at) : '—'}</td><td className="mono">{c?.ip_address ?? '—'}</td>
          <td>{c ? <div className="acts"><button className="btn ghost sm" disabled={dl === a.id} onClick={() => dlContract(a, c)}><Download size={14} />{dl === a.id ? 'Gerando…' : 'Baixar Contrato PDF'}</button></div> : <span className="mut">Aguardando assinatura</span>}</td></tr> })}</tbody></table></div>
        : <Empty title="Nenhum artista cadastrado" />}</div>
    <div className="card"><h3>Chamados de suporte ({openT} em aberto)</h3>
      {tk.length ? <div className="scroll"><table><thead><tr><th>Artista</th><th>Assunto</th><th>Categoria</th><th>Mensagem</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        {tk.map(t => <tr key={t.id}><td>{who(t)}</td><td>{t.subject}</td><td>{CAT[t.category]}</td><td className="trunc" title={t.message}>{t.message}</td><td>{dt(t.created_at)}</td><td><Badge s={t.status} /></td>
          <td><div className="acts">{t.status === 'open' && <button className="btn ghost sm" onClick={() => upd('tickets', t.id, { status: 'in_progress' })}>Em atendimento</button>}{t.status !== 'closed' && <button className="btn green sm" onClick={() => upd('tickets', t.id, { status: 'closed' })}>Fechar</button>}</div></td></tr>)}</tbody></table></div>
        : <Empty title="Nenhum chamado" />}</div>
    <div className="card"><h3>Pedidos LGPD (prazo de resposta: 15 dias)</h3>
      {lg.length ? <div className="scroll"><table><thead><tr><th>Recebido</th><th>Prazo</th><th>Quem</th><th>Pedido</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        {lg.map(l => <tr key={l.id}><td>{dt(l.created_at)}</td><td>{dt(new Date(new Date(l.created_at).getTime() + 15 * 864e5).toISOString())}</td><td>{l.name}<small className="mut block">{l.email}</small></td><td>{l.type}{l.details ? ': ' + l.details : ''}</td>
          <td><span className={'bd ' + (l.status === 'done' ? 'green' : 'amber')}>{l.status === 'done' ? 'Atendido' : 'Aberto'}</span></td>
          <td>{l.status !== 'done' && <button className="btn green sm" onClick={() => upd('lgpd_requests', l.id, { status: 'done' })}>Marcar atendido</button>}</td></tr>)}</tbody></table></div>
        : <Empty title="Nenhum pedido LGPD" />}</div>
    {player && <div className="player"><b>{player.t}</b><audio src={player.u} controls autoPlay /><button className="btn ghost sm" onClick={() => setPlayer(null)} aria-label="Fechar player"><X size={14} /></button></div>}
  </div>)
}
