'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mic2, Building2 } from 'lucide-react'
import { onboardingSchema, type OnboardingValues } from '@/lib/onboarding'
import { completeOnboarding } from './actions'
import './onboarding.css'

const COPY = {
  ARTIST: { stage: 'Nome Artístico', birth: 'Data de Nascimento', full: 'Nome Completo', addr: 'Endereço Residencial', doc: 'CPF', docHint: '000.000.000-00' },
  LABEL: { stage: 'Nome do Selo / Razão Social', birth: 'Data de Nascimento/Fundação', full: 'Nome Completo do Responsável', addr: 'Endereço', doc: 'CNPJ', docHint: '00.000.000/0000-00' },
} as const

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="ob-f"><span>{label}</span>{children}{error && <em role="alert">{error}</em>}</label>
}

export default function OnboardingForm({ email }: { email: string }) {
  const router = useRouter(); const [serverError, setServerError] = useState('')
  const { register, handleSubmit, watch, setValue, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema), mode: 'onTouched',
    defaultValues: { accountType: 'ARTIST', stageName: '', fullName: '', birthDate: '', email, phone: '', address: '', document: '' },
  })
  const type = watch('accountType'), t = COPY[type]
  const pick = (v: 'ARTIST' | 'LABEL') => { setValue('accountType', v); setValue('document', ''); clearErrors(); setServerError('') }
  async function onSubmit(values: OnboardingValues) {
    setServerError('')
    const r = await completeOnboarding(values)
    if (!r.ok) {
      Object.entries(r.fieldErrors ?? {}).forEach(([k, message]) => setError(k as keyof OnboardingValues, { message }))
      return setServerError(r.error)
    }
    router.push('/dashboard'); router.refresh()
  }
  return (<main className="ob"><div className="ob-wrap">
    <img src="/logo.png" alt="Nodal Music" className="ob-logo" />
    <h1>Escolha uma conta para criar</h1>
    <p className="ob-sub">Boas-vindas! Conte-nos quem você é para podermos personalizar sua experiência.</p>
    <div className="ob-types" role="radiogroup" aria-label="Tipo de conta">
      {([['ARTIST', 'Artista', 'Lanço minha própria música', Mic2], ['LABEL', 'Selo', 'Gerencio um selo ou vários artistas', Building2]] as const).map(([k, name, desc, Ic]) =>
        <button type="button" key={k} role="radio" aria-checked={type === k} className={'ob-type' + (type === k ? ' on' : '')} onClick={() => pick(k)}><Ic size={26} /><b>{name}</b><small>{desc}</small></button>)}
    </div>
    <form className="ob-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label={t.stage} error={errors.stageName?.message}><input {...register('stageName')} autoComplete="organization" /></Field>
      <div className="ob-two">
        <Field label={t.full} error={errors.fullName?.message}><input {...register('fullName')} autoComplete="name" /></Field>
        <Field label={t.birth} error={errors.birthDate?.message}><input type="date" {...register('birthDate')} autoComplete="bday" /></Field>
      </div>
      <div className="ob-two">
        <Field label="E-mail" error={errors.email?.message}><input type="email" {...register('email')} autoComplete="email" /></Field>
        <Field label="Telefone" error={errors.phone?.message}><input type="tel" placeholder="(51) 99999-9999" {...register('phone')} autoComplete="tel" /></Field>
      </div>
      <Field label={t.addr} error={errors.address?.message}><input placeholder="Rua, número, bairro, cidade e UF" {...register('address')} autoComplete="street-address" /></Field>
      <Field label={t.doc} error={errors.document?.message}><input placeholder={t.docHint} {...register('document')} inputMode={type === 'ARTIST' ? 'numeric' : 'text'} autoComplete="off" /></Field>
      <p className="ob-note">Usamos esses dados só para preparar o seu contrato, conforme a nossa <a href="/privacidade" target="_blank">Política de Privacidade</a>.</p>
      {serverError && <p className="ob-err" role="alert">{serverError}</p>}
      <button className="ob-btn" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar e continuar'}</button>
    </form>
  </div></main>)
}
