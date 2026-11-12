'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Data } from './ui'
export function Account({ d, reload }: { d: Data; reload: () => void }) {
  const [msg, setMsg] = useState('')
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await createClient().from('profiles').update({ name: f.get('name'), artist_name: f.get('artist'), pix_key: f.get('pix') || null }).eq('id', d.me.id)
    setMsg(error ? 'Não foi possível salvar.' : 'Dados salvos.'); if (!error) reload()
  }
  return (<form className="card form" onSubmit={save} style={{ maxWidth: 520 }}><h3>Minha conta</h3>
    <label>E-mail<input value={d.email} disabled /></label>
    <label>Nome completo<input name="name" defaultValue={d.me?.name ?? ''} /></label>
    <label>Nome artístico<input name="artist" defaultValue={d.me?.artist_name ?? ''} /></label>
    <label>Chave Pix padrão<input name="pix" defaultValue={d.me?.pix_key ?? ''} /></label>
    {msg && <p className={msg.startsWith('Dados') ? 'ok' : 'err'}>{msg}</p>}<button className="btn">Salvar</button>
    <p className="mut">Para acessar, corrigir ou excluir seus dados, use a página <a className="link" href="/lgpd">Seus dados (LGPD)</a>.</p></form>)
}
export const Soon = ({ t, p }: { t: string; p: string }) => <div className="card"><div className="empty"><h3>{t}</h3><p>{p}</p><span className="bd amber">Em breve</span></div></div>
