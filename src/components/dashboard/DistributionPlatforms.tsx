'use client'
import {useEffect,useRef,useState} from 'react'
import {Check,Search,X} from 'lucide-react'
import {SINTONE_DSPS} from '@/lib/sintone-dsps'
import './distribution-platforms.css'

export type PlatformMode='all'|'selected'
type Props={
  mode:PlatformMode;onModeChange:(mode:PlatformMode)=>void;
  selected:string[];onSelectedChange:(selected:string[])=>void;
  error?:string
}

export default function DistributionPlatforms({mode,onModeChange,selected,onSelectedChange,error}:Props){
  const [open,setOpen]=useState(false)
  const [draft,setDraft]=useState<string[]>([])
  const [search,setSearch]=useState('')
  const [modalError,setModalError]=useState('')
  const dialog=useRef<HTMLDivElement>(null)

  const openDialog=()=>{
    setDraft([...selected]);setSearch('');setModalError('');setOpen(true)
  }
  useEffect(()=>{
    if(!open)return
    const old=document.body.style.overflow
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)}
    document.body.style.overflow='hidden'
    document.addEventListener('keydown',key)
    dialog.current?.focus()
    return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key)}
  },[open])
  const filtered=SINTONE_DSPS.filter(p=>p.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
  const toggle=(platform:string,checked:boolean)=>{
    setDraft(old=>checked?[...old,platform]:old.filter(p=>p!==platform))
    setModalError('')
  }
  const save=()=>{
    if(!draft.length){setModalError('Selecione pelo menos uma plataforma.');return}
    onSelectedChange(SINTONE_DSPS.filter(p=>draft.includes(p)))
    setOpen(false)
  }

  return <div className="sr-distribution">
    <h3>Escolha onde você quer distribuir sua música *</h3>
    <div className="sr-dsp-modes" role="radiogroup" aria-label="Modo de seleção das plataformas">
      <label className={mode==='all'?'sr-dsp-mode on':'sr-dsp-mode'}>
        <input type="radio" name="distributionMode" checked={mode==='all'} onChange={()=>onModeChange('all')}/>
        <span><strong>Todas as plataformas</strong><small>{SINTONE_DSPS.length} destinos disponíveis para seleção</small></span>
      </label>
      <label className={mode==='selected'?'sr-dsp-mode on':'sr-dsp-mode'}>
        <input type="radio" name="distributionMode" checked={mode==='selected'} onChange={()=>onModeChange('selected')}/>
        <span><strong>Apenas em plataformas selecionadas</strong><small>Escolha os destinos do lançamento</small></span>
      </label>
    </div>
    {mode==='selected'&&<div className="sr-dsp-summary">
      <button type="button" className="sr-dsp-open" onClick={openDialog}>Selecione as plataformas aqui <span>{selected.length} selecionadas</span></button>
      {!!selected.length&&<p className="sr-dsp-selected">{selected.join(', ')}</p>}
    </div>}
    {error&&<p className="sr-error" role="alert">{error}</p>}
    <p className="sr-help mut">Os destinos dependem da disponibilidade e das regras da parceira de distribuição; esta seleção não garante entrega automática.</p>

    {open&&<div className="sr-dsp-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}>
      <div className="sr-dsp-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="sr-dsp-title" tabIndex={-1}>
        <header className="sr-dsp-dialog-head">
          <div><h3 id="sr-dsp-title">Selecionar plataformas</h3><p>Marque os destinos desejados.</p></div>
          <button type="button" aria-label="Fechar janela" className="sr-dsp-close" onClick={()=>setOpen(false)}><X size={20}/></button>
        </header>
        <div className="sr-dsp-toolbar">
          <label className="sr-dsp-search"><Search size={17}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar plataforma" aria-label="Buscar plataforma"/></label>
          <button type="button" onClick={()=>{setDraft([...SINTONE_DSPS]);setModalError('')}}>Selecionar todas</button>
          <button type="button" onClick={()=>setDraft([])}>Limpar</button>
        </div>
        <div className="sr-dsp-list" role="group" aria-label="Lista de plataformas">
          {filtered.map(name=><label className="sr-dsp-item" key={name}>
            <input type="checkbox" checked={draft.includes(name)} onChange={e=>toggle(name,e.target.checked)}/>
            <span>{name}</span>{draft.includes(name)&&<Check size={15} aria-hidden="true"/>}
          </label>)}
          {!filtered.length&&<p className="mut">Nenhuma plataforma encontrada.</p>}
        </div>
        {modalError&&<p className="sr-error sr-dsp-validation" role="alert">{modalError}</p>}
        <footer className="sr-dsp-dialog-foot">
          <span>{draft.length} de {SINTONE_DSPS.length} plataformas</span>
          <button type="button" className="btn ghost" onClick={()=>setOpen(false)}>Cancelar</button>
          <button type="button" className="btn" onClick={save}>Salvar seleção</button>
        </footer>
      </div>
    </div>}
  </div>
}
