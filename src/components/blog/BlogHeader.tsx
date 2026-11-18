import Link from 'next/link'
import Image from 'next/image'
export default function BlogHeader(){
 return <header className="sb-header"><div className="sb-wrap sb-header-inner">
  <Link href="/" aria-label="SINTONE, página inicial"><Image src="/sintone-logo.svg" width={164} height={43} alt="SINTONE"/></Link>
  <nav aria-label="Menu principal"><Link href="/">INÍCIO</Link><Link href="/#recursos">RECURSOS</Link><Link href="/blog" className="sb-nav-active" aria-current="page">BLOG</Link></nav>
  <div className="sb-header-auth"><Link href="/login">ENTRAR</Link><Link href="/register" className="sb-signup">CRIAR CONTA</Link></div>
 </div></header>
}
