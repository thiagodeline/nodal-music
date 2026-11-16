'use client'

import {useEffect,useRef,useState} from 'react'
import {Check,ChevronLeft,ChevronRight,Music2,Plus,Trash2,UploadCloud,X,Info} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {uploadReleaseAsset} from '@/lib/upload-release-asset'
import WaveformPreview from './WaveformPreview'
import {isMetaStore} from '@/lib/dsp-catalog'
import {SubscriptionCardForm} from '@/components/billing/SubscriptionCardForm'
import {checkReleaseExtras} from '@/app/dashboard/billing-actions'
import {DspIcon} from './DspIcon'
import type {Data} from './ui'
import './release-wizard.css'
import './release-wizard-four.css'

type Format='single'|'ep'|'album'
type ArtistRole='primary'|'featured'|'remixer'
type Artist={key:string;profile_id:string;name:string;role:ArtistRole}
type Contributor={key:string;name:string;role:'featured'|'producer'|'composer'|'instrumentalist'|'remixer'|'engineer'}
type Track={
  key:string;title:string;isrc:string;file:File|null;featured_artists:string;
  contributors:Contributor[];composers:string;producers:string;lyricists:string;
  credits:string;explicit:boolean;language:string;genre:string;subgenre:string
}
type Profile={id:string;name:string}
type DspSetting={name:string;slug:string;is_extra:boolean;extra_fee:number;active:boolean;category:string}
type CurrentPlan={id:string;name:string;price_brl:number;monthly_releases_limit:number|null;max_artists:number;included_stores:string[];has_instagram_included:boolean;instagram_addon_fee:number}
const trackNew=():Track=>({
  key:crypto.randomUUID(),title:'',isrc:'',file:null,featured_artists:'',
  contributors:[],composers:'',producers:'',lyricists:'',credits:'',explicit:false,language:'pt',genre:'',subgenre:''
})
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})
const afterDays=(n:number)=>{
  const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n)
  return d.toISOString().slice(0,10)
}
const fmtTitle:Record<Format,string>={single:'Single',ep:'EP',album:'Álbum'}
const countValid=(f:Format,n:number)=>f==='single'?n===1:f==='ep'?n>=2&&n<=6:n>=7&&n<=100
const isrcValid=(s:string)=>!s||/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(s)
const text=(e:string)=>e.trim()
const sizeMB=(f:File)=>(f.size/1024/1024).toFixed(1)+' MB'

export default function NewRelease({d,reload}:{d:Data;reload:()=>void}) {
  const [step,setStep]=useState(0)
  useEffect(()=>{window.scrollTo({top:0,behavior:'smooth'})},[step])
  const [format,setFormat]=useState<Format>('single')
  const [artists,setArtists]=useState<Artist[]>([
    {key:'primary',profile_id:'',name:'',role:'primary'}
  ])
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [profilesLoading,setProfilesLoading]=useState(true)
  const [profilesError,setProfilesError]=useState(false)
  const [tracks,setTracks]=useState<Track[]>(()=>[trackNew()])
  const [activeTrack,setActiveTrack]=useState(0)
  const [title,setTitle]=useState('')
  const [genre,setGenre]=useState('')
  const [subgenre,setSubgenre]=useState('')
  const [date,setDate]=useState(afterDays(28))
  const [upc,setUpc]=useState('')
  const [label,setLabel]=useState('SINTONE')
  const [pHolder,setPHolder]=useState(d.me?.artist_name||'')
  const [cHolder,setCHolder]=useState(d.me?.artist_name||'')
  const [pYear,setPYear]=useState(new Date().getFullYear())
  const [cYear,setCYear]=useState(new Date().getFullYear())
  const [platformMode,setPlatformMode]=useState<'all'|'selected'>('all')
  const [currentPlan,setCurrentPlan]=useState<CurrentPlan|null>(null)
  const [planLoading,setPlanLoading]=useState(true)
  const [monthlyUsed,setMonthlyUsed]=useState(0)
  const [enableInstagram,setEnableInstagram]=useState(false)
  const [dspSettings,setDspSettings]=useState<DspSetting[]>([])
  const [dspLoading,setDspLoading]=useState(true)
  const [dspError,setDspError]=useState('')
  const [releaseMode,setReleaseMode]=useState<'local'|'global'>('local')
  const [territoryMode,setTerritoryMode]=useState<'world'|'selected'>('world')
  const [countries,setCountries]=useState<string[]>(['BR'])
  const [publishingRights,setPublishingRights]=useState(100)
  const [contentId,setContentId]=useState(false)
  const draftRestored=useRef(false)
  const [addonCheckout,setAddonCheckout]=useState(false)
  const [addonPaid,setAddonPaid]=useState(false)
  const releaseId=useRef<string>(crypto.randomUUID())
  const [platforms,setPlatforms]=useState<string[]>([])
  const allowedDSP=dspSettings.filter(x=>x.active&&
   (!currentPlan?.included_stores?.length||currentPlan.included_stores.includes(x.name)))
  const effectivePlatforms=allowedDSP.filter(x=>platforms.includes(x.name)).map(x=>x.name)
  const chargedDSP=allowedDSP.filter(x=>platforms.includes(x.name)&&x.is_extra&&
   Number(x.extra_fee)>0&&!(currentPlan?.has_instagram_included&&isMetaStore(x.name)))
  const extras=chargedDSP.map(x=>({name:x.name,fee:Number(x.extra_fee)}))
  const extraTotal=Math.round(extras.reduce((sum,x)=>sum+x.fee,0)*100)/100
  const [cover,setCover]=useState<File|null>(null)
  const [coverUrl,setCoverUrl]=useState('')
  const [errors,setErrors]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState(false)
  const [progress,setProgress]=useState('')
  const [generalError,setGeneralError]=useState('')
  const [rights,setRights]=useState(false)
  const [draftId,setDraftId]=useState<string|null>(null)
  const [draftMessage,setDraftMessage]=useState('')
  const current=tracks[activeTrack]||tracks[0]
  const uploadPaths=useRef<{bucket:'audio'|'covers';path:string}[]>([])
  const success=useRef(false)

  useEffect(()=>{
    let mounted=true
    const sb=createClient()
    sb.from('artist_profiles').select('id,name').eq('owner_id',d.me?.id).order('created_at').then(({data,error})=>{
      if(!mounted)return
      setProfilesLoading(false)
      setProfilesError(!!error)
      if(error){setGeneralError('Não foi possível carregar os artistas. Recarregue a página.');return}
      setProfiles(data||[])
    })
    return()=>{mounted=false}
  },[d.me?.id])
  useEffect(()=>{
    let active=true
    const sb=createClient()
    void (async()=>{
      try{
       const {data:id,error:identityError}=await sb.rpc('current_sintone_plan',{p_user:d.me.id})
       if(identityError||!id)throw Error('Plano ativo não localizado. Acesse Planos e confira seu acesso.')
       const now=new Date(),monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1))
       const [{data:plan,error:planError},{count,error:countError}]=await Promise.all([
        sb.from('billing_plans').select('id,name,price_brl,monthly_releases_limit,max_artists,included_stores,has_instagram_included,instagram_addon_fee').eq('id',id).single(),
        sb.from('releases').select('id',{count:'exact',head:true}).eq('artist_id',d.me.id).gte('created_at',monthStart.toISOString())
       ])
       if(planError||countError||!plan)throw Error('Não foi possível carregar os limites do plano.')
       if(active){setCurrentPlan(plan as CurrentPlan);setMonthlyUsed(count||0)}
      }catch(e){if(active)setGeneralError(e instanceof Error?e.message:'Erro ao verificar plano')}
      finally{if(active)setPlanLoading(false)}
    })()
    return()=>{active=false}
  },[d.me.id])
    useEffect(()=>{
   const id=sessionStorage.getItem('sintone_resume_release_draft')
   if(!id)return
   sessionStorage.removeItem('sintone_resume_release_draft')
   if(!/^[0-9a-f-]{36}$/i.test(id))return
   let active=true
   void createClient().from('release_drafts').select('id,data').eq('id',id).eq('user_id',d.me.id).single()
    .then(({data,error})=>{
     if(!active)return
     if(error||!data){setDraftMessage('Rascunho não encontrado.');return}
     const v=data.data as Record<string,any>
     draftRestored.current=true
     setDraftId(id)
     if(['single','ep','album'].includes(v.format))setFormat(v.format)
     if(Array.isArray(v.artists))setArtists(v.artists)
     if(Array.isArray(v.tracks)&&v.tracks.length)setTracks(v.tracks.map((t:any)=>({...trackNew(),...t,key:t.key||crypto.randomUUID(),file:null})))
     setTitle(v.title||'');setGenre(v.genre||'');setSubgenre(v.subgenre||'')
     setDate(v.date||afterDays(28));setUpc(v.upc||'');setLabel(v.label||'SINTONE')
     setPHolder(v.pHolder||'');setCHolder(v.cHolder||'')
     setPYear(Number(v.pYear)||new Date().getFullYear());setCYear(Number(v.cYear)||new Date().getFullYear())
     if(v.platformMode==='selected')setPlatformMode('selected')
     if(Array.isArray(v.platforms))setPlatforms(v.platforms)
     setEnableInstagram(!!v.enableInstagram);setRights(!!v.rights)
     if(v.releaseMode==='global')setReleaseMode('global')
     if(v.territoryMode==='selected')setTerritoryMode('selected')
     if(Array.isArray(v.countries))setCountries(v.countries)
     if(Number.isFinite(Number(v.publishingRights)))setPublishingRights(Number(v.publishingRights))
     setContentId(!!v.contentId)
     setDraftMessage('Metadados restaurados. Selecione novamente os arquivos de áudio e capa.')
    })
   return()=>{active=false}
  },[d.me.id])
  useEffect(()=>{
   if(!currentPlan)return
   let active=true
   void createClient().from('dsp_settings').select('name,slug,is_extra,extra_fee,active,category').eq('active',true).order('name')
    .then(({data,error})=>{
     if(!active)return
     if(error||!data){setDspError('Não foi possível carregar as plataformas.');setDspLoading(false);return}
     const list=data as DspSetting[]
     setDspSettings(list)
     if(!draftRestored.current)setPlatforms(list.filter(x=>
      (!currentPlan.included_stores.length||currentPlan.included_stores.includes(x.name))&&!x.is_extra).map(x=>x.name))
     setDspLoading(false)
    })
   return()=>{active=false}
  },[currentPlan?.id])
  useEffect(()=>()=>{if(coverUrl)URL.revokeObjectURL(coverUrl)},[coverUrl])

  const editArtist=(key:string,part:Partial<Artist>)=>setArtists(a=>a.map(x=>x.key===key?{...x,...part}:x))
  const editTrack=(key:string,part:Partial<Track>)=>setTracks(a=>a.map(x=>x.key===key?{...x,...part}:x))
  const err=(key:string)=>errors[key]&&<small className="sr-error" role="alert">{errors[key]}</small>
  const show=(key:string)=>errors[key]?'sr-input-error':''
  const addArtist=()=>{if(artists.length>=20)return;setArtists(a=>[...a,{key:crypto.randomUUID(),profile_id:'',name:'',role:'featured'}])}
  const changeFormat=(value:Format)=>{
    const min=value==='single'?1:value==='ep'?2:7
    const max=value==='single'?1:value==='ep'?6:100
    if(tracks.length>max&&!confirm('Mudar o formato removerá as faixas excedentes e seus arquivos selecionados. Continuar?'))return
    setFormat(value)
    setTracks(old=>{
      let next=old.slice(0,max)
      while(next.length<min)next=[...next,trackNew()]
      return next
    })
    setActiveTrack(0);setErrors({});setGeneralError('')
  }
  const addTrack=()=>{if(tracks.length>=(format==='single'?1:format==='ep'?6:100))return
    setTracks(v=>[...v,trackNew()]);setActiveTrack(tracks.length)
  }
  const removeTrack=(key:string)=>{
    const min=format==='single'?1:format==='ep'?2:7
    if(tracks.length<=min)return
    const idx=tracks.findIndex(x=>x.key===key)
    setTracks(v=>v.filter(x=>x.key!==key));setActiveTrack(Math.max(0,Math.min(activeTrack,tracks.length-2)))
    if(idx===activeTrack)setGeneralError('')
  }
  const selectProfile=(a:Artist,profileId:string)=>{
    const p=profiles.find(x=>x.id===profileId)
    editArtist(a.key,{profile_id:p?.id||'',name:p?.name||''})
  }
  const selectAudio=(key:string,f?:File)=>{
    if(!f)return
    if(!/\.(wav|flac)$/i.test(f.name)||f.size<1000||f.size>250*1024*1024){
      setGeneralError('O áudio deve ser WAV ou FLAC, entre 1 KB e 250 MB. Confirme também o limite do seu plano Supabase.');return
    }
    editTrack(key,{file:f});setGeneralError('')
  }
  const selectCover=async(f?:File)=>{
    if(!f)return
    if(!/\.(jpe?g|png)$/i.test(f.name)||!['image/jpeg','image/png'].includes(f.type)||f.size>15*1024*1024){
      setErrors(v=>({...v,cover:'Envie um JPG ou PNG de até 15 MB.'}));return
    }
    const url=URL.createObjectURL(f)
    try{
      const pic=new Image()
      await new Promise<void>((resolve,reject)=>{
        pic.onload=()=>resolve();pic.onerror=()=>reject(new Error('Imagem inválida.'));pic.src=url
      })
      if(pic.naturalWidth!==3000||pic.naturalHeight!==3000)throw Error('A capa deve ter exatamente 3000 × 3000 pixels.')
      let file=f
      if(f.type==='image/png'){
       const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=3000
       const context=canvas.getContext('2d')
       if(!context)throw Error('Não foi possível converter a capa.')
       context.fillStyle='#ffffff';context.fillRect(0,0,3000,3000);context.drawImage(pic,0,0)
       const jpeg=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.94))
       if(!jpeg||jpeg.size>15*1024*1024)throw Error('Capa convertida ultrapassa 15 MB.')
       file=new File([jpeg],f.name.replace(/\.png$/i,'.jpg'),{type:'image/jpeg'})
      }
      setCover(file);setCoverUrl(url);setErrors(v=>({...v,cover:''}))
    }catch(e){URL.revokeObjectURL(url);setErrors(v=>({...v,cover:e instanceof Error?e.message:'Capa inválida.'}))}
  }

  function check(stepIndex:number){
   const found:Record<string,string>={}
   if(stepIndex===0){
    if(text(genre).length<2)found.genre='Informe o gênero do lançamento.'
    if(format!=='single'&&!text(title))found.title='Informe o título do EP ou Álbum.'
    if(profilesLoading||profilesError||!profiles.length)found.artists='Cadastre um artista antes de continuar.'
    if(artists.filter(x=>x.role==='primary').length!==1)found.artists='Escolha um artista principal.'
    artists.forEach(a=>{if(!a.profile_id||!profiles.some(p=>p.id===a.profile_id&&p.name===a.name))
     found['artist.'+a.key]='Selecione um artista cadastrado.'})
    if(!countValid(format,tracks.length))found.count='Quantidade de faixas inválida para '+fmtTitle[format]+'.'
    const seen=new Set<string>()
    tracks.forEach((t,i)=>{
     const key='track.'+t.key+'.',code=t.isrc.replace(/-/g,'').toUpperCase().trim()
     if(!text(t.title))found[key+'title']='Informe o título da faixa '+(i+1)
     if(!isrcValid(code)||(code&&seen.has(code)))found[key+'isrc']='ISRC inválido ou repetido.'
     if(code)seen.add(code)
     if(!t.file)found[key+'audio']='Envie áudio WAV/FLAC.'
     if(text(t.composers).length<2)found[key+'composers']='Informe os compositores.'
     if(t.contributors.some(c=>!text(c.name)))found[key+'contributors']='Preencha os colaboradores.'
    })
    if(!cover)found.cover='Envie uma capa de 3000 × 3000 px.'
   }
   if(stepIndex===1){
    if(date<afterDays(14)||date>afterDays(1095))found.date='Escolha uma data a partir de 14 dias.'
    if(upc&&!/^\d{12,13}$/.test(upc.replace(/\s/g,'')))found.upc='UPC/EAN inválido.'
    if(!text(label)||text(label).length<2)found.label='Informe o selo.'
    if(!effectivePlatforms.length)found.platforms='Selecione pelo menos uma plataforma.'
    if(dspLoading||dspError)found.platforms=dspError||'Aguarde as plataformas.'
    if(!currentPlan||planLoading)found.plan='Não foi possível carregar o seu plano.'
    if(currentPlan?.monthly_releases_limit!=null&&monthlyUsed>=currentPlan.monthly_releases_limit)found.plan='Limite mensal de lançamentos atingido.'
    if(territoryMode==='selected'&&!countries.length)found.territories='Escolha pelo menos um país.'
    if(extraTotal>100000)found.platforms='O total de extras excede o limite permitido.'
   }
   if(stepIndex===2){
    if(!text(pHolder)||!text(cHolder))found.copyright='Informe os titulares de direitos.'
    if(!Number.isInteger(pYear)||pYear<1900||pYear>2200||!Number.isInteger(cYear)||cYear<1900||cYear>2200)found.copyright='Ano de copyright inválido.'
    if(!Number.isFinite(publishingRights)||publishingRights<0||publishingRights>100)found.publishingRights='Porcentagem de direitos inválida.'
    if(!rights)found.rights='Confirme os direitos e autorizações.'
   }
   setErrors(found)
   return Object.keys(found).length===0
  }
  const next=()=>{
   setGeneralError('')
   if(!check(step))return
   if(step===0&&format==='single')setTitle(tracks[0]?.title||'')
   setStep(i=>Math.min(3,i+1))
  }
  async function saveDraft(){
   if(busy)return
   setDraftMessage('')
   const payload={
    format,artists,tracks:tracks.map(({file,...t})=>t),title:format==='single'?tracks[0]?.title||'':title,genre,subgenre,date,upc,label,
    pHolder,cHolder,pYear,cYear,platformMode,platforms,enableInstagram,rights,
    releaseMode,territoryMode,countries,publishingRights,contentId
   }
   const record={user_id:d.me.id,title:title.trim()||tracks[0]?.title||'Sem título',
    data:payload,updated_at:new Date().toISOString()}
   const sb=createClient()
   const result=draftId?await sb.from('release_drafts').update(record).eq('id',draftId).eq('user_id',d.me.id).select('id').single():
    await sb.from('release_drafts').insert(record).select('id').single()
   setDraftMessage(result.error?result.error.message:'Rascunho salvo.')
   if(!result.error)setDraftId(result.data?.id||draftId)
  }
  async function send(){
    for(let i=0;i<3;i++)if(!check(i)){setStep(i);return}
    if(busy)return
    if(extraTotal>0&&!addonPaid){
     const paid=await checkReleaseExtras(releaseId.current)
     if(!paid){setAddonCheckout(true);setGeneralError('Pague os extras por Pix e confirme antes do envio.');return}
     setAddonPaid(true)
    }
    setBusy(true);setGeneralError('');setProgress('Autenticando...')
    success.current=false;uploadPaths.current=[]
    const client=createClient()
    try{
      const {data:{user},error:authErr}=await client.auth.getUser()
      if(authErr||!user)throw new Error('Sessão expirada. Entre novamente.')
      const id=releaseId.current
      const coverPath=user.id+'/'+id+'/cover.jpg'
      setProgress('Enviando a capa...')
      uploadPaths.current.push({bucket:'covers',path:coverPath})
      await uploadReleaseAsset('covers',coverPath,cover!,p=>setProgress('Capa: '+p+'%'))
      const payloadTracks=[]
      for(let i=0;i<tracks.length;i++){
        const t=tracks[i],ext=/\.flac$/i.test(t.file!.name)?'flac':'wav'
        const audioPath=user.id+'/'+id+'/tracks/'+String(i+1).padStart(2,'0')+'.'+ext
        uploadPaths.current.push({bucket:'audio',path:audioPath})
        await uploadReleaseAsset('audio',audioPath,t.file!,p=>setProgress('Faixa '+(i+1)+'/'+tracks.length+': '+p+'%'))
        payloadTracks.push({
          title:t.title.trim(),isrc:t.isrc.replace(/-/g,'').toUpperCase().trim(),
          audio_path:audioPath,featured_artists:t.featured_artists.trim(),
          composers:t.composers.trim(),producers:t.producers.trim(),
          lyricists:t.lyricists.trim(),credits:t.credits.trim(),
          explicit:t.explicit,language:t.language,
          contributors:t.contributors.map(c=>({name:c.name.trim(),role:c.role}))
        })
      }
      setProgress('Registrando lançamento e enviando para revisão...')
      const payload={
        id,type:format,title:(format==='single'?tracks[0]?.title||'':title).trim(),genre:genre.trim(),
        subgenre:subgenre.trim(),release_date:date,upc:upc.replace(/\s/g,''),
        artists:artists.map(a=>({profile_id:a.profile_id,name:a.name.trim(),role:a.role})),
        tracks:payloadTracks,cover_path:coverPath,rights_confirmed:rights,
        label_name:label.trim(),p_line:'℗ '+pYear+' '+pHolder.trim(),
        c_line:'© '+cYear+' '+cHolder.trim(),platforms:effectivePlatforms
      }
      const response=await fetch('/api/releases',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const result=await response.json()
      if(!response.ok||result.id!==id)throw new Error(result.error||'O cadastro não foi confirmado. Confira seu catálogo.')
      success.current=true
      if(draftId)await client.from('release_drafts').delete().eq('id',draftId).eq('user_id',user.id)
      setProgress('Lançamento recebido! Aguarde a revisão da SINTONE.')
      reload()
      location.hash='#catalog'
    }catch(e){
      setGeneralError(e instanceof Error?e.message:'Não foi possível enviar o lançamento.')
      // Do not remove files if a record was committed successfully.
      if(!success.current) {
        for(const item of [...uploadPaths.current].reverse()){
          await client.storage.from(item.bucket).remove([item.path]).catch(()=>undefined)
        }
      }
    }finally{setBusy(false)}
  }

  const roleTitle:Record<ArtistRole,string>={primary:'Artista principal',featured:'Participação / feat.',remixer:'Remixer'}
  const contribTitle:Record<Contributor['role'],string>={
    featured:'Participação',producer:'Produtor',composer:'Compositor',
    instrumentalist:'Instrumentista',remixer:'Remixer',engineer:'Eng. áudio'
  }
  const days=date?Math.round((new Date(date+'T12:00:00Z').getTime()-new Date(today()+'T12:00:00Z').getTime())/86400000):0
  const planning=days>=28?{label:'Janela recomendada para planejamento',tone:'good'}:
    days>=14?{label:'Prazo reduzido para divulgação',tone:'warn'}:
    {label:'Pouco tempo para revisão e divulgação',tone:'bad'}
  const stepTitles=['Informações da faixa / álbum','Configurações de lançamento','Direitos e monetização','Revisão e envio']
  const countriesOptions=[["BR","Brasil"],["US","Estados Unidos"],["PT","Portugal"],["AR","Argentina"],["MX","México"],["FR","França"],["DE","Alemanha"],["GB","Reino Unido"],["ES","Espanha"],["CA","Canadá"],["JP","Japão"],["AO","Angola"]] as const
  const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  const changePlatform=(name:string,checked:boolean)=>{
    if(addonPaid)return
    setPlatforms(prev=>checked?[...prev,name]:prev.filter(x=>x!==name))
  }
  return <div className="sr sr-four">
   <header className="sr-header sr-four-header">
    <span className="sr-kicker">DISTRIBUIÇÃO DIGITAL · SINTONE</span>
    <h2>Novo lançamento</h2>
    <p>Envie seu Single, EP ou Álbum para revisão.</p>
   </header>
   <div className="sr-four-shell">
    <aside className="sr-four-side" aria-label="Etapas do lançamento">
     <span className="sr-four-side-label">SEU LANÇAMENTO</span>
     {stepTitles.map((label,i)=><button type="button" key={label} disabled={busy||i>step}
       className={'sr-four-nav '+(i===step?'active':i<step?'completed':'')}
       aria-current={i===step?'step':undefined}
       onClick={()=>{if(i<step){setStep(i);setErrors({})}}}>
       <span className="sr-four-step-circle">{i<step?<Check size={16}/>:i+1}</span>
       <span>{label}</span>
     </button>)}
     <div className="sr-four-side-foot"><Info size={17}/> Informações e arquivos são salvos apenas ao clicar em Salvar rascunho ou Enviar.</div>
    </aside>
    <div className="sr-four-work">
     <div className="sr-four-stage-head"><span>ETAPA {step+1} DE 4</span><h3>{stepTitles[step]}</h3></div>
     {step===0&&format!=='single'&&<div className="card sr-panel">
      <h3>Título do EP ou Álbum</h3>
      <label>Nome do lançamento<input value={title} maxLength={160} onChange={e=>setTitle(e.target.value)} placeholder="Título do projeto"/></label>
     </div>}
     {step===0&&<section className="card sr-panel">
      <h3>Qual o formato do lançamento?</h3>
      <div className="sr-formats">
        {(['single','ep','album'] as Format[]).map(f=><button type="button" key={f}
          className={format===f?'sr-format selected':'sr-format'} onClick={()=>changeFormat(f)} disabled={busy}>
          <Music2 size={23}/><strong>{fmtTitle[f]}</strong>
          <small>{f==='single'?'1 faixa':f==='ep'?'2 a 6 faixas':'7 ou mais faixas'}</small>
        </button>)}
      </div>
      <h3>Gênero do lançamento</h3>
       <div className="sr-grid">
        <label>Gênero *<input value={genre} maxLength={120} placeholder="Rap / Hip-hop" className={show('genre')} onChange={e=>setGenre(e.target.value)}/>{err('genre')}</label>
        <label>Subgênero<input value={subgenre} maxLength={120} placeholder="Boom bap, Trap..." onChange={e=>setSubgenre(e.target.value)}/></label>
       </div>
       {err('title')}
       <h3>Dados dos artistas</h3>
      <p className="mut">Selecione exclusivamente artistas cadastrados em “Meus Artistas”. Cada participante precisa de uma função.</p>
      {!profilesLoading&&!profilesError&&profiles.length===0&&<div className="sr-artist-alert" role="alert">Você precisa cadastrar pelo menos um artista em 'Meus Artistas' para criar um lançamento</div>}
      {profilesLoading&&<p className="mut" role="status">Carregando artistas cadastrados...</p>}
      {profilesError&&<p className="sr-error" role="alert">Não foi possível carregar os artistas. Recarregue a página.</p>}
      {artists.map((a,i)=><div className="sr-artist-row" key={a.key}>
        <span className="sr-num">{i+1}</span>
        <label>Perfil artístico
          <select value={a.profile_id} onChange={e=>selectProfile(a,e.target.value)}>
            <option value="" disabled>Selecione um artista cadastrado</option>
            {profiles.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
          </select></label>
        <label>Nome do artista
          <input value={a.name} className={show('artist.'+a.key)} readOnly aria-readonly="true" placeholder="Selecione um perfil artístico"/>
          {err('artist.'+a.key)}
        </label>
        <label>Função
          <select value={a.role} onChange={e=>editArtist(a.key,{role:e.target.value as ArtistRole})}>
            {(Object.keys(roleTitle) as ArtistRole[]).map(k=><option key={k} value={k}>{roleTitle[k]}</option>)}
          </select></label>
        {i>0&&<button type="button" className="sr-icon" aria-label="Remover artista" onClick={()=>setArtists(v=>v.filter(x=>x.key!==a.key))}><Trash2 size={17}/></button>}
      </div>)}
      {err('artists')}
      <button type="button" className="btn ghost sm" onClick={addArtist} disabled={artists.length>=20||profilesLoading||profilesError||!profiles.length}><Plus size={15}/> Adicionar artista</button>
    </section>}
     {step===0&&<section className="card sr-panel">
      <div className="sr-section-top"><div><h3>Dados das músicas</h3><p className="mut">{fmtTitle[format]} · {tracks.length} {tracks.length===1?'faixa':'faixas'}</p></div>
        {format!=='single'&&<button type="button" className="btn ghost sm" onClick={addTrack}
          disabled={tracks.length>=(format==='ep'?6:100)}><Plus size={15}/> Adicionar faixa</button>}</div>
      <div className="sr-track-tabs" role="tablist" aria-label="Selecionar faixa">
        {tracks.map((t,i)=><button type="button" role="tab" aria-selected={i===activeTrack}
          className={i===activeTrack?'selected':''} key={t.key} onClick={()=>setActiveTrack(i)}>
          {i+1}. {t.title.trim()||'Sem título'}
          {!t.file&&<span className="sr-dot"/>}
        </button>)}
      </div>
      {err('count')}
      {current&&<div className="sr-track-form" key={current.key}>
        <div className="sr-section-top"><h3>Faixa {activeTrack+1}</h3>
          {format!=='single'&&<button type="button" className="sr-icon" title="Remover esta faixa"
            disabled={tracks.length<=(format==='ep'?2:7)} onClick={()=>removeTrack(current.key)}><Trash2 size={17}/></button>}</div>
        <div className="sr-grid">
          <label>Título da música *
            <input value={current.title} className={show('track.'+current.key+'.title')} maxLength={160}
              onChange={e=>editTrack(current.key,{title:e.target.value})}/>
            {err('track.'+current.key+'.title')}</label>
          <label>ISRC (opcional)
            <input placeholder="BRABC2600001" maxLength={15} value={current.isrc}
              className={show('track.'+current.key+'.isrc')}
              onChange={e=>editTrack(current.key,{isrc:e.target.value.toUpperCase()})}/>
            {err('track.'+current.key+'.isrc')}</label>
        </div>
        <div className="sr-grid">
          <label>Gênero da faixa<input value={current.genre} placeholder={genre||'Rap / Hip-hop'} maxLength={120}
           onChange={e=>editTrack(current.key,{genre:e.target.value})}/></label>
          <label>Subgênero da faixa<input value={current.subgenre} placeholder={subgenre||'Boom bap, Trap...'} maxLength={120}
           onChange={e=>editTrack(current.key,{subgenre:e.target.value})}/></label>
        </div>
        <label className="sr-upload"><UploadCloud size={20}/> Áudio WAV ou FLAC *
          <input type="file" accept=".wav,.flac,audio/wav,audio/flac" onChange={e=>selectAudio(current.key,e.target.files?.[0])}/>
          <small>{current.file?current.file.name+' · '+sizeMB(current.file):'Nenhum áudio selecionado (até 250 MB por faixa; sujeito ao limite do Storage).'}</small>
          {err('track.'+current.key+'.audio')}
        </label>
        <WaveformPreview file={current.file}/>
        <h4>Créditos e direitos autorais</h4>
        <div className="sr-notice">Informe os autores reais da composição. Ter permissão para usar um beat não significa ser dono de sua composição ou dos samples. Antes de distribuir, obtenha licenças e autorizações necessárias.</div>
        <div className="sr-grid">
          <label>Compositores (nomes completos) *
            <input value={current.composers} maxLength={700} className={show('track.'+current.key+'.composers')}
              onChange={e=>editTrack(current.key,{composers:e.target.value})}/>
            {err('track.'+current.key+'.composers')}</label>
          <label>Produtores
            <input value={current.producers} maxLength={700} onChange={e=>editTrack(current.key,{producers:e.target.value})}/></label>
          <label>Letristas
            <input value={current.lyricists} maxLength={700} onChange={e=>editTrack(current.key,{lyricists:e.target.value})}/></label>
          <label>Participações nesta faixa
            <input value={current.featured_artists} maxLength={350} onChange={e=>editTrack(current.key,{featured_artists:e.target.value})}
              placeholder="Nome artístico dos feats"/></label>
          <label>Idioma da letra
            <select value={current.language} onChange={e=>editTrack(current.key,{language:e.target.value})}>
              <option value="pt">Português</option><option value="en">Inglês</option>
              <option value="es">Espanhol</option><option value="fr">Francês</option>
              <option value="instrumental">Instrumental (sem letra)</option>
              <option value="it">Italiano</option><option value="de">Alemão</option><option value="ja">Japonês</option><option value="ko">Coreano</option><option value="zh">Chinês</option>
            </select></label>
          <label>Outros créditos
            <textarea rows={2} value={current.credits} maxLength={2000}
              onChange={e=>editTrack(current.key,{credits:e.target.value})} placeholder="Mixagem, masterização, instrumentistas..."/></label>
        </div>
        <label className="sr-check"><input type="checkbox" checked={current.explicit}
          onChange={e=>editTrack(current.key,{explicit:e.target.checked})}/> Esta faixa contém linguagem ou conteúdo explícito</label>
        <h4>Colaboradores adicionais</h4>
        {current.contributors.map(c=><div className="sr-contributor" key={c.key}>
          <input value={c.name} placeholder="Nome do colaborador" maxLength={120}
            onChange={e=>editTrack(current.key,{contributors:current.contributors.map(z=>z.key===c.key?{...z,name:e.target.value}:z)})}/>
          <select value={c.role} onChange={e=>editTrack(current.key,{contributors:current.contributors.map(z=>z.key===c.key?{...z,role:e.target.value as Contributor['role']}:z)})}>
            {(Object.keys(contribTitle) as Contributor['role'][]).map(role=><option key={role} value={role}>{contribTitle[role]}</option>)}
          </select>
          <button type="button" className="sr-icon" aria-label="Remover colaborador" onClick={()=>editTrack(current.key,{contributors:current.contributors.filter(z=>z.key!==c.key)})}><Trash2 size={17}/></button>
        </div>)}
        {err('track.'+current.key+'.contributors')}
        <button type="button" className="btn ghost sm" disabled={current.contributors.length>=30} onClick={()=>editTrack(current.key,{contributors:[...current.contributors,{key:crypto.randomUUID(),name:'',role:'producer'}]})}><Plus size={15}/> Adicionar colaborador</button>
      </div>}
      <p className="mut sr-help">ISRC opcional: quando não informado, a equipe verifica a necessidade de atribuir um código durante a revisão.</p>
    </section>}
     {step===0&&<section className="card sr-panel">
      <h3>Capa do lançamento *</h3>
      <label className="sr-cover-picker">
        {coverUrl?<img src={coverUrl} alt="Prévia da capa do lançamento"/>:<UploadCloud size={27}/>}
        <span>{cover?cover.name:'Selecionar capa JPG/PNG · 3000×3000 px · até 15 MB'}</span>
        <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={e=>void selectCover(e.target.files?.[0])}/>
      </label>
      {err('cover')}
      
      <p className="sr-cover-guidance"><Info size={16}/> Capa quadrada em 3000 × 3000 px, até 15 MB. Sem URLs, QR Codes, logos de serviços de streaming ou conteúdo sem autorização. PNG é convertido para JPG antes do envio.</p>
     </section>}
     {step===1&&<section className="card sr-panel">
      <h3>Dados de distribuição</h3>
       <div className="sr-grid">
        <label>Data de lançamento (mínimo 14 dias) *
         <input type="date" min={afterDays(14)} max={afterDays(1095)} value={date} className={show('date')} onChange={e=>setDate(e.target.value)}/>
         {err('date')}</label>
        <label>Nome do selo *
         <input value={label} maxLength={150} className={show('label')} onChange={e=>setLabel(e.target.value)}/>
         {err('label')}</label>
       </div>
       <div className={'sr-date-badge '+planning.tone}>{planning.label} · {Math.max(days,0)} dias até o lançamento.</div>
       <h3>Horário do lançamento</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sr-four-choice-grid">
       <label className="sr-four-choice p-4 border rounded-xl flex items-start gap-3 cursor-pointer hover:border-blue-500"><input type="radio" name="releaseMode" checked={releaseMode==='local'} onChange={()=>setReleaseMode('local')}/>
        <span><strong>Lançamento Local</strong><small>00:00 no horário de cada país</small></span></label>
       <label className="sr-four-choice p-4 border rounded-xl flex items-start gap-3 cursor-pointer hover:border-blue-500"><input type="radio" name="releaseMode" checked={releaseMode==='global'} onChange={()=>setReleaseMode('global')}/>
        <span><strong>Lançamento Global</strong><small>Mesmo instante em todo o mundo (sujeito à disponibilidade das lojas)</small></span></label>
      </div>
      <h3>Territórios</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sr-four-choice-grid">
       <label className="sr-four-choice p-4 border rounded-xl flex items-start gap-3 cursor-pointer hover:border-blue-500"><input type="radio" name="territoryMode" checked={territoryMode==='world'} onChange={()=>setTerritoryMode('world')}/> Mundo inteiro</label>
       <label className="sr-four-choice p-4 border rounded-xl flex items-start gap-3 cursor-pointer hover:border-blue-500"><input type="radio" name="territoryMode" checked={territoryMode==='selected'} onChange={()=>setTerritoryMode('selected')}/> Países selecionados</label>
      </div>
      {territoryMode==='selected'&&<div className="sr-territory-grid">
       {countriesOptions.map(([code,country])=><label key={code}><input type="checkbox" checked={countries.includes(code)} onChange={e=>setCountries(prev=>e.target.checked?[...prev,code]:prev.filter(x=>x!==code))}/>{country}</label>)}
      </div>}
      {err('territories')}
      <h3>Plataformas de distribuição</h3>
      <p className="mut">Lojas incluídas vêm selecionadas. Extras exigem confirmação de pagamento antes do envio.</p>
      {dspLoading&&<p className="mut">Carregando lojas disponíveis...</p>}
      {dspError&&<p className="sr-error" role="alert">{dspError}</p>}
      {([
         {key:'streaming',title:'Plataformas de streaming',items:allowedDSP.filter(x=>!x.is_extra&&x.category!=='social'&&!isMetaStore(x.name))},
         {key:'social',title:'Plataformas sociais',items:allowedDSP.filter(x=>!x.is_extra&&(x.category==='social'||isMetaStore(x.name)))},
         {key:'extras',title:'Plataformas extras',items:allowedDSP.filter(x=>x.is_extra)}
        ] as const).map(group=><details className="sr-dsp-accordion" key={group.key} open={group.key==='streaming'}>
         <summary>{group.title}<span>{group.items.length} plataformas</span></summary>
         <div className="sr-dsp-grid">
          {group.items.map(x=>{
           const instagram=isMetaStore(x.name)
           const fee=currentPlan?.has_instagram_included&&instagram?0:
            x.is_extra&&Number(x.extra_fee)>0&&!(instagram&&currentPlan?.has_instagram_included)?Number(x.extra_fee):0
           return <label className={'sr-dsp-option '+(group.key==='extras'?'extra ':'')+(platforms.includes(x.name)?'checked':'')} key={x.slug}>
            <input type="checkbox" checked={platforms.includes(x.name)} disabled={addonPaid} onChange={e=>changePlatform(x.name,e.target.checked)}/>
            <DspIcon name={instagram?'Instagram':x.name}/><span className="sr-dsp-name">{instagram?'Instagram':x.name}</span>
            {group.key==='extras'&&<small className="sr-dsp-price">{fee>0?'+ '+money(fee):'Incluído'}</small>}
           </label>
          })}
          {!group.items.length&&<p className="mut">Nenhuma plataforma disponível nesta categoria.</p>}
         </div>
       </details>)}
       {currentPlan&&<p className="mut">Plano {currentPlan.name} · {monthlyUsed} de {currentPlan.monthly_releases_limit??'ilimitados'} lançamentos utilizados neste mês.</p>}
      {err('platforms')}{err('plan')}
      <div className="sr-four-total"><div><strong>Total adicional de plataformas extras</strong><small>Valor cobrado uma única vez por lançamento, via Pix</small></div><strong>{money(extraTotal)}</strong></div>
     </section>}
     {step===2&&<section className="card sr-panel">
      <h3>Copyright fonográfico e autoral</h3>
      <div className="sr-grid">
        <label>℗ Ano da gravação
          <input type="number" min={1900} max={2200} value={pYear} onChange={e=>setPYear(Number(e.target.value))}/></label>
        <label>℗ Titular da gravação
          <input maxLength={150} value={pHolder} onChange={e=>setPHolder(e.target.value)}/></label>
        <label>© Ano da obra/arte
          <input type="number" min={1900} max={2200} value={cYear} onChange={e=>setCYear(Number(e.target.value))}/></label>
        <label>© Titular da obra/arte
          <input maxLength={150} value={cHolder} onChange={e=>setCHolder(e.target.value)}/></label>
      </div>
      {err('copyright')}
      
      <h3>Direitos de publicação</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sr-four-choice-grid">
       {[100,0,-1].map(v=><label key={v} className="sr-four-choice p-4 border rounded-xl flex items-start gap-3 cursor-pointer hover:border-blue-500"><input type="radio" name="publishing" checked={v<0?![0,100].includes(publishingRights):publishingRights===v}
         onChange={()=>setPublishingRights(v<0?50:v)}/>{v<0?'Outro':v+'%'}</label>)}
      </div>
      {![0,100].includes(publishingRights)&&<label>Percentual de direitos de publicação<input type="number" min={0} max={100} step=".01" value={publishingRights} onChange={e=>setPublishingRights(Number(e.target.value))}/></label>}
      {err('publishingRights')}
      <h3>YouTube Content ID e monetização</h3>
      <label className="sr-four-switch"><input type="checkbox" checked={contentId} onChange={e=>setContentId(e.target.checked)}/>
       <span><strong>Solicitar YouTube Content ID</strong><small>Registrar a solicitação para análise da equipe da SINTONE</small></span></label>
      {contentId&&<div className="sr-notice"><Info size={16}/> O Content ID pode identificar usos de gravações por terceiros. A elegibilidade depende da titularidade exclusiva, de autorizações e das regras do YouTube. Marcar esta opção não ativa monetização automaticamente.</div>}
      <label className="sr-check"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> Confirmo que possuo os direitos e autorizações necessários para distribuir o áudio, a obra, os samples e a capa.</label>
      {err('rights')}
     </section>}
     {step===3&&<section className="card sr-panel">
      <h3>Revisar lançamento antes de enviar</h3>
      <div className="sr-four-review-cover">{coverUrl?<img src={coverUrl} alt="Capa do lançamento"/>:<Music2 size={35}/>}
       <div><strong>{title||'Sem título'}</strong><small>{fmtTitle[format]} · {tracks.length} faixa(s)</small>
        <small>{artists.find(a=>a.role==='primary')?.name||'Artista não informado'}</small></div></div>
      <h3>Revisão</h3>
      <div className="sr-summary">
        <span><strong>Formato</strong>{fmtTitle[format]} · {tracks.length} faixas</span>
        <span><strong>Artista principal</strong>{artists.find(a=>a.role==='primary')?.name||'—'}</span>
        <span><strong>Lançamento</strong>{title||'—'}</span>
        <span><strong>Plataformas</strong>{`${effectivePlatforms.length} plataformas`}</span>
        <span><strong>Data</strong>{date||'—'}</span>
        <span><strong>Capa</strong>{cover?.name||'Pendente'}</span>
      </div>
      <h3>Faixas</h3>
      <ol className="sr-track-review">{tracks.map((t,i)=><li key={t.key}>{i+1}. {t.title||'Sem título'} · {t.file?.name||'Sem áudio'} · {t.isrc||'ISRC pendente'}</li>)}</ol>
      <h3>Plataformas selecionadas ({effectivePlatforms.length})</h3>
      <div className="sr-review-platforms">{effectivePlatforms.map(name=><span key={name}><DspIcon name={isMetaStore(name)?'Instagram':name} size={22}/>{isMetaStore(name)?'Instagram':name}</span>)}</div>
      <div className="sr-four-total"><div><strong>Extras selecionados</strong><small>{extras.length?extras.map(x=>x.name+' '+money(x.fee)).join(' · '):'Sem taxas extras'}</small></div><strong>{money(extraTotal)}</strong></div>
      {extraTotal>0&&<p className="sr-notice">O Pix será cobrado antes do envio. O acesso às lojas extras só é liberado após confirmação do Mercado Pago.</p>}
      <p className="mut">A equipe revisará seu lançamento. Horários globais, territórios específicos e Content ID são solicitações registradas; a entrega efetiva depende das regras e capacidades da agregadora.</p>
     </section>}
     {addonCheckout&&currentPlan&&<SubscriptionCardForm plan={{id:currentPlan.id,name:currentPlan.name,price_brl:currentPlan.price_brl,frequency:1}}
      addonReleaseId={releaseId.current} addonPrice={extraTotal} selectedStores={effectivePlatforms}
      onClose={()=>{setAddonCheckout(false);void checkReleaseExtras(releaseId.current).then(setAddonPaid)}}/>}
     {generalError&&<p className="sr-error sr-global" role="alert">{generalError}</p>}
     {draftMessage&&<p className="sr-progress" role="status">{draftMessage}</p>}
     {progress&&<p className="sr-progress" role="status">{progress}</p>}
     <footer className="sr-footer sr-four-footer">
      {step>0&&<button type="button" className="btn ghost" disabled={busy} onClick={()=>{setStep(v=>v-1);setErrors({})}}><ChevronLeft size={16}/> Voltar</button>}
      <button type="button" className="btn ghost sm" disabled={busy} onClick={()=>void saveDraft()}>Salvar rascunho</button>
      <span className="mut">Etapa {step+1} de 4</span>
      {step<3?<button type="button" className="btn" disabled={busy} onClick={next}>Continuar <ChevronRight size={16}/></button>:
       <button type="button" className="btn" disabled={busy||extraTotal>0&&addonCheckout} onClick={()=>void send()}>{busy?'Enviando arquivos...':extraTotal>0&&!addonPaid?'Pagar extras e enviar':'Enviar para revisão'} <Check size={16}/></button>}
     </footer>
    </div>
   </div>
  </div>
}
