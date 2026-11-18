export const BLOG_CATEGORIES=['Comparativos','Direitos Autorais','Marketing Musical','Tutoriais','Mercado Musical'] as const
export type BlogCategory=typeof BLOG_CATEGORIES[number]
export type BlogPost={
 id:string;title:string;slug:string;summary:string;content:string;cover_image:string|null;
 category:BlogCategory;tags:string[];author_name:string;status:'DRAFT'|'PUBLISHED';
 views_count:number;seo_title:string;seo_description:string;focus_keywords:string[];
 canonical_url:string|null;is_indexable:boolean;published_at:string|null;created_at:string;updated_at:string
}
export const BLOG_SITE='https://sintone.com.br'
export const blogDate=(value:string|null)=>value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}):'Não publicado'
export const readMinutes=(content:string)=>Math.max(1,Math.ceil(content.trim().split(/\s+/).filter(Boolean).length/210))
export function slugify(input:string){return input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160).replace(/-$/,'')}
export function isBlogImage(value:string|null|undefined){
 if(!value)return false
 try{const u=new URL(value),origin=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://jklitdqichsuymgspvbe.supabase.co')
  return u.origin===origin.origin&&u.search===''&&u.hash===''&&/^\/storage\/v1\/object\/public\/public-assets\/blog\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(u.pathname)
 }catch{return false}
}
export function blogCanonical(value:string|null|undefined,slug:string){
 if(!value)return BLOG_SITE+'/blog/'+slug
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='sintone.com.br'&&u.pathname.startsWith('/blog/')?u.toString():BLOG_SITE+'/blog/'+slug}
 catch{return BLOG_SITE+'/blog/'+slug}
}
