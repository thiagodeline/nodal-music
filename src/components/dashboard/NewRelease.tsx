'use client'
import { useRef, useState } from 'react'
import { Check, Circle, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Data } from './ui'
const steps = ['Dados e créditos', 'Áudio', 'Revisão']
export default function NewRelease({ d, reload }: { d: Data; reload: () => void }) {
  const [st, setSt] = useState(0), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [drag, setDrag] = useState(false)
  const [v, setV] = useState({ title: '', type: 'single', artist: d.me?.artist_name || '', genre: '', date: '', isrc: '', upc: '', credits: '', explicit: false })
  const [cover, setCover] = useState<File | null>(null), [prev, setPrev] = useState(''), [audio, setAudio] = useState<File | null>(null)
  const inp = useRef<HTMLInputElement>(null)
  const set = (k: string, x: any) => setV(p => ({ ...p, [k]: x }))
  async function pickCover(f: File | null | undefined) {
    setErr(''); if (!f) return
    const img = new Image(); img.src = URL.createObjectURL(f); await new Promise(r => { img.onload = r; img.onerror = r })
    if (img.width !== img.height || img.width < 3000) { setCover(null); setPrev(''); return setErr(`A capa precisa ser quadrada e ter no mínimo 3000×3000 px (a sua tem ${img.width}×${img.height}).`) }
    setCover(f); setPrev(img.src)
  }
  function pickAudio(f: File | null | undefined) {
    setErr(''); if (!f) return
    if (!/\.(wav|flac)$/i.test(f.name)) { setAudio(null); return setErr('O áudio precisa ser WAV ou FLAC.') }
    setAudio(f)
  }
  function next() {
    setErr('')
    if (st === 0) {
      if (!v.title.trim() || !v.artist.trim()) return setErr('Preencha o título e o artista principal.')
      const isrc = v.isrc.replace(/-/g, '').toUpperCase(), upc = v.upc.replace(/\s/g, '')
      if (isrc && !/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc)) return setErr('ISRC inválido. Ele tem 12 caracteres, por exemplo BRABC2600001.')
      if (upc && !/^\d{12,13}$/.test(upc)) return setErr('UPC/EAN inválido. Use 12 ou 13 números.')
    }
    if (st === 1 && !audio) return setErr('Envie o áudio para continuar.')
    setSt(st + 1)
  }
  async function send() {
    if (!cover) return setErr('Falta a capa. Envie no quadro ao lado.')
    setBusy(true); setErr(''); const sb = createClient()
    const { data: { user } } = await sb.auth.getUser(); if (!user) { location.href = '/login'; return }
    const up = async (b: string, f: File) => { const p = `${user.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`; const { error } = await sb.storage.from(b).upload(p, f); if (error) throw error; return p }
    try {
      const c = await up('covers', cover), a = await up('audio', audio!)
      const { error } = await sb.from('releases').insert({ artist_id: user.id, title: v.title.trim(), type: v.type, main_artist: v.artist.trim(), genre: v.genre || null, explicit: v.explicit, release_date: v.date || null, isrc: v.isrc.replace(/-/g, '').toUpperCase() || null, upc: v.upc.replace(/\s/g, '') || null, credits: v.credits.trim() || null, cover_path: c, audio_path: a, status: 'pending' })
      if (error) throw error
      reload(); location.hash = '#catalog'
    } catch (x: any) { setErr('Não foi possível enviar: ' + (x.message ?? 'tente de novo.')); setBusy(false) }
  }
  const items: [string, boolean][] = [['Dados da faixa preenchidos', !!(v.title.trim() && v.artist.trim())], ['Áudio WAV ou FLAC enviado', !!audio], ['Capa HQ 3000×3000 válida', !!cover], ['Créditos informados', !!v.credits.trim()]]
  return (<div className="two-col">
    <div className="card">
      <ol className="stepper">{steps.map((s, i) => <li key={s} className={i === st ? 'on' : i < st ? 'done' : ''}><span>{i < st ? <Check size={14} /> : i + 1}</span>{s}</li>)}</ol>
      {st === 0 && <div className="form">
        <div className="two"><label>Título da faixa ou álbum<input value={v.title} onChange={e => set('title', e.target.value)} maxLength={120} /></label>
          <label>Artista principal<input value={v.artist} onChange={e => set('artist', e.target.value)} maxLength={120} /></label></div>
        <div className="two"><label>Tipo<select value={v.type} onChange={e => set('type', e.target.value)}><option value="single">Single</option><option value="ep">EP</option><option value="album">Álbum</option></select></label>
          <label>Gênero<input value={v.genre} onChange={e => set('genre', e.target.value)} placeholder="Ex.: Funk, Sertanejo, Pop" /></label></div>
        <label>Data de lançamento desejada<input type="date" value={v.date} onChange={e => set('date', e.target.value)} /></label>
        <div className="two"><label>ISRC (se já tiver)<input value={v.isrc} onChange={e => set('isrc', e.target.value)} placeholder="BRABC2600001" /></label>
          <label>UPC/EAN (se já tiver)<input value={v.upc} onChange={e => set('upc', e.target.value)} placeholder="12 ou 13 números" /></label></div>
        <p className="mut" style={{ margin: 0 }}>Sem ISRC ou UPC? Deixe em branco, a nossa equipe gera na aprovação.</p>
        <label>Créditos (compositores, produtores, intérpretes)<textarea rows={3} value={v.credits} onChange={e => set('credits', e.target.value)} placeholder="Ex.: Composição: Ana Lima. Produção: Beto Souza." maxLength={1000} /></label>
        <label className="chk"><input type="checkbox" checked={v.explicit} onChange={e => set('explicit', e.target.checked)} /> Contém conteúdo explícito</label></div>}
      {st === 1 && <div className="form"><label>Áudio (WAV ou FLAC)<input type="file" accept=".wav,.flac,audio/wav,audio/flac" onChange={e => pickAudio(e.target.files?.[0])} /></label>
        {audio && <p className="ok">{audio.name} ({(audio.size / 1048576).toFixed(1)} MB)</p>}
        <p className="mut" style={{ margin: 0 }}>A capa é enviada no quadro ao lado.</p></div>}
      {st === 2 && <div className="form"><dl className="review">{[['Título', v.title], ['Artista', v.artist], ['Tipo', v.type], ['Gênero', v.genre], ['Lançamento', v.date], ['ISRC', v.isrc], ['UPC/EAN', v.upc], ['Explícito', v.explicit ? 'Sim' : 'Não'], ['Áudio', audio?.name], ['Capa', cover?.name]].map(([k, x]) => <div key={k as string}><dt>{k}</dt><dd>{x || '—'}</dd></div>)}</dl>
        <p className="mut">Ao enviar, você declara ter os direitos sobre a obra, conforme o contrato e os Termos de Serviço. Nossa equipe revisa em seguida.</p></div>}
      {err && <p className="err" style={{ marginTop: 12 }}>{err}</p>}
      <div className="wiz-foot">{st > 0 && <button className="btn ghost" onClick={() => setSt(st - 1)} disabled={busy}>Voltar</button>}
        {st < 2 ? <button className="btn" onClick={next}>Continuar</button> : <button className="btn" onClick={send} disabled={busy}>{busy ? 'Enviando…' : 'Enviar lançamento'}</button>}</div>
    </div>
    <div className="side-col">
      <div className="card"><h3>Capa do lançamento</h3><p className="mut" style={{ margin: 0 }}>JPG ou PNG, quadrada, mínimo 3000×3000 px</p>
        <div className={'drop' + (drag ? ' over' : '')} role="button" tabIndex={0} onClick={() => inp.current?.click()} onKeyDown={e => e.key === 'Enter' && inp.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); pickCover(e.dataTransfer.files?.[0]) }}>
          {prev ? <img src={prev} alt="Prévia da capa" /> : <div><ImagePlus size={30} /><span>Solte a capa aqui ou clique para escolher</span></div>}</div>
        <input ref={inp} type="file" accept="image/jpeg,image/png" hidden onChange={e => pickCover(e.target.files?.[0])} /></div>
      <div className="card"><h3>Checklist do lançamento</h3>
        <ul className="check">{items.map(([t, ok]) => <li key={t} className={ok ? 'done2' : ''}>{ok ? <Check size={16} /> : <Circle size={16} />}{t}</li>)}</ul></div>
    </div>
  </div>)
}
