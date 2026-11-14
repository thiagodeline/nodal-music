'use server'
import { revalidatePath } from 'next/cache'
import { getAdminContext } from '@/lib/admin-access'

const uuid = (x:string) => /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x)
const denied = () => ({ok:false as const,error:'Acesso restrito a administradores.'})

export async function adminSetBalance(id:string,target:number,reason:string) {
  const ctx=await getAdminContext(); if(!ctx)return denied()
  if(!uuid(id)||!Number.isFinite(target)||target<0||target>1e8||
    Math.abs(target*100-Math.round(target*100))>0.00001||
    typeof reason!=='string'||reason.trim().length<10||reason.length>500)
    return {ok:false as const,error:'Saldo ou justificativa inválidos.'}
  const {data,error}=await ctx.supabase.rpc('admin_set_balance',{
    p_artist:id,p_target:target,p_reason:reason.trim()
  })
  if(error)return {ok:false as const,error:error.message}
  revalidatePath('/admin'); revalidatePath('/dashboard')
  return {ok:true as const,balance:Number(data)}
}

type Edit={
  name:string;artist_name:string;phone:string;address:string;birth_date:string;
  cpf:string;cnpj:string;
  status:'PENDING_ONBOARDING'|'PENDING_CONTRACT'|'ACTIVE'|'BLOCKED'
}
export async function adminSaveArtist(id:string,v:Edit) {
  const ctx=await getAdminContext();if(!ctx)return denied()
  if(!uuid(id)||!v||!['PENDING_ONBOARDING','PENDING_CONTRACT','ACTIVE','BLOCKED'].includes(v.status))
    return {ok:false as const,error:'Conta inválida.'}
  const {data:current}=await ctx.supabase.from('profiles')
    .select('role,status').eq('id',id).maybeSingle()
  if(current?.role!=='artist')return {ok:false as const,error:'Conta de artista/selo não encontrada.'}
  if(v.status==='ACTIVE'){
    const {data:signed}=await ctx.supabase.from('user_contracts')
      .select('signed_at,pdf_status').eq('user_id',id).maybeSingle()
    if(!signed?.signed_at||signed.pdf_status!=='ready')
      return {ok:false as const,error:'A conta exige contrato assinado e PDF finalizado.'}
  }
  const cpf=String(v.cpf||'').replace(/\D/g,'')||null
  const cnpj=String(v.cnpj||'').toUpperCase().replace(/[^A-Z0-9]/g,'')||null
  if(cpf&&!/^\d{11}$/.test(cpf))return {ok:false as const,error:'CPF inválido.'}
  if(cnpj&&!/^[A-Z0-9]{12}\d{2}$/.test(cnpj))return {ok:false as const,error:'CNPJ inválido.'}
  if(v.birth_date&&!/^\d{4}-\d{2}-\d{2}$/.test(v.birth_date))
    return {ok:false as const,error:'Data inválida.'}
  const {error}=await ctx.supabase.from('profiles').update({
    name:String(v.name||'').trim().slice(0,160)||null,
    artist_name:String(v.artist_name||'').trim().slice(0,160)||null,
    phone:String(v.phone||'').trim().slice(0,35)||null,
    address:String(v.address||'').trim().slice(0,500)||null,
    birth_date:v.birth_date||null,cpf,cnpj,status:v.status,
    onboarding_completed:v.status!=='PENDING_ONBOARDING',
    can_release_music:v.status==='ACTIVE'
  }).eq('id',id)
  if(error)return {ok:false as const,error:error.message}
  revalidatePath('/admin');revalidatePath('/dashboard')
  return {ok:true as const}
}

export type ImportRow={
  isrc?:string;upc?:string;artist_id?:string;email?:string;
  platform:string;month:string;streams:number;revenue:number;lines:number[]
}
export async function adminImportRoyaltyBatch(rows:ImportRow[]) {
  const ctx=await getAdminContext();if(!ctx)return denied()
  if(!Array.isArray(rows)||!rows.length||rows.length>400||JSON.stringify(rows).length>250000)
    return {ok:false as const,error:'Lote inválido (máximo de 400 linhas).'}
  const {data,error}=await ctx.supabase.rpc('import_royalties',{p_rows:rows})
  if(error)return {ok:false as const,error:error.message}
  revalidatePath('/admin');revalidatePath('/dashboard')
  return {ok:true as const,data:data as {
    imported:number;artists:number;
    errors:{key:string;platform:string;month:string;lines:number[];reason:string}[]
  }}
}
