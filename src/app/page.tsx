import Link from 'next/link'
const nodes = [[60,70],[300,40],[340,190],[210,290],[40,250],[170,160]]
export default function Home() {
  return (<>
    <div className="wrap">
      <header className="nav">
        <img src="/logo.png" alt="Nodal Music" />
        <nav><a href="#como">Como funciona</a><Link className="btn sm" href="/login">Entrar</Link></nav>
      </header>
      <section className="hero">
        <div>
          <h1>Sua música em todas as plataformas. Seu dinheiro, às claras.</h1>
          <p>A Nodal distribui seus lançamentos no Spotify, Apple Music, YouTube Music e outras lojas, e mostra no seu painel quanto cada stream rendeu.</p>
          <div className="row"><Link className="btn" href="/login?novo=1">Criar conta de artista</Link><a className="btn ghost" href="#como">Ver como funciona</a></div>
        </div>
        <svg className="net" viewBox="0 0 400 330" role="img" aria-label="Rede de plataformas conectadas a um ponto central">
          {nodes.map(([x, y], i) => <line key={'l'+i} x1={x} y1={y} x2={200} y2={165} />)}
          {nodes.map(([x, y], i) => <circle key={'c'+i} cx={x} cy={y} r={12} />)}
          <circle className="hub" cx={200} cy={165} r={22} />
        </svg>
      </section>
    </div>
    <section className="sec" id="como"><div className="wrap">
      <h2>Do arquivo de áudio ao primeiro pagamento</h2>
      <ol className="steps">
        <li><b>Envie sua faixa</b><span>Suba o áudio e a capa pelo painel e escolha a data de lançamento.</span></li>
        <li><b>Nós revisamos e publicamos</b><span>Nossa equipe confere os arquivos e leva o lançamento às lojas.</span></li>
        <li><b>Acompanhe e receba</b><span>Veja streams e receita por plataforma e peça o saque por Pix.</span></li>
      </ol>
    </div></section>
    <section className="sec"><div className="wrap cols">
      <div><h3>Relatórios que você entende</h3><p>Streams e receita separados por plataforma e por mês, sem planilha confusa.</p></div>
      <div><h3>Saque quando quiser</h3><p>Seu saldo fica visível o tempo todo. Peça o saque e acompanhe o status no painel.</p></div>
    </div></section>
    <div className="wrap"><footer className="foot">© {new Date().getFullYear()} Nodal Music</footer></div>
  </>)
}
