'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter,useSearchParams} from 'next/navigation'
import {Bell,ChevronDown,UploadCloud,CreditCard,UserRound,LogOut,Lock,Menu} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import './dashboard.css'
import './dashboard-horizontal.css'
import './dashboard-refinements.css'
import '@/components/billing/plans-dashboard.css'
import type {Data} from './ui'
import Overview from './Overview'
import Catalog from './Catalog'
import NewRelease from './NewRelease'
import Finance from './Finance'
import Analytics from './Analytics'
import {Account} from './Account'
import Artists from './Artists'
import Support from './Support'
import {ContractBanner} from './ContractBanner'
import RoyaltyInvites from './RoyaltyInvites'
import NotificationsCenter from './NotificationsCenter'
import ReleaseDrafts from './ReleaseDrafts'
import {PlanCards,type PublicPlan} from '@/components/billing/PlanCards'
import '@/components/billing/plans.css'
import {useCanReleaseMusic} from './useCanReleaseMusic'

const ROUTES=['overview','catalog','drafts','new','profiles','analytics','split','financial','account','plans','support','notifications','contracts','privacy','profile']
const groups=[
 {name:'Lançamentos',items:[['catalog','Todos os lançamentos'],['drafts','Rascunhos'],['profiles','Artistas']]},
 {name:'Análises e Ganhos',items:[['analytics','Analytics'],['split','Divisões de Royalties'],['financial','Meus Ganhos']]}
] as const
export default function Dashboard({checkoutReady=false}:{checkoutReady?:boolean}){
 const router=useRouter()
 const [d,setD]=useState<Data|null>(null)
 const [route,setRoute]=useState('overview')
 const [plans,setPlans]=useState<PublicPlan[]>([])
 const [subscription,setSubscription]=useState<{plan_id:string;status:string;access_expires_at:string|null}|null>(null)
 const [billingLoading,setBillingLoading]=useState(true)
 const [unread,setUnread]=useState(0)
 const [navOpen,setNavOpen]=useState(false)
   const load = useCallback(async () => {
    const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) { location.href = '/login'; return }
    const [me, r, rp, w, bs, catalog] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).single(),
      sb.from('releases').select('*,release_tracks(id,position,title,isrc,audio_path,composers,producers,lyricists,language,explicit)').eq('artist_id', user.id).order('created_at', { ascending: false }),
      sb.from('reports').select('*').eq('artist_id', user.id),
      sb.from('withdrawals').select('*').eq('artist_id', user.id).order('created_at', { ascending: false }),
      sb.from('billing_subscriptions').select('plan_id,status,access_expires_at').eq('user_id',user.id).order('created_at',{ascending:false}),
      sb.from('billing_plans').select('id,name,description,price_brl,frequency,benefits,mp_plan_id,is_default,monthly_releases_limit,max_artists').eq('published',true).eq('archived',false).order('price_brl')])
    if (me.data?.onboarding_completed === false || me.data?.status === 'PENDING_ONBOARDING') { location.href = '/onboarding'; return }
    if(bs.error)console.error('Falha ao consultar modalidade do artista',bs.error.message)
    if(catalog.error)console.error('Falha ao consultar modalidades',catalog.error.message)
    const current=(bs.data??[]).find(x=>x.status==='authorized'&&x.access_expires_at&&new Date(x.access_expires_at)>new Date())||(bs.data??[]).find(x=>x.status==='free')||(bs.data??[]).find(x=>x.status==='expired'||(x.status==='authorized'&&x.access_expires_at&&new Date(x.access_expires_at)<=new Date()))||null
    setSubscription(current)
    setPlans((catalog.data??[]) as PublicPlan[])
    setBillingLoading(false)
    setD({ me: me.data, email: user.email ?? '', releases: (r.data ?? []).map(x=>({...x,tracks:(x.release_tracks??[]).sort((a:any,b:any)=>a.position-b.position)})), reports: rp.data ?? [], wds: w.data ?? [] })
  }, [])

 useEffect(()=>{void load()},[load])
 useEffect(()=>{
  const update=()=>{
   const next=window.location.hash.slice(1)
   if(next==='admin'){window.location.replace('/admin');return}
   setRoute(ROUTES.includes(next)?next:'overview');setNavOpen(false);window.scrollTo(0,0)
  }
  update();window.addEventListener('hashchange',update)
  return()=>window.removeEventListener('hashchange',update)
 },[])
 useEffect(()=>{
  if(!d?.me?.id)return
  const sb=createClient()
  void sb.from('notifications').select('id',{head:true,count:'exact'}).eq('user_id',d.me.id).eq('read',false)
   .then(({count})=>setUnread(count||0))
 },[d?.me?.id,route])
 const gate=useCanReleaseMusic(d?.me)
 const expired=subscription?.status==='expired'||(subscription?.status==='authorized'&&!!subscription.access_expires_at&&new Date(subscription.access_expires_at)<=new Date())
 const locked=!!d&&(!gate.canRelease||expired||billingLoading)
 const activePlan=plans.find(p=>p.id===subscription?.plan_id)
 const limit=activePlan?.monthly_releases_limit
 const used=d?.releases.filter(r=>r.created_at.slice(0,7)===new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}).slice(0,7)).length||0
 const remain=limit==null?'Lançamentos Ilimitados':Math.max(0,limit-used)+' lançamento(s) restantes neste mês'
 const planTip='Plano Atual: '+(activePlan?.name||'Não identificado')+(activePlan?.description?' ('+activePlan.description+')':'')
 const uploadTip='Limite mensal: '+remain
 const restricted=expired&&!['plans','support','account','financial','catalog','notifications','contracts','privacy','profile','profiles'].includes(route)
 async function logout(){await createClient().auth.signOut();location.href='/'}
 const jump=(name:string)=>{location.hash='#'+name;setRoute(name)}
 return <div className="nd nd-horizontal">
  <header className="nd-hnav">
   <Link href="/dashboard" className="nd-hbrand" onClick={()=>jump('overview')}><img src="/sintone-logo.svg" alt="SINTONE"/></Link>
   <nav className={'nd-hlinks '+(navOpen?'open':'')} aria-label="Navegação do artista">
    <a className={route==='overview'?'active':''} href="/dashboard#overview">Visão Geral</a>
    {groups.map(group=><div className="nd-hgroup" key={group.name}>
     <button type="button" className={group.items.some(i=>i[0]===route)?'active':''}>{group.name} <ChevronDown size={15}/></button>
     <div className="nd-hdropdown">{group.items.map(([key,label])=><a key={key} href={key==='profiles'?'/dashboard/artistas':'/dashboard#'+key}>{label}</a>)}</div>
    </div>)}
   </nav>
   <div className="nd-hquick">
    <a href="/dashboard/planos" className="nd-houtline" title={planTip}><CreditCard size={16}/> <span>Atualizar</span></a>
    <button className="nd-hupload" title={uploadTip} disabled={locked} onClick={()=>{window.location.href='/novo-lancamento'}}><UploadCloud size={16}/><span>Carregar</span></button>
    <Link href="/notificacoes" className="nd-hbell" title="Notificações" aria-label={unread+' notificações não lidas'}><Bell size={19}/>{unread>0&&<sup>{unread>99?'99+':unread}</sup>}</Link>
    <div className="nd-hgroup nd-hprofile">
     <button type="button" aria-label="Menu do perfil" title={d?.email||'Conta'}><UserRound size={20}/><ChevronDown size={13}/></button>
     <div className="nd-hdropdown nd-hprofile-menu">
      <small title={d?.email}>{d?.email}</small>
      <a href="/dashboard#profile">Perfil do artista</a>
      <a href="/dashboard#account">Configurações da conta</a>
      <a href="/dashboard/planos">Plano e faturamento</a>
      <a href="/dashboard#contracts">Gestão de contratos</a>
      <a href="/privacidade">Política de Privacidade</a>
      {d?.me?.role==='admin'&&<Link href="/admin">Painel Admin</Link>}
      <button type="button" onClick={()=>void logout()}><LogOut size={15}/> Sair</button>
     </div>
    </div>
    <button className="nd-hburger" onClick={()=>setNavOpen(x=>!x)} aria-label="Abrir navegação"><Menu size={21}/></button>
   </div>
  </header>
  <main className="nd-hmain">
   {!d?<p className="mut">Carregando seu painel…</p>:<>
    {expired&&<div className="banner red" role="alert"><Lock size={20}/><p>Seu período de acesso terminou. <a href="/dashboard#plans">Renove seu plano</a> para continuar distribuindo.</p></div>}
    {route!=='contracts'&&route!=='notifications'&&<ContractBanner status={gate.status} signed={!!d.me?.contract_accepted_at}/>}
    {restricted?<div className="card"><h3>Acesso restrito</h3><p>Renove o plano para utilizar esta seção.</p><a className="btn" href="/dashboard#plans">Ver planos</a></div>:<>
     {route==='overview'&&<Overview d={d} can={!locked}/>}
     {route==='catalog'&&<Catalog d={d} can={!locked}/>}
     {route==='drafts'&&<ReleaseDrafts userId={d.me.id}/>}
     {route==='profiles'&&<Artists d={d}/>}
     {route==='new'&&(!locked?<NewRelease d={d} reload={load}/>:<div className="card"><h3>Novo lançamento indisponível</h3><p className="mut">Finalize o contrato e mantenha o plano ativo antes de enviar música.</p></div>)}
     {route==='analytics'&&<Analytics d={d}/>}
     {route==='split'&&<RoyaltyInvites d={d}/>}
     {route==='financial'&&<Finance d={d} reload={load}/>}
     {route==='notifications'&&<NotificationsCenter/>}
     {route==='account'&&<Account d={d} reload={load}/>}
     {route==='profile'&&<ArtistPhone d={d} reload={load}/>}
     {route==='contracts'&&<div className="card"><h3>Gestão de contratos</h3><p className="mut">Consulte seu contrato e baixe o documento assinado.</p><a className="btn" href="/onboarding/contract">Abrir contrato</a></div>}
     {route==='privacy'&&<div className="card"><a href="/privacidade">Abrir Política de Privacidade</a></div>}
     {route==='support'&&<Support d={d}/>}
     {route==='plans'&&<section className="nd-plan-page"><div className="nd-plan-page-head"><h1>Planos e faturamento</h1><p>Escolha a modalidade ideal para distribuir seus lançamentos. Pagamento único com acesso de 30 dias, sem renovação automática.</p></div><PlanCards plans={plans} context="dashboard" checkoutReady={checkoutReady} currentPlanId={expired?null:subscription?.plan_id}/></section>}
    </>}
   </>}
  </main>
 </div>
}
function ArtistPhone({d,reload}:{d:Data;reload:()=>void}){
 const [phone,setPhone]=useState(d.me?.phone||'')
 const [message,setMessage]=useState('')
 return <form className="card form nd-phone" onSubmit={async e=>{
  e.preventDefault();const clean=phone.trim()
  if(clean.length>35){setMessage('Telefone muito longo.');return}
  const {error}=await createClient().from('profiles').update({phone:clean||null}).eq('id',d.me.id)
  setMessage(error?'Não foi possível salvar.':'Telefone atualizado.');if(!error)reload()
 }}><h3>Perfil do artista</h3><p className="mut">Neste espaço, somente o telefone pode ser alterado.</p>
 <label>Telefone<input type="tel" maxLength={35} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <button className="btn">Salvar telefone</button>{message&&<p role="status">{message}</p>}</form>
}
