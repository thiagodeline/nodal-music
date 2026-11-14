'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, BadgeCheck, CalendarDays, Check, CheckCircle2, ChevronRight,
  Clock3, Disc3, Download, Eye, FileAudio2, FileSignature, Filter,
  Headphones, LayoutDashboard, LoaderCircle, Music2, Search, ShieldCheck,
  UsersRound, X, XCircle
} from 'lucide-react'
import { getContractDownloadUrl, getReleaseAudioUrl, moderateRelease } from '@/app/admin/actions'
import './admin.css'

export type AdminRelease = {
  id:string;artist_id:string;title:string;type:string|null;main_artist:string|null;
  featured_artists:string|null;genre:string|null;subgenre:string|null;release_date:string|null;
  isrc:string|null;upc:string|null;composers:string|null;producers:string|null;
  lyricists:string|null;credits:string|null;explicit:boolean|null;created_at:string;
  status:string;rejection_reason:string|null;cover_url:string|null;has_audio:boolean
}
export type AdminUser = {
  id:string;name:string|null;artist_name:string|null;email:string|null;role:string;
  status:string;account_type:string|null;registration_profile:string|null;created_at:string
}
export type AdminContract = {user_id:string;signed_name:string;signed_at:string}
type Props = {
  adminLabel:string; users:AdminUser[]; releases:AdminRelease[]; contracts:AdminContract[];
  metrics:{users:number;pending:number;approved:number;total:number};
  truncatedUsers:boolean;truncatedReleases:boolean
}

const statusLabels:Record<string,string> = {
  pending:'Pendente',approved:'Aprovado',rejected:'Rejeitado',live:'No ar',draft:'Rascunho'
}
const profileLabels:Record<string,string> = { ARTIST:'Artista',PRODUCER:'Produção',LABEL:'Selo' }
const fmtDate = (date?:string|null) => date ? new Date(date.length===10 ? date+'T12:00:00' : date).toLocaleDateString('pt-BR') : 'Não informado'
const display = (s?:string|null) => s?.trim() || 'Não informado'
const statusClass = (status:string) => 'sa-tag sa-tag-' + status
const glyph = (n:number) => n.toLocaleString('pt-BR')
function Cover({url,title,big=false}:{url:string|null;title:string;big?:boolean}){
  return <div className={big?'sa-cover sa-cover-big':'sa-cover'}>
    {url ? <img src={url} alt={'Capa de '+title} loading="lazy"/> : <Disc3 size={big?54:22}/>}
  </div>
}
function Field({label,value}:{label:string;value:string|boolean|null|undefined}){
  return <div className="sa-detail-field"><dt>{label}</dt><dd>{typeof value==='boolean' ? (value?'Sim':'Não') : display(value)}</dd></div>
}

export default function AdminPanel({adminLabel,users,releases,contracts,metrics,truncatedUsers,truncatedReleases}:Props) {
  const router=useRouter()
  const [tab,setTab]=useState<'releases'|'artists'>('releases')
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('all')
  const [contractFilter,setContractFilter]=useState('all')
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [busy,setBusy]=useState('')
  const [feedback,setFeedback]=useState<{type:'success'|'error';text:string}|null>(null)
  const [audio,setAudio]=useState('')
  const [audioBusy,setAudioBusy]=useState(false)
  const [audioError,setAudioError]=useState('')
  const [rejecting,setRejecting]=useState(false)
  const [reason,setReason]=useState('')
  const contractsByUser=useMemo(()=>new Map(contracts.map(c=>[c.user_id,c])),[contracts])
  const usersById=useMemo(()=>new Map(users.map(u=>[u.id,u])),[users])
  const selected=selectedId ? releases.find(r=>r.id===selectedId) : null
  const normalized=search.trim().toLocaleLowerCase('pt-BR')
  const filteredReleases=useMemo(()=>releases.filter(r=>
    (filter==='all'||r.status===filter) &&
    (!normalized || [r.title,r.main_artist,r.featured_artists,usersById.get(r.artist_id)?.artist_name,r.isrc,r.upc].some(v=>v?.toLocaleLowerCase('pt-BR').includes(normalized)))
  ),[releases,filter,normalized,usersById])
  const filteredUsers=useMemo(()=>users.filter(u=>{
    const signed=contractsByUser.has(u.id)
    return (contractFilter==='all'||(contractFilter==='signed'?signed:!signed)) &&
      (!normalized || [u.name,u.artist_name,u.email].some(v=>v?.toLocaleLowerCase('pt-BR').includes(normalized)))
  }),[users,contractFilter,normalized,contractsByUser])

  useEffect(()=>{
    if(!selectedId)return
    const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelectedId(null)}
    document.addEventListener('keydown',close)
    return ()=>document.removeEventListener('keydown',close)
  },[selectedId])

  const flash=(type:'success'|'error',text:string)=>setFeedback({type,text})
  const open=(r:AdminRelease)=>{setSelectedId(r.id);setRejecting(false);setReason('');setAudio('');setAudioError('');setFeedback(null)}
  const close=()=>{setSelectedId(null);setRejecting(false);setAudio('')}
  const changeTab=(next:'releases'|'artists')=>{setTab(next);setSearch('');setFeedback(null)}
  async function play(id:string){
    setAudioBusy(true);setAudioError('');setAudio('')
    try {const result=await getReleaseAudioUrl(id)
      if(result.ok && result.url)setAudio(result.url)
      else setAudioError(result.ok?'Áudio indisponível.':result.message)
    }catch{setAudioError('Não foi possível carregar a pré-escuta.')}
    finally{setAudioBusy(false)}
  }
  async function moderate(decision:'approved'|'rejected'){
    if(!selected)return
    setBusy(selected.id);setFeedback(null)
    try{
      const result=await moderateRelease(selected.id,decision,reason)
      if(!result.ok){flash('error',result.message);return}
      flash('success',result.message||'Alteração salva.')
      setRejecting(false)
      close()
      router.refresh()
    }catch{flash('error','Falha na comunicação com o servidor. Tente novamente.')}
    finally{setBusy('')}
  }
  async function downloadContract(id:string){
    setBusy(id);setFeedback(null)
    try{
      const result=await getContractDownloadUrl(id)
      if(!result.ok || !result.url){flash('error',result.ok?'Arquivo indisponível.':result.message);return}
      const a=document.createElement('a');a.href=result.url;a.target='_blank';a.rel='noopener noreferrer'
      document.body.appendChild(a);a.click();a.remove()
    }catch{flash('error','Não foi possível obter o contrato.')}
    finally{setBusy('')}
  }

  const tiles=[
    {label:'Usuários / Artistas',value:metrics.users,Icon:UsersRound,desc:'Contas registradas'},
    {label:'Pendentes de aprovação',value:metrics.pending,Icon:Clock3,desc:'Precisam de revisão'},
    {label:'Lançamentos aprovados',value:metrics.approved,Icon:BadgeCheck,desc:'Aguardando próximas etapas'},
    {label:'Total de lançamentos',value:metrics.total,Icon:Disc3,desc:'Em todos os status'}
  ]
  return <div className="sa">
    <aside className="sa-sidebar">
      <Link href="/" className="sa-brand"><img src="/sintone-logo.svg" alt="SINTONE"/></Link>
      <span className="sa-sidebar-label">ÁREA RESTRITA</span>
      <nav aria-label="Navegação administrativa">
        <button className={tab==='releases'?'sa-nav-active':''} onClick={()=>changeTab('releases')}><Music2 size={18}/> Lançamentos</button>
        <button className={tab==='artists'?'sa-nav-active':''} onClick={()=>changeTab('artists')}><UsersRound size={18}/> Artistas e contratos</button>
      </nav>
      <div className="sa-sidebar-secondary"><span>OUTRAS FERRAMENTAS</span>
        <Link href="/dashboard#contracts"><FileSignature size={17}/> Contratos pendentes</Link>
        <Link href="/dashboard#royalties"><LayoutDashboard size={17}/> Importar royalties</Link>
        <Link href="/dashboard"><ArrowLeft size={17}/> Painel do artista</Link>
      </div>
      <div className="sa-sidebar-user"><ShieldCheck size={18}/><div><strong>Administrador</strong><small title={adminLabel}>{adminLabel}</small></div></div>
    </aside>
    <div className="sa-main">
      <header className="sa-header"><div className="sa-crumb">SINTONE <ChevronRight size={15}/> Administração</div>
        <Link href="/" className="sa-view-site"><Eye size={16}/> Ver site</Link></header>
      <main className="sa-content">
        <div className="sa-titlebar"><div><span className="sa-kicker">CENTRAL DE GERENCIAMENTO</span><h1>Painel administrativo</h1><p>Analise lançamentos e acompanhe os artistas da plataforma.</p></div>
          <span className="sa-secure"><ShieldCheck size={15}/> Acesso administrativo</span>
        </div>
        <div className="sa-metrics">{tiles.map(({label,value,Icon,desc})=><div className="sa-metric" key={label}>
          <div className="sa-metric-top"><span>{label}</span><span className="sa-metric-icon"><Icon size={21}/></span></div>
          <strong>{glyph(value)}</strong><small>{desc}</small>
        </div>)}</div>
        <div className="sa-board">
          <div className="sa-board-heading"><div className="sa-tabs" role="tablist" aria-label="Módulos de administração">
            <button role="tab" aria-selected={tab==='releases'} className={tab==='releases'?'active':''} onClick={()=>changeTab('releases')}><Music2 size={17}/> Lançamentos</button>
            <button role="tab" aria-selected={tab==='artists'} className={tab==='artists'?'active':''} onClick={()=>changeTab('artists')}><UsersRound size={17}/> Artistas & contratos</button>
          </div><span className="sa-count">{tab==='releases'?glyph(filteredReleases.length):glyph(filteredUsers.length)} resultados</span></div>
          <div className="sa-controls">
            <label className="sa-search"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==='releases'?'Buscar título, artista ou código...':'Buscar artista, nome ou e-mail...'} aria-label="Buscar registros"/></label>
            <div className="sa-select-wrap"><Filter size={17}/>
              {tab==='releases'?<select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filtrar lançamentos por status">
                <option value="all">Todos os status</option><option value="pending">Pendentes</option><option value="approved">Aprovados</option><option value="rejected">Rejeitados</option><option value="live">No ar</option><option value="draft">Rascunho</option>
              </select>:<select value={contractFilter} onChange={e=>setContractFilter(e.target.value)} aria-label="Filtrar contratos">
                <option value="all">Todos os contratos</option><option value="signed">Assinados</option><option value="pending">Pendentes</option>
              </select>}
            </div>
          </div>
          {feedback&&<div className={'sa-feedback '+feedback.type} role="status">{feedback.type==='success'?<CheckCircle2 size={17}/>:<XCircle size={17}/>} {feedback.text}<button aria-label="Fechar aviso" onClick={()=>setFeedback(null)}><X size={15}/></button></div>}
          {tab==='releases' ? <>
            {truncatedReleases&&<p className="sa-warning">Exibindo os 1.000 lançamentos mais recentes. A contagem dos cards inclui todos os lançamentos.</p>}
            <div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>Lançamento</th><th>Artista principal</th><th>Data prevista</th><th>Status</th><th></th></tr></thead><tbody>
              {filteredReleases.map(r=><tr key={r.id}><td><button className="sa-record" onClick={()=>open(r)}><Cover url={r.cover_url} title={r.title}/><span><strong>{r.title}</strong><small>{r.type?.toUpperCase()||'LANÇAMENTO'}</small></span></button></td>
                <td>{display(r.main_artist || usersById.get(r.artist_id)?.artist_name)}</td><td>{fmtDate(r.release_date)}</td>
                <td><span className={statusClass(r.status)}>{statusLabels[r.status]||r.status}</span></td>
                <td><button className="sa-icon-button" aria-label={'Ver detalhes de '+r.title} onClick={()=>open(r)}><ChevronRight size={19}/></button></td></tr>)}
            </tbody></table></div>
            {!filteredReleases.length&&<div className="sa-empty"><Disc3 size={36}/><h3>Nenhum lançamento encontrado</h3><p>Experimente alterar os filtros ou a busca.</p></div>}
          </> : <>
            {truncatedUsers&&<p className="sa-warning">Exibindo os 1.000 usuários mais recentes. A contagem do card inclui todas as contas.</p>}
            <div className="sa-table-scroll"><table className="sa-table"><thead><tr><th>Artista / Responsável</th><th>Perfil</th><th>Cadastro</th><th>Contrato</th><th>Ação</th></tr></thead><tbody>
              {filteredUsers.map(u=>{const contract=contractsByUser.get(u.id);return <tr key={u.id}>
                <td><div className="sa-user-cell"><span className="sa-avatar">{(u.artist_name||u.name||'A').slice(0,1).toUpperCase()}</span><div><strong>{u.artist_name||u.name||'Sem nome informado'}</strong><small>{u.email||'E-mail indisponível'}</small></div></div></td>
                <td>{profileLabels[u.registration_profile||u.account_type||'']||'Artista'}</td><td>{fmtDate(u.created_at)}</td>
                <td><span className={'sa-tag '+(contract?'sa-tag-approved':'sa-tag-pending')}>{contract?'Assinado':'Pendente'}</span>{contract&&<small className="sa-contract-date">{fmtDate(contract.signed_at)}</small>}</td>
                <td>{contract?<button className="sa-download" disabled={busy===u.id} onClick={()=>downloadContract(u.id)}>{busy===u.id?<LoaderCircle className="sa-spin" size={16}/>:<Download size={16}/>} Baixar contrato PDF</button>:
                  <span className="sa-muted">Aguardando assinatura</span>}</td>
              </tr>})}
            </tbody></table></div>
            {!filteredUsers.length&&<div className="sa-empty"><UsersRound size={36}/><h3>Nenhum artista encontrado</h3><p>Experimente alterar os filtros ou a busca.</p></div>}
          </>}
        </div>
      </main>
    </div>
    {selected&&<div className="sa-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
      <section className="sa-dialog" role="dialog" aria-modal="true" aria-label={'Detalhes do lançamento '+selected.title}>
        <header className="sa-dialog-header"><div><span className="sa-kicker">REVISÃO DE LANÇAMENTO</span><h2>{selected.title}</h2></div><button onClick={close} aria-label="Fechar detalhes"><X size={21}/></button></header>
        <div className="sa-dialog-body">
          <div className="sa-dialog-overview"><Cover url={selected.cover_url} title={selected.title} big/>
            <div className="sa-dialog-summary"><span className={statusClass(selected.status)}>{statusLabels[selected.status]||selected.status}</span><h3>{selected.title}</h3><p>{display(selected.main_artist)}</p><small><CalendarDays size={14}/> Data prevista: {fmtDate(selected.release_date)}</small></div></div>
          <h3 className="sa-section-title">Informações do lançamento</h3><dl className="sa-details">
            <Field label="Título / Álbum" value={selected.title}/><Field label="Tipo" value={selected.type}/>
            <Field label="Artista principal" value={selected.main_artist}/><Field label="Participações (feat)" value={selected.featured_artists}/>
            <Field label="Gênero" value={selected.genre}/><Field label="Subgênero" value={selected.subgenre}/>
            <Field label="Data de lançamento" value={fmtDate(selected.release_date)}/><Field label="Conteúdo explícito" value={selected.explicit}/>
            <Field label="ISRC" value={selected.isrc}/><Field label="UPC/EAN" value={selected.upc}/>
          </dl>
          <h3 className="sa-section-title">Ficha técnica e créditos</h3><dl className="sa-details">
            <Field label="Compositores" value={selected.composers}/><Field label="Produtores" value={selected.producers}/>
            <Field label="Letristas" value={selected.lyricists}/><Field label="Outros créditos" value={selected.credits}/>
          </dl>
          <h3 className="sa-section-title">Pré-escuta de áudio</h3>
          <div className="sa-audio-box"><Headphones size={24}/><div className="sa-audio-content">
            {audio?<audio controls src={audio} preload="metadata" aria-label={'Áudio de '+selected.title}/>:
              <p>{selected.has_audio?'Ouça o material original antes de aprovar.':'Nenhum arquivo de áudio associado.'}</p>}
            {audioError&&<p className="sa-error" role="alert">{audioError}</p>}
          </div>{selected.has_audio&&!audio&&<button className="sa-download" onClick={()=>play(selected.id)} disabled={audioBusy}>{audioBusy?<LoaderCircle className="sa-spin" size={17}/>:<FileAudio2 size={17}/>} Carregar áudio</button>}</div>
          {selected.rejection_reason&&<div className="sa-rejection-old"><strong>Motivo registrado na última rejeição</strong><p>{selected.rejection_reason}</p></div>}
          {rejecting&&<div className="sa-rejection"><label htmlFor="sa-reason">Motivo da rejeição <span>(obrigatório)</span></label><textarea id="sa-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={1500} rows={4} placeholder="Explique ao artista o que precisa ser corrigido antes de reenviar..."/><small>{reason.trim().length}/1500 · mínimo 10 caracteres</small></div>}
          {feedback?.type==='error'&&<p className="sa-error" role="alert">{feedback.text}</p>}
        </div>
        <footer className="sa-dialog-footer"><button className="sa-cancel" onClick={close}>Fechar</button>
          {['pending','approved','rejected'].includes(selected.status)&&<>
            {(selected.status==='pending'||selected.status==='approved')&&(rejecting?
              <button className="sa-danger" disabled={busy===selected.id||reason.trim().length<10} onClick={()=>moderate('rejected')}>{busy===selected.id?<LoaderCircle className="sa-spin" size={16}/>:<XCircle size={16}/>} Confirmar rejeição</button>:
              <button className="sa-danger-outline" disabled={!!busy} onClick={()=>setRejecting(true)}><XCircle size={16}/> Rejeitar lançamento</button>)}
            {(selected.status==='pending'||selected.status==='rejected')&&<button className="sa-approve" disabled={!!busy} onClick={()=>moderate('approved')}>{busy===selected.id?<LoaderCircle className="sa-spin" size={16}/>:<Check size={17}/>} Aprovar lançamento</button>}
          </>}
        </footer>
      </section>
    </div>}
  </div>
}
