import type { SupabaseClient, User } from '@supabase/supabase-js'

// Garante que a linha do perfil existe (status PENDING_ONBOARDING). Não mexe em nada se já existir.
// Serve de rede de segurança caso o gatilho do banco tenha falhado ou a conta seja antiga.
export async function ensureProfile(sb: SupabaseClient, user: Pick<User, 'id' | 'email'>) {
  const { error } = await sb.from('profiles').upsert(
    { id: user.id, email: user.email ?? null, status: 'PENDING_ONBOARDING', onboarding_completed: false },
    { onConflict: 'id', ignoreDuplicates: true },
  )
  return error
}
