'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Eye, CheckCircle2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { approveContract } from '@/app/actions'
import { formatCpf, formatCnpj } from '@/lib/onboarding'
import { Empty, dt } from './ui'
const doc = (p: any) => p.account_type === 'ARTIST' ? formatCpf(p.cpf) : formatCnpj(p.cnpj)
const slug = (s: string) => (s || 'conta').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase().slice(0, 30)
function download(p: any) {
  const data = {
    id: p.id, tipoConta: p.account_type === 'ARTIST' ? 'Artista' : 'Selo', nomeArtisticoOuSelo: p.artist_name, nomeCompleto: p.name,
    dataNascimentoOuFundacao: p.birth_date, email: p.email, telefone: p.phone, endereco: p.address,
    [p.account_type === 'ARTIST' ? 'cpf' : 'cnpj']: doc(p), cadastradoEm: p.created_at, exportadoEm: new Date().toISOString(),
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  a.download = `contrato-${slug(p.artist_name)}-${String(p.id).slice(0, 8)}.json`; a.click(); URL.revokeObjectURL(a.href)
}
export default function PendingContracts() {
  const sb = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<any[] | null>(null), [sel, setSel] = useState<any>(null), [busy, setBusy] = useState(''), [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data, error } = await sb.from('profiles').select('*').eq('status', 'PENDING_CONTRACT').order('created_at')
    if (error) setErr('Não foi possível carregar: ' + error.message); setRows(data ?? [])
  }, [sb])
  useEffect(() => { load() }, [load])
  async function approve(p: any) {
    if (!confirm(`Confirma que o contrato assinado de ${p.artist_name} foi recebido? O painel dele será liberado para lançamentos.`)) return
    setBusy(p.id); setErr(''); const r = await approveContract(p.id); setBusy('')
    if (!r.ok) setErr(r.error); load()
  }
  return (<div className="card"><div className="head-row"><div><h3>Contratos pendentes</h3><p className="mut" style={{ margin: 0 }}>Baixe os dados, preencha o contrato, envie ao artista e aprove quando voltar assinado.</p></div></div>
    {err && <p className="err">{err}</p>}
    {rows === null ? <p className="mut">Carregando…</p> : rows.length ? <div className="scroll"><table><thead><tr><th>Tipo</th><th>Nome artístico / Selo</th><th>Responsável</th><th>CPF / CNPJ</th><th>E-mail</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>
      {rows.map(p => <tr key={p.id}><td><span className="bd blue">{p.account_type === 'ARTIST' ? 'Artista' : 'Selo'}</span></td><td>{p.artist_name}</td><td>{p.name}</td><td className="mono">{doc(p)}</td><td>{p.email}</td><td>{dt(p.created_at)}</td>
        <td><div className="acts"><button className="btn ghost sm" onClick={() => setSel(p)}><Eye size={14} />Ver dados</button><button className="btn ghost sm" onClick={() => download(p)}><Download size={14} />Baixar Dados</button>
          <button className="btn green sm" disabled={busy === p.id} onClick={() => approve(p)}><CheckCircle2 size={14} />{busy === p.id ? 'Liberando…' : 'Aprovar Contrato & Liberar Acesso'}</button></div></td></tr>)}</tbody></table></div>
      : <Empty title="Nenhum contrato pendente" text="Quem concluir o cadastro aparece aqui até o contrato assinado voltar." />}
    {sel && <div className="modal" onClick={() => setSel(null)}><div className="sheet" onClick={e => e.stopPropagation()}><button className="x" onClick={() => setSel(null)} aria-label="Fechar"><X size={18} /></button>
      <h3>{sel.artist_name}</h3><dl>{[['Tipo', sel.account_type === 'ARTIST' ? 'Artista' : 'Selo'], ['Nome completo', sel.name], [sel.account_type === 'ARTIST' ? 'CPF' : 'CNPJ', doc(sel)], ['Nascimento / Fundação', dt(sel.birth_date)], ['E-mail', sel.email], ['Telefone', sel.phone], ['Endereço', sel.address]].map(([k, v]) => <div key={k as string}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
      <button className="btn" onClick={() => download(sel)}><Download size={14} style={{ verticalAlign: -2 }} /> Baixar Dados (JSON)</button></div></div>}
  </div>)
}
