export type LandingVideo={kind:'file'|'embed';url:string}
export function parseLandingVideo(raw:string|null|undefined):LandingVideo|null{
 const value=raw?.trim()
 if(!value)return null
 try{
  const url=new URL(value)
  if(url.protocol!=='https:'||url.username||url.password)return null
  const host=url.hostname.toLowerCase()
  const origin=process.env.NEXT_PUBLIC_SUPABASE_URL
  if(origin&&url.origin===new URL(origin).origin&&
   /^\/storage\/v1\/object\/public\/landing-videos\/landing\/[a-f0-9-]{36}\.(mp4|webm)$/i.test(url.pathname)&&!url.search&&!url.hash)
    return {kind:'file',url:url.href}
  if(/^(.+\.)?youtube\.com$/.test(host)||host==='youtu.be'||host==='www.youtube-nocookie.com'){
   let id=''
   if(host==='youtu.be')id=url.pathname.slice(1)
   else if(url.pathname==='/watch')id=url.searchParams.get('v')||''
   else if(/^\/(shorts|embed)\//.test(url.pathname))id=url.pathname.split('/')[2]||''
   if(/^[A-Za-z0-9_-]{11}$/.test(id))return {kind:'embed',url:'https://www.youtube-nocookie.com/embed/'+id}
  }
  if(host==='vimeo.com'||host==='www.vimeo.com'||host==='player.vimeo.com'){
   const match=url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)
   if(match)return {kind:'embed',url:'https://player.vimeo.com/video/'+match[1]}
  }
  if(url.pathname.toLowerCase().endsWith('.mp4')||url.pathname.toLowerCase().endsWith('.webm'))
   return {kind:'file',url:url.href}
 }catch{}
 return null
}
