'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Music2, PlusCircle, BarChart3, Wallet, Handshake, UserRound, LifeBuoy, Settings, LogOut, Menu, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import './dashboard.css'
import type { Data } from './ui'
import Overview from './Overview'
import Catalog from './Catalog'
import NewRelease from './NewRelease'
import Finance from './Finance'
import Analytics from './Analytics'
import { Account, Soon } from './Account'

const NAV: [string, [string, string, any][]][] = [
  ['Principal', [['overview', 'Visão Geral', LayoutDashboard]]],
  ['Catálogo', [['catalog', 'Gerenciar Músicas', Music2], ['new', 'Novo Lançamento', PlusCircle]]],
  ['Desempenho', [['analytics', 'Analytics e DSPs', BarChart3]]],
  ['Financeiro', [['financial', 'Saldo e Saques', Wallet], ['split', 'Split de Royalties', Handshake]]],
  ['Configurações', [['profiles', 'Meus Artistas', UserRound], ['support', 'Suporte', LifeBuoy], ['account', 'Minha Conta', Settings]]],
]
const ROUTES = NAV.flatMap(s => s[1].map(i => i[0]))

export default function Dashboard() {
  const [d, setD] = useState<Data | null>(null), [route, setRoute] = useState('overview'), [open, setOpen] = useState(false)
  const load = useCallback(async () => {
    const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) { location.href = '/login'; return }
    const [me, r, rp, w] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).single(),
      sb.from('releases').select('*').eq('artist_id', user.id).order('created_at', { ascending: false }),
      sb.from('reports').select('*').eq('artist_id', user.id),
      sb.from('withdrawals').select('*').eq('artist_id', user.id).order('created_at', { ascending: false })])
    setD({ me: me.data, email: user.email ?? '', releases: r.data ?? [], reports: rp.data ?? [], wds: w.data ?? [] })
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { const f = () => { const h = location.hash.slice(1); setRoute(ROUTES.includes(h) ? h : 'overview'); setOpen(false); window.scrollTo(0, 0) }; f(); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  const title = NAV.flatMap(s => s[1]).find(i => i[0] === route)![1]
  async function out() { await createClient().auth.signOut(); location.href = '/' }
  return (<div className="nd">
    <aside className={'nd-side' + (open ? ' open' : '')}>
      <Link href="/"><img src="/logo.png" alt="Nodal Music" /></Link>
      <nav>{NAV.map(([s, items]) => <div key={s}><h4>{s}</h4>{items.map(([k, l, Ic]) => <a key={k} href={'#' + k} className={route === k ? 'on' : ''}><Ic size={17} />{l}</a>)}</div>)}</nav>
      <div className="nd-foot">{d?.me?.role === 'admin' && <Link href="/admin"><ShieldCheck size={17} />Painel admin</Link>}<button onClick={out}><LogOut size={17} />Sair</button></div>
    </aside>
    <div className="nd-main">
      <header className="nd-top"><button className="burger" onClick={() => setOpen(!open)} aria-label="Menu"><Menu size={20} /></button><h1>{title}</h1>
        <div className="who"><span>{d?.me?.artist_name || d?.email}</span></div></header>
      <main>{!d ? <p className="mut">Carregando…</p> : <>
        {route === 'overview' && <Overview d={d} />}{route === 'catalog' && <Catalog d={d} />}
        {route === 'new' && <NewRelease d={d} reload={load} />}{route === 'analytics' && <Analytics d={d} />}
        {route === 'financial' && <Finance d={d} reload={load} />}{route === 'account' && <Account d={d} reload={load} />}
        {route === 'split' && <Soon t="Split de royalties" p="Divida a receita de cada faixa entre coautores, com porcentagens e aceite de cada um." />}
        {route === 'profiles' && <Soon t="Meus artistas e perfis" p="Cadastre os IDs do Spotify e do Apple Music de cada artista para vincular os lançamentos ao perfil certo." />}
        {route === 'support' && <Soon t="Suporte" p="Abra e acompanhe tickets de atendimento com a nossa equipe." />}</>}</main>
    </div></div>)
}
