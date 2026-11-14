import { createClient } from '@/lib/supabase/server'

// Autorizações de admin usam o JWT verificado e a linha de perfil.
// Nunca confie em user_metadata nem apenas em visibilidade de componentes.
export async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  if (user.app_metadata?.role !== 'admin') return null
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profileError || profile?.role !== 'admin') return null
  return { supabase, user }
}
