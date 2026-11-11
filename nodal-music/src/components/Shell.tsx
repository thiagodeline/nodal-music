import Link from 'next/link'
import SignOut from './SignOut'
import './shell.css'
export default function Shell({ links, children }: { links: [string, string][]; children: React.ReactNode }) {
  return (<div className="shell">
    <aside className="side">
      <Link href="/"><img src="/logo.png" alt="Nodal Music" /></Link>
      <nav>{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <SignOut />
    </aside>
    <div className="shell-main">{children}</div>
  </div>)
}
