'use client'
import Link from 'next/link'
import Image from 'next/image'
import {BarChart3,Bell,CircleHelp,Disc3,FileText,Home,LockKeyhole,LogOut,Menu,Music2,Settings,UserRound,Wallet,X,Megaphone,Users,AudioLines} from 'lucide-react'

type NavItem={key:string;label:string;icon:typeof Home;href:string;disabled?:boolean;badge?:number}
export default function ArtistSidebar({active,name,unread,open,setOpen,onLogout}:{active:string;name:string;unread:number;open:boolean;setOpen:(value:boolean)=>void;onLogout:()=>void}){
 const links:NavItem[]=[
  {key:'overview',label:'Início',icon:Home,href:'/dashboard#overview'},
  {key:'new',label:'Lançar música',icon:Music2,href:'/dashboard#new'},
  {key:'catalog',label:'Meu catálogo',icon:Disc3,href:'/dashboard#catalog'},
  {key:'drafts',label:'Rascunhos',icon:AudioLines,href:'/dashboard#drafts'},
  {key:'profiles',label:'Artistas',icon:Users,href:'/dashboard#profiles'},
  {key:'analytics',label:'Percepções / Analytics',icon:BarChart3,href:'/dashboard#analytics'},
  {key:'financial',label:'Carteira',icon:Wallet,href:'/dashboard#financial'},
  {key:'plans',label:'Exclusivo / Planos',icon:LockKeyhole,href:'/dashboard#plans'},
  {key:'promote',label:'Promova',icon:Megaphone,href:'#',disabled:true}
 ]
 const footer:NavItem[]=[
  {key:'notifications',label:'Notificações',icon:Bell,href:'/dashboard#notifications',badge:unread},
  {key:'account',label:'Configurações',icon:Settings,href:'/dashboard#account'},
  {key:'support',label:'Ajuda / Suporte',icon:CircleHelp,href:'/dashboard#support'},
  {key:'contracts',label:'Contratos',icon:FileText,href:'/dashboard#contracts'}
 ]
 const render=(item:NavItem)=><li key={item.key}>
  {item.disabled?<span className="nd-side-link is-disabled" title={item.label+' — em breve'} aria-disabled="true"><item.icon size={20}/><span className="nd-side-label">{item.label} · EM BREVE</span></span>:
   <Link className={'nd-side-link '+(active===item.key?'is-active':'')} aria-current={active===item.key?'page':undefined}
    href={item.href} title={item.label} onClick={()=>setOpen(false)}>
    <item.icon size={20}/><span className="nd-side-label">{item.label}</span>
    {item.badge? <span className="nd-side-counter">{item.badge>99?'99+':item.badge}</span>:null}</Link>}
 </li>
 return <>
  <button className="nd-mobile-menu" type="button" onClick={()=>setOpen(!open)} aria-label={open?'Fechar menu':'Abrir menu'} aria-controls="nd-sidebar" aria-expanded={open}>{open?<X size={22}/>:<Menu size={22}/>}</button>
  {open&&<button className="nd-side-scrim" onClick={()=>setOpen(false)} aria-label="Fechar navegação"/>}
  <aside className={'nd-premium-sidebar '+(open?'is-open':'')} id="nd-sidebar" aria-label="Menu do artista">
   <div className="nd-sidebar-brand"><Link href="/dashboard#overview" onClick={()=>setOpen(false)} aria-label="Ir ao início do painel"><Image src="/sintone-icon.svg" width={31} height={31} alt="SINTONE"/></Link>
    <span className="nd-side-brand-name">SINTONE</span>
   </div>
   <div className="nd-side-identity"><span className="nd-side-avatar"><UserRound size={20}/></span><div className="nd-side-identity-copy"><strong>{name||'ARTISTA'}</strong><small>PAINEL DO ARTISTA</small></div></div>
   <nav aria-label="Navegação principal do artista"><ul>{links.map(render)}</ul></nav>
   <div className="nd-side-bottom"><nav aria-label="Conta e suporte"><ul>{footer.map(render)}</ul></nav>
    <Link className="nd-side-link nd-terms-link" href="/termos" title="Termos de uso" onClick={()=>setOpen(false)}><FileText size={20}/><span className="nd-side-label">Termos de uso</span></Link>
    <button type="button" className="nd-side-link nd-side-logout" onClick={onLogout} title="Sair"><LogOut size={20}/><span className="nd-side-label">Sair</span></button>
    <span className="nd-side-copyright">© {new Date().getFullYear()} SINTONE</span>
   </div>
  </aside>
 </>
}
