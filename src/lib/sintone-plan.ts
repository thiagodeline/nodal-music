import {DSP} from './dsp-catalog'
export type PlanInput={
 name:string;price:number;description:string;royaltyCommission:number;
 monthlyReleasesLimit:number|null;maxArtists:number;includedStores:string[];
 hasInstagramIncluded:boolean;instagramAddonFee:number;chargeExtraPlatformFees:boolean;benefits:string[];published:boolean
}
const money=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100000&&Math.round(n*100)===n*100
export function parsePlanInput(raw:unknown):PlanInput{
 if(!raw||typeof raw!=='object')throw Error('Dados inválidos')
 const o=raw as Record<string,unknown>
 const name=String(o.name||'').trim(),description=String(o.description||'').trim()
 const price=Number(o.price),royaltyCommission=Number(o.royaltyCommission),
  instagramAddonFee=Number(o.instagramAddonFee),maxArtists=Number(o.maxArtists)
 const limit=o.monthlyReleasesLimit==null?null:Number(o.monthlyReleasesLimit)
 const includedStores=o.includedStores,benefits=o.benefits
 if(name.length<2||name.length>80||description.length>500||
   !money(price)||!money(instagramAddonFee)||!Number.isFinite(royaltyCommission)||royaltyCommission<0||royaltyCommission>100||
   !Number.isInteger(maxArtists)||maxArtists<1||maxArtists>1000||
   (limit!==null&&(!Number.isInteger(limit)||limit<0||limit>100000))||
   !Array.isArray(includedStores)||includedStores.length>DSP.length||
   includedStores.some(x=>typeof x!=='string'||!(DSP as readonly string[]).includes(x))||
   new Set(includedStores).size!==includedStores.length||
   !Array.isArray(benefits)||benefits.length>20||benefits.some(x=>typeof x!=='string'||x.trim().length>160)||
   typeof o.hasInstagramIncluded!=='boolean'||typeof o.chargeExtraPlatformFees!=='boolean'||(price===0&&!o.chargeExtraPlatformFees)||typeof o.published!=='boolean')
    throw Error('Preencha preço, comissões, limites e lojas com valores válidos.')
 return {name,description,price,royaltyCommission,monthlyReleasesLimit:limit,
  maxArtists,includedStores:includedStores as string[],hasInstagramIncluded:o.hasInstagramIncluded,
  instagramAddonFee,chargeExtraPlatformFees:price===0?true:o.chargeExtraPlatformFees as boolean,benefits:benefits as string[],published:o.published}
}
export function planDbFields(p:PlanInput){
 return {name:p.name,description:p.description,price_brl:p.price,
   royalty_commission:p.royaltyCommission,monthly_releases_limit:p.monthlyReleasesLimit,
   max_artists:p.maxArtists,included_stores:p.includedStores,
   has_instagram_included:p.price===0?false:p.hasInstagramIncluded,instagram_addon_fee:p.instagramAddonFee,
   charge_extra_platform_fees:p.price===0?true:p.chargeExtraPlatformFees,
   benefits:p.benefits,published:p.published,frequency:1,frequency_type:'months',updated_at:new Date().toISOString()}
}
