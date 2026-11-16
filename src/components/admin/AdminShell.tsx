'use client'
import Link from 'next/link'
import {usePathname,useSearchParams} from 'next/navigation'
import {ChevronRight,Eye,ShieldCheck,Music2,UsersRound,FileSpreadsheet,CreditCard,MessageSquare,Banknote,Truck,Handshake,ImageIcon,SlidersHorizontal,UserCog} from 'lucide-react'
import type {AdminTab} from '@/lib/admin-access'
import './admin.css'
import './admin-extras.css'
const nav=[
 {key:'releases',name:'Lançamentos',Icon:Music2},
 {key:'artists',name:'Artistas e contas',Icon:UsersRound},
 {key:'royalties',name:'Importar royalties',Icon:FileSpreadsheet},
 {key:'plans',name:'Planos',Icon:CreditCard},
 {key:'banners',name:'Banners promocionais',Icon:ImageIcon},
 {key:'landing',name:'Landing Page',Icon:ImageIcon},
 {key:'dsp',name:'Plataformas e taxas',Icon:SlidersHorizontal},
 {key:'support',name:'Suporte',Icon:MessageSquare},
 {key:'payouts',name:'Saques e repasses',Icon:Banknote},
 {key:'splits',name:'Divisões de royalties',Icon:Handshake},
 {key:'delivery',name:'Entregas às lojas',Icon:Truck},
 {key:'team',name:'Equipe & Cargos',Icon:UserCog}
] as const
export default function AdminShell({email,children,tabs,isGeneral}:{email:string;children:React.ReactNode;tabs:AdminTab[];isGeneral:boolean}){
 const pathname=usePathname(),search=useSearchParams()
 const active=pathname.startsWith('/admin/landing-page')?'landing':pathname.startsWith('/admin/planos')?'plans':pathname.startsWith('/admin/equipe')?'team':pathname.startsWith('/admin/config-plataformas')?'dsp':search.get('tab')||'releases'
 return <div className="sa">
  <aside className="sa-sidebar">
   <Link href="/" className="sa-brand"><img src="/sintone-logo.svg" alt="SINTONE"/></Link>
   <span className="sa-sidebar-label">ÁREA RESTRITA</span>
   <nav aria-label="Navegação administrativa">
    {nav.filter(x=>x.key==='landing'?isGeneral:tabs.includes(x.key)).map(({key,name,Icon})=><Link key={key} href={key==='plans'?'/admin/planos':key==='dsp'?'/admin/config-plataformas':key==='team'?'/admin/equipe':key==='landing'?'/admin/landing-page':'/admin?tab='+key}
      aria-current={active===key?'page':undefined} className={active===key?'sa-nav-active':''}>
      <Icon size={18}/>{name}</Link>)}
   </nav>
   <div className="sa-sidebar-user"><ShieldCheck size={18}/><div className="min-w-0">
    <strong>{isGeneral?'Administrador geral':'Equipe SINTONE'}</strong><small className="truncate text-xs text-slate-500" title={email}>{email}</small>
   </div></div>
  </aside>
  <div className="sa-main">
   <header className="sa-header"><div className="sa-crumb">SINTONE <ChevronRight size={15}/> Administração</div>
    <Link href="/" className="sa-view-site"><Eye size={16}/> Ver site</Link></header>
   {children}
  </div>
 </div>
}
