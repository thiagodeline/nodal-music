'use client'
import { createClient } from '@/lib/supabase/client'
export default function SignOut() {
  return <button className="side-out" onClick={async () => { await createClient().auth.signOut(); location.href = '/' }}>Sair</button>
}
