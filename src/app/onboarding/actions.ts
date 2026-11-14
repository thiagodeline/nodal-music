'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile, type DbErr } from '@/lib/profile'
import { onboardingSchema, digits, normCnpj, normPhone, type OnboardingValues } from '@/lib/onboarding'

type Debug = { step: string; code?: string; message: string; details?: string | null; hint?: string | null }
export type OnboardingResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<keyof OnboardingValues, string>>; debug?: Debug }

function fail(step: string, e: DbErr, error: string): OnboardingResult {
  console.error('Erro detalhado Supabase:', step, e) // aparece nos logs da Vercel
  return { ok: false, error, debug: { step, code: e.code, message: e.message, details: e.details, hint: e.hint } } // e no console do navegador
}

export async function completeOnboarding(input: unknown): Promise<OnboardingResult> {
  try {
    const parsed = onboardingSchema.safeParse(input) // valida de novo no servidor (data DD/MM/AAAA vira AAAA-MM-DD)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof OnboardingValues, string>> = {}
      parsed.error.issues.forEach(i => { const k = i.path[0] as keyof OnboardingValues; if (k && !fieldErrors[k]) fieldErrors[k] = i.message })
      return { ok: false, error: 'Confira os campos destacados.', fieldErrors }
    }
    const v = parsed.data
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { ok: false, error: 'Sua sessão expirou. Entre novamente.' }

    const p = await ensureProfile(sb, user) // cria a linha inicial se não existir
    if (p.error) return fail('ensureProfile', p.error, 'Não foi possível criar o seu perfil. Tente de novo ou fale com o suporte.')
    if (p.status !== 'PENDING_ONBOARDING') return { ok: false, error: 'O seu cadastro já foi concluído.' }

    const { data: saved, error } = await sb.from('profiles').update({
      account_type: v.accountType, registration_profile: v.accountType, artist_name: v.stageName, name: v.fullName, birth_date: v.birthDate, email: v.email,
      phone: normPhone(v.phone), address: v.address,                                                  // só números no telefone
      cpf: v.accountType === 'ARTIST' ? digits(v.document) : null,                                   // só números no CPF
      cnpj: v.accountType === 'LABEL' ? normCnpj(v.document) : null,
      status: 'PENDING_CONTRACT', onboarding_completed: true,
    }).eq('id', user.id).eq('status', 'PENDING_ONBOARDING').select('id')
    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Este documento já está cadastrado em outra conta.', fieldErrors: { document: 'Já cadastrado em outra conta' } }
      return fail('update', error, 'Não foi possível salvar os seus dados. Tente de novo ou fale com o suporte.')
    }
    if (!saved?.length) return fail('update', { message: 'Nenhuma linha atualizada (RLS ou status diferente de PENDING_ONBOARDING).' }, 'Não foi possível salvar os seus dados. Saia e entre de novo.')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e: any) {
    console.error('Erro detalhado (inesperado):', e)
    return { ok: false, error: 'Erro inesperado. Tente de novo.', debug: { step: 'catch', message: String(e?.message ?? e) } }
  }
}
