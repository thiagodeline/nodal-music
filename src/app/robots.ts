import type {MetadataRoute} from 'next'
export default function robots():MetadataRoute.Robots{
 return {
  rules:[{
   userAgent:'*',
   allow:'/',
   disallow:['/admin','/dashboard','/onboarding','/api','/auth','/login','/register','/notificacoes','/novo-lancamento']
  }],
  sitemap:'https://sintone.com.br/sitemap.xml',
  host:'https://sintone.com.br'
 }
}
