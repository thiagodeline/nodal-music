import Link from 'next/link'
import Image from 'next/image'
import '@/app/landing.css'
import './legal.css'
import { CO, type Sec } from '@/lib/legal'

function body(lines: string[]) {
  const out: React.ReactNode[] = []; let li: string[] = []
  const flush = () => { if (li.length) { out.push(<ul key={out.length}>{li.map((x, i) => <li key={i}>{x}</li>)}</ul>); li = [] } }
  lines.forEach(l => { if (l.startsWith('- ')) li.push(l.slice(2)); else { flush(); out.push(<p key={out.length}>{l}</p>) } })
  flush(); return out
}
export default function LegalPage({ title, sections }: { title: string; sections: Sec[] }) {
  return (<>
    <header className="l-head"><div className="wrap l-bar">
      <Link href="/" aria-label="SINTONE — Página inicial"><Image src="/sintone-logo.svg" width={155} height={44} alt="SINTONE" priority /></Link>
      <div className="l-act"><Link className="btn ghost sm" href="/">Voltar ao site</Link></div>
    </div></header>
    <main className="legal">
      <h1>{title}</h1>
      <p className="lg-meta">Versão {CO.versao}, atualizada em {CO.data}.</p>
      {sections.map(([h, ...p], i) => <section key={i}><h2>{i + 1}. {h}</h2>{body(p)}</section>)}
    </main>
  </>)
}
