'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LoaderCircle, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import '../register/register.css'

export default function Login() {
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('novo') === '1') window.location.replace('/register')
  },[])
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true)
    const data = new FormData(e.currentTarget)
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(data.get('email') || '').trim(), password: String(data.get('password') || '')
      })
      if (error) return setError('E-mail ou senha incorretos. Verifique os dados e tente novamente.')
      window.location.assign('/dashboard')
    } catch { setError('Falha de conexão. Tente novamente.') }
    finally { setBusy(false) }
  }
  return <main className="rg-page"><div className="rg-container">
    <aside className="rg-aside"><Link href="/"><img src="/sintone-logo.svg" alt="SINTONE"/></Link>
      <div className="rg-aside-content"><span className="rg-eyebrow">BEM-VINDO DE VOLTA</span><h2>Sua música. Seu catálogo. Seu controle.</h2>
        <p>Acompanhe seus lançamentos e resultados pelo painel da SINTONE.</p></div>
      <p className="rg-aside-foot">Distribuição musical independente.</p>
    </aside>
    <section className="rg-panel"><div className="rg-form-wrap">
      <div className="rg-mobile-brand"><Link href="/"><img src="/sintone-logo.svg" alt="SINTONE"/></Link></div>
      <div className="rg-heading"><span className="rg-eyebrow">ENTRAR NA PLATAFORMA</span><h1>Acesse sua conta</h1><p>Entre com seu e-mail e senha para continuar.</p></div>
      <form onSubmit={submit}>
        <div className="rg-group"><div className="rg-caption"><label htmlFor="login-email">E-mail</label></div><input id="login-email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required/></div>
        <div className="rg-group"><div className="rg-caption"><label htmlFor="login-password">Senha</label></div><input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required/></div>
        {error && <div className="rg-alert" role="alert">{error}</div>}
        <button type="submit" className="rg-submit" disabled={busy}>{busy ? <><LoaderCircle className="rg-spin" size={18}/> Entrando…</> : <><LogIn size={18}/> Entrar</>}</button>
      </form>
      <p className="rg-login">Ainda não tem conta? <Link href="/register">Criar conta grátis</Link></p>
    </div></section>
  </div></main>
}