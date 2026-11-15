'use client'
import {useRef,useState} from 'react'
import {UploadCloud,FileSpreadsheet} from 'lucide-react'
import {useRouter} from 'next/navigation'
import {adminImportRoyaltyBatch,type ImportRow} from '@/app/admin/management-actions'
import {normPlatform,parseMoney,parsePeriod,parseStreams} from '@/lib/royalties'
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const raw=(r:Record<string,unknown>,...aliases:string[])=>{const k=Object.keys(r).find(k=>aliases.includes(norm(k)));return k?r[k]:''}
const txt=(r:Record<string,unknown>,...aliases:string[])=>String(raw(r,...aliases)??'').trim()
const uuid=/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const isrcRe=/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/
async function parse(file:File):Promise<{rows:ImportRow[];errors:string[];preview:Record<string,unknown>[]}> {
  if(file.size>5*1024*1024)throw Error('Arquivo acima de 5 MB.')
  if(!/\.(csv|tsv|xlsx|xls)$/i.test(file.name))throw Error('Envie CSV, TSV ou XLSX.')
  const XLSX=await import('xlsx');const buf=await file.arrayBuffer()
  let wb
  if(/\.(csv|tsv)$/i.test(file.name)){
    let content:string
    try{content=new TextDecoder('utf-8',{fatal:true}).decode(buf)}
    catch{content=new TextDecoder('windows-1252').decode(buf)}
    content=content.replace(/^\uFEFF/,'')
    const line=content.split(/\r?\n/,1)[0]
    const FS=/\.tsv$/i.test(file.name)?'\t':(line.match(/;/g)||[]).length>(line.match(/,/g)||[]).length?';':','
    wb=XLSX.read(content,{type:'string',raw:true,FS})
  }else wb=XLSX.read(buf,{type:'array',cellDates:true})
  const sheet=wb.Sheets[wb.SheetNames[0]]
  if(!sheet)throw Error('Planilha vazia.')
  const lines=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:'',raw:true})
  if(!lines.length||lines.length>20000)throw Error('O arquivo deve ter entre 1 e 20.000 linhas.')
  const errors:string[]=[], grouped=new Map<string,ImportRow>()
  lines.forEach((r,i)=>{
    const isrc=txt(r,'isrc').toUpperCase().replace(/[^A-Z0-9]/g,'')
    const upc=txt(r,'upc','ean','gtin').replace(/[^0-9]/g,'')
    const artist_id=txt(r,'artistid','idartista','userid').toLowerCase()
    const email=txt(r,'emailartista','email').toLowerCase()
    const platform=normPlatform(txt(r,'plataforma','platform','dsp','loja'))
    const period=parsePeriod(raw(r,'periodo','mes','month','competencia'))
    const streams=parseStreams(raw(r,'streams','reproducoes','plays','views'))
    const revenue=parseMoney(raw(r,'receitaliquidaartistabrl','receitabrl','receita','revenue'))
    if((isrc&&!isrcRe.test(isrc))||(upc&&![8,12,13,14].includes(upc.length))||
      (artist_id&&!uuid.test(artist_id))||(!isrc&&!upc&&!artist_id&&!email)||
      !platform||!period||streams===null||revenue===null||!Number.isFinite(revenue)) {
      errors.push('Linha '+(i+2)+': identificador, data ou valores inválidos.');return
    }
    const month=period+'-01',key=[isrc||upc||artist_id||email,platform,month].join('|')
    const prev=grouped.get(key)
    if(prev){prev.streams+=streams;prev.revenue+=revenue;prev.lines.push(i+2)}
    else grouped.set(key,{isrc,upc,artist_id,email,platform,month,streams,revenue,lines:[i+2]})
  })
  return {rows:[...grouped.values()].map(r=>({...r,revenue:Math.round(r.revenue*1e6)/1e6})),errors,preview:lines.slice(0,5)}
}
export default function AdminRoyaltyUpload(){
  const router=useRouter()
  const [file,setFile]=useState<File|null>(null)
  const [rows,setRows]=useState<ImportRow[]>([])
  const [errors,setErrors]=useState<string[]>([])
  const [report,setReport]=useState('')
  const [busy,setBusy]=useState(false)
  const [progress,setProgress]=useState(0)
  const [drag,setDrag]=useState(false)
  const [preview,setPreview]=useState<Record<string,unknown>[]>([])
  const fileInput=useRef<HTMLInputElement|null>(null)
  const choose=async(f:File|null)=>{
    setFile(f);setRows([]);setErrors([]);setReport('');setPreview([])
    if(!f)return
    try{const p=await parse(f);setRows(p.rows);setErrors(p.errors);setPreview(p.preview)}
    catch(e){setReport(e instanceof Error?e.message:'Falha na leitura.')}
  }
  const send=async()=>{
    if(!rows.length||busy||!confirm('Importar '+rows.length+' registros? Mesmos períodos substituem totais anteriores.'))return
    setBusy(true);setReport('');setProgress(0)
    let imported=0;const failures:string[]=[]
    try{
      for(let i=0;i<rows.length;i+=400){
        const r=await adminImportRoyaltyBatch(rows.slice(i,i+400))
        if(!r.ok)throw Error(r.error)
        imported+=r.data.imported
        failures.push(...(r.data.errors||[]).map(e=>String(e.key)+': '+e.reason))
        setProgress(Math.min(rows.length,i+400))
      }
      setReport(imported+' registros atualizados. '+failures.length+' rejeitados.')
      setErrors(prev=>[...prev,...failures.slice(0,100)])
      router.refresh()
    }catch(e){setReport('Importação interrompida após '+imported+' registros. '+(e instanceof Error?e.message:'Falha')+'. Reenviar o arquivo não duplica relatórios.')}
    finally{setBusy(false)}
  }
  const template=()=>{
    const csv='ISRC;UPC;Artist_ID;Email_Artista;Plataforma;Periodo;Streams;Receita_Liquida_Artista_BRL\nBRABC2600001;;;;Spotify;2026-10;300;10,50\n;;;artista@exemplo.com;YouTube;2026-10;500;5,75\n'
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const a=document.createElement('a');a.href=url;a.download='modelo-sintone-royalties.csv'
    a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <section className="sa-x-edit">
    <h2>Importação de royalties — CSV/TSV/XLSX</h2>
    <p className="sa-x-note">Informe a receita líquida do artista, já descontada a comissão da SINTONE. A receita informada será importada como líquida e não sofrerá um segundo desconto. Identificadores: ISRC, UPC, Artist_ID ou e-mail. UPC ambíguo exige ISRC.</p>
    <button className="sa-x-link" onClick={template}>Baixar modelo CSV</button>
    <div className={'sa-dropzone'+(drag?' drag':'')} role="button" tabIndex={0}
       onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.current?.click()}}}
       onClick={()=>fileInput.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}}
       onDragLeave={e=>{e.preventDefault();setDrag(false)}} onDrop={e=>{e.preventDefault();setDrag(false);void choose(e.dataTransfer.files?.[0]||null)}}>
      <UploadCloud size={28}/><strong>Arraste seu arquivo aqui ou clique para selecionar</strong>
      <span>CSV, TSV, XLS ou XLSX · até 5 MB</span>
      <input ref={fileInput} type="file" accept=".csv,.tsv,.xlsx,.xls" style={{display:'none'}} onChange={e=>void choose(e.target.files?.[0]||null)}/>
     </div>
     {!!preview.length&&<div><h3><FileSpreadsheet size={17}/> Pré-visualização — primeiras {preview.length} linhas</h3>
      <div className="sa-file-preview"><table><thead><tr>{Object.keys(preview[0]).map(k=><th key={k}>{k}</th>)}</tr></thead>
      <tbody>{preview.map((row,i)=><tr key={i}>{Object.keys(preview[0]).map(k=><td key={k}>{String(row[k]??'')}</td>)}</tr>)}</tbody>
      </table></div><p className="sa-x-note">Revise os dados antes de confirmar a importação. Nenhuma linha é enviada automaticamente.</p></div>}
    {file&&<p>{file.name} · {rows.length} registros válidos · {errors.length} erros de leitura</p>}
    {!!rows.length&&<>
      <p><strong>{rows.reduce((s,r)=>s+r.streams,0).toLocaleString('pt-BR')}</strong> streams · R$ <strong>{rows.reduce((s,r)=>s+r.revenue,0).toFixed(2)}</strong> líquidos</p>
      <button className="sa-x-button" disabled={busy} onClick={send}>{busy?'Enviando '+progress+'/'+rows.length:'Confirmar importação'}</button>
    </>}
    {report&&<p role="status">{report}</p>}
    {!!errors.length&&<details><summary>{errors.length} erros encontrados</summary><ul>{errors.slice(0,100).map((e,i)=><li key={i}>{e}</li>)}</ul></details>}
  </section>
}
