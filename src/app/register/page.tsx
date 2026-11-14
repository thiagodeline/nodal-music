'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, CircleCheck, Eye, EyeOff, Mic2, Building2, LoaderCircle, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile } from '@/lib/profile'
import './register.css'

const schema = z.object({
  fullName: z.string().trim().min(5, 'Digite seu nome e sobrenome.').max(160).refine(n => n.split(/\s+/).length > 1, 'Informe nome e sobrenome.'),
  email: z.string().trim().toLowerCase().email('Digite um e-mail válido.').max(160),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(72).regex(/[A-Za-z]/, 'Inclua pelo menos uma letra.').regex(/[0-9]/, 'Inclua pelo menos um número.'),
  confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  profile: z.enum(['artista', 'selo']),
  terms: z.boolean().refine(Boolean, 'É necessário aceitar os termos.'),
}).refine(v => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' })
type Profile = 'artista' | 'selo'
type Values = z.infer<typeof schema>
const profiles = [
  { value: 'artista', label: 'Artista', desc: 'Quero lançar minhas músicas', Icon: Mic2 },
  { value: 'selo', label: 'Selo', desc: 'Gerencio artistas e catálogo', Icon: Building2 },
] as const satisfies ReadonlyArray<{ value: Profile; label: string; desc: string; Icon: typeof Mic2 }>

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [done, setDone] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isValid, touchedFields } } = useForm<Values>({
    resolver: zodResolver(schema), mode: 'onChange',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', profile: 'artista', terms: false },
  })
  const password = watch('password') || ''
  const confirmPassword = watch('confirmPassword') || ''
  const profile = watch('profile')
  const termsAccepted = watch('terms') === true
  const toggleTerms = () => setValue('terms', !termsAccepted, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
  const passes = [password.length >= 8, /[A-Za-z]/.test(password), /[0-9]/.test(password)]
  const field = (id: string, label: string, error?: string) => <div className="rg-caption"><label htmlFor={id}>{label}</label>{error && <small id={id + '-error'} role="alert">{error}</small>}</div>

  async function onSubmit(values: Values) {
    setFeedback('')
    try {
      const sb = createClient()
      const { data, error } = await sb.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: { data: {
          full_name: values.fullName.trim(), registration_profile: values.profile === 'artista' ? 'ARTIST' : 'LABEL',
          terms_version: '2026-11',
        } },
      })
      if (error) {
        const msg = error.message || 'Falha desconhecida'
        if (/fetch|network|connection|timeout/i.test(msg)) {
          setFeedback('Não foi possível conectar ao serviço de autenticação. Tente novamente em instantes.')
        } else if (/rate limit|too many requests|email rate limit/i.test(msg)) {
          setFeedback('Muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente.')
        } else if (/already registered|already exists|user already registered/i.test(msg)) {
          setFeedback('Este e-mail já pode estar cadastrado. Tente entrar na sua conta.')
        } else {
          setFeedback('Não foi possível criar a conta: ' + msg)
        }
        return
      }
      if (data.session && data.user) {
        const created = await ensureProfile(sb, data.user)
        if (created.error) {
          setFeedback('Conta criada, mas não foi possível preparar o perfil. Entre novamente ou fale com o suporte.')
          return
        }
        window.location.assign('/onboarding')
        return
      }
      setDone(true)
    } catch (err) {
      // Um erro inesperado pode indicar configuração inválida e não falta de Internet.
      console.error('Cadastro SINTONE: erro inesperado na autenticação', err)
      setFeedback('Serviço de cadastro temporariamente indisponível. Tente novamente ou entre em contato com o suporte.')
    }
  }

  return <main className="rg-page">
    <div className="rg-container">
      <aside className="rg-aside">
        <Link href="/" aria-label="Voltar para SINTONE"><img src="/sintone-logo.svg" alt="SINTONE" /></Link>
        <div className="rg-aside-content"><span className="rg-eyebrow">SINTONE PARA CRIADORES</span>
          <h2>Sua música merece um caminho próprio.</h2>
          <p>Organize seu catálogo, acompanhe seus lançamentos e cresça com uma plataforma criada para o mercado independente.</p>
          <div className="rg-points"><span><CircleCheck size={18} /> Painel de lançamentos</span><span><CircleCheck size={18} /> Royalties com transparência</span><span><CircleCheck size={18} /> Controle do seu catálogo</span></div>
        </div>
        <p className="rg-aside-foot">Distribuição musical independente.</p>
      </aside>
      <section className="rg-panel">
        <div className="rg-mobile-brand"><Link href="/"><img src="/sintone-logo.svg" alt="SINTONE" /></Link></div>
        {done ? <div className="rg-success"><CircleCheck size={42} /><h1>Confira seu e-mail</h1><p>Se o cadastro foi aceito, você receberá uma mensagem para confirmar o endereço informado. Depois, entre para completar seu perfil.</p><Link href="/login" className="rg-submit">Ir para entrar</Link></div> :
        <div className="rg-form-wrap">
          <div className="rg-heading"><span className="rg-eyebrow">COMECE POR AQUI</span><h1>Crie sua conta</h1><p>Preencha seus dados para começar na SINTONE.</p></div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="rg-group"><div className="rg-caption"><span>Como você vai usar a SINTONE?</span></div>
              <div className="rg-profiles" role="radiogroup" aria-label="Perfil de cadastro">
                {profiles.map(({ value, label, desc, Icon }) => <button key={value} type="button" className={'rg-profile' + (profile === value ? ' selected' : '')} role="radio" aria-checked={profile === value} onClick={() => setValue('profile', value, { shouldValidate: true })}>
                  <Icon size={21} /><strong>{label}</strong><small>{desc}</small><span className="rg-choice"><Check size={12}/></span>
                </button>)}
              </div>
            </div>
            <div className="rg-group">
              {field('rg-name', 'Nome completo', errors.fullName?.message)}
              <input id="rg-name" type="text" autoComplete="name" placeholder="Seu nome e sobrenome" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'rg-name-error' : undefined} {...register('fullName')}/>
            </div>
            <div className="rg-group">
              {field('rg-email', 'E-mail', errors.email?.message)}
              <input id="rg-email" type="email" autoComplete="email" placeholder="voce@exemplo.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'rg-email-error' : undefined} {...register('email')}/>
            </div>
            <div className="rg-group">
              {field('rg-password', 'Senha', touchedFields.password ? errors.password?.message : undefined)}
              <div className="rg-password">
                <input id="rg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Crie uma senha segura" aria-invalid={!!errors.password && touchedFields.password} {...register('password')} />
                <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18}/>}</button>
              </div>
              <div className="rg-hints">{['8 ou mais caracteres', 'Uma letra', 'Um número'].map((s,i)=><span key={s} className={passes[i] ? 'passed' : ''}><Check size={12}/>{s}</span>)}</div>
            </div>
            <div className="rg-group">
              {field('rg-confirm', 'Confirmar senha', touchedFields.confirmPassword || confirmPassword ? errors.confirmPassword?.message : undefined)}
              <div className="rg-password">
                <input id="rg-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Repita sua senha" aria-invalid={!!errors.confirmPassword && !!confirmPassword} {...register('confirmPassword')} />
                <button type="button" aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'} onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
              {confirmPassword && password === confirmPassword && <small className="rg-match"><CircleCheck size={13}/> As senhas coincidem</small>}
            </div>
            <div className="rg-terms">
              <div className="rg-terms-row">
                <button
                  type="button"
                  className={'rg-terms-check' + (termsAccepted ? ' is-checked' : '')}
                  role="checkbox"
                  aria-label="Aceito os Termos de Serviço e a Política de Privacidade"
                  aria-checked={termsAccepted}
                  aria-invalid={!!errors.terms}
                  aria-describedby={errors.terms ? 'rg-terms-error' : undefined}
                  onClick={toggleTerms}
                >
                  {termsAccepted && <Check size={15} strokeWidth={3} aria-hidden="true" />}
                </button>
                <div className="rg-terms-copy">
                  <button type="button" className="rg-terms-text-toggle" onClick={toggleTerms}>Li e aceito os</button>{' '}
                  <Link href="/termos" target="_blank" rel="noopener noreferrer">Termos de Serviço</Link>
                  {' '}e a{' '}
                  <Link href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.
                </div>
              </div>
              {errors.terms && <small id="rg-terms-error" role="alert">{errors.terms.message}</small>}
            </div>
            {feedback && <div className="rg-alert" role="alert">{feedback}</div>}
            <button className="rg-submit" type="submit" disabled={isSubmitting || !isValid}>{isSubmitting ? <><LoaderCircle className="rg-spin" size={18}/> Criando conta…</> : <><LockKeyhole size={17}/> Criar conta grátis</>}</button>
          </form>
          <p className="rg-login">Já tem uma conta? <Link href="/login">Entrar na SINTONE</Link></p>
        </div>}
      </section>
    </div>
  </main>
}