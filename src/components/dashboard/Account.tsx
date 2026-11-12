'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dt, Data } from './ui'
export function Account({ d, reload }: { d: Data; reload: () => void }) {
  const [msg, setMsg] = useState(''), [pm, setPm] = useState('')
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget)
    const { error } = await createClient().from('profiles').update({ name: f.get('name'), artist_name: f.get('artist'), pix_key: f.get('pix') || null }).eq('id', d.me.id)
    setMsg(error ? 'Não foi possível salvar.' : 'Dados salvos.'); if (!error) reload()
  }
  async function pass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const p = String(new FormData(form).get('p'))
    if (p.length < 8) return setPm('Use pelo menos 8 caracteres.')
    const { error } = await createClient().auth.updateUser({ password: p })
    setPm(error ? 'Não foi possível trocar a senha: ' + error.message : 'Senha alterada.'); if (!error) form.reset()
  }
  async function everywhere() { await createClient().auth.signOut({ scope: 'global' }); location.href = '/' }
  return (<div className="two-col">
    <form className="card form" onSubmit={save}><h3>Informações pessoais</h3>
      <label>E-mail<input value={d.email} disabled /></label>
      <div className="two"><label>Nome completo<input name="name" defaultValue={d.me?.name ?? ''} /></label><label>Nome artístico<input name="artist" defaultValue={d.me?.artist_name ?? ''} /></label></div>
      <h3 style={{ marginTop: 8 }}>Chave Pix</h3>
      <label>Chave Pix padrão para saques<input name="pix" defaultValue={d.me?.pix_key ?? ''} /></label>
      {msg && <p className={msg.startsWith('Dados') ? 'ok' : 'err'}>{msg}</p>}<div><button className="btn">Salvar alterações</button></div></form>
    <div className="side-col">
      <form className="card form" onSubmit={pass}><h3>Segurança</h3>
        <label>Nova senha<input name="p" type="password" minLength={8} autoComplete="new-password" required /></label>
        {pm && <p className={pm === 'Senha alterada.' ? 'ok' : 'err'}>{pm}</p>}
        <div className="acts"><button className="btn">Trocar senha</button><button type="button" className="btn ghost" onClick={everywhere}>Sair de todos os dispositivos</button></div></form>
      <div className="card"><h3>Privacidade e LGPD</h3>
        <p className="mut">Aceite dos termos: {d.me?.terms_accepted_at ? dt(d.me.terms_accepted_at) : 'sem registro'}.</p>
        <p className="mut">Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento.</p>
        <div className="acts"><a className="btn ghost sm" href="/lgpd">Pedido LGPD</a><a className="btn ghost sm" href="/privacidade">Privacidade</a><a className="btn ghost sm" href="/termos">Termos</a></div></div>
    </div></div>)
}
