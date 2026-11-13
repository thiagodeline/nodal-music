'use client'
import { useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { parseRoyaltyFile, downloadTemplate, type Parsed } from '@/lib/royalties'
import { brl, num, Empty } from './ui'

type Err = { lines: number[]; key: string; platform: string; month: string; reason: string }
type Result = { imported: number; artists: number; errors: Err[] }
const CHUNK = 400

export default function RoyaltiesImport() {
  const [file, setFile] = useState<File | null>(null), [parsed, setParsed] = useState<Parsed | null>(null), [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [result, setResult] = useState<Result | null>(null), [drag, setDrag] = useState(false)
  const inp = useRef<HTMLInputElement>(null)

  async function pick(f: File | null | undefined) {
    if (!f) return
    setMsg(''); setResult(null); setParsed(null); setFile(null)
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) return setMsg('Envie um arquivo .xlsx, .xls ou .csv.')
    try { setParsed(await parseRoyaltyFile(f)); setFile(f) } catch (e: any) { setMsg(e?.message ?? 'Não foi possível ler o arquivo.') }
  }
  function reset() { setFile(null); setParsed(null); setResult(null); setMsg(''); setProgress(0) }

  async function send() {
    if (!parsed?.royalties.length) return
    const total = parsed.royalties.length
    if (!confirm(`Enviar ${num(total)} registros (${brl(parsed.revenueTotal)})?\n\nValores do mesmo artista, plataforma e período já existentes serão substituídos.`)) return
    setBusy(true); setMsg(''); setProgress(0)
    const sb = createClient(); const acc: Result = { imported: 0, artists: 0, errors: [] }
    try {
      for (let i = 0; i < total; i += CHUNK) {
        const rows = parsed.royalties.slice(i, i + CHUNK).map(r => ({ isrc: r.isrc, email: r.email, platform: r.platform, month: r.month, streams: r.streams, revenue: r.revenue, lines: r.lines }))
        const { data, error } = await sb.rpc('import_royalties', { p_rows: rows })
        if (error) { console.error('Erro detalhado Supabase:', error); throw new Error(`${error.message}${error.code ? ' (' + error.code + ')' : ''}`) }
        acc.imported += data.imported; acc.artists += data.artists; acc.errors.push(...(data.errors ?? []))
        setProgress(Math.min(total, i + CHUNK))
      }
      setResult(acc)
    } catch (e: any) {
      setMsg('A importação parou: ' + (e?.message ?? 'erro desconhecido') + '. Os lotes já enviados foram gravados; pode reenviar o arquivo sem duplicar.')
      if (acc.imported || acc.errors.length) setResult(acc)
    } finally { setBusy(false) }
  }

  const notFound = result?.errors.filter(e => e.reason === 'not_found') ?? [], failed = result?.errors.filter(e => e.reason !== 'not_found') ?? []
  const lines = (e: Err[]) => e.reduce((s, x) => s + (x.lines?.length ?? 1), 0)

  return (<div style={{ display: 'grid', gap: 20 }}>
    <div className="card">
      <div className="head-row"><div><h3>Importar Relatório de Royalties</h3>
        <p className="mut" style={{ margin: 0 }}>Colunas: ISRC ou Email_Artista, Plataforma, Periodo (ex.: 2026-10), Streams e Receita_BRL. A Receita_BRL é creditada inteira ao artista, então o arquivo deve trazer o valor líquido dele.</p></div>
        <button className="btn ghost sm" onClick={() => downloadTemplate()}><Download size={14} style={{ verticalAlign: -2 }} /> Baixar modelo</button></div>
      <div className={'drop' + (drag ? ' over' : '')} style={{ aspectRatio: 'auto', minHeight: 150 }} role="button" tabIndex={0} onClick={() => inp.current?.click()} onKeyDown={e => e.key === 'Enter' && inp.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}>
        <div>{file ? <FileSpreadsheet size={30} /> : <UploadCloud size={30} />}<span>{file ? file.name : 'Solte a planilha aqui ou clique para escolher (.xlsx, .xls ou .csv)'}</span></div></div>
      <input ref={inp} type="file" hidden accept=".xlsx,.xls,.csv" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {msg && <p className="err" style={{ marginTop: 12 }}>{msg}</p>}
      {parsed?.missingColumns.length ? <p className="err" style={{ marginTop: 12 }}>Faltam colunas na planilha: {parsed.missingColumns.join(', ')}.</p> : null}
    </div>

    {parsed && !parsed.missingColumns.length && !result && <div className="card">
      <div className="grid4" style={{ marginBottom: 16 }}>
        <div><small className="mut block">Linhas lidas</small><strong style={{ fontSize: '1.5rem' }}>{num(parsed.totalRows)}</strong></div>
        <div><small className="mut block">Linhas válidas</small><strong style={{ fontSize: '1.5rem' }}>{num(parsed.validRows)}</strong></div>
        <div><small className="mut block">Receita total (Receita_BRL)</small><strong style={{ fontSize: '1.5rem' }}>{brl(parsed.revenueTotal)}</strong></div>
        <div><small className="mut block">Streams / período</small><strong style={{ fontSize: '1.5rem' }}>{num(parsed.streamsTotal)}</strong><small className="mut block">{parsed.periods.join(', ') || '—'}</small></div>
      </div>
      {parsed.merged > 0 && <p className="mut">{num(parsed.merged)} linhas repetidas (mesmo ISRC/e-mail, plataforma e período) foram somadas.</p>}
      {parsed.issues.length > 0 && <div className="banner" style={{ marginBottom: 14 }} role="alert"><AlertTriangle size={20} /><div><p><b>{num(parsed.issues.length)} linhas com formato inválido serão ignoradas.</b></p>
        <details><summary style={{ cursor: 'pointer' }}>Ver quais</summary><ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{parsed.issues.slice(0, 100).map(i => <li key={i.line}>Linha {i.line}: {i.reason}</li>)}{parsed.issues.length > 100 && <li>e mais {parsed.issues.length - 100}…</li>}</ul></details></div></div>}
      {parsed.royalties.length ? <>
        <div className="scroll"><table><thead><tr><th>Linha</th><th>ISRC / E-mail</th><th>Plataforma</th><th>Período</th><th>Streams</th><th>Receita</th></tr></thead><tbody>
          {parsed.royalties.slice(0, 50).map((r, i) => <tr key={i}><td>{r.lines[0]}{r.lines.length > 1 ? ` (+${r.lines.length - 1})` : ''}</td><td className="mono">{r.isrc || r.email}</td><td>{r.platform}</td><td>{r.period}</td><td>{num(r.streams)}</td><td>{r.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 6, minimumFractionDigits: 2 })}</td></tr>)}</tbody></table></div>
        {parsed.royalties.length > 50 && <p className="mut pad">Mostrando 50 de {num(parsed.royalties.length)} registros.</p>}
        <div className="acts" style={{ marginTop: 16 }}><button className="btn" onClick={send} disabled={busy}>{busy ? `Enviando… ${num(progress)} de ${num(parsed.royalties.length)}` : 'Processar e Enviar Royalties'}</button>
          <button className="btn ghost" onClick={reset} disabled={busy}>Cancelar</button></div></>
        : <Empty title="Nenhuma linha válida" text="Corrija a planilha e envie de novo." />}
    </div>}

    {result && <div className="card" role="status">
      <div className="banner" style={{ background: 'rgba(21,128,61,.08)', borderColor: 'rgba(21,128,61,.3)' }}><CheckCircle2 size={20} style={{ color: '#15803d' }} />
        <p style={{ color: '#15803d' }}><b>{num(result.imported)} registros importados</b> para {num(result.artists)} {result.artists === 1 ? 'artista' : 'artistas'}. Os saldos já foram recalculados.</p></div>
      {notFound.length > 0 && <div className="banner" style={{ marginTop: 14 }} role="alert"><AlertTriangle size={20} /><div>
        <p><b>Atenção: {num(lines(notFound))} linhas não foram importadas porque o artista/ISRC não existe no sistema.</b></p>
        <div className="scroll"><table><thead><tr><th>Linha(s)</th><th>ISRC / E-mail</th><th>Plataforma</th><th>Período</th></tr></thead><tbody>
          {notFound.slice(0, 200).map((e, i) => <tr key={i}><td>{(e.lines ?? []).join(', ')}</td><td className="mono">{e.key}</td><td>{e.platform}</td><td>{String(e.month).slice(0, 7)}</td></tr>)}</tbody></table></div>
        {notFound.length > 200 && <p>e mais {notFound.length - 200} registros.</p>}</div></div>}
      {failed.length > 0 && <div className="banner red" style={{ marginTop: 14 }} role="alert"><AlertTriangle size={20} /><div><p><b>{num(lines(failed))} linhas deram erro ao gravar.</b></p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{failed.slice(0, 50).map((e, i) => <li key={i}>Linha {(e.lines ?? []).join(', ')} ({e.key}): {e.reason}</li>)}</ul></div></div>}
      <div className="acts" style={{ marginTop: 16 }}><button className="btn" onClick={reset}>Importar outro arquivo</button></div>
    </div>}
  </div>)
}
