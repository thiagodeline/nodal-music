import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { setReleaseStatus, setWithdrawalStatus } from '../actions'
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export default async function Admin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser(); if (!user) redirect('/login')
  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')
  const [{ data: rels }, { data: wds }, { count }] = await Promise.all([
    sb.from('releases').select('*, profiles(artist_name)').order('created_at', { ascending: false }).limit(50),
    sb.from('withdrawals').select('*, profiles(artist_name)').order('created_at', { ascending: false }).limit(50),
    sb.from('profiles').select('*', { count: 'exact', head: true }),
  ])
  const audio = Object.fromEntries(await Promise.all((rels ?? []).map(async r => [r.id, (await sb.storage.from('audio').createSignedUrl(r.audio_path, 3600)).data?.signedUrl])))
  const pend = (rels ?? []).filter(r => r.status === 'pending').length, pw = (wds ?? []).filter(w => w.status === 'pending').length
  return (<div className="wrap"><header className="nav"><img src="/logo.png" alt="Nodal Music" /><nav><Link href="/dashboard">Meu painel</Link></nav></header>
    <main className="panel"><h1>Painel admin</h1>
      <div className="stats"><div className="stat"><small>Artistas</small><strong>{count}</strong></div><div className="stat gold"><small>Lançamentos para revisar</small><strong>{pend}</strong></div><div className="stat gold"><small>Saques pendentes</small><strong>{pw}</strong></div></div>
      <h2 className="h">Lançamentos</h2>
      <table><thead><tr><th>Artista</th><th>Título</th><th>Áudio</th><th>Status</th><th></th></tr></thead><tbody>
        {rels?.map(r => <tr key={r.id}><td>{r.profiles?.artist_name}</td><td>{r.title}</td><td>{audio[r.id] && <a href={audio[r.id]} target="_blank">Ouvir</a>}</td><td><span className={`tag ${r.status}`}>{r.status}</span></td>
          <td style={{ display: 'flex', gap: 6 }}>
            <form action={setReleaseStatus.bind(null, r.id, 'live')}><button className="btn sm">Publicar</button></form>
            <form action={setReleaseStatus.bind(null, r.id, 'rejected')}><button className="btn sm bad">Recusar</button></form></td></tr>)}</tbody></table>
      <h2 className="h">Saques</h2>
      <table><thead><tr><th>Artista</th><th>Valor</th><th>Pix</th><th>Status</th><th></th></tr></thead><tbody>
        {wds?.map(w => <tr key={w.id}><td>{w.profiles?.artist_name}</td><td>{brl(Number(w.amount))}</td><td>{w.pix_key}</td><td><span className={`tag ${w.status}`}>{w.status}</span></td>
          <td style={{ display: 'flex', gap: 6 }}>
            <form action={setWithdrawalStatus.bind(null, w.id, 'paid')}><button className="btn sm">Marcar pago</button></form>
            <form action={setWithdrawalStatus.bind(null, w.id, 'rejected')}><button className="btn sm bad">Recusar</button></form></td></tr>)}</tbody></table>
    </main></div>)
}
