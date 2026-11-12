'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Data, Empty } from './ui'
const spId = (s: string) => { const m = s.match(/artist\/([A-Za-z0-9]{22})/); return m ? m[1] : s.trim() }
const apId = (s: string) => { const m = s.match(/(\d{5,})\D*$/); return m ? m[1] : s.trim() }
function Row({ a, save, del }: { a: any; save: (id: string, sp: string, ap: string) => Promise<void>; del: (id: string) => void }) {
  const [sp, setSp] = useState(a.spotify_artist_id ?? ''), [ap, setAp] = useState(a.apple_artist_id ?? '')
  return (<div className="ap"><label>{a.name}<input value={sp} onChange={e => setSp(e.target.value)} placeholder="Spotify Artist ID ou link" /></label>
    <label>&nbsp;<input value={ap} onChange={e => setAp(e.target.value)} placeholder="Apple Music Artist ID ou link" /></label>
    <span /><div className="acts"><button className="btn sm" onClick={() => save(a.id, sp, ap)}>Salvar</button><button className="btn bad sm" aria-label="Remover" onClick={() => del(a.id)}><Trash2 size={14} /></button></div></div>)
}
export default function Artists({ d }: { d: Data }) {
  const sb = useMemo(() => createClient(), []); const [rows, setRows] = useState<any[]>([]), [adding, setAdding] = useState(false), [name, setName] = useState(''), [msg, setMsg] = useState('')
  const load = useCallback(async () => { const { data } = await sb.from('artist_profiles').select('*').order('created_at'); setRows(data ?? []) }, [sb])
  useEffect(() => { load() }, [load])
  async function add() {
    if (!name.trim()) return setMsg('Digite o nome do artista.')
    const { error } = await sb.from('artist_profiles').insert({ owner_id: d.me.id, name: name.trim() })
    if (error) return setMsg('Não foi possível adicionar.'); setName(''); setAdding(false); setMsg(''); load()
  }
  async function save(id: string, sp: string, ap: string) {
    const s = spId(sp), a = apId(ap)
    if (s && !/^[A-Za-z0-9]{22}$/.test(s)) return setMsg('Spotify Artist ID inválido: são 22 letras e números (ou cole o link do artista).')
    if (a && !/^\d+$/.test(a)) return setMsg('Apple Music Artist ID inválido: só números (ou cole o link do artista).')
    const { error } = await sb.from('artist_profiles').update({ spotify_artist_id: s || null, apple_artist_id: a || null }).eq('id', id)
    setMsg(error ? 'Não foi possível salvar.' : 'IDs salvos.'); load()
  }
  async function del(id: string) { if (!confirm('Remover este artista?')) return; await sb.from('artist_profiles').delete().eq('id', id); load() }
  return (<div className="card"><div className="head-row"><div><h3>Meus artistas</h3><p className="mut" style={{ margin: 0 }}>Vincule cada artista aos perfis das lojas. O ID está no link do perfil.</p></div>
    <button className="btn" onClick={() => setAdding(!adding)}><Plus size={15} style={{ verticalAlign: -2 }} /> Adicionar novo artista</button></div>
    {adding && <div className="ap" style={{ marginBottom: 16 }}><label>Nome do artista<input value={name} onChange={e => setName(e.target.value)} maxLength={120} /></label><span /><span /><button className="btn" onClick={add}>Adicionar</button></div>}
    {msg && <p className={msg.endsWith('salvos.') ? 'ok' : 'err'}>{msg}</p>}
    {rows.length ? <div className="form">{rows.map(a => <Row key={a.id + (a.spotify_artist_id ?? '') + (a.apple_artist_id ?? '')} a={a} save={save} del={del} />)}</div>
      : <Empty title="Nenhum artista cadastrado" text="Adicione os artistas do seu selo para vincular os IDs do Spotify e do Apple Music." />}</div>)
}
