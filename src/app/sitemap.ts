import type {MetadataRoute} from 'next'
import {createClient} from '@/lib/supabase/server'
import {BLOG_SITE} from '@/lib/blog'

export const dynamic='force-dynamic'
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base:MetadataRoute.Sitemap=[
  {url:BLOG_SITE,changeFrequency:'weekly',priority:1},
  {url:BLOG_SITE+'/blog',changeFrequency:'daily',priority:.9}
 ]
 try{
  const sb=await createClient()
  const {data,error}=await sb.from('blog_posts').select('slug,updated_at').eq('status','PUBLISHED')
   .eq('is_indexable',true).order('published_at',{ascending:false}).limit(5000)
  if(error) return base
  for(const row of data||[]){
   if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug))continue
   const modified=row.updated_at?new Date(row.updated_at):null
   base.push({url:BLOG_SITE+'/blog/'+row.slug,
    ...(modified&&!Number.isNaN(modified.getTime())?{lastModified:modified}:{}),
    changeFrequency:'monthly',priority:.7})
  }
 }catch{}
 return base
}
