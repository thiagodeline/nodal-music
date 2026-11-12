'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function Login() {
  const [novo, setNovo] = useState(false)
  const [err, setErr] = useState(''); const [info, setInfo] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true)
    try {
      const f = new FormData(e.currentTarget); const sb = createClient()
      const email = String(f.get('email')).trim(), password = String(f.get('password'))
      if (novo) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { terms_version: '2026-11' } } })
        if (error) return setErr(/already registered/i.test(error.message) ? 'Este e-mail já tem conta. Use Entrar.' : error.message)
        let session = data.session
        if (!session) { // sem sessão = o Supabase ainda exige confirmação de e-mail; tenta entrar direto
          const r = await sb.auth.signInWithPassword({ email, password }); session = r.data.session
        }
        if (!session) return setErr('Conta criada, mas o login automático não foi possível: a confirmação de e-mail ainda está ligada no Supabase. Desligue "Confirm email" em Authentication, Providers, Email.')
        location.href = '/onboarding' // conta criada, sessão ativa e cookie gravado
        return
      }
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) return setErr('E-mail ou senha incorretos.')
      location.href = '/dashboard'
    } catch (x: any) {
      setErr('Não foi possível conectar: ' + (x?.message ?? 'tente de novo.'))
    } finally { setBusy(false) }
  }
  return (<main className="auth"><div className="card">
    <img src="/logo.png" alt="Nodal Music" />
    <h1 style={{ fontSize: '1.8rem', marginBottom: 20 }}>{novo ? 'Criar sua conta' : 'Entrar no painel'}</h1>
    <form className="f" onSubmit={submit}>
      <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
      <label>Senha<input name="password" type="password" minLength={6} autoComplete={novo ? 'new-password' : 'current-password'} required /></label>
      {novo && <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><input type="checkbox" required style={{ marginTop: 4 }} /><span>Li e aceito os <a href="/termos" target="_blank">Termos</a> e a <a href="/privacidade" target="_blank">Política de Privacidade</a>.</span></label>}
      {err && <p className="err">{err}</p>}{info && <p>{info}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Aguarde…' : novo ? 'Criar conta' : 'Entrar'}</button>
      <button type="button" className="btn ghost" onClick={() => { setNovo(!novo); setErr(''); setInfo('') }}>{novo ? 'Já tenho conta' : 'Criar conta nova'}</button>
    </form></div></main>)
}
