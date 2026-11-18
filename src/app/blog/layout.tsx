import type {Metadata} from 'next'
import BlogHeader from '@/components/blog/BlogHeader'
import '@/components/blog/blog.css'
export const metadata:Metadata={title:{default:'Blog | SINTONE',template:'%s | Blog SINTONE'},description:'Tutoriais, comparativos, direitos autorais e estratégias para artistas independentes.'}
export default function Layout({children}:{children:React.ReactNode}){
 return <div className="sb-site"><BlogHeader/>{children}<footer className="sb-footer"><div className="sb-wrap"><strong>SINTONE / CONHECIMENTO INDEPENDENTE.</strong><p>Conteúdo informativo para artistas e profissionais da música.</p><div><a href="/">INÍCIO</a><a href="/register">CRIAR CONTA</a><a href="/privacidade">PRIVACIDADE</a></div><small>© {new Date().getFullYear()} SINTONE.</small></div></footer></div>
}
