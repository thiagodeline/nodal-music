import {StreamingWordmark} from './StreamingLogos'
const platforms=['spotify','applemusic','tiktok','instagram','amazonmusic','youtube','tidal','deezer'] as const
export default function PlatformStrip(){
 return <section className="um-platforms" aria-label="Plataformas de streaming"><div className="um-container">
  <p className="um-platform-intro">Distribua suas músicas em <span>mais de 150 plataformas de streaming renomadas</span></p>
  <div className="um-platform-list w-full max-w-[1300px] mx-auto flex items-center justify-center flex-nowrap gap-4 md:gap-6 lg:gap-8 overflow-x-auto md:overflow-visible py-4 px-2">{platforms.map(slug=><div key={slug} className="um-platform flex shrink-0 items-center justify-center">
   <StreamingWordmark slug={slug}/>
  </div>)}</div>
 </div></section>
}
