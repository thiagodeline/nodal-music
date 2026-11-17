'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, BadgeCheck, CalendarDays, Check, CheckCircle2, ChevronRight,
  Clock3, Disc3, Download, Eye, FileAudio2, FileSignature, FileSpreadsheet, Filter, CreditCard, MessageSquare,
  Headphones, LayoutDashboard, LoaderCircle, Music2, Search, ShieldCheck,
  UsersRound, X, XCircle, Play, MoreHorizontal, Truck, Banknote, ShieldAlert
} from 'lucide-react'
import { getContractDownloadUrl, getReleaseAudioUrl, moderateRelease } from '@/app/admin/actions'
import './admin.css'
import './admin-extras.css'
import type {AdminTab} from '@/lib/admin-access'
import AdminAccounts from './AdminAccounts'
import AdminRoyaltyUpload from './AdminRoyaltyUpload'
import AdminReleaseTracks from './AdminReleaseTracks'
import AdminTickets from './AdminTickets'
import AdminPayouts from './AdminPayouts'
import AdminDelivery from './AdminDelivery'
import AdminRoyaltySplits from './AdminRoyaltySplits'
import AdminBanners from './AdminBanners'
import AdminQA from './AdminQA'
import ReleaseQuickPreview from './ReleaseQuickPreview'
import SpotifyBadge from './SpotifyBadge'
import type {AdminSpotifyProfile} from './AdminSpotifyProfiles'

export type AdminReleaseTrack = {
  id:string;release_id:string;position:number;title:string;isrc:string|null;audio_path:string;
  featured_artists:string|null;composers:string|null;producers:string|null;
  lyricists:string|null;credits:string|null;explicit:boolean;language:string;
  contributors:{name:string;role:string}[]
}
export type AdminRelease = {
  id:string;artist_id:string;title:string;type:string|null;main_artist:string|null;
  featured_artists:string|null;genre:string|null;subgenre:string|null;release_date:string|null;
  isrc:string|null;upc:string|null;composers:string|null;producers:string|null;
  lyricists:string|null;credits:string|null;explicit:boolean|null;created_at:string;
  status:string;rejection_reason:string|null;cover_url:string|null;has_audio:boolean;
  label_name:string|null;p_line:string|null;c_line:string|null;delivery_status:string;
  artists:{name:string;role:string;profile_id?:string;spotify_id?:string|null;spotify_url?:string|null;is_first_spotify_release?:boolean}[];
  platforms:string[];tracks:AdminReleaseTrack[]
}
export type AdminUser = {
  id:string;name:string|null;artist_name:string|null;email:string|null;role:string;
  status:string;account_type:string|null;registration_profile:string|null;created_at:string;
  saldo_disponivel:number;phone:string|null;address:string|null;cpf:string|null;cnpj:string|null;birth_date:string|null
}
export type AdminContract = {user_id:string;signed_name:string;signed_at:string;pdf_status:'pending'|'ready'}
type Props = {
  adminLabel:string;allowedTabs:AdminTab[];isGeneral:boolean;canEditSpotify:boolean; users:AdminUser[]; spotifyProfiles:AdminSpotifyProfile[]; releases:AdminRelease[]; contracts:AdminContract[];
  metrics:{users:number;pending:number;approved:number;total:number;payouts:number};
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

export default function AdminPanel({adminLabel,allowedTabs,isGeneral,canEditSpotify,users,spotifyProfiles,releases,contracts,metrics,truncatedUsers,truncatedReleases}:Props) {
  const router=useRouter()
  const searchParams=useSearchParams()
  const requested=searchParams.get('tab')||allowedTabs[0]||'releases'
  const tab=(allowedTabs.includes(requested as AdminTab)?requested:allowedTabs[0]||'releases') as 'releases'|'artists'|'royalties'|'support'|'payouts'|'delivery'|'splits'|'banners'
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('all')
  const [contractFilter,setContractFilter]=useState('all')
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [zoomCover,setZoomCover]=useState(false)
  const [busy,setBusy]=useState('')
  const [feedback,setFeedback]=useState<{type:'success'|'error';text:string}|null>(null)
  const [audio,setAudio]=useState('')
  const [audioBusy,setAudioBusy]=useState(false)
  const [audioError,setAudioError]=useState('')
  const [rejecting,setRejecting]=useState(false)
  const [reviewMode,setReviewMode]=useState<'details'|'approve'|'reject'>('details')
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
    const signed=contractsByUser.get(u.id)?.pdf_status==='ready'
    return (contractFilter==='all'||(contractFilter==='signed'?signed:!signed)) &&
      (!normalized || [u.name,u.artist_name,u.email].some(v=>v?.toLocaleLowerCase('pt-BR').includes(normalized)))
  }),[users,contractFilter,normalized,contractsByUser])

  useEffect(()=>{
    if(!selectedId)return
    const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setSelectedId(null);setZoomCover(false)}}
    document.addEventListener('keydown',close)
    return ()=>document.removeEventListener('keydown',close)
  },[selectedId])

  const flash=(type:'success'|'error',text:string)=>setFeedback({type,text})
  const open=(r:AdminRelease,mode:'details'|'approve'|'reject'='details')=>{setSelectedId(r.id);setReviewMode(mode);setRejecting(mode==='reject');setReason('');setAudio('');setAudioError('');setFeedback(null)}
  const close=()=>{setSelectedId(null);setRejecting(false);setAudio('');setZoomCover(false)}
  const changeTab=(next:AdminTab)=>{if(!allowedTabs.includes(next))return;router.push('/admin?tab='+next);setSearch('');setFeedback(null)}
  async function play(id:string,trackId?:string){
    setAudioBusy(true);setAudioError('');setAudio('')
    try {const result=await getReleaseAudioUrl(id,trackId)
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
    {label:'Pendentes de aprovação',value:metrics.pending,Icon:Clock3,desc:'Precisam de revisão',filter:'pending',tab:'releases'},
    {label:'Aprovados',value:metrics.approved,Icon:BadgeCheck,desc:'Lançamentos aprovados',filter:'approved',tab:'releases'},
    {label:'Total de lançamentos',value:metrics.total,Icon:Disc3,desc:'Em todos os status',filter:'all',tab:'releases'},
    {label:'Solicitações de saque pendentes',value:metrics.payouts,Icon:Banknote,desc:'Aguardam conferência de repasse',filter:'all',tab:'payouts'}
  ]
  return <>
      <main className="sa-content">
        {!searchParams.has('tab')&&<div className="sa-titlebar"><div><span className="sa-kicker">CENTRAL DE GERENCIAMENTO</span><h1>Painel administrativo</h1><p>Visão geral dos lançamentos e atividades da SINTONE.</p></div></div>}
        {tab==='releases'&&<div className="sa-metrics">{tiles.filter(tile=>allowedTabs.includes(tile.tab as AdminTab)).map(({label,value,Icon,desc,filter:status,tab:target})=><button type="button" className={'sa-metric sa-metric-button '+(tab===target&&filter===status?'sa-metric-selected':'')} key={label} onClick={()=>{changeTab(target as typeof tab);setFilter(status)}} aria-label={'Abrir '+label}>
          <div className="sa-metric-top"><span>{label}</span><span className="sa-metric-icon"><Icon size={21}/></span></div>
          <strong>{glyph(value)}</strong><small>{desc}</small>
        </button>)}</div>}
        <div className="sa-board">
          <div className="sa-board-heading sa-board-heading-compact"><span className="sa-board-context">Registros e ferramentas</span><span className="sa-count">{tab==='releases'?glyph(filteredReleases.length)+' resultados':tab==='artists'?glyph(filteredUsers.length)+' resultados':'Gestão administrativa'}</span></div>
          {(tab==='releases'||tab==='artists') && <div className="sa-controls">
            <label className="sa-search"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==='releases'?'Buscar título, artista ou código...':'Buscar artista, nome ou e-mail...'} aria-label="Buscar registros"/></label>
            <div className="sa-select-wrap"><Filter size={17}/>
              {tab==='releases'?<select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filtrar lançamentos por status">
                <option value="all">Todos os status</option><option value="pending">Pendentes</option><option value="approved">Aprovados</option><option value="rejected">Rejeitados</option><option value="live">No ar</option><option value="draft">Rascunho</option>
              </select>:<select value={contractFilter} onChange={e=>setContractFilter(e.target.value)} aria-label="Filtrar contratos">
                <option value="all">Todos os contratos</option><option value="signed">Assinados</option><option value="pending">Pendentes</option>
              </select>}
            </div>
          </div>}
          {feedback&&<div className={'sa-feedback '+feedback.type} role="status">{feedback.type==='success'?<CheckCircle2 size={17}/>:<XCircle size={17}/>} {feedback.text}<button aria-label="Fechar aviso" onClick={()=>setFeedback(null)}><X size={15}/></button></div>}
          {tab==='releases' ? <>
            {truncatedReleases&&<p className="sa-warning">Exibindo os 1.000 lançamentos mais recentes. A contagem dos cards inclui todos os lançamentos.</p>}
            <div className="sa-table-scroll"><table className="sa-table sa-release-table"><thead><tr><th>Lançamento / códigos</th><th>Prévia</th><th>Tipo / faixas</th><th>Artista</th><th>Solicitação</th><th>Previsão</th><th>Status</th><th>Ações</th></tr></thead><tbody>
              {filteredReleases.map(r=><tr key={r.id}>
                <td><button className="sa-record" onClick={()=>open(r)}><Cover url={r.cover_url} title={r.title}/><span><strong>{r.title}</strong><small>UPC: {r.upc||'Pendente'}</small><small>ISRC: {r.tracks[0]?.isrc||r.isrc||'Pendente'}</small></span></button></td>
                <td><ReleaseQuickPreview releaseId={r.id} trackId={r.tracks[0]?.id} enabled={r.has_audio||r.tracks.length>0}/></td>
                <td><span className="sa-release-type">{r.type?.toUpperCase()==='ALBUM'?'Álbum':r.type?.toUpperCase()==='EP'?'EP':'Single'}</span><small className="sa-subline">{r.tracks.length||1} faixa(s)</small></td>
                <td>{display(r.main_artist||usersById.get(r.artist_id)?.artist_name)}</td>
                <td>{fmtDate(r.created_at)}</td><td>{fmtDate(r.release_date)}</td>
                <td><span className={statusClass(r.status)}>{statusLabels[r.status]||r.status}</span></td>
                <td><div className="sa-quick-actions">
                  {r.status==='pending'&&<>
                    <button className="sa-action-pill approve" onClick={()=>open(r,'approve')}><Check size={14}/> Aprovar</button>
                    <button className="sa-action-pill reject" onClick={()=>open(r,'reject')}><XCircle size={14}/> Rejeitar</button>
                  </>}
                  <button className="sa-action-pill" onClick={()=>open(r)}><Eye size={14}/> Detalhes</button></div></td>
                </tr>)}
            </tbody></table></div>
            {!filteredReleases.length&&<div className="sa-empty"><Disc3 size={36}/><h3>{filter==="pending"?"Nenhum lançamento aguardando revisão":"Nenhum lançamento encontrado"}</h3><p>{filter==="pending"?"Todos os lançamentos recebidos já foram analisados.":"Experimente alterar os filtros ou a busca."}</p></div>}
          </> : tab==='artists' ? <>
            {truncatedUsers&&<p className="sa-warning">Exibindo os 1.000 usuários mais recentes.</p>}
            <AdminAccounts users={filteredUsers} contracts={contracts} canEditBalance={isGeneral} canEditSpotify={canEditSpotify} spotifyProfiles={spotifyProfiles}/>
          </> : tab==='royalties' ? <AdminRoyaltyUpload/> : tab==='support' ? <AdminTickets/> : tab==='payouts' ? <AdminPayouts/> : tab==='splits' ? <AdminRoyaltySplits/> : tab==='banners' ? <AdminBanners/> : <AdminDelivery releases={releases} canEditSpotify={canEditSpotify}/>}
        </div>
      </main>
    {selected&&<div className="sa-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
      <section className="sa-dialog sa-review-drawer" role="dialog" aria-modal="true" aria-label={'Detalhes do lançamento '+selected.title}>
        <header className="sa-dialog-header"><div><span className="sa-kicker">REVISÃO DE LANÇAMENTO</span><h2>{selected.title}</h2></div><button onClick={close} aria-label="Fechar detalhes"><X size={21}/></button></header>
        <div className="sa-dialog-body">
          <div className="sa-dialog-overview"><button type="button" className="sa-cover-zoom" onClick={()=>setZoomCover(true)} disabled={!selected.cover_url} aria-label="Ampliar capa do lançamento"><Cover url={selected.cover_url} title={selected.title} big/><span>Ampliar capa</span></button>
            <div className="sa-dialog-summary"><span className={statusClass(selected.status)}>{statusLabels[selected.status]||selected.status}</span><h3>{selected.title}</h3><p>{display(selected.main_artist)}</p><small><CalendarDays size={14}/> Data prevista: {fmtDate(selected.release_date)}</small></div></div>
          <h3 className="sa-section-title">Informações do lançamento</h3><dl className="sa-details">
            <Field label="Título / Álbum" value={selected.title}/><Field label="Tipo" value={selected.type}/>
            <Field label="Artista principal" value={selected.main_artist}/><Field label="Participações (feat)" value={selected.featured_artists}/>
            <Field label="Gênero" value={selected.genre}/><Field label="Subgênero" value={selected.subgenre}/>
            <Field label="Data de lançamento" value={fmtDate(selected.release_date)}/><Field label="Conteúdo explícito" value={selected.explicit}/>
            <Field label="ISRC (primeira faixa)" value={selected.isrc}/><Field label="UPC/EAN" value={selected.upc}/>
            <Field label="Selo" value={selected.label_name}/><Field label="℗" value={selected.p_line}/>
            <Field label="©" value={selected.c_line}/><Field label="Plataformas" value={selected.platforms.join(', ')}/>
            <Field label="Artistas e funções" value={selected.artists.map(a=>a.name+' ('+a.role+')').join(', ')}/>
          </dl>
          <div style={{margin:'18px 0'}}><h3 className="sa-section-title">Perfis de artista no Spotify</h3>
           {selected.artists.length?selected.artists.map((a,i)=><SpotifyBadge key={a.profile_id||i} artist={a}/>):<p>Nenhum artista registrado.</p>}
          </div>
          <AdminQA release={selected}/>
          <h3 className="sa-section-title">Ficha técnica e créditos</h3><dl className="sa-details">
            <Field label="Compositores" value={selected.composers}/><Field label="Produtores" value={selected.producers}/>
            <Field label="Letristas" value={selected.lyricists}/><Field label="Outros créditos" value={selected.credits}/>
          </dl>
          <AdminReleaseTracks tracks={selected.tracks} onPlay={(id)=>void play(selected.id,id)} busy={audioBusy}/>
          <h3 className="sa-section-title">Pré-escuta de áudio</h3>
          <div className="sa-audio-box"><Headphones size={24}/><div className="sa-audio-content">
            {audio?<audio controls src={audio} preload="metadata" aria-label={'Áudio de '+selected.title}/>:
              <p>{selected.has_audio?'Ouça o material original antes de aprovar.':'Nenhum arquivo de áudio associado.'}</p>}
            {audioError&&<p className="sa-error" role="alert">{audioError}</p>}
          </div>{selected.has_audio&&!audio&&<button className="sa-download" onClick={()=>play(selected.id)} disabled={audioBusy}>{audioBusy?<LoaderCircle className="sa-spin" size={17}/>:<FileAudio2 size={17}/>} Carregar áudio</button>}</div>
          {selected.rejection_reason&&<div className="sa-rejection-old"><strong>Motivo registrado na última rejeição</strong><p>{selected.rejection_reason}</p></div>}
          {reviewMode==='approve'&&<div className="sa-review-info">Confirme a revisão dos metadados antes de aprovar. UPC e ISRC ausentes exigem atribuição válida em fluxo próprio; a aprovação não gera códigos automaticamente.</div>}
          {rejecting&&<div className="sa-rejection"><label htmlFor="sa-reason">Motivo da rejeição <span>(obrigatório)</span></label><textarea id="sa-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={1500} rows={4} placeholder="Explique ao artista o que precisa ser corrigido antes de reenviar..."/><small>{reason.trim().length}/1500 · mínimo 10 caracteres</small></div>}
          {feedback?.type==='error'&&<p className="sa-error" role="alert">{feedback.text}</p>}
        </div>
        <footer className="sa-dialog-footer"><button className="sa-cancel" onClick={close}>Fechar</button>
          {['pending','approved','rejected'].includes(selected.status)&&<>
            {(selected.status==='pending'||selected.status==='approved')&&(rejecting?
              <button className="sa-danger" disabled={busy===selected.id||reason.trim().length<10} onClick={()=>moderate('rejected')}>{busy===selected.id?<LoaderCircle className="sa-spin" size={16}/>:<XCircle size={16}/>} Confirmar rejeição</button>:
              <button className="sa-danger-outline" disabled={!!busy} onClick={()=>{setRejecting(true);setReviewMode('reject')}}><XCircle size={16}/> Rejeitar lançamento</button>)}
            {(selected.status==='pending'||selected.status==='rejected')&&<button className="sa-approve" disabled={!!busy} onClick={()=>moderate('approved')}>{busy===selected.id?<LoaderCircle className="sa-spin" size={16}/>:<Check size={17}/>} Aprovar lançamento</button>}
          </>}
        </footer>
      </section>
    </div>}
    {zoomCover&&selected?.cover_url&&<div className="sa-zoom-backdrop" role="dialog" aria-modal="true" aria-label="Capa ampliada" onClick={()=>setZoomCover(false)}><button type="button" aria-label="Fechar imagem ampliada" onClick={()=>setZoomCover(false)}><X size={24}/></button><img src={selected.cover_url} alt={"Capa ampliada de "+selected.title}/></div>}
  </>
}
