'use client'
import {Music2} from 'lucide-react'
const brands:Record<string,{slug:string;color:string}>={
 'Spotify':{slug:'spotify',color:'1DB954'},
 'Instagram':{slug:'instagram',color:'E4405F'},
 'Apple Music':{slug:'applemusic',color:'FA243C'},
 'Apple Music 1':{slug:'applemusic',color:'FA243C'},
 'Youtube Music':{slug:'youtubemusic',color:'FF0000'},
 'TikTok':{slug:'tiktok',color:'111111'},
 'Deezer':{slug:'deezer',color:'A238FF'},
 'Amazon':{slug:'amazonmusic',color:'25D1DA'},
 'Tidal':{slug:'tidal',color:'171717'},
 'Facebook':{slug:'facebook',color:'0866FF'},
 'Facebook Audio Library':{slug:'facebook',color:'0866FF'},
 'Facebook Fingerprinting':{slug:'facebook',color:'0866FF'},
 'Facebook Video':{slug:'facebook',color:'0866FF'},
 'Facebook Video Figerprint':{slug:'facebook',color:'0866FF'},
 'Beatport':{slug:'beatport',color:'01FF95'},
 'Soundcloud':{slug:'soundcloud',color:'FF5500'},
 'Pandora':{slug:'pandora',color:'224099'},
 'Napster':{slug:'napster',color:'000000'},
 'iHeartRadio':{slug:'iheartradio',color:'C6002B'},
 'iHeart Radio US':{slug:'iheartradio',color:'C6002B'},
 'Qobuz':{slug:'qobuz',color:'000000'},
 'Mixcloud':{slug:'mixcloud',color:'5000FF'},
 '7Digital':{slug:'7digital',color:'F56F10'},
 'Boomplay':{slug:'boomplay',color:'E40046'},
 'JioSaavn':{slug:'jiosaavn',color:'2BC5B4'},
 'Anghami':{slug:'anghami',color:'EA376D'},
 'LINE Music':{slug:'line',color:'06C755'},
 'Snap':{slug:'snapchat',color:'FFFC00'},
 'Shazam':{slug:'shazam',color:'0088FF'}
}
export function DspIcon({name,size=25}:{name:string;size?:number}){
 const brand=brands[name]
 return <span className="sr-dsp-symbol" aria-hidden="true" style={{width:size,height:size}}>
  {brand?<img src={'https://cdn.simpleicons.org/'+brand.slug+'/'+brand.color}
    width={size} height={size} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>:
   <Music2 size={Math.round(size*.78)} color="#64748b"/>}
 </span>
}
