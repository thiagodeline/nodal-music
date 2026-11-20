'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronLeft, Download, FileCheck2, FileSignature, LoaderCircle, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { acceptContract, finalizeContractPdf, getSignedContractDownload, type ContractAcceptance } from './actions'
import './contract.css'

export type ContractRecord = {
  user_id:string; signed_at:string; signed_name:string; artist_name:string|null;
  cpf:string|null; cnpj:string|null; contract_snapshot:string|null; contract_version:string|null; pdf_status:'pending'|'ready'
}
type Props = {
  userId:string;accountType:'ARTIST'|'LABEL';artistName:string;fullName:string;
  documentNumber:string;contractVersion:string;contractText:string;readyToSign:boolean;
  existingRecord:ContractRecord|null
}
const formattedDate = (date: string) => new Date(date).toLocaleString('pt-BR', {
  timeZone:'America/Sao_Paulo', day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'
})

function createPdfNode(record: ContractAcceptance, accountType:'ARTIST'|'LABEL') {
  const root=document.createElement('article')
  root.style.cssText='width:750px;padding:42px;background:white;color:#1b2538;font-family:Arial,sans-serif;font-size:13px;line-height:1.75;box-sizing:border-box;white-space:normal;'
  const title=document.createElement('h1')
  title.textContent='SINTONE — CONTRATO DE DISTRIBUIÇÃO MUSICAL'
  title.style.cssText='color:#0646bd;font-size:20px;line-height:1.3;margin-bottom:24px;'
  root.appendChild(title)
  const identity=document.createElement('section')
  identity.style.cssText='border:1px solid #dbe3ef;padding:14px;margin:0 0 24px;'
  const label=accountType==='ARTIST'?'Nome artístico':'Nome do selo'
  for(const [key,value] of [[label,record.artist_name||'Não informado'],['Nome completo / responsável',record.signed_name],[accountType==='ARTIST'?'CPF':'CNPJ',accountType==='ARTIST'?(record.cpf||''):(record.cnpj||'')],['Versão do contrato',record.contract_version]]){
    const p=document.createElement('p');p.style.margin='0 0 6px'
    const strong=document.createElement('strong');strong.textContent=key+': '
    p.appendChild(strong);p.appendChild(document.createTextNode(value));identity.appendChild(p)
  }
  root.appendChild(identity)
  const body=document.createElement('div')
  body.textContent=record.contract_snapshot
  body.style.whiteSpace='pre-wrap'
  body.style.overflowWrap='anywhere'
  root.appendChild(body)
  const footer=document.createElement('section')
  footer.style.cssText='margin-top:32px;padding-top:18px;border-top:2px solid #0646bd;break-inside:avoid;page-break-inside:avoid;'
  const signed=document.createElement('strong')
  const who=(record.artist_name ? record.artist_name+' / ' : '') + record.signed_name
  signed.textContent='Esse contrato foi assinado digitalmente por '+who+' em '+formattedDate(record.signed_at)+'.'
  footer.appendChild(signed)
  const evidence=document.createElement('p')
  evidence.style.cssText='font-size:11px;color:#52627a;margin-top:10px'
  evidence.textContent='Aceite eletrônico registrado em sessão autenticada. Data e hora fornecidas pelo servidor. Este documento não é certificado ICP-Brasil.'
  footer.appendChild(evidence);root.appendChild(footer)
  return root
}

export default function ContractSigning({
  userId,accountType,artistName,fullName,documentNumber,contractVersion,contractText,readyToSign,existingRecord
}:Props) {
  const scrollRef=useRef<HTMLDivElement|null>(null)
  const [readToEnd,setReadToEnd]=useState(false)
  const [record,setRecord]=useState<ContractRecord|null>(existingRecord)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [phase,setPhase]=useState('')
  const isDone=record?.pdf_status==='ready'
  const hasSigned=!!record?.signed_at
  const pdfText=record?.contract_snapshot || contractText

  const updateScroll=useCallback(()=>{
    const el=scrollRef.current
    if (!el) return
    if (el.scrollHeight-el.scrollTop-el.clientHeight <= 8) setReadToEnd(true)
  },[])
  useEffect(()=>{
    // Quando toda a minuta cabe na caixa, ela já é integralmente visível.
    const timer=window.setTimeout(updateScroll,150)
    return ()=>window.clearTimeout(timer)
  },[updateScroll])

  const createAndUpload = async (accepted: ContractAcceptance) => {
    setError('')
    setPhase('Gerando PDF do contrato…')
    // html2pdf cria seu próprio contêiner temporário.
    // Não posicione o HTML em -100000px: isso produz um PDF branco de uma página.
    // O nó destacado é clonado pelo html2pdf e mantém todas as páginas legíveis.
    const printNode=createPdfNode(accepted,accountType)
    let blob:Blob
    try {
      const module=await import('html2pdf.js')
      const html2pdf=(module.default || module) as any
      const worker=html2pdf().set({
        margin: [10,10,12,10],
        filename:'contrato_assinado.pdf',
        image:{type:'jpeg',quality:0.97},
        html2canvas:{scale:1.7,backgroundColor:'#ffffff',useCORS:true},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
        pagebreak:{mode:['css','legacy']},
      }).from(printNode)
      blob = await worker.outputPdf('blob') as Blob
    } finally {
      printNode.remove()
    }
    if (!(blob instanceof Blob) || blob.type && blob.type !== 'application/pdf' || blob.size<200 || blob.size>10*1024*1024)
      throw new Error('Não foi possível gerar um PDF válido de até 10 MB.')
    setPhase('Salvando PDF no armazenamento privado…')
    const path=userId+'/contrato_assinado.pdf'
    const sb=createClient()
    const { error: uploadError }=await sb.storage.from('contracts')
      .upload(path,blob,{contentType:'application/pdf',cacheControl:'0',upsert:false})
    if (uploadError && !/already exists|duplicate|resource already exists/i.test(uploadError.message))
      throw new Error('O aceite foi registrado, mas o PDF não pôde ser salvo: '+uploadError.message)

    setPhase('Finalizando registro da assinatura…')
    const result=await finalizeContractPdf()
    if (!result.ok) throw new Error(result.error)
    setRecord(r=>r ? {...r,pdf_status:'ready'} : {
      ...accepted, contract_snapshot:accepted.contract_snapshot, pdf_status:'ready',
    })
    setPhase('')
  }

  const accept = async () => {
    if (!readToEnd || !readyToSign || busy || hasSigned) return
    setBusy(true);setError('');setPhase('Registrando aceite eletrônico…')
    try {
      const result=await acceptContract()
      if (!result.ok) {setError(result.error);return}
      const accepted=result.data
      setRecord({...accepted,contract_snapshot:accepted.contract_snapshot})
      await createAndUpload(accepted)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A assinatura foi registrada, mas houve falha ao gerar o PDF. Tente novamente.')
    } finally {setBusy(false);setPhase('')}
  }

  const retryPdf=async()=>{
    if(!record || busy)return
    setBusy(true);setError('')
    try {
      const result=await finalizeContractPdf()
      if(result.ok){setRecord({...record,pdf_status:'ready'});return}
      await createAndUpload({
        user_id:record.user_id,signed_at:record.signed_at,signed_name:record.signed_name,
        artist_name:record.artist_name,cpf:record.cpf,cnpj:record.cnpj,
        contract_snapshot:record.contract_snapshot || contractText,contract_version:record.contract_version || contractVersion,pdf_status:'pending',
      })
    }catch(e){setError(e instanceof Error?e.message:'Falha ao recuperar o PDF.')}
    finally{setBusy(false);setPhase('')}
  }

  const download=async()=>{
    if(busy)return
    setBusy(true);setError('')
    try{
      const result=await getSignedContractDownload()
      if(!result.ok){setError(result.error);return}
      const a=document.createElement('a')
      a.href=result.data.url;a.target='_blank';a.rel='noopener noreferrer'
      document.body.appendChild(a);a.click();a.remove()
    }catch{setError('Não foi possível obter o link temporário. Tente novamente.')}
    finally{setBusy(false)}
  }

  return <main className="sc-page"><div className="sc-wrap">
    <Link href="/" className="sc-brand"><img src="/sintone-logo.svg" alt="SINTONE"/></Link>
    {isDone ? <section className="sc-success">
      <div className="sc-success-icon"><CheckCircle2 size={42}/></div>
      <span className="sc-eyebrow">ASSINATURA REGISTRADA</span>
      <h1>Contrato assinado com sucesso</h1>
      <p>Seu aceite eletrônico foi registrado em {formattedDate(record.signed_at)} e o PDF está salvo em armazenamento privado.</p>
      <div className="sc-success-detail"><FileCheck2 size={23}/><div><strong>contrato_assinado.pdf</strong><small>Disponível para download com link temporário seguro</small></div></div>
      <button type="button" className="sc-primary" disabled={busy} onClick={download}><Download size={18}/> Baixar Contrato em PDF</button>
      <Link href="/dashboard" className="sc-secondary">Ir para o Dashboard</Link>
      <small className="sc-footnote">Após o PDF ser finalizado, a conta é liberada automaticamente para envio conforme os limites do plano.</small>
      {error && <p className="sc-error" role="alert">{error}</p>}
    </section> : <>
      <div className="sc-step"><span className="sc-step-done"><CheckCircle2 size={16}/> Dados concluídos</span><span className="sc-step-current">2 de 2 · Contrato e assinatura</span></div>
      <header className="sc-heading"><span className="sc-eyebrow">SINTONE · CONTRATO DIGITAL</span><h1>Leia e aceite seu contrato</h1>
        <p>Leia o documento até o final. A assinatura será associada à sua conta autenticada e ao documento informado no cadastro.</p></header>
      <div className="sc-card">
        <div className="sc-identity"><div><small>{accountType==='ARTIST'?'ARTISTA':'SELO'}</small><strong>{artistName}</strong></div>
          <div><small>NOME DO RESPONSÁVEL</small><strong>{fullName}</strong></div>
          <div><small>{accountType==='ARTIST'?'CPF':'CNPJ'}</small><strong>{documentNumber}</strong></div>
        </div>
        <div className="sc-contract-heading"><div><FileSignature size={21}/><strong>Contrato SINTONE</strong><small>Versão {contractVersion}</small></div>
          <span className={readToEnd ? 'sc-read-done' : 'sc-read-pending'}>{readToEnd ? 'Leitura completa' : 'Role até o final'}</span></div>
        <div className="sc-scroll" ref={scrollRef} onScroll={updateScroll} role="region" tabIndex={0} aria-label="Texto integral do contrato">
          <pre>{pdfText}</pre>
          <div className="sc-last-line">FIM DO CONTRATO</div>
        </div>
        {!readyToSign && !hasSigned && <div className="sc-draft" role="status">
          Esta versão é uma minuta em revisão. A assinatura só será liberada depois que a SINTONE preencher e aprovar os dados legais e comerciais do contrato.
        </div>}
        {hasSigned ? <div className="sc-resume">
          <CheckCircle2 size={20}/><div><strong>Seu aceite já foi registrado.</strong><p>Falta concluir ou recuperar o PDF para disponibilizar o download.</p></div>
        </div> : <p className="sc-hint">{readToEnd?'Você chegou ao fim do documento.':'Desça até o fim do texto para habilitar o aceite.'}</p>}
        {error && <p className="sc-error" role="alert">{error}</p>}
        {phase && <p className="sc-working" role="status"><LoaderCircle size={15} className="sc-spin"/>{phase}</p>}
        {hasSigned
          ? <button type="button" className="sc-primary" disabled={busy} onClick={retryPdf}>{busy?<LoaderCircle size={18} className="sc-spin"/>:<FileCheck2 size={18}/>} {busy?'Processando…':'Concluir geração do PDF'}</button>
          : <button type="button" className="sc-primary" disabled={!readToEnd || !readyToSign || busy} onClick={accept}>
            {busy?<LoaderCircle className="sc-spin" size={18}/>:<LockKeyhole size={18}/>}
            {busy?'Registrando assinatura…' :'Assinar e Aceitar Contrato'}
          </button>}
        <small className="sc-footnote">Ao aceitar, você manifesta concordância eletrônica com a versão exibida. Os dados de assinatura são registrados pelo servidor.</small>
      </div>
      <Link href="/dashboard" className="sc-return"><ChevronLeft size={16}/> Voltar ao painel</Link>
    </>}
  </div></main>
}
