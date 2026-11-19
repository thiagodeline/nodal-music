import Link from 'next/link'
import Image from 'next/image'

export default function BlogHeader() {
  return (
    <header className="sb-header sticky top-0 z-50 border-b border-slate-200/80 bg-white">
      <div className="sb-wrap sb-header-inner">
        <Link href="/" aria-label="SINTONE — Página inicial" className="sb-header-logo">
          <Image src="/sintone-logo.svg" width={166} height={46} alt="SINTONE" priority />
        </Link>
        <nav className="sb-header-auth" aria-label="Acesso à SINTONE">
          <Link href="/login" className="sb-login">ENTRAR</Link>
          <Link href="/register" className="sb-signup">CRIAR CONTA</Link>
        </nav>
      </div>
    </header>
  )
}
