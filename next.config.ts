import type {NextConfig} from 'next'
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||''
const supabaseHostname=(()=>{
 try {return new URL(supabaseUrl).hostname}
 catch{return 'jklitdqichsuymgspvbe.supabase.co'}
})()
const nextConfig:NextConfig={
 async redirects(){
  return [
   {source:'/:path*',has:[{type:'host',value:'nodalmusic.com.br'}],destination:'https://sintone.com.br/:path*',permanent:true},
   {source:'/:path*',has:[{type:'host',value:'www.nodalmusic.com.br'}],destination:'https://sintone.com.br/:path*',permanent:true},
  ]
 },
 images:{remotePatterns:[
  {protocol:'https',hostname:supabaseHostname,pathname:'/storage/v1/object/public/covers/**'}
 ]}
}
export default nextConfig
