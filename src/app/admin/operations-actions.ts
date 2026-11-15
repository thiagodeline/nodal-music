'use server'
import {getAdminContext} from '@/lib/admin-access'
import {revalidatePath} from 'next/cache'
const uuid=/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const denied={ok:false as const,error:'Acesso restrito à administração.'}
export async function adminMarkPayoutPaid(id:string,receipt:string){
 const ctx=await getAdminContext();if(!ctx)return denied
 if(!uuid.test(id)||typeof receipt!=='string'||receipt.trim().length<8||receipt.length>240)
  return {ok:false as const,error:'Informe a referência do comprovante (8 a 240 caracteres).'}
 const {error}=await ctx.supabase.rpc('admin_mark_manual_payout',{p_withdrawal_id:id,p_receipt_reference:receipt.trim()})
 if(error)return {ok:false as const,error:error.message}
 revalidatePath('/admin')
 return {ok:true as const}
}
export async function adminSetArtistRoyaltyRate(id:string,percent:number){
 const ctx=await getAdminContext();if(!ctx)return denied
 if(!uuid.test(id)||!Number.isFinite(percent)||percent<0||percent>100||
    Math.abs(Math.round(percent*100)-percent*100)>0.001)
   return {ok:false as const,error:'Percentual inválido.'}
 const {error}=await ctx.supabase.from('artist_royalty_terms').upsert({
   artist_id:id,artist_percent:percent,updated_by:ctx.user.id,updated_at:new Date().toISOString()
 },{onConflict:'artist_id'})
 if(error)return {ok:false as const,error:error.message}
 revalidatePath('/admin');return {ok:true as const}
}
export async function adminSetDeliveryStatus(id:string,status:'awaiting'|'sent'|'live'){
 const ctx=await getAdminContext();if(!ctx)return denied
 if(!uuid.test(id)||!['awaiting','sent','live'].includes(status))return {ok:false as const,error:'Dados inválidos.'}
 const {data:release,error:readError}=await ctx.supabase.from('releases').select('status').eq('id',id).single()
 if(readError||!release)return {ok:false as const,error:'Lançamento não encontrado.'}
 if(status!=='awaiting'&&!['approved','live'].includes(release.status))
  return {ok:false as const,error:'Aprovação editorial obrigatória antes de marcar envio.'}
 const {error}=await ctx.supabase.from('releases').update({delivery_status:status,delivered_at:status==='awaiting'?null:new Date().toISOString()}).eq('id',id)
 if(error)return {ok:false as const,error:error.message}
 revalidatePath('/admin');return {ok:true as const}
}

export async function adminSetDeliveryStatusBulk(ids:string[],status:'awaiting'|'sent'|'live'){
 const ctx=await getAdminContext();if(!ctx)return denied
 if(!Array.isArray(ids)||!ids.length||ids.length>100||
    new Set(ids).size!==ids.length||ids.some(id=>!uuid.test(id))||
    !['awaiting','sent','live'].includes(status))
  return {ok:false as const,error:'Seleção inválida (máximo 100 lançamentos).'}
 const {data,error}=await ctx.supabase.rpc('admin_bulk_delivery_status',{
  p_release_ids:ids,p_status:status
 })
 if(error)return {ok:false as const,error:error.message}
 revalidatePath('/admin')
 return {ok:true as const,updated:Number(data)}
}
