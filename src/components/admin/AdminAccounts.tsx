'use client'
import {useEffect,useState} from 'react'
import {Download,Settings2,X} from 'lucide-react'
import {useRouter} from 'next/navigation'
import {adminSaveArtist,adminSetBalance} from '@/app/admin/management-actions'
import {getContractDownloadUrl} from '@/app/admin/actions'
import type {AdminUser,AdminContract} from './AdminPanel'
import AdminSpotifyProfiles,{type AdminSpotifyProfile} from './AdminSpotifyProfiles'
import SpotifyBadge from './SpotifyBadge'
type Status='PENDING_ONBOARDING'|'PENDING_CONTRACT'|'ACTIVE'|'BLOCKED'
type Draft={name:string;artist_name:string;phone:string;address:string;birth_date:string;cpf:string;cnpj:string;status:Status}
const input='sa-x-input'
export default function AdminAccounts({users,contracts,canEditBalance=false,spotifyProfiles}:{users:AdminUser[];contracts:AdminContract[];canEditBalance?:boolean;spotifyProfiles:AdminSpotifyProfile[]}) {
  const router=useRouter()
  const [selected,setSelected]=useState<string|null>(null)
  const [draft,setDraft]=useState<Draft|null>(null)
  const [balance,setBalance]=useState('0.00')
  const [reason,setReason]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const open=(u:AdminUser)=>{
    setSelected(u.id);setDraft({
      name:u.name||'',artist_name:u.artist_name||'',phone:u.phone||'',
      address:u.address||'',birth_date:u.birth_date||'',cpf:u.cpf||'',cnpj:u.cnpj||'',
      status:u.status as Status
    })
    setBalance(Number(u.saldo_disponivel||0).toFixed(2));setReason('');setMessage('')
  }
  const save=async(kind:'balance'|'account')=>{
    if(!selected||!draft)return
    setBusy(true);setMessage('')
    try {
      const r=kind==='balance'
        ?await adminSetBalance(selected,Number(balance.replace(',','.')),reason)
        :await adminSaveArtist(selected,draft)
      setMessage(r.ok?'Alteração registrada.':r.error)
      if(r.ok)router.refresh()
    }catch{setMessage('Erro de conexão ao salvar.')}
    finally{setBusy(false)}
  }
  const download=async(id:string)=>{
    const r=await getContractDownloadUrl(id)
    if(!r.ok||!r.url){setMessage(r.ok?'Contrato indisponível.':r.message);return}
    const a=document.createElement('a');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer'
    document.body.appendChild(a);a.click();a.remove()
  }
  const ready=(id:string)=>contracts.some(c=>c.user_id===id&&c.pdf_status==='ready')
  useEffect(()=>{if(!selected)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[selected])
  return <div className="sa-x-wrap">
    <p className="sa-x-note">Saldo = royalties líquidos + ajustes auditados − saques. Alterações exigem justificativa.</p>
    <div className="sa-table-scroll"><table className="sa-table">
      <thead><tr><th>Artista / E-mail</th><th>Spotify ID / Link</th><th>Status</th><th>Saldo disponível</th><th>Contrato</th><th>Ações</th></tr></thead>
      <tbody>{users.map(u=><tr key={u.id}>
        <td><strong>{u.artist_name||u.name||'Sem nome'}</strong><small className="sa-x-small">{u.email}</small></td>
        <td>{spotifyProfiles.filter(p=>p.owner_id===u.id).map(p=><SpotifyBadge key={p.id} artist={p}/>)}{!spotifyProfiles.some(p=>p.owner_id===u.id)&&<small>Sem perfil cadastrado</small>}</td>
        <td>{u.status}</td><td>{canEditBalance?'R$ '+Number(u.saldo_disponivel||0).toFixed(2):'Restrito ao financeiro'}</td>
        <td>{ready(u.id)?<button className="sa-action-pill" onClick={()=>void download(u.id)}><Download size={14}/> Baixar PDF</button>:'Pendente'}</td>
        <td><button className="sa-action-pill" onClick={()=>open(u)}><Settings2 size={14}/> Gerenciar</button></td>
      </tr>)}</tbody>
    </table></div>
    {selected&&draft&&<div className="sa-drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
     <section className="sa-drawer" role="dialog" aria-modal="true" aria-label="Gerenciar artista">
      <header className="sa-drawer-head"><h3>Gerenciar conta</h3><button type="button" className="sa-action-pill" onClick={()=>setSelected(null)} aria-label="Fechar"><X size={17}/></button></header>
      <div className="sa-drawer-body"><p className="sa-x-note">Dados cadastrais e contrato</p>
      <div className="sa-x-fields">
        {(['name','artist_name','phone','address','cpf','cnpj'] as const).map(k=>
          <label key={k}>{({name:'Nome',artist_name:'Artista/Selo',phone:'Telefone',address:'Endereço',cpf:'CPF',cnpj:'CNPJ'} as Record<string,string>)[k]}
            <input className={input} value={draft[k]} onChange={e=>setDraft({...draft,[k]:e.target.value})}/></label>
        )}
        <label>Data de nascimento/fundação<input type="date" className={input} value={draft.birth_date} onChange={e=>setDraft({...draft,birth_date:e.target.value})}/></label>
        <label>Status<select className={input} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Status})}>
          <option value="PENDING_ONBOARDING">Cadastro pendente</option>
          <option value="PENDING_CONTRACT">Contrato pendente</option>
          <option value="ACTIVE">Ativo</option>
          <option value="BLOCKED">Bloqueado</option>
        </select></label>
      </div>
      <button className="sa-x-button" disabled={busy} onClick={()=>save('account')}>Salvar dados cadastrais</button>
      <AdminSpotifyProfiles profiles={spotifyProfiles.filter(p=>p.owner_id===selected)}/>
      {canEditBalance&&<><div className="sa-x-sep"/>
      <label>Definir saldo disponível (R$)<input type="number" step="0.01" min="0" className={input} value={balance} onChange={e=>setBalance(e.target.value)}/></label>
      <label>Motivo do ajuste (obrigatório)<input minLength={10} maxLength={500} className={input} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <button className="sa-x-button" disabled={busy||reason.trim().length<10} onClick={()=>save('balance')}>Registrar ajuste auditável</button></>}
      <button className="sa-x-link" onClick={()=>setSelected(null)}>Fechar</button>
      {message&&<p role="status">{message}</p>}
     </div>
    </section></div>}
  </div>
}
