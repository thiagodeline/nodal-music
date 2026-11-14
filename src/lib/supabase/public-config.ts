/**
 * Low-privilege, public Supabase application configuration.
 *
 * Publishable keys are designed to be embedded in web clients and DO NOT
 * bypass Row Level Security. Never place secret/service_role keys here.
 *
 * Values defined in Vercel (NEXT_PUBLIC_SUPABASE_*) override these fallbacks.
 * The fallback makes the app usable if a new Vercel project lacks env vars.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  'https://jklitdqichsuymgspvbe.supabase.co'

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  'sb_publishable_4zKtEeJQMofr2_MU0v6s2w_8i6E8b4-'
