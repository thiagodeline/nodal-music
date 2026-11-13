import { z } from 'zod'

export const digits = (s: string) => s.replace(/\D/g, '')
export const normCnpj = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
export const normPhone = (s: string) => { const d = digits(s); return d.length > 11 && d.startsWith('55') ? d.slice(2) : d }
// aceita DD/MM/AAAA (ou DD-MM-AAAA) e converte para AAAA-MM-DD, o formato do Postgres
export function normDate(s: string): string {
  const t = s.trim(); const m = t.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : t
}
const PHONE = /^[1-9][1-9](9\d{8}|[2-5]\d{7})$/

export function isValidCpf(raw: string): boolean {
  const c = digits(raw)
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10])
}
// Aceita o CNPJ numérico e o alfanumérico (Receita Federal, desde jul/2026): valor = código ASCII - 48
export function isValidCnpj(raw: string): boolean {
  const c = normCnpj(raw)
  if (!/^[A-Z0-9]{12}\d{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false
  const dv = (base: string) => {
    const w = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const r = [...base].reduce((a, ch, i) => a + (ch.charCodeAt(0) - 48) * w[i], 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = dv(c.slice(0, 12)), d2 = dv(c.slice(0, 12) + d1)
  return c.slice(12) === `${d1}${d2}`
}
export const formatCpf = (c?: string | null) => c ? c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : ''
export const formatCnpj = (c?: string | null) => c ? c.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5') : ''

function parseDate(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number); const t = new Date(y, m - 1, d)
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d ? t : null
}
function age(d: Date) { const t = new Date(); let a = t.getFullYear() - d.getFullYear(); if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--; return a }

export const onboardingSchema = z.object({
  accountType: z.enum(['ARTIST', 'LABEL']),
  stageName: z.string().trim().min(2, 'Informe o nome').max(120, 'Nome muito longo'),
  fullName: z.string().trim().min(5, 'Informe o nome completo').max(160, 'Nome muito longo').refine(v => v.split(/\s+/).length >= 2, 'Informe nome e sobrenome'),
  birthDate: z.string().transform(normDate),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(160, 'E-mail muito longo'),
  phone: z.string().refine(v => PHONE.test(normPhone(v)), 'Telefone inválido. Use DDD e número, por exemplo (51) 99999-9999.'),
  address: z.string().trim().min(10, 'Informe rua, número, cidade e UF').max(300, 'Endereço muito longo'),
  document: z.string().trim().min(1, 'Campo obrigatório'),
}).superRefine((v, ctx) => {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v.birthDate) ? parseDate(v.birthDate) : null
  if (!d || d > new Date() || d.getFullYear() < 1900) ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'Informe uma data válida' })
  else if (v.accountType === 'ARTIST' && age(d) < 18) ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'É preciso ter 18 anos ou mais. Se você é menor, fale com o suporte: a conta deve ser aberta por um responsável legal.' })
  if (v.accountType === 'ARTIST' && !isValidCpf(v.document)) ctx.addIssue({ code: 'custom', path: ['document'], message: 'CPF inválido' })
  if (v.accountType === 'LABEL' && !isValidCnpj(v.document)) ctx.addIssue({ code: 'custom', path: ['document'], message: 'CNPJ inválido' })
})
export type OnboardingValues = z.infer<typeof onboardingSchema>
