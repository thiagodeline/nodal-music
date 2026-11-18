import {StreamingWordmark} from './StreamingLogos'
const platforms=['spotify','applemusic','tiktok','instagram','amazonmusic','youtube','tidal','deezer'] as const
export default function PlatformStrip(){
 return <section className="um-platforms" aria-label="Plataformas de streaming"><div className="um-container">
  <p className="um-platform-intro">Distribua suas músicas em <span>mais de 150 plataformas de streaming renomadas</span></p>
  <div className="um-platform-list">{platforms.map(slug=><div key={slug} className="um-platform">
   <StreamingWordmark slug={slug}/>
  </div>)}</div>
 </div></section>
}
