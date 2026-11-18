'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import { Data, Kpi, Badge, Cover, Bars, brl, num, dt, money, sum, group } from './ui'
import {Info,Music2,ImageIcon,ClipboardCheck,Bell,UserRound,Camera,Wallet,ArrowRight} from 'lucide-react'
import Link from 'next/link'
const iso = (d: Date) => d.toISOString().slice(0, 10)
export default function Overview({ d, can, unread=0, reload }: { d: Data; can: boolean; unread?:number; reload:()=>void }) {
  const { balance } = money(d)
  const [avatarBusy,setAvatarBusy]=useState(false),[avatarError,setAvatarError]=useState('')
  const [greeting,setGreeting]=useState('Olá')
  useEffect(()=>{const hour=new Date().getHours();setGreeting(hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite')},[])
  const avatarPath=d.me?.avatar_path as string|undefined
  const avatarUrl=avatarPath?createClient().storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl:null
  async function uploadAvatar(file:File|undefined){
   if(!file||avatarBusy)return
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){
    setAvatarError('Envie JPG, PNG ou WebP com até 2 MB.');return
   }
   setAvatarError('');setAvatarBusy(true)
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
   const sb=createClient(),path=d.me.id+'/'+crypto.randomUUID()+'.'+ext
   try{
    const {error:upError}=await sb.storage.from('avatars').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'})
    if(upError)throw upError
    const {error:dbError}=await sb.from('profiles').update({avatar_path:path}).eq('id',d.me.id)
    if(dbError){await sb.storage.from('avatars').remove([path]);throw dbError}
    reload()
   }catch{setAvatarError('Não foi possível atualizar a foto. Tente novamente.')}
   finally{setAvatarBusy(false)}
  }
  const today = new Date(), months = Array.from({ length: 6 }, (_, i) => { const x = new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()-(5-i),1)); return iso(x) })
  const cur = d.reports.filter(r => r.month >= months[4])
  const map: Record<string, number> = {}; d.reports.forEach(r => map[r.month] = (map[r.month] || 0) + Number(r.streams))
  const chartMonths=months.map(x=>({label:new Date(x+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}).replace('.',''),streams:map[x]||0}))
  const chartMax=Math.max(0,...chartMonths.map(x=>x.streams))
  const monthKey = iso(today).slice(0, 7), monthRev = sum(d.reports.filter(r => r.month.startsWith(monthKey)), 'revenue')
  const active = d.releases.filter(r => r.status === 'approved' || r.status === 'live').length
  const dsp = group(d.reports, r => r.platform).slice(0, 5)
  return (<>
    <div className="nd-premium-greeting"><span className="nd-greeting-kicker">SINTONE / VISÃO GERAL</span><h1>{greeting}, {d.me?.artist_name?.trim()||d.me?.name?.trim()||'Artista'}</h1></div>
    <section className="nd-premium-welcome">
     <div className="nd-welcome-profile">
      <label className="nd-avatar-upload" title="Alterar foto de perfil">
       {avatarUrl?<img src={avatarUrl} alt="Foto de perfil do artista"/>:<UserRound size={34}/>}
       <span><Camera size={13}/></span>
       <input type="file" accept="image/png,image/jpeg,image/webp" disabled={avatarBusy} onChange={e=>{void uploadAvatar(e.target.files?.[0]);e.target.value=''}} aria-label="Enviar foto de perfil"/>
      </label>
      <div className="nd-welcome-text"><span>SEU ESPAÇO NA SINTONE</span><h2>QUE BOM VER VOCÊ EM SINTONE.</h2>
       <p>{d.me?.artist_name?'Seu catálogo, suas oportunidades e seus próximos lançamentos estão aqui.':'Defina seu nome artístico para deixar seu perfil pronto.'}</p>
       <a href="/dashboard#account" className="nd-welcome-outline">{d.me?.artist_name?'EDITAR NOME DO ARTISTA':'+ DEFINIR NOME DO ARTISTA'}</a>
      </div>
     </div>
     <div className="nd-welcome-wallet"><Wallet size={23}/><h3>ABRA SUA WALLET DA SINTONE</h3><p>Confira seus ganhos e solicitações de saque.</p><a href="/dashboard#financial">ACESSAR CARTEIRA <ArrowRight size={16}/></a></div>
     {avatarError&&<p className="nd-avatar-error" role="alert">{avatarError}</p>}
    </section>
    <div className="nd-premium-overview-grid">
     <section className="nd-release-launch">
      <div className="nd-premium-section-title"><h2>LANÇAR MÚSICA</h2><span>TRÊS PASSOS PARA SEU PRÓXIMO LANÇAMENTO</span></div>
      <div className="nd-launch-steps">
       <article><Music2 size={26}/><span>01</span><h3>ESCOLHA SUAS FAIXAS</h3><p>Selecione o áudio e confira a qualidade do arquivo.</p></article>
       <article><ImageIcon size={26}/><span>02</span><h3>PREPARE SUA CAPA DE ÁLBUM</h3><p>Use uma imagem adequada para as plataformas.</p></article>
       <article><ClipboardCheck size={26}/><span>03</span><h3>FINALIZE OS DETALHES</h3><p>Informe título, artistas, créditos e data de lançamento.</p></article>
      </div>
      <a className={'nd-launch-cta '+(!can?'is-locked':'')} href={can?'/novo-lancamento':'/dashboard#contracts'} aria-disabled={!can}><Music2 size={20}/>{can?'LANÇAR MÚSICA':'LANÇAMENTO INDISPONÍVEL'}</a>
      {!can&&<p className="nd-launch-lock-note">Conclua os requisitos da conta, contrato ou plano para liberar os lançamentos.</p>}
     </section>
     <section className="nd-overview-notifications"><Bell size={28}/><h2>NOTIFICAÇÕES</h2>
      <strong>{unread>0?'VOCÊ TEM '+unread+' NOTIFICAÇÃO'+(unread>1?'ÕES':''):'VOCÊ ESTÁ EM DIA!'}</strong>
      <p>{unread>0?'Confira os avisos pendentes para sua conta.':'Volte aqui para alertas e atualizações oportunas relativas à sua música, carteira e outros recursos da SINTONE.'}</p>
      <a href="/dashboard#notifications">VER NOTIFICAÇÕES <ArrowRight size={15}/></a>
     </section>
    </div>
    <section className="card nd-weekly-analysis">
      <div className="nd-section-head"><h3>Análise — últimos 7 dias</h3>
        <span className="nd-info-help" title="Os relatórios atuais da SINTONE chegam por competência mensal. Ainda não há dados diários verificáveis de vídeos, visualizações ou streams para calcular os últimos 7 dias." aria-label="Sobre os dados dos últimos 7 dias" tabIndex={0}><Info size={17}/></span>
      </div>
      <div className="nd-weekly-grid">
       {(['Vídeos','Visualizações','Fluxos'] as const).map(label=><div className="nd-weekly-stat" key={label}>
        <span>{label}</span><strong>0</strong><small title="Variação demonstrativa: não há dados diários para comparar períodos.">0% <span className="nd-weekly-hint">sem dados diários</span></small>
       </div>)}
      </div>
    </section>
    <div className="grid4">
      <Kpi label="Saldo disponível" value={brl(balance)} action={<a className="btn sm" href="#financial">Sacar</a>} />
      <Kpi label="Streams nas 2 últimas competências" value={num(sum(cur, 'streams'))} delta={null} />
      <Kpi label="Lançamentos ativos" value={String(active)} />
      <Kpi label="Royalties reportados no mês" value={brl(monthRev)} />
    </div>
    <div className="grid2">
      <section className="card nd-monthly-card"><div className="nd-section-head"><h3>Streams por competência</h3><span className="mut">Últimos 6 meses</span></div>
       <div className="nd-monthly-chart" role="img" aria-label={'Streams mensais: '+chartMonths.map(m=>m.label+' '+m.streams).join(', ')}>
        {chartMonths.map((m,i)=><div className="nd-month-column" key={i}><div className="nd-month-bar-area"><span className="nd-month-bar" style={{height:chartMax?Math.max(3,m.streams/chartMax*100)+'%':'3px'}} title={m.label+': '+num(m.streams)+' streams'}/></div><span className="nd-month-label">{m.label}</span></div>)}
       </div>
       {!chartMax&&<p className="nd-month-empty">Aguardando primeiros dados de streams</p>}
      </section>
      <section className="card"><h3>Top lojas (DSPs)</h3><p className="mut">Participação nos streams reportados</p>{dsp.length?<Bars rows={dsp}/>:<p className="mut">Aguardando primeiros relatórios das lojas.</p>}</section>
    </div>
    <div className="card"><div className="row-h"><h3>Lançamentos recentes</h3><a className="link" href="/dashboard#catalog">Ver todos</a></div>
      {d.releases.length ? <div className="nd-table-scroll" role="region" aria-label="Lançamentos recentes" tabIndex={0}><table><thead><tr><th>Faixa</th><th>Artista</th><th>Data</th><th>Status</th></tr></thead><tbody>
        {d.releases.slice(0, 3).map(r => <tr key={r.id}><td><div className="cell"><Cover path={r.cover_path} />{r.title}</div></td><td>{r.main_artist || d.me?.artist_name || '—'}</td><td>{dt(r.release_date || r.created_at)}</td><td><Badge s={r.status} /></td></tr>)}</tbody></table></div>
        : <div className="nd-no-releases"><h4>Nenhum lançamento ainda</h4><p className="mut">Cadastre um artista para começar a organizar seu catálogo.</p><Link className="btn" href="/dashboard/artistas">Cadastrar artista</Link></div>}</div>
  </>)
}
