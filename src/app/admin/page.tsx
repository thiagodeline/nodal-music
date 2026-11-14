import { notFound } from 'next/navigation'
import { getAdminContext } from '@/lib/admin-access'
import AdminPanel, { type AdminRelease, type AdminUser, type AdminContract } from '@/components/admin/AdminPanel'

export const metadata = { title: 'Administração | SINTONE' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const ctx = await getAdminContext()
  if (!ctx) notFound()
  const sb = ctx.supabase
  const [profiles, releases, contracts, totalUsers, pending, approved, totalReleases] = await Promise.all([
    sb.from('profiles').select('id,name,artist_name,email,role,status,account_type,registration_profile,created_at').order('created_at',{ascending:false}).range(0,999),
    sb.from('releases').select('id,artist_id,title,type,main_artist,featured_artists,genre,subgenre,release_date,isrc,upc,composers,producers,lyricists,credits,explicit,cover_path,audio_path,status,created_at,rejection_reason').order('created_at',{ascending:false}).range(0,999),
    sb.from('user_contracts').select('user_id,signed_name,signed_at').order('signed_at',{ascending:false}).range(0,999),
    sb.from('profiles').select('id',{count:'exact',head:true}),
    sb.from('releases').select('id',{count:'exact',head:true}).eq('status','pending'),
    sb.from('releases').select('id',{count:'exact',head:true}).eq('status','approved'),
    sb.from('releases').select('id',{count:'exact',head:true}),
  ])
  if (profiles.error || releases.error || contracts.error || totalUsers.error || pending.error || approved.error || totalReleases.error) {
    throw new Error('Falha ao carregar informações administrativas. Confirme as permissões do Supabase e tente novamente.')
  }
  const users: AdminUser[] = (profiles.data ?? []).map(p=>({
    id:p.id,name:p.name,artist_name:p.artist_name,email:p.email,role:p.role,status:p.status,
    account_type:p.account_type,registration_profile:p.registration_profile,created_at:p.created_at,
  }))
  const contractRows: AdminContract[] = (contracts.data ?? []).map(c=>({ user_id:c.user_id,signed_name:c.signed_name,signed_at:c.signed_at }))
  const releaseRows: AdminRelease[] = (releases.data ?? []).map(r=>({
    id:r.id,artist_id:r.artist_id,title:r.title,type:r.type,main_artist:r.main_artist,
    featured_artists:r.featured_artists,genre:r.genre,subgenre:r.subgenre,release_date:r.release_date,
    isrc:r.isrc,upc:r.upc,composers:r.composers,producers:r.producers,lyricists:r.lyricists,
    credits:r.credits,explicit:r.explicit,created_at:r.created_at,status:r.status,
    rejection_reason:r.rejection_reason,has_audio:!!r.audio_path,
    cover_url: r.cover_path ? sb.storage.from('covers').getPublicUrl(r.cover_path).data.publicUrl : null,
  }))
  return <AdminPanel
    adminLabel={ctx.user.email || 'Administrador'}
    users={users}
    releases={releaseRows}
    contracts={contractRows}
    metrics={{
      users:totalUsers.count??users.length,
      pending:pending.count??0,
      approved:approved.count??0,
      total:totalReleases.count??releaseRows.length,
    }}
    truncatedUsers={(totalUsers.count ?? 0)>1000}
    truncatedReleases={(totalReleases.count ?? 0)>1000}
  />
}
