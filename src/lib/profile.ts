import type { SupabaseClient, User } from '@supabase/supabase-js'

export type DbErr = { code?: string; message: string; details?: string | null; hint?: string | null }

// Devolve o status do perfil, criando a linha (PENDING_ONBOARDING) só se ela não existir.
// Lê primeiro: se a linha já existe, nem tenta inserir (inserir exige uma política de INSERT, mesmo com ON CONFLICT).
export async function ensureProfile(sb: SupabaseClient, user: Pick<User, 'id' | 'email'>): Promise<{ status?: string; error?: DbErr }> {
  const sel = await sb.from('profiles').select('status').eq('id', user.id).maybeSingle()
  if (sel.error) return { error: sel.error }
  if (sel.data) return { status: sel.data.status }
  const ins = await sb.from('profiles').upsert(
    { id: user.id, email: user.email ?? null, status: 'PENDING_ONBOARDING' },
    { onConflict: 'id', ignoreDuplicates: true },
  )
  if (ins.error) return { error: ins.error }
  return { status: 'PENDING_ONBOARDING' }
}
