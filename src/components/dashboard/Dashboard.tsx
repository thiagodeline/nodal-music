'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import {useRouter,useSearchParams} from 'next/navigation'
import {Lock} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import './dashboard.css'
import './dashboard-horizontal.css'
import './dashboard-refinements.css'
import './dashboard-premium.css'
import './spotify-dark.css'
import ArtistSidebar from './ArtistSidebar'
import DashboardPopup from './DashboardPopup'
import DirectNotificationsBell from './DirectNotificationsBell'
import {NotificationsProvider,useNotifications} from './useNotifications'
import './direct-notifications-header.css'
import '@/components/billing/plans-dashboard.css'
import type {Data} from './ui'
import Overview from './Overview'
const Catalog=dynamic(()=>import('./Catalog'))
const NewRelease=dynamic(()=>import('./NewRelease'),{loading:()=> <p className="mut">Preparando formulário…</p>})
const Finance=dynamic(()=>import('./Finance'))
const Analytics=dynamic(()=>import('./Analytics'))
import {Account} from './Account'
import Artists from './Artists'
import Support from './Support'
import {ContractBanner} from './ContractBanner'
const RoyaltyInvites=dynamic(()=>import('./RoyaltyInvites'))
const NotificationsCenter=dynamic(()=>import('./NotificationsCenter'))
const ReleaseDrafts=dynamic(()=>import('./ReleaseDrafts'))
import {PlanCards,type PublicPlan} from '@/components/billing/PlanCards'
import '@/components/billing/plans.css'
import {useCanReleaseMusic} from './useCanReleaseMusic'

// Cache curta por usuário: deduplica leituras em mounts simultâneos sem reter dados entre sessões.
type Snapshot=Awaited<ReturnType<typeof readSnapshot>>
const snapshotCache=new Map<string,{expiry:number;value:Promise<Snapshot>}>()
async function readSnapshot(sb:ReturnType<typeof createClient>,userId:string){
 return Promise.all([
  sb.from('profiles').select('*').eq('id',userId).single(),
  sb.from('releases').select('*,release_tracks(id,position,title,isrc,audio_path,composers,producers,lyricists,language,explicit)').eq('artist_id',userId).order('created_at',{ascending:false}),
  sb.from('reports').select('*').eq('artist_id',userId),
  sb.from('withdrawals').select('*').eq('artist_id',userId).order('created_at',{ascending:false}),
  sb.from('billing_subscriptions').select('plan_id,status,access_expires_at').eq('user_id',userId).order('created_at',{ascending:false}),
  sb.from('billing_plans').select('id,name,description,price_brl,frequency,benefits,mp_plan_id,is_default,monthly_releases_limit,max_artists').eq('published',true).eq('archived',false).order('price_brl')
 ])
}
function cachedSnapshot(sb:ReturnType<typeof createClient>,userId:string,force:boolean){
 const existing=snapshotCache.get(userId)
 if(!force&&existing&&existing.expiry>Date.now())return existing.value
 const promise=readSnapshot(sb,userId)
 snapshotCache.set(userId,{expiry:Date.now()+15000,value:promise})
 return promise
}

const ROUTES=['overview','catalog','drafts','new','profiles','analytics','split','financial','account','plans','support','notifications','contracts','privacy']
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
 const [navOpen,setNavOpen]=useState(false)
 const [staffAccess,setStaffAccess]=useState(false)
   const load = useCallback(async (force=true) => {
    const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); if (!user) { location.href = '/login'; return }
    const [me,r,rp,w,bs,catalog]=await cachedSnapshot(sb,user.id,force)
    if(me.data?.role==='admin'){window.location.replace('/admin');return}
    if (me.data?.onboarding_completed === false || me.data?.status === 'PENDING_ONBOARDING') { location.href = '/onboarding'; return }
    if(bs.error)console.error('Falha ao consultar modalidade do artista',bs.error.message)
    if(catalog.error)console.error('Falha ao consultar modalidades',catalog.error.message)
    const current=(bs.data??[]).find(x=>x.status==='authorized'&&x.access_expires_at&&new Date(x.access_expires_at)>new Date())||(bs.data??[]).find(x=>x.status==='free')||(bs.data??[]).find(x=>x.status==='expired'||(x.status==='authorized'&&x.access_expires_at&&new Date(x.access_expires_at)<=new Date()))||null
    setSubscription(current)
    setPlans((catalog.data??[]) as PublicPlan[])
    setBillingLoading(false)
    setD({ me: me.data, email: user.email ?? '', releases: (r.data ?? []).map(x=>({...x,tracks:(x.release_tracks??[]).sort((a:any,b:any)=>a.position-b.position)})), reports: rp.data ?? [], wds: w.data ?? [] })
  }, [])

 useEffect(()=>{void load(false)},[load])
 // Sincroniza a aba com o hash no carregamento, em voltar/avançar e na navegação.
 const syncHash=useCallback(()=>{
  const next=window.location.hash.slice(1)
  if(next==='admin'){window.location.replace('/admin');return}
  setRoute(ROUTES.includes(next)?next:'overview')
  setNavOpen(false)
  window.scrollTo({top:0,behavior:'instant'})
 },[])
 useEffect(()=>{
  syncHash()
  window.addEventListener('hashchange',syncHash)
  window.addEventListener('popstate',syncHash)
  return()=>{
   window.removeEventListener('hashchange',syncHash)
   window.removeEventListener('popstate',syncHash)
  }
 },[syncHash])
 // Next/Link pode atualizar a URL sem disparar hashchange de forma consistente.
 // Navegação do menu atualiza a aba imediatamente; o efeito cobre histórico e links externos.
 const navigateToTab=useCallback((tab:string)=>{
  if(!ROUTES.includes(tab))return
  setRoute(tab)
  setNavOpen(false)
  window.scrollTo({top:0,behavior:'instant'})
 },[])
 useEffect(()=>{
  if(!d?.me?.id)return
  let mounted=true
  void createClient().from('admin_user_roles').select('id').eq('user_id',d.me.id).limit(1)
   .then(({data})=>{if(mounted)setStaffAccess(!!data?.length)})
  return()=>{mounted=false}
 },[d?.me?.id])
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
 async function logout(){snapshotCache.clear();await createClient().auth.signOut();location.href='/'}
 const jump=(name:string)=>{location.hash='#'+name;setRoute(name)}
 return <NotificationsProvider userId={d?.me?.id||null}><DashboardView
  d={d} route={route} navOpen={navOpen} setNavOpen={setNavOpen} navigateToTab={navigateToTab}
  logout={logout} expired={expired} gate={gate} locked={locked} restricted={restricted}
  load={load} plans={plans} checkoutReady={checkoutReady} subscription={subscription}
 /></NotificationsProvider>
}

function DashboardView({d,route,navOpen,setNavOpen,navigateToTab,logout,expired,gate,locked,restricted,load,plans,checkoutReady,subscription}:{
 d:Data|null;route:string;navOpen:boolean;setNavOpen:(v:boolean)=>void;navigateToTab:(tab:string)=>void;
 logout:()=>Promise<void>;expired:boolean;gate:ReturnType<typeof useCanReleaseMusic>;locked:boolean;restricted:boolean;
 load:(force?:boolean)=>Promise<void>;plans:PublicPlan[];checkoutReady:boolean;
 subscription:{plan_id:string;status:string;access_expires_at:string|null}|null
 }){
 const {unreadCount}=useNotifications()
 return <div className="nd nd-horizontal nd-premium">
  <ArtistSidebar active={route} name={d?.me?.artist_name||d?.me?.name||'Artista'} unread={unreadCount} open={navOpen} setOpen={setNavOpen} onNavigate={navigateToTab} onLogout={()=>void logout()}/>
  <div className="nd-direct-header"><span className="nd-direct-header-mobile">SINTONE / PAINEL</span><span className="nd-direct-header-desktop">CENTRAL DO ARTISTA</span>{d?.me?.id&&<DirectNotificationsBell/>}</div>
  {d&&<DashboardPopup/>}
  <main className="nd-hmain">
   {!d?<p className="mut">Carregando seu painel…</p>:<>
    {expired&&<div className="banner red" role="alert"><Lock size={20}/><p>Seu período de acesso terminou. <a href="/dashboard#plans">Renove seu plano</a> para continuar distribuindo.</p></div>}
    {route!=='contracts'&&route!=='notifications'&&<ContractBanner status={gate.status} signed={!!d.me?.contract_accepted_at}/>}
    {restricted?<div className="card"><h3>Acesso restrito</h3><p>Renove o plano para utilizar esta seção.</p><a className="btn" href="/dashboard#plans">Ver planos</a></div>:<>
     {route==='overview'&&<Overview d={d} can={!locked} unread={unreadCount} reload={()=>void load(true)}/>}
     {route==='catalog'&&<Catalog d={d} can={!locked}/>}
     {route==='drafts'&&<ReleaseDrafts userId={d.me.id}/>}
     {route==='profiles'&&<Artists d={d}/>}
     {route==='new'&&(!locked?<NewRelease d={d} reload={load}/>:<div className="card"><h3>Novo lançamento indisponível</h3><p className="mut">Finalize o contrato e mantenha o plano ativo antes de enviar música.</p></div>)}
     {route==='analytics'&&<Analytics d={d}/>}
     {route==='split'&&<RoyaltyInvites d={d}/>}
     {route==='financial'&&<Finance d={d} reload={load}/>}
     {route==='notifications'&&<NotificationsCenter/>}
     {route==='account'&&<Account d={d} reload={load}/>}
     {route==='contracts'&&<div className="card"><h3>Gestão de contratos</h3><p className="mut">Consulte seu contrato e baixe o documento assinado.</p><a className="btn" href="/onboarding/contract">Abrir contrato</a></div>}
     {route==='privacy'&&<div className="card"><a href="/privacidade">Abrir Política de Privacidade</a></div>}
     {route==='support'&&<Support d={d}/>}
     {route==='plans'&&<section className="nd-plan-page"><div className="nd-plan-page-head"><h1>Planos e faturamento</h1><p>Escolha a modalidade ideal para distribuir seus lançamentos. Pagamento único com acesso de 30 dias, sem renovação automática.</p></div><PlanCards plans={plans} context="dashboard" checkoutReady={checkoutReady} currentPlanId={expired?null:subscription?.plan_id}/></section>}
    </>}
   </>}
  </main>
 </div>
}
