'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { onboardingSchema, digits, normCnpj, normPhone, type OnboardingValues } from '@/lib/onboarding'

export type OnboardingResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<keyof OnboardingValues, string>> }

export async function completeOnboarding(input: unknown): Promise<OnboardingResult> {
  try {
    const parsed = onboardingSchema.safeParse(input) // valida de novo no servidor: nunca confie só no formulário
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof OnboardingValues, string>> = {}
      parsed.error.issues.forEach(i => { const k = i.path[0] as keyof OnboardingValues; if (k && !fieldErrors[k]) fieldErrors[k] = i.message })
      return { ok: false, error: 'Confira os campos destacados.', fieldErrors }
    }
    const v = parsed.data
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { ok: false, error: 'Sua sessão expirou. Entre novamente.' }
    const { data: me, error: e0 } = await sb.from('profiles').select('status').eq('id', user.id).single()
    if (e0 || !me) return { ok: false, error: 'Não encontramos o seu perfil. Saia e entre de novo.' }
    if (me.status !== 'PENDING_ONBOARDING') return { ok: false, error: 'O seu cadastro já foi concluído.' }
    const { error } = await sb.from('profiles').update({
      account_type: v.accountType, artist_name: v.stageName, name: v.fullName, birth_date: v.birthDate, email: v.email, phone: normPhone(v.phone), address: v.address,
      cpf: v.accountType === 'ARTIST' ? digits(v.document) : null, cnpj: v.accountType === 'LABEL' ? normCnpj(v.document) : null, status: 'PENDING_CONTRACT',
    }).eq('id', user.id).eq('status', 'PENDING_ONBOARDING')
    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Este documento já está cadastrado em outra conta.', fieldErrors: { document: 'Já cadastrado em outra conta' } }
      return { ok: false, error: 'Não foi possível salvar agora. Tente de novo em instantes.' }
    }
    revalidatePath('/dashboard')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Erro inesperado. Tente de novo.' }
  }
}
