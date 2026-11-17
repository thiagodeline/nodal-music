import {ArrowUpRight,ChevronDown} from 'lucide-react'
import Link from 'next/link'
import type {LandingConfig} from '@/lib/landing-config'
const essentials=[
 {q:'O que é ISRC?',a:'É o código que identifica uma gravação específica. Ele é utilizado na identificação e no cadastro do fonograma nas plataformas.'},
 {q:'Quando recebo os royalties?',a:'Os valores dependem dos relatórios e repasses das plataformas. Quando estiverem disponíveis no seu saldo, o saque poderá ser solicitado conforme as condições aplicáveis.'},
 {q:'Quanto tempo leva para uma música ser lançada?',a:'O prazo depende da revisão dos arquivos e dos processos de cada plataforma. Recomendamos enviar com antecedência: datas não são garantidas.'},
]
export default function EditorialFAQ({items}:{items:LandingConfig['faq_items']}){
 const faqs=[...essentials,...items.filter(item=>!essentials.some(x=>x.q.toLowerCase()===item.q.toLowerCase()))]
 return <section id="faq" className="um-faq"><div className="um-container">
  <div className="um-faq-intro"><span className="um-kicker">[ DÚVIDAS FREQUENTES ]</span><h2>SEM LETRAS MIÚDAS.<br/>SEM COMPLICAÇÃO.</h2>
   <p>O que você precisa saber antes de enviar seu próximo lançamento.</p><Link href="/register">COMEÇAR AGORA <ArrowUpRight size={18}/></Link></div>
  <div className="um-faq-list">{faqs.map((item,i)=><details key={item.q}>
   <summary><span>{String(i+1).padStart(2,'0')}</span><strong>{item.q}</strong><ChevronDown size={21}/></summary><p>{item.a}</p>
  </details>)}</div>
 </div></section>
}
