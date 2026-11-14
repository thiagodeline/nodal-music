'use client'
import {useState} from 'react'
import {adminSetDeliveryStatus} from '@/app/admin/operations-actions'
import type {AdminRelease} from './AdminPanel'

const labels:Record<string,string>={awaiting:'Aguardando envio',sent:'Enviado para lojas',live:'Publicado'}

// Metadados de artistas são dados externos: não permitir fórmulas injetadas em Excel.
const excelText=(v:unknown):string=>{
 const s=v==null?'':typeof v==='string'?v:typeof v==='boolean'?(v?'Sim':'Não'):String(v)
 return /^[\s]*[=+@-]/.test(s)?"'"+s:s
}
const rows=(values:unknown[][]):string[][]=>values.map(row=>row.map(excelText))

async function exportExcel(r:AdminRelease,format:'xlsx'|'xls'){
 const XLSX=await import('xlsx')
 const wb=XLSX.utils.book_new()
 const geral=rows([
  ['Campo','Valor'],
  ['ID Sintone',r.id],['ID artista',r.artist_id],['Título',r.title],
  ['Tipo de lançamento',r.type],['Artista principal',r.main_artist],
  ['Participações',r.featured_artists],['Gênero',r.genre],['Subgênero',r.subgenre],
  ['Data prevista',r.release_date],['Data de solicitação',r.created_at],
  ['UPC / EAN',r.upc],['ISRC (lançamento legado)',r.isrc],
  ['Selo',r.label_name],['P-Line',r.p_line],['C-Line',r.c_line],
  ['Compositores (geral)',r.composers],['Produtores (geral)',r.producers],
  ['Letristas (geral)',r.lyricists],['Créditos (geral)',r.credits],
  ['Explícito',r.explicit],['Status editorial Sintone',r.status],
  ['Status de entrega Sintone',r.delivery_status],['Motivo de rejeição',r.rejection_reason],
  ['Artistas / papéis',r.artists.map(a=>a.name+' ('+a.role+')').join('; ')],
  ['Plataformas',r.platforms.join('; ')],
 ])
 const wsGeral=XLSX.utils.aoa_to_sheet(geral)
 wsGeral['!cols']=[{wch:31},{wch:74}]
 XLSX.utils.book_append_sheet(wb,wsGeral,'Lançamento')

 const faixas:unknown[][]=[[
   'ID lançamento','ID faixa','Ordem','Título da faixa','ISRC',
   'Participações','Compositores','Produtores','Letristas','Créditos',
   'Colaboradores','Explícito','Idioma','Caminho áudio'
 ]]
 const trackList=r.tracks.length?r.tracks:[{
  id:'',position:1,title:r.title,isrc:r.isrc,featured_artists:r.featured_artists,
  composers:r.composers,producers:r.producers,lyricists:r.lyricists,
  credits:r.credits,contributors:[] as {name:string;role:string}[],
  explicit:r.explicit,language:'',audio_path:''
 }]
 for(const t of trackList){
  faixas.push([r.id,t.id,t.position,t.title,t.isrc,
   t.featured_artists,t.composers,t.producers,t.lyricists,t.credits,
   (t.contributors||[]).map(c=>c.name+' ('+c.role+')').join('; '),
   t.explicit,t.language,t.audio_path])
 }
 const wsTracks=XLSX.utils.aoa_to_sheet(rows(faixas))
 wsTracks['!cols']=[{wch:38},{wch:38},{wch:8},{wch:35},{wch:17},{wch:24},
  {wch:40},{wch:36},{wch:35},{wch:35},{wch:40},{wch:12},{wch:14},{wch:60}]
 wsTracks['!autofilter']={ref:'A1:N'+faixas.length}
 XLSX.utils.book_append_sheet(wb,wsTracks,'Faixas')

 const artistas=rows([['Artista','Papel','ID perfil'],...r.artists.map(a=>[a.name,a.role,a.profile_id||''])])
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(artistas),'Artistas')
 const dsps=rows([['Plataforma selecionada'],...r.platforms.map(p=>[p])])
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(dsps),'Plataformas')
 const filename='sintone-metadados-'+r.id+'.'+format
 XLSX.writeFile(wb,filename,{bookType:format==='xls'?'biff8':'xlsx'})
}

export default function AdminDelivery({releases}:{releases:AdminRelease[]}){
 const [current,setCurrent]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(''),[message,setMessage]=useState('')

 const update=async(r:AdminRelease,status:'awaiting'|'sent'|'live')=>{
  setBusy(r.id);setMessage('')
  try{
   const res=await adminSetDeliveryStatus(r.id,status)
   if(!res.ok)setMessage(res.error)
   else setCurrent(x=>({...x,[r.id]:status}))
  }catch{setMessage('Erro ao salvar status')}
  finally{setBusy('')}
 }

 const handleExport=async(r:AdminRelease,format:'xlsx'|'xls')=>{
  setBusy(r.id);setMessage('')
  try{await exportExcel(r,format)}
  catch{setMessage('Falha ao gerar a planilha de metadados. Tente novamente.')}
  finally{setBusy('')}
 }

 const exportJson=(r:AdminRelease)=>{
  const payload={format:'SINTONE_INTERNAL_RELEASE_JSON',
   note:'Exportação interna de metadados. NÃO é pacote DDEX ERN validado.',
   release:{title:r.title,type:r.type,upc:r.upc,mainArtist:r.main_artist,releaseDate:r.release_date,
    label:r.label_name,pLine:r.p_line,cLine:r.c_line,platforms:r.platforms},
   tracks:r.tracks.map(t=>({title:t.title,isrc:t.isrc,position:t.position,composers:t.composers,
    producers:t.producers,language:t.language}))}
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}))
  const a=document.createElement('a');a.href=url;a.download='sintone-release-'+r.id+'.json';a.click()
  URL.revokeObjectURL(url)
 }
 return <section className="sa-mod-panel">
  <h2>Pipeline de distribuição</h2>
  <p className="sa-x-note">Acompanhamento manual do envio à agregadora. O Excel inclui dados gerais, faixas, artistas e plataformas. Não é um modelo de importação oficial da iMusics, nem um pacote DDEX. A exportação não envia arquivos ou altera o status do lançamento.</p>
  {message&&<p role="status">{message}</p>}
  <div className="sa-table-scroll"><table className="sa-mod-table">
   <thead><tr><th>Lançamento</th><th>UPC</th><th>Status da entrega</th><th>Exportar metadados</th></tr></thead>
   <tbody>{releases.map(r=><tr key={r.id}>
    <td>{r.title}</td><td>{r.upc||'Pendente'}</td>
    <td><select value={current[r.id]||r.delivery_status||'awaiting'}
      disabled={busy===r.id} onChange={e=>void update(r,e.target.value as 'awaiting'|'sent'|'live')}
      aria-label={'Status de '+r.title}>
      {Object.entries(labels).map(([key,label])=><option value={key} key={key}>{label}</option>)}
    </select></td>
    <td style={{whiteSpace:'nowrap'}}>
     <button type="button" disabled={busy===r.id} onClick={()=>void handleExport(r,'xlsx')}>Excel .xlsx</button>{' '}
     <button type="button" disabled={busy===r.id} onClick={()=>void handleExport(r,'xls')}>XLS .xls</button>{' '}
     <button type="button" disabled={busy===r.id} onClick={()=>exportJson(r)}>JSON</button>
    </td>
   </tr>)}</tbody>
  </table></div>
 </section>
}
