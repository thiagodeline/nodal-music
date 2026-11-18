import type {MetadataRoute} from 'next'
export default function robots():MetadataRoute.Robots{
 return {rules:[{userAgent:'*',allow:['/','/blog/'],disallow:['/admin/','/dashboard/','/onboarding/','/api/']}],
  sitemap:'https://sintone.com.br/sitemap.xml'}
}
