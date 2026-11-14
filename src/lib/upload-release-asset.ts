import { createClient } from '@/lib/supabase/client'
import { SUPABASE_URL } from '@/lib/supabase/public-config'

const CHUNK = 6 * 1024 * 1024
type Bucket = 'audio' | 'covers'

/** Direct-to-Storage upload, never proxies audio through Next.js/Vercel. */
export async function uploadReleaseAsset(
  bucket: Bucket, path: string, file: File, progress: (percent: number) => void,
) {
  const client = createClient()
  const type = bucket === 'covers'
    ? 'image/jpeg' : /\.flac$/i.test(file.name) ? 'audio/flac' : 'audio/wav'
  const { data: { session }, error: authError } = await client.auth.getSession()
  if (authError || !session?.access_token) throw new Error('Sua sessão expirou. Faça login novamente.')

  if (file.size <= CHUNK) {
    const { error } = await client.storage.from(bucket).upload(path, file, {
      contentType: type, cacheControl: '3600', upsert: false,
    })
    if (error) throw error
    progress(100)
    return
  }

  // TUS 1.0.0, 6-MB blocks, HEAD offset recovery after a network interruption.
  const base = new URL(SUPABASE_URL)
  if (base.hostname.endsWith('.supabase.co')) {
    base.hostname = base.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co')
  }
  const endpoint = new URL('/storage/v1/upload/resumable', base)
  const token = session.access_token
  const headers = {
    Authorization: 'Bearer ' + token,
    'Tus-Resumable': '1.0.0',
  }
  const created = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Upload-Length': String(file.size),
      'Upload-Metadata': [
        ['bucketName', bucket], ['objectName', path],
        ['contentType', type], ['cacheControl', '3600'],
      ].map(([k, v]) => k + ' ' + btoa(v)).join(','),
      'x-upsert': 'false',
    },
  })
  if (!created.ok) throw new Error('Falha ao iniciar envio do áudio (HTTP ' + created.status + ').')
  const location = created.headers.get('Location')
  if (!location) throw new Error('O servidor não retornou a sessão de upload.')
  const url = new URL(location, endpoint)

  let offset = 0
  let retries = 0
  while (offset < file.size) {
    try {
      const end = Math.min(offset + CHUNK, file.size)
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': String(offset),
        },
        body: file.slice(offset, end),
      })
      if (!response.ok) throw new Error('Falha ao enviar bloco (HTTP ' + response.status + ').')
      const received = Number(response.headers.get('Upload-Offset') ?? end)
      if (!Number.isSafeInteger(received) || received <= offset || received > file.size) {
        throw new Error('Offset de upload inválido.')
      }
      offset = received
      retries = 0
      progress(Math.round(offset / file.size * 100))
    } catch (error) {
      if (++retries > 4) throw error
      await new Promise(resolve => setTimeout(resolve, retries * 1200))
      const status = await fetch(url, { method: 'HEAD', headers })
      if (!status.ok) continue
      const serverOffset = Number(status.headers.get('Upload-Offset'))
      if (Number.isSafeInteger(serverOffset) && serverOffset >= 0 && serverOffset <= file.size) {
        offset = serverOffset
        progress(Math.round(offset / file.size * 100))
      }
    }
  }
}
