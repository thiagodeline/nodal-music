import {StreamingWordmark} from './StreamingLogos'
const platforms=['spotify','applemusic','tiktok','instagram','amazonmusic','youtube','tidal','deezer'] as const
export default function PlatformStrip(){
 return <section className="um-platforms" aria-label="Plataformas de streaming"><div className="um-container">
  <p className="um-platform-intro">Distribua suas músicas em <span>mais de 150 plataformas de streaming renomadas</span></p>
  <div className="um-platform-list w-full max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-14 lg:gap-16 py-8 px-4">{platforms.map(slug=><div key={slug} className="um-platform flex items-center justify-center min-w-[120px] md:min-w-[160px]">
   <StreamingWordmark slug={slug}/>
  </div>)}</div>
 </div></section>
}
