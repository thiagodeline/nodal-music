'use client'
import Link from 'next/link'
import {usePathname,useSearchParams} from 'next/navigation'
import {ChevronRight,Eye,ShieldCheck,Music2,UsersRound,FileSpreadsheet,CreditCard,MessageSquare,Banknote,Truck,Handshake,PanelsTopLeft,SlidersHorizontal,UserCog,Palette,BookOpenText} from 'lucide-react'
import type {AdminTab,StaffRole} from '@/lib/admin-access'
import './admin.css'
import './admin-extras.css'
import './admin-modules.css'
import './admin-dark.css'
import './admin-theme-fixes.css'
const groups=[
 {heading:'OPERACIONAL & CATÁLOGO',items:[
  {key:'releases',name:'Lançamentos',Icon:Music2,badge:'releases'},
  {key:'delivery',name:'Entregas às lojas',Icon:Truck},
  {key:'artists',name:'Artistas e contas',Icon:UsersRound}]},
 {heading:'FINANCEIRO & ROYALTIES',items:[
  {key:'royalties',name:'Importar royalties',Icon:FileSpreadsheet},
  {key:'payouts',name:'Saques e repasses',Icon:Banknote,badge:'payouts'},
  {key:'splits',name:'Divisões de royalties',Icon:Handshake}]},
 {heading:'ATENDIMENTO & CONTRATOS',items:[
  {key:'support',name:'Suporte',Icon:MessageSquare,badge:'support'},
  {key:'plans',name:'Planos da SINTONE',Icon:CreditCard}]},
 {heading:'PLATAFORMA & CONFIGURAÇÕES',items:[
  {key:'popups',name:'Popups',Icon:PanelsTopLeft},
  {key:'blog',name:'Blog',Icon:BookOpenText},
  {key:'landing',name:'Landing Page',Icon:Palette},
  {key:'dsp',name:'Plataformas e taxas',Icon:SlidersHorizontal},
  {key:'team',name:'Equipe & Cargos',Icon:UserCog}]}
] as const
type NavKey=typeof groups[number]['items'][number]['key']
const links:Partial<Record<NavKey,string>>={plans:'/admin/planos',dsp:'/admin/config-plataformas',team:'/admin/equipe',landing:'/admin/landing-page',popups:'/admin/popups',blog:'/admin/blog'}
const headings:Record<string,string>={releases:'Lançamentos',delivery:'Entregas às lojas',artists:'Artistas e contas',royalties:'Importar royalties',payouts:'Saques e Repasses',splits:'Divisões de royalties',support:'Suporte',plans:'Planos da SINTONE',popups:'Popups',blog:'Blog',landing:'Landing Page',dsp:'Plataformas e taxas',team:'Equipe & Cargos'}
const roleLabels:Record<StaffRole,string>={admin:'Administrador Geral',qc_specialist:'Analista QC',ingestion_manager:'Gestor de Ingestão',a_and_r:'A&R',royalty_financial:'Analista Financeiro',customer_success:'Atendimento',ui_designer:'Designer de Interface'}
type Counts={releases:number|null;payouts:number|null;support:number|null}
export default function AdminShell({email,children,tabs,roles,isGeneral,counts}:{email:string;children:React.ReactNode;tabs:AdminTab[];roles:StaffRole[];isGeneral:boolean;counts:Counts}){
 const pathname=usePathname(),params=useSearchParams()
 const active=pathname.startsWith('/admin/blog')?'blog':pathname.startsWith('/admin/popups')?'popups':pathname.startsWith('/admin/landing-page')?'landing':pathname.startsWith('/admin/planos')?'plans':pathname.startsWith('/admin/equipe')?'team':pathname.startsWith('/admin/config-plataformas')?'dsp':params.get('tab')||tabs[0]||'releases'
 const overview=pathname==='/admin'&&!params.has('tab')
 const role=isGeneral?'Administrador Geral':roles.map(x=>roleLabels[x]).join(' · ')
 const allow=(key:NavKey)=>key==='blog'?isGeneral:key==='popups'?isGeneral:key==='landing'?isGeneral||roles.includes('ui_designer'):key==='team'||key==='plans'?isGeneral:tabs.includes(key as AdminTab)
 const colors:Record<string,string>={releases:'amber',payouts:'green',support:'red'}
 return <div className="sa">
  <aside className="sa-sidebar sa-sidebar-modular">
   <Link href="/admin" className="sa-brand"><img src="/sintone-logo.svg" alt="SINTONE"/></Link>
   <span className="sa-sidebar-label">CENTRAL ADMINISTRATIVA</span>
   <nav aria-label="Navegação administrativa">{groups.map(group=>{
    const items=group.items.filter(i=>allow(i.key))
    return items.length?<section className="sa-nav-module" key={group.heading}><h2 className="sa-module-label">{group.heading}</h2>
     {items.map(({key,name,Icon,...extra})=>{
      const count='badge'in extra&&extra.badge?counts[extra.badge as keyof Counts]:null
      return <Link key={key} href={links[key]||'/admin?tab='+key} aria-current={active===key?'page':undefined} className={'sa-mod-link '+(active===key?'sa-nav-active':'')}>
       <Icon size={17}/><span>{name}</span>{count!==null&&count>0&&<strong className={'sa-nav-badge sa-nav-badge-'+colors[key]} aria-label={count+' pendências'}>{count>99?'99+':count}</strong>}</Link>
     })}</section>:null
   })}</nav>
   <div className="sa-sidebar-user"><ShieldCheck size={18}/><div><strong>{role}</strong><small title={email}>{email}</small></div></div>
  </aside>
  <div className="sa-main">
   <header className="sa-header sa-context-header"><div className="sa-header-context">
    <div className="sa-crumb"><Link href="/">SINTONE</Link><ChevronRight size={14}/><Link href="/admin">Administração</Link>{!overview&&<><ChevronRight size={14}/><span>{headings[active]}</span></>}</div>
    {!overview&&<><h1>{headings[active]||'Administração'}</h1><p className="sa-context-subtitle">Gerencie esta seção com as permissões do seu cargo.</p></>}</div>
    <div className="sa-header-actions"><span className="sa-role-badge"><ShieldCheck size={15}/>{role}</span><Link href="/" className="sa-view-site"><Eye size={16}/> Ver site</Link></div>
   </header>{children}
  </div>
 </div>
}
