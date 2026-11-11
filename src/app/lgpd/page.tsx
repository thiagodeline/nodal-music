'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import '@/app/landing.css'
import '@/components/legal.css'
const tipos: [string, string][] = [
  ['confirmacao', 'Confirmar se vocês tratam meus dados'], ['acesso', 'Acessar meus dados'], ['correcao', 'Corrigir dados incorretos'],
  ['exclusao', 'Excluir meus dados'], ['portabilidade', 'Receber meus dados (portabilidade)'], ['compartilhamento', 'Saber com quem meus dados foram compartilhados'],
  ['revogacao', 'Revogar um consentimento'], ['oposicao', 'Me opor a um tratamento'], ['revisao', 'Revisar uma decisão automatizada'],
]
export default function Lgpd() {
  const [done, setDone] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(''); setBusy(true)
    const f = new FormData(e.currentTarget)
    if (f.get('site')) return // campo isca contra robôs
    const id = crypto.randomUUID()
    const { error } = await createClient().from('lgpd_requests').insert({ id, name: f.get('name'), email: f.get('email'), type: f.get('type'), details: f.get('details') || null })
    setBusy(false)
    if (error) return setErr('Não foi possível enviar agora. Tente de novo ou escreva para o e-mail de privacidade.')
    setDone(id.slice(0, 8).toUpperCase())
  }
  return (<>
    <header className="l-head"><div className="wrap l-bar"><Link href="/"><img src="/logo.png" alt="Nodal Music" /></Link><Link className="btn ghost sm" href="/">Voltar ao site</Link></div></header>
    <main className="legal"><h1>Seus dados (LGPD)</h1>
      <p>Use este formulário para exercer seus direitos sobre dados pessoais. Pedimos só o necessário para identificar e responder você. Respondemos em até 15 dias.</p>
      {done ? <div className="stat" style={{ marginTop: 24 }}><small>Pedido recebido</small><strong>Protocolo {done}</strong><p style={{ margin: '8px 0 0' }}>Responderemos no e-mail informado. Guarde este número.</p></div> :
      <form className="f" onSubmit={submit} style={{ marginTop: 24 }}>
        <label>Nome<input name="name" required maxLength={120} /></label>
        <label>E-mail da conta<input name="email" type="email" required maxLength={160} /></label>
        <label>O que você quer pedir<select name="type" required>{tipos.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Detalhes (opcional)<textarea name="details" rows={4} maxLength={1500} style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 10, padding: 11, font: 'inherit' }} /></label>
        <input name="site" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true" />
        <p style={{ fontSize: '.9rem' }}>Usaremos estes dados apenas para atender o seu pedido, conforme a <Link href="/privacidade">Política de Privacidade</Link>. Para sua segurança, podemos confirmar sua identidade antes de entregar ou excluir dados.</p>
        {err && <p className="err">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar pedido'}</button>
      </form>}
    </main></>)
}
