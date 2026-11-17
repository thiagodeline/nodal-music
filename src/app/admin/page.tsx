import { notFound,redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/admin-access'
import AdminPanel, { type AdminRelease, type AdminReleaseTrack, type AdminUser, type AdminContract } from '@/components/admin/AdminPanel'
import type {AdminSpotifyProfile} from '@/components/admin/AdminSpotifyProfiles'

export const metadata = { title: 'Administração | SINTONE' }
export const dynamic = 'force-dynamic'

export default async function AdminPage({searchParams}:{searchParams:Promise<{tab?:string}>}) {
  const ctx = await getAdminContext('staff')
  if (!ctx) notFound()
  const {tab}=await searchParams
  if(tab&&!ctx.tabs.includes(tab as typeof ctx.tabs[number]))notFound()
  if(tab==='team')redirect('/admin/equipe')
  if(tab==='plans')redirect('/admin/planos')
  if(tab==='dsp')redirect('/admin/config-plataformas')
  const sb = ctx.supabase
  const [profiles, releases, contracts, totalUsers, pending, approved, totalReleases, pendingPayouts] = await Promise.all([
    sb.from('profiles').select('id,name,artist_name,email,role,status,account_type,registration_profile,created_at,saldo_disponivel,phone,address,cpf,cnpj,birth_date').neq('role','admin').order('created_at',{ascending:false}).range(0,999),
    sb.from('releases').select('id,artist_id,title,type,main_artist,featured_artists,genre,subgenre,release_date,isrc,upc,composers,producers,lyricists,credits,explicit,cover_path,audio_path,status,created_at,rejection_reason,label_name,p_line,c_line,platforms,artists,delivery_status').order('created_at',{ascending:false}).range(0,999),
    sb.from('user_contracts').select('user_id,signed_name,signed_at,pdf_status').order('signed_at',{ascending:false}).range(0,999),
    sb.from('profiles').select('id',{count:'exact',head:true}).neq('role','admin'),
    sb.from('releases').select('id',{count:'exact',head:true}).eq('status','pending'),
    sb.from('releases').select('id',{count:'exact',head:true}).eq('status','approved'),
    sb.from('releases').select('id',{count:'exact',head:true}),
    sb.from('withdrawals').select('id',{count:'exact',head:true}).eq('status','pending'),
  ])
  if (profiles.error || releases.error || contracts.error || totalUsers.error || pending.error || approved.error || totalReleases.error || pendingPayouts.error) {
    throw new Error('Falha ao carregar informações administrativas. Confirme as permissões do Supabase e tente novamente.')
  }
  const [spotifyProfilesResult,releaseArtistsResult]=await Promise.all([
    sb.from('artist_profiles').select('id,owner_id,name,spotify_id,spotify_url,is_first_spotify_release').order('created_at',{ascending:false}).range(0,999),
    sb.from('release_artists').select('release_id,profile_id,name,role,spotify_id,spotify_url,is_first_spotify_release').range(0,9999)
  ])
  if(spotifyProfilesResult.error||releaseArtistsResult.error)throw new Error('Falha ao consultar os perfis Spotify da equipe.')
  const spotifyProfiles=(spotifyProfilesResult.data||[]).map(p=>({...p,role:'profile'})) as AdminSpotifyProfile[]
  const spotifyById=new Map(spotifyProfiles.map(p=>[p.id,p]))
  const participantsByRelease=new Map<string,AdminRelease['artists']>()
  for(const item of releaseArtistsResult.data||[]){
    const list=participantsByRelease.get(item.release_id)||[]
    list.push({name:item.name,role:item.role,profile_id:item.profile_id||undefined,spotify_id:item.spotify_id,spotify_url:item.spotify_url,is_first_spotify_release:item.is_first_spotify_release})
    participantsByRelease.set(item.release_id,list)
  }
  const releaseIds=(releases.data??[]).map(r=>r.id)
  const allTracks: AdminReleaseTrack[]=[]
  if(releaseIds.length){
    // A separate paginated query avoids Supabase's default 1,000-row API cap.
    for(let start=0;start<10000;start+=1000){
      const {data,error}=await sb.from('release_tracks')
        .select('id,release_id,position,title,isrc,audio_path,featured_artists,composers,producers,lyricists,credits,contributors,explicit,language')
        .order('created_at',{ascending:false}).range(start,start+999)
      if(error)throw new Error('Falha ao carregar faixas do lançamento: '+error.message)
      allTracks.push(...(data??[]))
      if((data??[]).length<1000)break
    }
  }
  const byRelease=new Map<string,AdminReleaseTrack[]>()
  for(const t of allTracks){const list=byRelease.get(t.release_id)||[];list.push(t as AdminReleaseTrack);byRelease.set(t.release_id,list)}
  for(const list of byRelease.values())list.sort((a,b)=>a.position-b.position)
  const users: AdminUser[] = (profiles.data ?? []).map(p=>({
    id:p.id,name:p.name,artist_name:p.artist_name,email:p.email,role:p.role,status:p.status,
    account_type:p.account_type,registration_profile:p.registration_profile,created_at:p.created_at,
    saldo_disponivel:Number(p.saldo_disponivel||0),phone:p.phone,address:p.address,cpf:p.cpf,cnpj:p.cnpj,birth_date:p.birth_date,
  }))
  const contractRows: AdminContract[] = (contracts.data ?? []).map(c=>({ user_id:c.user_id,signed_name:c.signed_name,signed_at:c.signed_at,pdf_status:c.pdf_status }))
  const releaseRows: AdminRelease[] = (releases.data ?? []).map(r=>({
    id:r.id,artist_id:r.artist_id,title:r.title,type:r.type,main_artist:r.main_artist,
    featured_artists:r.featured_artists,genre:r.genre,subgenre:r.subgenre,release_date:r.release_date,
    isrc:r.isrc,upc:r.upc,composers:r.composers,producers:r.producers,lyricists:r.lyricists,
    credits:r.credits,explicit:r.explicit,created_at:r.created_at,status:r.status,
    rejection_reason:r.rejection_reason,has_audio:!!r.audio_path,
    label_name:r.label_name,p_line:r.p_line,c_line:r.c_line,delivery_status:r.delivery_status||'awaiting',platforms:r.platforms||[],
    artists:participantsByRelease.get(r.id)||((r.artists||[]) as AdminRelease['artists']).map(a=>{
      const profile=a.profile_id?spotifyById.get(a.profile_id):null
      return {...a,spotify_id:profile?.spotify_id||null,spotify_url:profile?.spotify_url||null,is_first_spotify_release:!!profile?.is_first_spotify_release}
    }),tracks:byRelease.get(r.id)||[],
    cover_url: r.cover_path ? sb.storage.from('covers').getPublicUrl(r.cover_path).data.publicUrl : null,
  }))
  return <AdminPanel
    allowedTabs={ctx.tabs} isGeneral={ctx.isGeneral} canEditSpotify={ctx.isGeneral||ctx.roles.includes("a_and_r")}
    adminLabel={ctx.user.email || 'Administrador'}
    users={users}
    spotifyProfiles={spotifyProfiles}
    releases={releaseRows}
    contracts={contractRows}
    metrics={{
      users:totalUsers.count??users.length,
      pending:pending.count??0,
      approved:approved.count??0,
      total:totalReleases.count??releaseRows.length,
      payouts:pendingPayouts.count??0,
    }}
    truncatedUsers={(totalUsers.count ?? 0)>1000}
    truncatedReleases={(totalReleases.count ?? 0)>1000}
  />
}
