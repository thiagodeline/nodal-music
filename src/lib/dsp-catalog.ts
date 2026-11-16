export const DSP = ["7Digital","Amazon","Ami","Anghami","Apple Music","AWA","Beatport","Bmat","Boomplay","Bugs!","Deezer","Dreamus Company (Flo)","Fizy","FLO Music","Genie Music","Gracenote","Hungama","iHeart Radio US","iHeartRadio","iMusica","Instagram","Jaxsta Music","JioSaavn","Joox","KKBox","KKBOXMY","Kuack Media","Kuaishou","LINE Music","Lyricfind","Meplaylist","Mixcloud","Muska","Napster","Naver","Naver Vibe","Nuuday A/S","Pandora","Peloton","Phononet","Pretzel Rocks","Qobuz","Resso","Snap","Soundcloud","Spotify","Spotify Discovery Mode","Tencent","Tidal","TikTok","Touchtunes","Trebel","United Media Agency (Uma)","Xite","Yandex Music","Youtube Music","Zvooq"] as const
export type Store=(typeof DSP)[number]
// Instagram é a única entrada Meta canônica; antigas variações Facebook foram migradas.
export const META_STORES=['Instagram'] as const
export const isMetaStore=(name:string)=>name==='Instagram'
