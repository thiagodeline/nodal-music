import { useMemo } from 'react'
export type AccountStatus = 'PENDING_ONBOARDING' | 'PENDING_CONTRACT' | 'ACTIVE' | 'BLOCKED'
// Só libera quando o admin aprovou o contrato: status ACTIVE e can_release_music verdadeiro.
export function useCanReleaseMusic(me: any) {
  return useMemo(() => {
    const status = (me?.status ?? 'PENDING_ONBOARDING') as AccountStatus
    return { status, canRelease: status === 'ACTIVE' && me?.can_release_music === true, pendingContract: status === 'PENDING_CONTRACT', blocked: status === 'BLOCKED' }
  }, [me])
}
