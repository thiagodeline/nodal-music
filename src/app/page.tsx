import Link from 'next/link'
import './landing.css'
import '@/components/legal.css'

const stores = ['Spotify', 'Apple Music', 'YouTube Music', 'Deezer', 'TikTok', 'Instagram', 'SoundCloud', 'Amazon Music']
const bars = [38, 52, 44, 70, 62, 88, 76]
const pains = [
  ['Suporte que some', 'Você manda mensagem e espera dias por uma resposta genérica.'],
  ['Relatório que ninguém entende', 'Planilhas gigantes que não mostram de onde veio o dinheiro.'],
  ['Contrato que prende', 'Regras confusas e pouca clareza sobre o que é seu.'],
]
const tools = [
  ['Relatórios por loja e por mês', 'Veja quantos streams e quanto cada plataforma rendeu, sem abrir planilha.'],
  ['Envio de lançamento em minutos', 'Suba o áudio e a capa, escolha a data e acompanhe a análise.'],
  ['Saque por Pix', 'Seu saldo fica sempre visível. Peça o saque e veja o status no painel.'],
  ['Status em tempo real', 'Em análise, aprovado ou no ar: você sabe em que etapa cada faixa está.'],
]
const faq = [
  ['O que é a Nodal Music?', 'Uma distribuidora que leva a sua música às principais plataformas de streaming e mostra os resultados em um painel simples.'],
  ['Como eu recebo meus royalties?', 'O saldo aparece no seu painel. Quando quiser, você pede o saque informando sua chave Pix e acompanha o pagamento por lá.'],
  ['Preciso ter um selo para distribuir?', 'Não. Artistas independentes podem criar a conta e enviar os lançamentos sozinhos.'],
  ['Quanto tempo leva para minha música entrar no ar?', 'Depois que a nossa equipe aprova os arquivos, o envio às lojas começa. O prazo final depende de cada plataforma.'],
  ['Que arquivos eu preciso enviar?', 'O áudio em WAV ou FLAC e uma capa em JPG ou PNG, no tamanho 3000×3000.'],
]

export default function Home() {
  return (<>
    <header className="l-head"><div className="wrap l-bar">
      <Link href="/"><img src="/logo.png" alt="Nodal Music" /></Link>
      <nav className="l-links"><a href="#recursos">Recursos</a><a href="#como">Como funciona</a><a href="#faq">Perguntas</a></nav>
      <div className="l-act"><Link className="btn ghost sm" href="/login">Entrar</Link><Link className="btn sm" href="/login?novo=1">Criar conta</Link></div>
    </div></header>

    <main>
      <section className="wrap l-hero">
        <div>
          <p className="l-pill">Para artistas e selos independentes</p>
          <h1>Sua música no ar, com dados claros e gente do seu lado.</h1>
          <p className="l-sub">A Nodal distribui seus lançamentos nas maiores plataformas e mostra, em um painel simples, quanto cada stream rendeu.</p>
          <div className="l-row"><Link className="btn" href="/login?novo=1">Criar conta grátis</Link><a className="btn ghost" href="#como">Ver como funciona</a></div>
        </div>
        <div className="l-mock" aria-label="Exemplo ilustrativo do painel do artista">
          <div className="l-mock-top"><span>Saldo disponível</span><em>Exemplo ilustrativo</em></div>
          <strong>R$ 1.280,40</strong>
          <div className="l-bars">{bars.map((h, i) => <i key={i} style={{ height: h + '%' }} />)}</div>
          <ul><li><span>Spotify</span><b>62%</b></li><li><span>Apple Music</span><b>21%</b></li><li><span>YouTube Music</span><b>17%</b></li></ul>
        </div>
      </section>

      <div className="l-marq" aria-label="Plataformas de distribuição"><div>{[...stores, ...stores].map((s, i) => <span key={i}>{s}</span>)}</div></div>

      <section className="wrap l-split">
        <div><h2>Distribuição rápida, sem perder o timing do lançamento</h2>
          <p>Envie a faixa assim que ela estiver pronta. Nossa equipe revisa os arquivos e leva o lançamento às lojas, para você não perder a onda de uma música que está crescendo.</p>
          <Link className="btn" href="/login?novo=1">Enviar minha primeira faixa</Link></div>
        <div className="l-card big"><h3>Atendimento de gente de verdade</h3><p>Deu dúvida no meio do lançamento? Você fala com uma pessoa que entende de música independente, não com um robô.</p></div>
      </section>

      <section className="l-dark"><div className="wrap">
        <h2>Velhas distribuidoras, velhos problemas</h2>
        <div className="l-grid3">{pains.map(([t, d]) => <div className="l-pain" key={t}><h3>{t}</h3><p>{d}</p></div>)}</div>
        <p className="l-turn">Na Nodal, o suporte responde, o relatório é legível e o contrato é claro.</p>
      </div></section>

      <section className="wrap l-sec" id="recursos">
        <h2>Tudo que você precisa para crescer, num só painel</h2>
        <div className="l-grid2">{tools.map(([t, d]) => <div className="l-card" key={t}><h3>{t}</h3><p>{d}</p></div>)}</div>
      </section>

      <section className="l-dark" id="como"><div className="wrap">
        <h2>Do arquivo ao primeiro pagamento</h2>
        <ol className="l-steps">
          <li><b>Crie sua conta</b><span>Cadastro rápido, só com e-mail e nome artístico.</span></li>
          <li><b>Envie seu lançamento</b><span>Áudio, capa, título e data. A equipe revisa.</span></li>
          <li><b>Acompanhe e receba</b><span>Veja streams e receita e peça o saque por Pix.</span></li>
        </ol>
      </div></section>

      <section className="wrap l-sec" id="faq">
        <h2>Perguntas frequentes</h2>
        <div className="l-faq">{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>

      <section className="wrap"><div className="l-cta">
        <h2>Pronto para lançar?</h2>
        <p>Crie sua conta e envie sua primeira faixa hoje.</p>
        <Link className="btn" href="/login?novo=1">Criar conta de artista</Link>
      </div></section>
    </main>

    <footer className="wrap l-foot">
      <img src="/logo.png" alt="Nodal Music" />
      <div><nav className="l-legal" aria-label="Legal"><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link><Link href="/cookies">Cookies</Link><Link href="/reembolso">Reembolso</Link><Link href="/lgpd">Seus dados (LGPD)</Link></nav><p style={{ marginTop: 10 }}>© {new Date().getFullYear()} Nodal Music. Todos os direitos reservados.</p></div>
    </footer>
  </>)
}
