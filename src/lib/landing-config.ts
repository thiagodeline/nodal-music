export type HeroBanner={image_url:string;title:string;subtitle:string;button_text:string;button_url:string}
export type LandingConfig = {
 announcement_active:boolean; announcement_text:string; announcement_link:string;
 hero_title:string; hero_subtitle:string; hero_cta_text:string; hero_cta_url:string;
 pricing_badge:string; pricing_title:string; pricing_price:string; pricing_subtitle:string;
 pricing_features:string[]; faq_items:{q:string;a:string}[]; dsp_enabled:string[];
 hero_image_url:string|null;hero_banners:HeroBanner[];social_links:{instagram?:string;youtube?:string;tiktok?:string}
}
export const DEFAULT_LANDING:LandingConfig={
 announcement_active:false,announcement_text:'🚀 Distribuição rápida para +64 plataformas de streaming',announcement_link:'/register',
 hero_title:'Envie sua música para mais de 50 plataformas de streaming!',hero_subtitle:'Distribuidora digital 100% brasileira.',
 hero_cta_text:'Criar conta grátis',hero_cta_url:'/register',pricing_badge:'Plano Gratuito',pricing_title:'Grátis',
 pricing_price:'R$ 0,00',pricing_subtitle:'Sem mensalidade ou taxa de adesão',
 pricing_features:['Painel do artista com estatísticas','Acompanhamento de lançamentos em tempo real','Relatórios detalhados de royalties','Solicitação de saques via Pix'],
 faq_items:[{q:'O serviço é gratuito?',a:'Você pode cadastrar sua conta sem mensalidade. Confira os limites e condições do plano antes de enviar seu lançamento.'},{q:'Quanto tempo demora o lançamento?',a:'Recomendamos enviar com antecedência para revisão e entrega às lojas. O prazo final depende de cada plataforma.'}],
 dsp_enabled:['spotify','applemusic','youtubemusic','tiktok','deezer','tidal','amazonmusic','instagram'],hero_image_url:null,hero_banners:[],social_links:{}
}
export const DSP_CHOICES=[
 {slug:'spotify',name:'Spotify'},{slug:'applemusic',name:'Apple Music'},{slug:'youtubemusic',name:'YouTube Music'},
 {slug:'tiktok',name:'TikTok'},{slug:'deezer',name:'Deezer'},{slug:'tidal',name:'TIDAL'},
 {slug:'amazonmusic',name:'Amazon Music'},{slug:'instagram',name:'Instagram'}
] as const
export function normalizeLanding(input:Partial<LandingConfig>|null|undefined):LandingConfig{
 const v=input||{}
 const features=Array.isArray(v.pricing_features)?v.pricing_features.filter(x=>typeof x==='string'):DEFAULT_LANDING.pricing_features
 const faqs=Array.isArray(v.faq_items)?v.faq_items.filter(x=>x&&typeof x.q==='string'&&typeof x.a==='string'):DEFAULT_LANDING.faq_items
 const dsps=Array.isArray(v.dsp_enabled)?v.dsp_enabled.filter(x=>DSP_CHOICES.some(d=>d.slug===x)):DEFAULT_LANDING.dsp_enabled
 const fallbackTitle=DEFAULT_LANDING.hero_title
 const banners:HeroBanner[]=Array.isArray(v.hero_banners)?v.hero_banners.slice(0,6).flatMap((x:unknown)=>{
  if(typeof x==='string')return [{image_url:x,title:fallbackTitle,subtitle:DEFAULT_LANDING.hero_subtitle,button_text:DEFAULT_LANDING.hero_cta_text,button_url:'/register'}]
  if(!x||typeof x!=='object'||Array.isArray(x))return []
  const raw=x as Record<string,unknown>
  if(typeof raw.image_url!=='string')return []
  return [{image_url:raw.image_url,title:typeof raw.title==='string'?raw.title:fallbackTitle,
   subtitle:typeof raw.subtitle==='string'?raw.subtitle:'',button_text:typeof raw.button_text==='string'?raw.button_text:'',
   button_url:typeof raw.button_url==='string'?raw.button_url:''}]
 }):v.hero_image_url?[{image_url:v.hero_image_url,title:fallbackTitle,subtitle:'',button_text:'',button_url:''}]:[]
 const socialRaw:Record<string,unknown>=v.social_links&&typeof v.social_links==='object'&&!Array.isArray(v.social_links)?v.social_links:{}
 const domains:Record<string,string[]>={instagram:['instagram.com','www.instagram.com'],youtube:['youtube.com','www.youtube.com','youtu.be'],tiktok:['tiktok.com','www.tiktok.com']}
 const socials:Record<string,string>={}
 for(const key of Object.keys(domains)){const raw=socialRaw[key];if(typeof raw!=='string')continue
  try{const url=new URL(raw);if(url.protocol==='https:'&&domains[key].includes(url.hostname)&&!url.username&&!url.password)socials[key]=url.toString()}catch{}
 }
 return {...DEFAULT_LANDING,...v,pricing_features:features,faq_items:faqs,dsp_enabled:dsps,hero_banners:banners,social_links:socials}
}
