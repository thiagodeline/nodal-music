// Leitura e validação da planilha de royalties (xlsx, xls ou csv). Roda no navegador do admin.
export type RawRow = Record<string, unknown>
export type Royalty = { isrc: string; email: string; platform: string; month: string; period: string; streams: number; revenue: number; lines: number[] }
export type Issue = { line: number; reason: string }
export type Parsed = { totalRows: number; validRows: number; merged: number; royalties: Royalty[]; issues: Issue[]; revenueTotal: number; streamsTotal: number; periods: string[]; missingColumns: string[] }

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const ALIAS = {
  isrc: ['isrc'], email: ['emailartista', 'email', 'emaildoartista'], platform: ['plataforma', 'platform', 'dsp', 'loja'],
  period: ['periodo', 'period', 'mes', 'month', 'competencia'], streams: ['streams', 'reproducoes', 'plays'], revenue: ['receitabrl', 'receita', 'revenue', 'valorliquido'],
} as const
type Field = keyof typeof ALIAS
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const PLAT: [RegExp, string][] = [[/youtube.*music|yt.*music/, 'YouTube Music'], [/youtube/, 'YouTube'], [/spotify/, 'Spotify'], [/apple|itunes/, 'Apple Music'], [/deezer/, 'Deezer'], [/tiktok/, 'TikTok'],
  [/amazon/, 'Amazon Music'], [/soundcloud/, 'SoundCloud'], [/tidal/, 'Tidal'], [/instagram|facebook|meta/, 'Instagram/Facebook']]

export function normPlatform(v: unknown): string {
  const s = String(v ?? '').trim(); if (!s) return ''
  const l = s.toLowerCase(); const hit = PLAT.find(([re]) => re.test(l)); if (hit) return hit[1]
  return s.replace(/\s+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}
// Aceita 2026-10, 2026-10-15, 10/2026, 202610, "out/2026", data do Excel (Date ou número serial)
export function parsePeriod(v: unknown): string | null {
  let y = 0, m = 0
  if (v instanceof Date && !isNaN(v.getTime())) { const t = new Date(v.getTime() + 12 * 3600e3); y = t.getFullYear(); m = t.getMonth() + 1 }
  else if (typeof v === 'number') {
    if (v >= 200001 && v <= 210012 && Number.isInteger(v)) { y = Math.floor(v / 100); m = v % 100 }
    else if (v > 20000 && v < 80000) { const t = new Date(Math.round((v - 25569) * 86400e3)); y = t.getUTCFullYear(); m = t.getUTCMonth() + 1 }
  } else if (typeof v === 'string') {
    const s = v.trim().toLowerCase(); let r: RegExpMatchArray | null
    if ((r = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?(?:[ t].*)?$/))) { y = +r[1]; m = +r[2] }
    else if ((r = s.match(/^(?:\d{1,2}[-/.])?(\d{1,2})[-/.](\d{4})$/))) { y = +r[2]; m = +r[1] }
    else if ((r = s.match(/^(\d{4})(\d{2})$/))) { y = +r[1]; m = +r[2] }
    else if ((r = s.match(/^([a-zç]{3})[a-zç]*[ /.-]+(\d{4})$/))) { y = +r[2]; m = MONTHS.indexOf(r[1]) + 1 }
  }
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12 ? `${y}-${String(m).padStart(2, '0')}` : null
}
// Aceita 1234.56, "1.234,56", "R$ 1.234,56", "(12,5)" e "-12,5"
export function parseMoney(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  let s = v.replace(/R\$|\s/g, ''); if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1) }
  if (s.startsWith('-')) { neg = true; s = s.slice(1) }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.')
  if (c > -1 && d > -1) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (c > -1) s = s.replace(/\./g, '').replace(',', '.')
  else if (d > -1 && /^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '') // 1.234 = mil duzentos e trinta e quatro
  const n = Number(s); return Number.isFinite(n) ? (neg ? -n : n) : null
}
export function parseStreams(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 && v < 1e12 ? Math.round(v) : null
  if (typeof v !== 'string') return null
  const s = v.replace(/[.,\s]/g, ''); return /^\d{1,12}$/.test(s) ? Number(s) : null
}
const ISRC_RE = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/, EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const blank = (v: unknown) => v === '' || v === null || v === undefined || (typeof v === 'string' && !v.trim())

export function parseRows(rows: RawRow[]): Parsed {
  const out: Parsed = { totalRows: 0, validRows: 0, merged: 0, royalties: [], issues: [], revenueTotal: 0, streamsTotal: 0, periods: [], missingColumns: [] }
  const headers = Object.keys(rows[0] ?? {})
  const col = (f: Field) => headers.find(h => (ALIAS[f] as readonly string[]).includes(norm(h)))
  const c = { isrc: col('isrc'), email: col('email'), platform: col('platform'), period: col('period'), streams: col('streams'), revenue: col('revenue') }
  const need: [Field, string][] = [['platform', 'Plataforma'], ['period', 'Periodo'], ['streams', 'Streams'], ['revenue', 'Receita_BRL']]
  need.forEach(([f, n]) => { if (!c[f]) out.missingColumns.push(n) })
  if (!c.isrc && !c.email) out.missingColumns.push('ISRC ou Email_Artista')
  if (out.missingColumns.length) return out
  const map = new Map<string, Royalty>()
  rows.forEach((row, i) => {
    if (Object.values(row).every(blank)) return
    out.totalRows++
    const line = i + 2, why: string[] = []
    let isrc = c.isrc ? String(row[c.isrc] ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
    const email = c.email ? String(row[c.email] ?? '').trim().toLowerCase() : ''
    if (isrc && !ISRC_RE.test(isrc)) { if (EMAIL_RE.test(email)) isrc = ''; else why.push('ISRC inválido') }
    if (email && !EMAIL_RE.test(email) && !isrc) why.push('e-mail inválido')
    if (!isrc && !email) why.push('sem ISRC nem e-mail')
    const platform = normPlatform(row[c.platform!]); if (!platform) why.push('plataforma vazia')
    const period = parsePeriod(row[c.period!]); if (!period) why.push('período inválido (use 2026-10)')
    const streams = parseStreams(row[c.streams!]); if (streams === null) why.push('streams inválido')
    const revenue = parseMoney(row[c.revenue!]); if (revenue === null) why.push('receita inválida')
    if (why.length) { out.issues.push({ line, reason: why.join(', ') }); return }
    out.validRows++; out.revenueTotal += revenue!; out.streamsTotal += streams!
    const key = [isrc || email, platform, period].join('|')
    const hit = map.get(key)
    if (hit) { hit.streams += streams!; hit.revenue += revenue!; hit.lines.push(line); out.merged++ }
    else map.set(key, { isrc, email, platform, month: period + '-01', period: period!, streams: streams!, revenue: revenue!, lines: [line] })
  })
  out.royalties = [...map.values()].map(r => ({ ...r, revenue: Math.round(r.revenue * 1e6) / 1e6 }))
  out.revenueTotal = Math.round(out.revenueTotal * 100) / 100
  out.periods = [...new Set(out.royalties.map(r => r.period))].sort()
  return out
}

export async function parseRoyaltyFile(file: File): Promise<Parsed> {
  if (file.size > 5 * 1024 * 1024) throw new Error('O arquivo passa de 5 MB. Divida a planilha em partes.')
  const XLSX = await import('xlsx') // carrega a biblioteca só quando o admin usa a importação
  const buf = await file.arrayBuffer()
  let wb
  if (/\.csv$/i.test(file.name)) {
    let text: string
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { text = new TextDecoder('windows-1252').decode(buf) } // CSV do Excel brasileiro
    text = text.replace(/^\uFEFF/, '')
    const first = text.split(/\r?\n/, 1)[0] ?? ''
    const FS = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ','
    wb = XLSX.read(text, { type: 'string', raw: true, FS }) // raw: não deixa a biblioteca "adivinhar" números e datas
  } else wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('A planilha está vazia.')
  const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '', raw: true })
  if (rows.length > 20000) throw new Error('A planilha tem mais de 20.000 linhas. Divida em partes.')
  return parseRows(rows)
}

export async function downloadTemplate() {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([['ISRC', 'Email_Artista', 'Plataforma', 'Periodo', 'Streams', 'Receita_BRL'], ['BRABC2600001', '', 'Spotify', '2026-10', 12500, 187.35], ['', 'artista@email.com', 'Apple Music', '2026-10', 3200, 94.1]])
  ws['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }]
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Royalties'); XLSX.writeFile(wb, 'modelo-royalties-nodal.xlsx')
}
