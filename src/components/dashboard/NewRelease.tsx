'use client'

import {useEffect,useRef,useState} from 'react'
import {Check,ChevronLeft,ChevronRight,Music2,Plus,Trash2,UploadCloud,X,Info} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {uploadReleaseAsset} from '@/lib/upload-release-asset'
import {isMetaStore} from '@/lib/dsp-catalog'
import {SubscriptionCardForm} from '@/components/billing/SubscriptionCardForm'
import {checkReleaseExtras} from '@/app/dashboard/billing-actions'
import {DspIcon} from './DspIcon'
import ReleaseAudioMini from './ReleaseAudioMini'
import ReleaseStoreItem from './ReleaseStoreItem'
import {GENRES,LANGUAGES,releaseFormat} from './release-fields'
import type {Data} from './ui'
import './release-wizard.css'
import './release-wizard-four.css'
import './release-wizard-five.css'

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
const countValid=(f:Format,n:number)=>f==='single'?n===1:f==='ep'?n>=2&&n<=4:n>=5&&n<=100
const isrcValid=(s:string)=>!s||/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(s)
const text=(e:string)=>e.trim()
const sizeMB=(f:File)=>(f.size/1024/1024).toFixed(1)+' MB'

export default function NewRelease({d,reload}:{d:Data;reload:()=>void}) {
  const [step,setStep]=useState(0)
  useEffect(()=>{window.scrollTo({top:0,behavior:'smooth'})},[step])
  const [artists,setArtists]=useState<Artist[]>([
    {key:'primary',profile_id:'',name:'',role:'primary'}
  ])
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [profilesLoading,setProfilesLoading]=useState(true)
  const [profilesError,setProfilesError]=useState(false)
  const [tracks,setTracks]=useState<Track[]>(()=>[])
  const [dropActive,setDropActive]=useState(false)
  const [trackDurations,setTrackDurations]=useState<Record<string,number>>({})
  const [expandedTrack,setExpandedTrack]=useState<string|null>(null)
  const format=releaseFormat(tracks.length)
  const [title,setTitle]=useState('')
  const [genre,setGenre]=useState('')
  const [subgenre,setSubgenre]=useState('')
  const [language,setLanguage]=useState('pt')
  const [releaseTime,setReleaseTime]=useState('00:00')
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
     if(Array.isArray(v.artists))setArtists(v.artists)
     if(Array.isArray(v.tracks)&&v.tracks.length)setTracks(v.tracks.map((t:any)=>({...trackNew(),...t,key:t.key||crypto.randomUUID(),file:null})))
     setTitle(v.title||'');setGenre(v.genre||'');setSubgenre(v.subgenre||'')
     setDate(v.date||afterDays(28));setUpc(v.upc||'');setLabel(v.label||'SINTONE');setLanguage(v.language||'pt');setReleaseTime(v.releaseTime||'00:00')
     setPHolder(v.pHolder||'');setCHolder(v.cHolder||'')
     setPYear(Number(v.pYear)||new Date().getFullYear());setCYear(Number(v.cYear)||new Date().getFullYear())
     if(v.platformMode==='selected')setPlatformMode('selected')
     if(Array.isArray(v.platforms))setPlatforms(v.platforms)
     setEnableInstagram(!!v.enableInstagram);setRights(!!v.rights)
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
  const addAudioFiles=(files:File[])=>{
    if(!files.length)return
    if(tracks.length+files.length>100){setGeneralError('Máximo de 100 faixas.');return}
    const bad=files.find(f=>!/\.(wav|flac)$/i.test(f.name)||f.size<1000||f.size>250*1024*1024)
    if(bad){setGeneralError('Áudio inválido: '+bad.name+'. Envie WAV/FLAC de até 250 MB.');return}
    const next=files.map(f=>({...trackNew(),file:f,title:f.name.replace(/\.(wav|flac)$/i,'').replace(/[_-]+/g,' ').trim(),language}))
    setTracks(old=>[...old,...next]);setExpandedTrack(next[0].key);setGeneralError('')
  }
  const removeTrack=(key:string)=>{
    setTracks(old=>old.filter(t=>t.key!==key))
    if(expandedTrack===key)setExpandedTrack(null)
    setTrackDurations(old=>{const next={...old};delete next[key];return next})
    setAddonPaid(false)
  }
  const selectProfile=(a:Artist,profileId:string)=>{
    const p=profiles.find(x=>x.id===profileId)
    editArtist(a.key,{profile_id:p?.id||'',name:p?.name||''})
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
     if(!text(title))found.title='Informe o título do lançamento.'
     if(!GENRES.some(g=>g===genre))found.genre='Selecione um gênero válido.'
     if(subgenre&&!GENRES.some(g=>g===subgenre))found.subgenre='Selecione o gênero secundário.'
     if(!LANGUAGES.some(l=>l.code===language))found.language='Selecione um idioma válido.'
     if(!text(label)||text(label).length<2)found.label='Informe o selo.'
     if(!text(pHolder)||!text(cHolder))found.copyright='Preencha os titulares ℗ e ©.'
     if(!Number.isInteger(pYear)||!Number.isInteger(cYear)||pYear<1900||cYear<1900||pYear>2200||cYear>2200)found.copyright='Ano de copyright inválido.'
     if(upc&&!/^\d{12,13}$/.test(upc.replace(/\s/g,'')))found.upc='UPC/EAN inválido.'
     if(profilesLoading||profilesError||!profiles.length)found.artists='Cadastre pelo menos um artista.'
     if(artists.filter(a=>a.role==='primary').length!==1)found.artists='Selecione um artista principal.'
     artists.forEach(a=>{if(!a.profile_id||!profiles.some(p=>p.id===a.profile_id&&p.name===a.name))
      found['artist.'+a.key]='Escolha um perfil artístico válido.'})
   }
   if(stepIndex===1){
     if(!countValid(format,tracks.length))found.count='Envie de 1 a 100 faixas.'
     const seen=new Set<string>()
     tracks.forEach((t,i)=>{
       const key='track.'+t.key+'.',code=t.isrc.replace(/-/g,'').toUpperCase().trim()
       if(!text(t.title))found[key+'title']='Informe o título da faixa '+(i+1)
       if(!t.file)found[key+'audio']='Selecione áudio WAV/FLAC.'
       if(text(t.composers).length<2)found[key+'composers']='Informe os compositores da faixa '+(i+1)
       if(!isrcValid(code)||(code&&seen.has(code)))found[key+'isrc']='ISRC inválido ou duplicado.'
       if(code)seen.add(code)
       if(t.contributors.some(c=>!text(c.name)))found[key+'contributors']='Informe o nome dos colaboradores.'
     })
   }
   if(stepIndex===2&&!cover)found.cover='Envie capa de 3000 × 3000 px.'
   if(stepIndex===3){
     if(date<afterDays(14)||date>afterDays(1095))found.date='Selecione uma data a partir de 14 dias.'
     if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(releaseTime))found.time='Horário inválido.'
     if(!effectivePlatforms.length)found.platforms='Selecione ao menos uma plataforma.'
     if(dspLoading||dspError)found.platforms=dspError||'Aguarde o catálogo de lojas.'
     if(!currentPlan||planLoading)found.plan='Plano indisponível.'
     if(currentPlan?.monthly_releases_limit!=null&&monthlyUsed>=currentPlan.monthly_releases_limit)found.plan='Limite mensal atingido.'
   }
   if(stepIndex===4&&!rights)found.rights='Confirme direitos e autorizações.'
   setErrors(found)
   return Object.keys(found).length===0
  }
  const next=()=>{
   setGeneralError('')
   if(!check(step))return
   setStep(i=>Math.min(4,i+1))
  }
  async function saveDraft(){
   if(busy)return
   setDraftMessage('')
   const payload={
    format,artists,tracks:tracks.map(({file,...t})=>t),title,genre,subgenre,language,date,releaseTime,upc,label,
    pHolder,cHolder,pYear,cYear,platformMode,platforms,enableInstagram,rights,
    publishingRights,contentId
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
    for(let i=0;i<5;i++)if(!check(i)){setStep(i);return}
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
          explicit:t.explicit,language:t.language,duration_seconds:trackDurations[t.key]||null,
          contributors:t.contributors.map(c=>({name:c.name.trim(),role:c.role}))
        })
      }
      setProgress('Registrando lançamento e enviando para revisão...')
      const payload={
        id,type:format,title:title.trim(),genre:genre.trim(),language,release_time:releaseTime,
        subgenre:subgenre.trim(),release_date:date,upc:upc.replace(/\s/g,''),
        artists:artists.map(a=>({profile_id:a.profile_id,name:a.name.trim(),role:a.role})),
        tracks:payloadTracks,cover_path:coverPath,rights_confirmed:rights,
        label_name:label.trim(),p_line:'℗ '+pYear+' '+pHolder.trim(),
        c_line:'© '+cYear+' '+cHolder.trim(),platforms:effectivePlatforms,territories:['WORLD']
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
  const days=date?Math.round((new Date(date+'T12:00:00Z').getTime()-new Date(today()+'T12:00:00Z').getTime())/86400000):0
  const planning=days>=28?{label:'Janela recomendada para planejamento',tone:'good'}:
    days>=14?{label:'Prazo reduzido para divulgação',tone:'warn'}:
    {label:'Pouco tempo para revisão e divulgação',tone:'bad'}
  const stepTitles=['Informações gerais','Upload de faixas','Capa','Distribuição','Revisão e confirmação']
  const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  const changePlatform=(name:string,checked:boolean)=>{
   if(addonPaid)return
   setPlatforms(prev=>checked?[...prev,name]:prev.filter(x=>x!==name))
  }
  const duration=(n:number)=>Number.isFinite(n)?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'—'
  return <div className="sr sr-four sr-five">
   <header className="sr-header sr-four-header">
    <span className="sr-kicker">DISTRIBUIÇÃO DIGITAL · SINTONE</span>
    <h2>Novo lançamento</h2>
    <p>Preencha cinco etapas para enviar seu projeto à revisão da equipe.</p>
   </header>
   <div className="sr-four-shell">
    <aside className="sr-four-side" aria-label="Etapas do lançamento">
     <span className="sr-four-side-label">SEU LANÇAMENTO</span>
     {stepTitles.map((name,i)=><button key={name} type="button" disabled={busy||i>step}
      className={'sr-four-nav '+(i===step?'active':i<step?'completed':'')}
      aria-current={step===i?'step':undefined} onClick={()=>{if(i<step){setStep(i);setErrors({})}}}>
      <span className="sr-four-step-circle">{i<step?<Check size={16}/>:i+1}</span><span>{name}</span>
     </button>)}
     <div className="sr-four-side-foot"><Info size={17}/> Salve o rascunho sempre que desejar preservar os metadados. Os arquivos de áudio e capa precisarão ser selecionados novamente.</div>
    </aside>
    <div className="sr-four-work">
     <div className="sr-four-stage-head"><span>ETAPA {step+1} DE 5</span><h3>{stepTitles[step]}</h3></div>
     {step===0&&<>
      <section className="card sr-panel">
       <h3>Informações do lançamento</h3>
       <label>Título do lançamento *<input maxLength={160} value={title} className={show('title')}
        placeholder="Nome do Single, EP ou Álbum" onChange={e=>setTitle(e.target.value)}/>{err('title')}</label>
       <div className="sr-grid">
        <label>Gênero *<select className={show('genre')} value={genre} onChange={e=>setGenre(e.target.value)}>
         <option value="">Selecione um gênero</option>{GENRES.map(g=><option key={g} value={g}>{g}</option>)}
        </select>{err('genre')}</label>
        <label>Gênero secundário<select value={subgenre} onChange={e=>setSubgenre(e.target.value)}>
         <option value="">Nenhum</option>{GENRES.map(g=><option key={g} value={g}>{g}</option>)}
        </select>{err('subgenre')}</label>
        <label>Idioma do lançamento *<select value={language} onChange={e=>setLanguage(e.target.value)}>
         {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
        </select>{err('language')}</label>
        <label>Record Label / Selo *<input maxLength={150} value={label}
         onChange={e=>setLabel(e.target.value)}/>{err('label')}</label>
       </div>
       <label>UPC/EAN (opcional)<input value={upc} maxLength={13} inputMode="numeric"
        placeholder="Opcional — deixe em branco se não tiver" onChange={e=>setUpc(e.target.value.replace(/\D/g,''))}/>{err('upc')}</label>
       <p className="sr-upc-note">Se você ainda não possui UPC/EAN, deixe este campo em branco. A SINTONE cuidará da identificação do lançamento durante o processo de distribuição.</p>
      </section>
      <section className="card sr-panel">
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
      </section>
      <section className="card sr-panel">
       <h3>Copyrights do lançamento</h3>
       <div className="sr-grid">
        <label>℗ Ano da gravação<input type="number" min={1900} max={2200} value={pYear} onChange={e=>setPYear(Number(e.target.value))}/></label>
        <label>℗ Titular da gravação *<input maxLength={150} value={pHolder} onChange={e=>setPHolder(e.target.value)}/></label>
        <label>© Ano do lançamento<input type="number" min={1900} max={2200} value={cYear} onChange={e=>setCYear(Number(e.target.value))}/></label>
        <label>© Titular do lançamento *<input maxLength={150} value={cHolder} onChange={e=>setCHolder(e.target.value)}/></label>
       </div>{err('copyright')}
      </section>
     </>}
     {step===1&&<section className="card sr-panel">
      <div className="sr-section-top"><div><h3>Arquivos de áudio</h3>
       <p className="mut">{tracks.length} faixa(s) · formato identificado automaticamente: <strong>{fmtTitle[format]}</strong></p></div></div>
      <label className={'sr-audio-drop '+(dropActive?'dragging':'')} onDragOver={e=>{e.preventDefault();setDropActive(true)}}
       onDragLeave={e=>{e.preventDefault();setDropActive(false)}} onDrop={e=>{e.preventDefault();setDropActive(false);addAudioFiles(Array.from(e.dataTransfer.files))}}>
       <UploadCloud size={27}/><strong>Selecione ou arraste arquivos WAV/FLAC</strong>
       <small>Múltiplos arquivos, até 250 MB por faixa; máximo 100 faixas</small>
       <input type="file" multiple accept=".wav,.flac,audio/wav,audio/flac" onChange={e=>{
        addAudioFiles(Array.from(e.target.files||[]));e.target.value=''
       }}/>
      </label>
      {err('count')}
      <div className="sr-track-list">
       {tracks.map((t,i)=><article key={t.key} className="sr-track-item">
        <div className="sr-track-item-header">
         <div><strong>{i+1}. {t.title||'Faixa sem título'}</strong><p className="mut">{t.file?.name||'Áudio pendente'} · {duration(trackDurations[t.key]||0)}</p></div>
         <div className="sr-track-item-actions">
          <button type="button" className="btn ghost sm" onClick={()=>setExpandedTrack(expandedTrack===t.key?null:t.key)}>Editar faixa</button>
          <button type="button" className="sr-icon" onClick={()=>removeTrack(t.key)} aria-label={'Excluir faixa '+(i+1)}><Trash2 size={17}/></button>
         </div>
        </div>
        <ReleaseAudioMini file={t.file} onDuration={n=>setTrackDurations(d=>d[t.key]===n?d:{...d,[t.key]:n})}/>
        {expandedTrack===t.key&&<div className="sr-track-edit">
         <div className="sr-grid">
          <label>Título da faixa *<input value={t.title} maxLength={160} className={show('track.'+t.key+'.title')}
           onChange={e=>editTrack(t.key,{title:e.target.value})}/>{err('track.'+t.key+'.title')}</label>
          <label>ISRC (opcional)<input value={t.isrc} maxLength={15} placeholder="BRABC2600001"
           onChange={e=>editTrack(t.key,{isrc:e.target.value.toUpperCase()})}/>{err('track.'+t.key+'.isrc')}</label>
          <label>Artista principal da faixa<select value={artists.find(a=>a.role==='primary')?.profile_id||''} disabled>
           <option value={artists.find(a=>a.role==='primary')?.profile_id||''}>{artists.find(a=>a.role==='primary')?.name||'Selecionado na etapa 1'}</option>
          </select></label>
          <label>Participações / Feats<input value={t.featured_artists} maxLength={350}
           onChange={e=>editTrack(t.key,{featured_artists:e.target.value})} placeholder="Artistas convidados"/></label>
          <label>Compositores *<input value={t.composers} maxLength={700} className={show('track.'+t.key+'.composers')}
           onChange={e=>editTrack(t.key,{composers:e.target.value})}/>{err('track.'+t.key+'.composers')}</label>
          <label>Idioma da faixa<select value={t.language} onChange={e=>editTrack(t.key,{language:e.target.value})}>
           {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}</select></label>
         </div>
         <label className={'sr-explicit-card '+(t.explicit?'is-on':'')}>
          <input type="checkbox" role="switch" aria-label="Conteúdo explícito" checked={t.explicit}
           onChange={e=>editTrack(t.key,{explicit:e.target.checked})}/>
          <span className="sr-explicit-track" aria-hidden="true"><span/></span>
          <span className="sr-explicit-description">
           <strong>Conteúdo explícito</strong>
           <small>Letras ou linguagem explícita</small>
          </span>
          <span className={'sr-explicit-status '+(t.explicit?'active':'')}>{t.explicit?'Sim':'Não'}</span>
         </label>
         <p className="sr-notice">Confirme os autores e permissões de samples antes da distribuição. ISRC vazio será analisado pela equipe.</p>
        </div>}
       </article>)}
      </div>
      {tracks.length===0&&<p className="mut">Nenhum arquivo selecionado. Adicione áudio para avançar.</p>}
     </section>}
     {step===2&&<section className="card sr-panel"><h3>Capa do lançamento *</h3>
      <label className="sr-cover-picker">
        {coverUrl?<img src={coverUrl} alt="Prévia da capa do lançamento"/>:<UploadCloud size={27}/>}
        <span>{cover?cover.name:'Selecionar capa JPG/PNG · 3000×3000 px · até 15 MB'}</span>
        <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={e=>void selectCover(e.target.files?.[0])}/>
      </label>
      {err('cover')}
      
      <p className="sr-cover-guidance"><Info size={16}/> Capa quadrada em 3000 × 3000 px, até 15 MB. Sem URLs, QR Codes, logos de serviços de streaming ou conteúdo sem autorização. PNG é convertido para JPG antes do envio.</p></section>}
     {step===3&&<section className="card sr-panel">
      <h3>Data e horário de lançamento</h3>
      <div className="sr-grid">
       <label>Data de lançamento *<input type="date" min={afterDays(14)} max={afterDays(1095)}
        value={date} onChange={e=>setDate(e.target.value)}/>{err('date')}</label>
       <label>Horário solicitado *<input type="time" step={60} value={releaseTime}
        onChange={e=>setReleaseTime(e.target.value)}/>{err('time')}</label>
      </div>
      <div className={'sr-date-badge '+planning.tone}>{planning.label} · {Math.max(days,0)} dias até o lançamento.</div>
      <p className="sr-notice"><Info size={16}/> O horário é uma solicitação registrada para a equipe. A disponibilidade de hora exata varia conforme a loja e a agregadora.</p>
      <h3>Plataformas de distribuição</h3>
      <p className="mut">Lojas incluídas vêm selecionadas. Extras exigem confirmação de pagamento antes do envio.</p>
      {dspLoading&&<p className="mut">Carregando lojas disponíveis...</p>}
      {dspError&&<p className="sr-error" role="alert">{dspError}</p>}
      <div className="sr-store-section">
       <div className="sr-store-section-title"><h4>Streaming e plataformas sociais</h4>
        <span>{allowedDSP.filter(x=>!x.is_extra).length} lojas</span></div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sr-store-grid">
        {allowedDSP.filter(x=>!x.is_extra).map(store=><ReleaseStoreItem key={store.slug}
         name={store.name} checked={platforms.includes(store.name)} disabled={addonPaid}
         onChange={checked=>changePlatform(store.name,checked)}/>)}
       </div>
      </div>
      {allowedDSP.some(x=>x.is_extra)&&<div className="sr-store-section">
       <div className="sr-store-section-title"><h4>Plataformas extras</h4><span>Taxa por lançamento</span></div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sr-store-grid">
        {allowedDSP.filter(x=>x.is_extra).map(store=><ReleaseStoreItem key={store.slug}
         name={store.name} checked={platforms.includes(store.name)} disabled={addonPaid}
         fee={store.is_extra&&!(isMetaStore(store.name)&&currentPlan?.has_instagram_included)?Number(store.extra_fee):0}
         onChange={checked=>changePlatform(store.name,checked)}/>)}
       </div>
      </div>}
       {currentPlan&&<p className="mut">Plano {currentPlan.name} · {monthlyUsed} de {currentPlan.monthly_releases_limit??'ilimitados'} lançamentos utilizados neste mês.</p>}
      {err('platforms')}{err('plan')}
      <div className="sr-four-total"><div><strong>Total adicional de plataformas extras</strong><small>Valor cobrado uma única vez por lançamento, via Pix</small></div><strong>{money(extraTotal)}</strong></div>

     </section>}
     {step===4&&<section className="card sr-panel">
      <h3>Revisão final</h3>
      <div className="sr-four-review-cover">{coverUrl?<img src={coverUrl} alt="Capa do lançamento"/>:<Music2 size={35}/>}
       <div><strong>{title||'Sem título'}</strong><small>{fmtTitle[format]} · {tracks.length} faixa(s)</small>
        <small>{artists.filter(a=>a.role==='primary').map(a=>a.name).join(', ')||'Artista não informado'}</small></div>
      </div>
      <div className="sr-summary">
       <span><strong>Título</strong>{title||'—'}</span>
       <span><strong>Gênero / Secundário</strong>{genre}{subgenre?' / '+subgenre:''}</span>
       <span><strong>Idioma</strong>{LANGUAGES.find(x=>x.code===language)?.label}</span>
       <span><strong>Selo</strong>{label||'—'}</span>
       <span><strong>℗ Gravação</strong>{pYear} · {pHolder}</span>
       <span><strong>© Lançamento</strong>{cYear} · {cHolder}</span>
       <span><strong>UPC</strong>{upc||'Pendente — SINTONE'}</span>
       <span><strong>Data e horário solicitados</strong>{date} às {releaseTime}</span>
       <span><strong>Plataformas</strong>{effectivePlatforms.length}</span>
      </div>
      <h3>Faixas</h3>
      <ol className="sr-track-review">{tracks.map((t,i)=><li key={t.key}>
       {i+1}. {t.title||'Sem título'} · {duration(trackDurations[t.key]||0)} ·
       {t.isrc||'ISRC pendente'} · {t.explicit?'Explícita':'Não explícita'}
      </li>)}</ol>
      <h3>Plataformas selecionadas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sr-store-grid sr-review-store-grid">
       {effectivePlatforms.map(name=><div className="sr-store-option" key={name}>
        <DspIcon name={name} size={32}/><span className="sr-store-name">{name}</span>
       </div>)}
      </div>
      <div className="sr-four-total"><div><strong>Total das plataformas extras</strong>
       <small>{extras.length?extras.map(x=>x.name+' '+money(x.fee)).join(' · '):'Nenhum extra pago'}</small></div>
       <strong>{money(extraTotal)}</strong></div>
      <label className="sr-check"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>
       Confirmo que possuo todos os direitos necessários para distribuir os áudios, obras, samples e capa.</label>{err('rights')}
      <p className="sr-notice">O lançamento será enviado como pendente para revisão da equipe SINTONE. Caso o UPC não tenha sido informado, a equipe SINTONE cuidará da identificação. ISRC e horário poderão exigir conferência antes da entrega às lojas.</p>
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
      <span className="mut">Etapa {step+1} de 5</span>
      {step<4?<button type="button" className="btn" disabled={busy} onClick={next}>Continuar <ChevronRight size={16}/></button>:
      <button type="button" className="btn" disabled={busy||extraTotal>0&&addonCheckout} onClick={()=>void send()}>
       {busy?'Enviando arquivos...':extraTotal>0&&!addonPaid?'Pagar extras e distribuir':'Distribuir'} <Check size={16}/></button>}
     </footer>
    </div>
   </div>
  </div>
}
