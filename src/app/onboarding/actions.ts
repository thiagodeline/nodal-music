'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/profile'
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

    // 1) se o perfil não existir, cria a linha inicial (PENDING_ONBOARDING)
    if (await ensureProfile(sb, user)) return { ok: false, error: 'Não foi possível criar o seu perfil. Tente de novo ou fale com o suporte.' }

    // 2) só quem ainda não concluiu o onboarding pode salvar
    const { data: me } = await sb.from('profiles').select('status').eq('id', user.id).maybeSingle()
    if (!me) return { ok: false, error: 'Não foi possível acessar o seu perfil. Saia e entre de novo.' }
    if (me.status !== 'PENDING_ONBOARDING') return { ok: false, error: 'O seu cadastro já foi concluído.' }

    // 3) grava tudo e muda o status (upsert pelo id da sessão)
    const { data: saved, error } = await sb.from('profiles').upsert({
      id: user.id, account_type: v.accountType, artist_name: v.stageName, name: v.fullName, birth_date: v.birthDate, email: v.email, phone: normPhone(v.phone), address: v.address,
      cpf: v.accountType === 'ARTIST' ? digits(v.document) : null, cnpj: v.accountType === 'LABEL' ? normCnpj(v.document) : null,
      status: 'PENDING_CONTRACT', onboarding_completed: true,
    }, { onConflict: 'id' }).select('id')
    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Este documento já está cadastrado em outra conta.', fieldErrors: { document: 'Já cadastrado em outra conta' } }
      return { ok: false, error: 'Não foi possível salvar agora. Tente de novo em instantes.' }
    }
    if (!saved?.length) return { ok: false, error: 'Nada foi salvo. Saia e entre de novo.' }
    revalidatePath('/dashboard')
    return { ok: true }
  } catch {
    return { ok: false, error: 'Erro inesperado. Tente de novo.' }
  }
}
