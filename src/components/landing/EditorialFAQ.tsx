const essentials=[
 {q:'O que é ISRC?',a:'É o código que identifica uma gravação específica. Ele é utilizado na identificação e no cadastro do fonograma nas plataformas.'},
 {q:'Quando recebo os royalties?',a:'Os valores dependem dos relatórios e repasses das plataformas. Quando estiverem disponíveis no seu saldo, o saque poderá ser solicitado conforme as condições aplicáveis.'},
 {q:'Quanto tempo leva para uma música ser lançada?',a:'O prazo depende da revisão dos arquivos e dos processos de cada plataforma. Recomendamos enviar com antecedência: datas não são garantidas.'},
]
export default function EditorialFAQ(){
 const faqs=essentials
 return <section id="faq" className="um-faq"><div className="um-container">
   <h2 className="um-faq-title">Perguntas frequentes sobre distribuição de música digital</h2>
   <div className="um-faq-list">{faqs.map(item=><details key={item.q}>
    <summary><strong>{item.q}</strong><span className="um-faq-plus" aria-hidden="true">+</span><span className="um-faq-minus" aria-hidden="true">−</span></summary>
    <p>{item.a}</p>
   </details>)}</div>
  </div></section>
}
