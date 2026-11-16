export type LandingConfig = {
 announcement_active:boolean; announcement_text:string; announcement_link:string;
 hero_title:string; hero_subtitle:string; hero_cta_text:string; hero_cta_url:string;
 pricing_badge:string; pricing_title:string; pricing_price:string; pricing_subtitle:string;
 pricing_features:string[]; faq_items:{q:string;a:string}[]; dsp_enabled:string[];
 hero_image_url:string|null
}
export const DEFAULT_LANDING:LandingConfig={
 announcement_active:false,announcement_text:'🚀 Distribuição rápida para +64 plataformas de streaming',announcement_link:'/register',
 hero_title:'Envie sua música para mais de 50 plataformas de streaming!',hero_subtitle:'Distribuidora digital 100% brasileira.',
 hero_cta_text:'Criar conta grátis',hero_cta_url:'/register',pricing_badge:'Plano Gratuito',pricing_title:'Grátis',
 pricing_price:'R$ 0,00',pricing_subtitle:'Sem mensalidade ou taxa de adesão',
 pricing_features:['Painel do artista com estatísticas','Acompanhamento de lançamentos em tempo real','Relatórios detalhados de royalties','Solicitação de saques via Pix'],
 faq_items:[{q:'O serviço é gratuito?',a:'Você pode cadastrar sua conta sem mensalidade. Confira os limites e condições do plano antes de enviar seu lançamento.'},{q:'Quanto tempo demora o lançamento?',a:'Recomendamos enviar com antecedência para revisão e entrega às lojas. O prazo final depende de cada plataforma.'}],
 dsp_enabled:['spotify','applemusic','youtubemusic','tiktok','deezer','tidal','amazonmusic','instagram'],hero_image_url:null
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
 return {...DEFAULT_LANDING,...v,pricing_features:features,faq_items:faqs,dsp_enabled:dsps}
}
