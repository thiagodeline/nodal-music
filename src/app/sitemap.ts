import type {MetadataRoute} from 'next'
import {createClient} from '@/lib/supabase/server'
import {BLOG_SITE} from '@/lib/blog'
export const dynamic='force-dynamic'
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base:MetadataRoute.Sitemap=[{url:BLOG_SITE,lastModified:new Date(),changeFrequency:'weekly',priority:1},
  {url:BLOG_SITE+'/blog',lastModified:new Date(),changeFrequency:'daily',priority:.9}]
 try{
  const sb=await createClient()
  const {data}=await sb.from('blog_posts').select('slug,updated_at').eq('status','PUBLISHED').eq('is_indexable',true).order('published_at',{ascending:false}).limit(5000)
  for(const row of data||[])base.push({url:BLOG_SITE+'/blog/'+row.slug,lastModified:new Date(row.updated_at),changeFrequency:'monthly',priority:.7})
 }catch{}
 return base
}
