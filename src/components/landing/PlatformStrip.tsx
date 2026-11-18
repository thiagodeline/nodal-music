import {StreamingLogo} from './StreamingLogos'
const platforms=[['spotify','Spotify'],['applemusic','Apple Music'],['tiktok','TikTok'],['instagram','Instagram'],['amazonmusic','Amazon Music'],['youtube','YouTube'],['tidal','Tidal'],['deezer','Deezer']] as const
export default function PlatformStrip(){
 return <section className="um-platforms" aria-label="Plataformas de distribuição"><div className="um-container">
  <div className="um-platform-list">{platforms.map(([slug,name])=><div key={slug} className="um-platform"><StreamingLogo slug={slug} monochrome size={29}/><span>{name}</span></div>)}</div>
 </div></section>
}
