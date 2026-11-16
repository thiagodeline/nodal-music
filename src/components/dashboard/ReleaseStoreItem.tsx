'use client'
import {DspIcon} from './DspIcon'

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export default function ReleaseStoreItem({name,checked,disabled,fee,onChange}:{
 name:string;checked:boolean;disabled?:boolean;fee?:number;onChange:(checked:boolean)=>void
}){
 const spotify=name==='Spotify'
 return <div className={'sr-store-option '+(checked?'selected':'')+(disabled?' disabled':'')}>
  <label className="sr-store-primary">
   <input type="checkbox" checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)}
    aria-label={'Distribuir para '+name}/>
   <span className="sr-store-logo"><DspIcon name={name} size={31}/></span>
   <span className="sr-store-content">
    <strong>{name}</strong>
    {spotify&&<small className="sr-store-hint">Gerencie sua presença no Spotify</small>}
   </span>
   {fee!==undefined&&<span className={'sr-store-fee '+(fee>0?'paid':'included')}>
    {fee>0?'+ '+money(fee):'Incluído'}</span>}
  </label>
  {spotify&&<a className="sr-store-help" href="https://artists.spotify.com/" target="_blank" rel="noopener noreferrer"
   onClick={e=>e.stopPropagation()}>Obtenha acesso ao Spotify for Artists</a>}
 </div>
}
