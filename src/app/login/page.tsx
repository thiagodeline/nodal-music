'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function Login() {
  const [novo, setNovo] = useState(false)
  const [err, setErr] = useState(''); const [info, setInfo] = useState('')
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); const f = new FormData(e.currentTarget); const sb = createClient()
    const email = String(f.get('email')), password = String(f.get('password'))
    if (novo) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name: f.get('name'), terms_version: '2026-11' } } })
      if (error) return setErr(error.message)
      if (!data.session) return setInfo('Enviamos um link de confirmação para o seu e-mail.')
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) return setErr('E-mail ou senha incorretos.')
    }
    location.href = '/dashboard'
  }
  return (<main className="auth"><div className="card">
    <img src="/logo.png" alt="Nodal Music" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: 20 }}>{novo ? 'Criar conta de artista' : 'Entrar no painel'}</h1>
    <form className="f" onSubmit={submit}>
      {novo && <label>Nome artístico<input name="name" required /></label>}
      <label>E-mail<input name="email" type="email" required /></label>
      <label>Senha<input name="password" type="password" minLength={6} required /></label>
      {novo && <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><input type="checkbox" required style={{ marginTop: 4 }} /><span>Tenho 18 anos ou mais (ou sou responsável legal) e aceito os <a href="/termos" target="_blank">Termos</a> e a <a href="/privacidade" target="_blank">Política de Privacidade</a>.</span></label>}
      {err && <p className="err">{err}</p>}{info && <p>{info}</p>}
      <button className="btn">{novo ? 'Criar conta' : 'Entrar'}</button>
      <button type="button" className="btn ghost" onClick={() => setNovo(!novo)}>{novo ? 'Já tenho conta' : 'Criar conta nova'}</button>
    </form></div></main>)
}
