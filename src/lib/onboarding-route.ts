/**
 * Determine navigation for users with an authenticated Supabase session.
 *
 * The profile becomes PENDING_CONTRACT immediately after the data form. It
 * should never be treated as "onboarding finished" until the signed PDF is ready.
 */
export type OnboardingRouteProfile = {
  status: string | null
  onboarding_completed: boolean | null
}

export function onboardingRedirect(
  pathname: string,
  profile: OnboardingRouteProfile | null,
  contractPdfReady = false,
): string | null {
  const dataPending = !profile || profile.onboarding_completed !== true ||
    profile.status === 'PENDING_ONBOARDING'

  if (dataPending) return pathname === '/onboarding' ? null : '/onboarding'

  if (profile.status === 'PENDING_CONTRACT') {
    // The contract screen must always remain reachable, including PDF retry.
    if (pathname === '/onboarding/contract') return null
    if (pathname === '/onboarding') {
      return contractPdfReady ? '/dashboard' : '/onboarding/contract'
    }
    // Prevent bypassing an unsigned contract by visiting /dashboard directly.
    return contractPdfReady ? null : '/onboarding/contract'
  }

  // Active and approved accounts can access their signed contract for download.
  if (pathname === '/onboarding') return '/dashboard'
  return null
}
