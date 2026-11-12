'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Data } from './ui'
const steps = ['Dados', 'Arquivos', 'Revisão']
export default function NewRelease({ d, reload }: { d: Data; reload: () => void }) {
  const [st, setSt] = useState(0), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const [v, setV] = useState({ title: '', type: 'single', artist: d.me?.artist_name || '', genre: '', date: '', explicit: false })
  const [cover, setCover] = useState<File | null>(null), [audio, setAudio] = useState<File | null>(null)
  const set = (k: string, x: any) => setV(p => ({ ...p, [k]: x }))
  async function pickCover(f: File | null) {
    setErr(''); setCover(null); if (!f) return
    const img = new Image(); img.src = URL.createObjectURL(f)
    await new Promise(r => { img.onload = r; img.onerror = r })
    if (img.width !== img.height || img.width < 3000) return setErr(`A capa precisa ser quadrada e ter no mínimo 3000×3000 px (a sua tem ${img.width}×${img.height}).`)
    setCover(f)
  }
  function next() {
    setErr('')
    if (st === 0 && (!v.title.trim() || !v.artist.trim())) return setErr('Preencha o título e o artista principal.')
    if (st === 1 && (!cover || !audio)) return setErr('Envie a capa e o áudio para continuar.')
    setSt(st + 1)
  }
  async function send() {
    setBusy(true); setErr(''); const sb = createClient()
    const { data: { user } } = await sb.auth.getUser(); if (!user) { location.href = '/login'; return }
    const up = async (b: string, f: File) => { const p = `${user.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`; const { error } = await sb.storage.from(b).upload(p, f); if (error) throw error; return p }
    try {
      const c = await up('covers', cover!), a = await up('audio', audio!)
      const { error } = await sb.from('releases').insert({ artist_id: user.id, title: v.title.trim(), type: v.type, main_artist: v.artist.trim(), genre: v.genre || null, explicit: v.explicit, release_date: v.date || null, cover_path: c, audio_path: a, status: 'pending' })
      if (error) throw error
      reload(); location.hash = '#catalog'
    } catch (x: any) { setErr('Não foi possível enviar: ' + (x.message ?? 'tente de novo.')); setBusy(false) }
  }
  return (<div className="card wiz">
    <ol className="stepper">{steps.map((s, i) => <li key={s} className={i === st ? 'on' : i < st ? 'done' : ''}><span>{i < st ? <Check size={14} /> : i + 1}</span>{s}</li>)}</ol>
    {st === 0 && <div className="form">
      <label>Título<input value={v.title} onChange={e => set('title', e.target.value)} maxLength={120} /></label>
      <label>Artista principal<input value={v.artist} onChange={e => set('artist', e.target.value)} maxLength={120} /></label>
      <div className="two"><label>Tipo<select value={v.type} onChange={e => set('type', e.target.value)}><option value="single">Single</option><option value="ep">EP</option><option value="album">Álbum</option></select></label>
        <label>Gênero<input value={v.genre} onChange={e => set('genre', e.target.value)} placeholder="Ex.: Funk, Sertanejo, Pop" /></label></div>
      <label>Data de lançamento desejada<input type="date" value={v.date} onChange={e => set('date', e.target.value)} /></label>
      <label className="chk"><input type="checkbox" checked={v.explicit} onChange={e => set('explicit', e.target.checked)} /> Contém conteúdo explícito</label></div>}
    {st === 1 && <div className="form">
      <label>Capa (JPG ou PNG, quadrada, mínimo 3000×3000)<input type="file" accept="image/jpeg,image/png" onChange={e => pickCover(e.target.files?.[0] ?? null)} /></label>{cover && <p className="ok">Capa válida: {cover.name}</p>}
      <label>Áudio (WAV ou FLAC)<input type="file" accept=".wav,.flac,audio/wav,audio/flac" onChange={e => setAudio(e.target.files?.[0] ?? null)} /></label>{audio && <p className="ok">{audio.name} ({(audio.size / 1048576).toFixed(1)} MB)</p>}</div>}
    {st === 2 && <div className="form"><dl className="review">{[['Título', v.title], ['Artista', v.artist], ['Tipo', v.type], ['Gênero', v.genre], ['Lançamento', v.date], ['Explícito', v.explicit ? 'Sim' : 'Não'], ['Capa', cover?.name], ['Áudio', audio?.name]].map(([k, x]) => <div key={k as string}><dt>{k}</dt><dd>{x || '—'}</dd></div>)}</dl>
      <p className="mut">Ao enviar, você declara ter os direitos sobre a obra, conforme o contrato e os Termos de Serviço. Nossa equipe revisa em seguida.</p></div>}
    {err && <p className="err">{err}</p>}
    <div className="wiz-foot">{st > 0 && <button className="btn ghost" onClick={() => setSt(st - 1)} disabled={busy}>Voltar</button>}
      {st < 2 ? <button className="btn" onClick={next}>Continuar</button> : <button className="btn" onClick={send} disabled={busy}>{busy ? 'Enviando…' : 'Enviar lançamento'}</button>}</div>
  </div>)
}
