'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function Novo() {
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setBusy(true)
    const f = new FormData(e.currentTarget); const sb = createClient()
    const { data: { user } } = await sb.auth.getUser(); if (!user) { location.href = '/login'; return }
    const up = async (bucket: string, file: File) => {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
      const { error } = await sb.storage.from(bucket).upload(path, file); if (error) throw error; return path
    }
    try {
      const cover = await up('covers', f.get('cover') as File), audio = await up('audio', f.get('audio') as File)
      const { error } = await sb.from('releases').insert({ artist_id: user.id, title: f.get('title'), type: f.get('type'), release_date: f.get('date') || null, cover_path: cover, audio_path: audio })
      if (error) throw error
      location.href = '/dashboard'
    } catch (x: any) { setErr('Não foi possível enviar: ' + (x.message ?? 'tente de novo.')); setBusy(false) }
  }
  return (<div className="wrap"><main className="panel"><h1>Novo lançamento</h1>
    <form className="f" onSubmit={submit}>
      <label>Título<input name="title" required /></label>
      <label>Tipo<select name="type"><option value="single">Single</option><option value="ep">EP</option><option value="album">Álbum</option></select></label>
      <label>Data de lançamento<input name="date" type="date" /></label>
      <label>Capa (JPG ou PNG, 3000×3000)<input name="cover" type="file" accept="image/jpeg,image/png" required /></label>
      <label>Áudio (WAV ou FLAC)<input name="audio" type="file" accept=".wav,.flac,audio/wav,audio/flac" required /></label>
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar lançamento'}</button>
    </form></main></div>)
}
