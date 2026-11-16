import type {NextConfig} from 'next'
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||''
const supabaseHostname=(()=>{
 try {return new URL(supabaseUrl).hostname}
 catch{return 'jklitdqichsuymgspvbe.supabase.co'}
})()
const nextConfig:NextConfig={
 images:{remotePatterns:[
  {protocol:'https',hostname:supabaseHostname,pathname:'/storage/v1/object/public/covers/**'}
 ]}
}
export default nextConfig
