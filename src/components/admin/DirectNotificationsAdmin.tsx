'use client'
import {useMemo,useState} from 'react'
import {Bell,Send,Search,CheckCircle2,Clock,Trash2} from 'lucide-react'
import {sendDirectArtistNotification,removeDirectArtistNotification,clearDirectArtistNotifications,type DirectNoticeType} from '@/app/admin/notificacoes/actions'
import './direct-notifications.css'

type Account={id:string;name:string|null;artist_name:string|null;email:string|null}
type Artist={id:string;owner_id:string;name:string}
type History={id:string;user_id:string;artist_profile_id:string|null;title:string;message:string;type:DirectNoticeType;action_url:string|null;read:boolean;created_at:string}
const typeNames:Record<DirectNoticeType,string>={info:'Informação',success:'Conquista / Sucesso',warning:'Aviso / Ajuste',action:'Ação Requerida'}
const types:DirectNoticeType[]=['info','success','warning','action']
export default function DirectNotificationsAdmin({initialAccounts,initialArtists,initialHistory}:{initialAccounts:Account[];initialArtists:Artist[];initialHistory:History[]}){
 const [accounts]=useState(initialAccounts)
 const [artists]=useState(initialArtists)
 const [history,setHistory]=useState(initialHistory)
 const [search,setSearch]=useState('')
 const [recipient,setRecipient]=useState('')
 const [artistId,setArtistId]=useState('')
 const [title,setTitle]=useState('')
 const [message,setMessage]=useState('')
 const [type,setType]=useState<DirectNoticeType>('info')
 const [url,setUrl]=useState('')
 const [busy,setBusy]=useState(false)
 const [feedback,setFeedback]=useState('')
 const [isError,setIsError]=useState(false)
 const [confirmClear,setConfirmClear]=useState<'all'|'read'|null>(null)
 const matches=useMemo(()=>accounts.filter(a=>([a.artist_name,a.name,a.email,...artists.filter(x=>x.owner_id===a.id).map(x=>x.name)].join(' ').toLowerCase()).includes(search.toLowerCase())).slice(0,30),[accounts,artists,search])
 const selected=accounts.find(a=>a.id===recipient)
 const profiles=artists.filter(a=>a.owner_id===recipient)
 function choose(a:Account){setRecipient(a.id);setArtistId('');setSearch(a.artist_name||a.name||a.email||'')}
 async function send(){
  if(busy)return
  if(!window.confirm('Enviar esta notificação somente para '+(selected?.artist_name||selected?.name||selected?.email||'a conta selecionada')+'?'))return
  setBusy(true);setFeedback('');setIsError(false)
  try{
   const result=await sendDirectArtistNotification({user_id:recipient,artist_profile_id:artistId||null,title,message,type,action_url:url})
   if(!result.ok)throw Error(result.error)
   setFeedback('Notificação enviada ao artista.')
   setTitle('');setMessage('');setUrl('')
   setHistory(rows=>[result.notification as History,...rows].slice(0,150))
  }catch(e){setIsError(true);setFeedback(e instanceof Error?e.message:'Falha ao enviar.')}
  finally{setBusy(false)}
 }

 async function remove(id:string){
  if(busy)return
  if(!window.confirm('Remover esta notificação do histórico e do painel do artista?'))return
  const previous=history
  setBusy(true);setFeedback('');setIsError(false)
  setHistory(rows=>rows.filter(row=>row.id!==id))
  try{
   const result=await removeDirectArtistNotification(id)
   if(!result.ok)throw Error(result.error)
   setFeedback('Notificação removida do histórico e do painel do artista.')
  }catch(e){
   setHistory(previous)
   setIsError(true);setFeedback(e instanceof Error?e.message:'Falha ao excluir.')
  }finally{setBusy(false)}
 }
 async function clear(mode:'all'|'read'){
  if(busy)return
  const previous=history
  setBusy(true);setFeedback('');setIsError(false)
  setHistory(rows=>mode==='all'?[]:rows.filter(row=>!row.read))
  try{
   const result=await clearDirectArtistNotifications(mode)
   if(!result.ok)throw Error(result.error)
   setFeedback(result.count+' notificação(ões) removida(s) do histórico e dos painéis dos artistas.')
   setConfirmClear(null)
  }catch(e){
   setHistory(previous)
   setIsError(true);setFeedback(e instanceof Error?e.message:'Falha ao limpar histórico.')
  }finally{setBusy(false)}
 }
 return <main className="sa-content sa-direct-admin">
  <div className="sa-direct-header"><div><span>COMUNICAÇÃO DIRETA / SINTONE</span><h2>NOTIFICAÇÕES AOS ARTISTAS</h2><p>Mensagens individuais, exclusivas para a conta selecionada.</p></div><Bell size={29}/></div>
  <div className="sa-direct-layout">
   <section className="sa-direct-panel">
    <h3>01 / DESTINATÁRIO E MENSAGEM</h3>
    <label className="sa-direct-field"><span>Buscar artista ou conta</span><div className="sa-direct-search"><Search size={17}/><input autoComplete="off" value={search} onChange={e=>{setSearch(e.target.value);setRecipient('');setArtistId('')}} placeholder="Nome artístico, nome ou e-mail"/></div></label>
    {recipient?<div className="sa-direct-selected"><CheckCircle2 size={18}/><div><strong>{selected?.artist_name||selected?.name||'Artista'}</strong><small>{selected?.email||'Conta selecionada'}</small></div><button type="button" onClick={()=>{setRecipient('');setSearch('');setArtistId('')}}>Trocar</button></div>:<div className="sa-direct-results" role="listbox" aria-label="Selecionar destinatário">
     {matches.map(a=><button type="button" key={a.id} role="option" aria-selected="false" onClick={()=>choose(a)}>
      <strong>{a.artist_name||a.name||'Artista'}</strong><small>{a.email||'Sem e-mail cadastrado'}</small></button>)}
     {!matches.length&&<p>Nenhum resultado encontrado.</p>}
    </div>}
    {recipient&&profiles.length>0&&<label className="sa-direct-field"><span>Perfil artístico (opcional)</span><select value={artistId} onChange={e=>setArtistId(e.target.value)}><option value="">Notificar a conta inteira</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    <label className="sa-direct-field"><span>Título da notificação ({title.length}/160)</span><input maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Sua música entrou na playlist!"/></label>
    <label className="sa-direct-field"><span>Mensagem completa ({message.length}/3000)</span><textarea rows={6} maxLength={3000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escreva uma mensagem clara e específica para o artista." /></label>
    <label className="sa-direct-field"><span>Tipo</span><select value={type} onChange={e=>setType(e.target.value as DirectNoticeType)}>{types.map(t=><option value={t} key={t}>{typeNames[t]}</option>)}</select></label>
    <label className="sa-direct-field"><span>Link do botão (opcional)</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="/dashboard#catalog"/></label>
    <small className="sa-direct-help">Links aceitos: /dashboard ou /dashboard#catalog, #financial, #notifications e demais abas existentes.</small>
    {feedback&&<p className={isError?'sa-direct-feedback error':'sa-direct-feedback'} role={isError?'alert':'status'}>{feedback}</p>}
    <button type="button" className="sa-direct-send" disabled={busy||!recipient||title.trim().length<3||!message.trim()} onClick={()=>void send()}><Send size={18}/>{busy?'ENVIANDO…':'ENVIAR NOTIFICAÇÃO DIRETA'}</button>
   </section>
   <section className="sa-direct-panel sa-direct-history">
    <div className="sa-direct-history-head"><h3>02 / HISTÓRICO DE ENVIOS</h3>
     <div className="sa-direct-history-actions">
      {confirmClear?<div className="sa-direct-clear-confirm" role="group" aria-label="Confirmar limpeza do histórico"><span>{confirmClear==='all'?'Remover todas as notificações diretas?':'Remover todas as notificações diretas lidas?'}</span>
       <button type="button" className="danger" disabled={busy} onClick={()=>void clear(confirmClear)}>Confirmar</button>
       <button type="button" disabled={busy} onClick={()=>setConfirmClear(null)}>Cancelar</button></div>:<>
       {history.some(h=>h.read)&&<button type="button" disabled={busy} onClick={()=>setConfirmClear('read')}>Excluir lidas</button>}
       {history.length>0&&<button type="button" className="danger" disabled={busy} onClick={()=>setConfirmClear('all')}><Trash2 size={14}/> Limpar histórico</button>}
      </>}
     </div>
    </div>
    <p className="sa-direct-help">Últimas 150 notificações diretas ativas. Excluir aqui também as remove do painel do destinatário. O registro de auditoria permanece armazenado.</p>
    <div className="sa-direct-table-wrap"><table><thead><tr><th>Artista</th><th>Notificação</th><th>Tipo</th><th>Enviada em</th><th>Status</th><th>Ações</th></tr></thead><tbody>{history.map(h=>{
     const a=accounts.find(x=>x.id===h.user_id)
     return <tr key={h.id}><td><strong>{a?.artist_name||a?.name||'Conta'}</strong><small>{a?.email||h.user_id.slice(0,8)}</small></td>
     <td><strong>{h.title}</strong><small>{h.message}</small></td><td><span className={'sa-direct-type '+h.type}>{typeNames[h.type]}</span></td>
     <td>{new Date(h.created_at).toLocaleString('pt-BR')}</td><td><span className={'sa-direct-read '+(h.read?'yes':'no')}>{h.read?<CheckCircle2 size={14}/>:<Clock size={14}/>} {h.read?'Lida':'Não lida'}</span></td>
     <td><button type="button" className="sa-direct-delete" disabled={busy} aria-label={'Excluir notificação: '+h.title} title="Excluir notificação" onClick={()=>void remove(h.id)}><Trash2 size={16}/> Excluir</button></td></tr>
    })}</tbody></table>{!history.length&&<p className="sa-direct-empty">Nenhuma notificação direta foi enviada.</p>}</div>
   </section>
  </div>
 </main>
}
