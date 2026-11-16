'use client'

import {useEffect,useRef,useState} from 'react'
import {Check,ChevronLeft,ChevronRight,Music2,Plus,Trash2,UploadCloud,X,Info,Headphones,FileAudio,ShieldAlert} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {uploadReleaseAsset} from '@/lib/upload-release-asset'
import {isMetaStore} from '@/lib/dsp-catalog'
import {SubscriptionCardForm} from '@/components/billing/SubscriptionCardForm'
import {checkReleaseExtras} from '@/app/dashboard/billing-actions'
import {DspIcon} from './DspIcon'
import ReleaseAudioMini from './ReleaseAudioMini'
import ReleaseStoreItem from './ReleaseStoreItem'
import {GENRES,LANGUAGES,releaseFormat} from './release-fields'
import {inspectReleaseAudio,type AudioTechnicalInfo} from './release-audio-validation'
import type {Data} from './ui'
import './release-wizard.css'
import './release-wizard-four.css'
import './release-wizard-five.css'
import './release-two-pages.css'

type Format='single'|'ep'|'album'
type ArtistRole='primary'|'featured'|'remixer'
type Artist={key:string;profile_id:string;name:string;role:ArtistRole}
type Contributor={key:string;name:string;profile_id?:string;role:'vocal'|'featured'|'producer'|'instrumentalist'|'remixer'|'engineer'}
type Track={
  key:string;title:string;isrc:string;file:File|null;featured_artists:string;
  contributors:Contributor[];composers:string;producers:string;lyricists:string;
  credits:string;explicit:boolean;language:string;genre:string;subgenre:string;
  isOriginal:boolean;isInstrumental:boolean;isRemix:boolean;tiktokPreviewStart:number
}
type Profile={id:string;name:string}
type DspSetting={name:string;slug:string;is_extra:boolean;extra_fee:number;active:boolean;category:string}
type CurrentPlan={id:string;name:string;price_brl:number;monthly_releases_limit:number|null;max_artists:number;included_stores:string[];has_instagram_included:boolean;instagram_addon_fee:number}
const trackNew=():Track=>({
  key:crypto.randomUUID(),title:'',isrc:'',file:null,featured_artists:'',
  contributors:[{key:crypto.randomUUID(),name:'',role:'vocal'},{key:crypto.randomUUID(),name:'',role:'producer'}],composers:'',producers:'',lyricists:'',credits:'',explicit:false,language:'pt',genre:'',subgenre:'',isOriginal:true,isInstrumental:false,isRemix:false,tiktokPreviewStart:0
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
  const [tracks,setTracks]=useState<Track[]>(()=>[trackNew()])
  const [audioSpecs,setAudioSpecs]=useState<Record<string,AudioTechnicalInfo>>({})
  const [composerProfiles,setComposerProfiles]=useState<Record<string,{key:string;profile_id:string;legalName:string}[]>>({})
  const [advancedTracks,setAdvancedTracks]=useState<Record<string,boolean>>({})
  const [isrcModes,setIsrcModes]=useState<Record<string,'have'|'generate'>>({})
  const [dropActive,setDropActive]=useState(false)
  const [trackDurations,setTrackDurations]=useState<Record<string,number>>({})
  const [expandedTrack,setExpandedTrack]=useState<string|null>(()=>tracks[0]?.key||null)
  const format=releaseFormat(tracks.length)
  const [title,setTitle]=useState('')
  const [genre,setGenre]=useState('')
  const [subgenre,setSubgenre]=useState('')
  const [language,setLanguage]=useState('pt')
  const [releaseTime,setReleaseTime]=useState('00:00')
  const [useSpecificTime,setUseSpecificTime]=useState(false)
  const [hasExistingUpc,setHasExistingUpc]=useState(false)
  const [showStoreChooser,setShowStoreChooser]=useState(false)
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
     setDate(v.date||afterDays(28));setUpc(v.upc||'');setHasExistingUpc(!!v.upc);setLabel(v.label||'SINTONE');setLanguage(v.language||'pt');setReleaseTime(v.releaseTime||'00:00');setUseSpecificTime(!!v.useSpecificTime)
     setPHolder(v.pHolder||'');setCHolder(v.cHolder||'')
     setPYear(Number(v.pYear)||new Date().getFullYear());setCYear(Number(v.cYear)||new Date().getFullYear())
     if(v.platformMode==='selected'){setPlatformMode('selected');setShowStoreChooser(true)}
     if(v.composerProfiles&&typeof v.composerProfiles==='object')setComposerProfiles(v.composerProfiles)
     if(v.isrcModes&&typeof v.isrcModes==='object')setIsrcModes(v.isrcModes)
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
  const addAudioFiles=async(files:File[])=>{
   if(!files.length)return
   if(tracks.length+files.length>100){setGeneralError('Limite de 100 faixas por lançamento.');return}
   try{
    const analyzed=await Promise.all(files.map(async file=>({file,spec:await inspectReleaseAudio(file)})))
    const existing=tracks.length===1&&!tracks[0].file&&!tracks[0].title.trim()
    const incoming=analyzed.map(({file,spec})=>{
     const t=trackNew()
     return {track:{...t,title:file.name.replace(/\.(wav|flac)$/i,'').replace(/[_-]/g,' ').trim(),file,genre,language},spec}
    })
    if(existing)setTracks(incoming.map(x=>x.track))
    else setTracks(prev=>[...prev,...incoming.map(x=>x.track)])
    setAudioSpecs(prev=>({...prev,...Object.fromEntries(incoming.map(x=>[x.track.key,x.spec]))}))
    setExpandedTrack(incoming[0].track.key);setGeneralError('')
   }catch(e){setGeneralError(e instanceof Error?e.message:'Áudio inválido.')}
  }
  const removeTrack=(key:string)=>{
    setTracks(old=>old.filter(t=>t.key!==key))
    if(expandedTrack===key)setExpandedTrack(null)
    setTrackDurations(old=>{const next={...old};delete next[key];return next})
    setAudioSpecs(old=>{const next={...old};delete next[key];return next})
    setAddonPaid(false)
  }
  const selectProfile=(a:Artist,profileId:string)=>{
    const p=profiles.find(x=>x.id===profileId)
    editArtist(a.key,{profile_id:p?.id||'',name:p?.name||''})
  }
  const selectCover=async(f?:File)=>{
    if(!f)return
    if(!/\.jpe?g$/i.test(f.name)||f.type!=='image/jpeg'||f.size>15*1024*1024){
      setErrors(v=>({...v,cover:'Envie um JPG de até 15 MB.'}));return
    }
    const url=URL.createObjectURL(f)
    try{
      const pic=new Image()
      await new Promise<void>((resolve,reject)=>{
        pic.onload=()=>resolve();pic.onerror=()=>reject(new Error('Imagem inválida.'));pic.src=url
      })
      if(![1440,3000].includes(pic.naturalWidth)||pic.naturalWidth!==pic.naturalHeight)throw Error('A capa deve ter 1440 × 1440 ou 3000 × 3000 pixels.')
      const file=f
      setCover(file);setCoverUrl(url);setErrors(v=>({...v,cover:''}))
    }catch(e){URL.revokeObjectURL(url);setErrors(v=>({...v,cover:e instanceof Error?e.message:'Capa inválida.'}))}
  }

  const composerItems=(key:string)=>composerProfiles[key]||[]
  const updateComposer=(key:string,rowKey:string,change:Partial<{profile_id:string;legalName:string}>)=>
   setComposerProfiles(old=>({...old,[key]:(old[key]||[]).map(item=>item.key===rowKey?{...item,...change}:item)}))
  const addComposer=(key:string)=>setComposerProfiles(old=>({...old,
   [key]:[...(old[key]||[]),{key:crypto.randomUUID(),profile_id:'',legalName:''}]}))
  const changeContributor=(trackKey:string,contributorKey:string,change:Partial<Contributor>)=>
   setTracks(old=>old.map(t=>t.key===trackKey?{...t,contributors:t.contributors.map(c=>c.key===contributorKey?{...c,...change}:c)}:t))
  const readyTracks=tracks.map((t,i)=>({...t,
   composers:composerItems(t.key).map(c=>c.legalName.trim()).filter(Boolean).join(', '),
   producers:t.contributors.filter(c=>c.role==='producer').map(c=>c.name.trim()).filter(Boolean).join(', '),
   featured_artists:t.contributors.filter(c=>c.role==='featured').map(c=>c.name.trim()).filter(Boolean).join(', '),
   genre:t.genre||genre
  }))
  function check(stepIndex:number){
   const found:Record<string,string>={}
   if(stepIndex===0){
    if(profilesLoading||profilesError||!profiles.length)found.artists='Cadastre um perfil artístico antes de continuar.'
    if(artists.some(a=>!a.profile_id||!profiles.some(p=>p.id===a.profile_id)))
     found.artists='Selecione um artista em cada campo'
    if(!artists.some(a=>a.role==='primary'&&a.profile_id))
     found.primary='Pelo menos um artista primário deve estar selecionado'
    if(!tracks.length||tracks.length>100)found.tracks='Adicione de 1 a 100 faixas.'
    const seen=new Set<string>()
    tracks.forEach((t,i)=>{
     const key='track.'+t.key+'.',spec=audioSpecs[t.key]
     if(!t.title.trim())found[key+'title']='Informe o nome da música.'
     if(!GENRES.some(g=>g===t.genre))found[key+'genre']='Selecione o gênero principal.'
     if(!t.file||!spec)found[key+'audio']='Envie áudio WAV/FLAC validado (5–1.800 s).'
     if(spec&&(spec.duration<5||spec.duration>1800))found[key+'audio']='Duração inválida.'
     if(isrcModes[t.key]==='have'&&!t.isrc.trim())found[key+'isrc']='Informe o ISRC da música.'
     const code=t.isrc.replace(/-/g,'').toUpperCase().trim()
     if(!isrcValid(code)||(code&&seen.has(code)))found[key+'isrc']='ISRC inválido ou duplicado.'
     if(code)seen.add(code)
     if(!t.contributors.some(c=>c.role==='vocal'&&c.profile_id&&c.name))
      found[key+'vocal']='Informe pelo menos um vocal (intérprete). Pode ser o mesmo nome do artista.'
     if(!t.contributors.some(c=>c.role==='producer'&&c.profile_id&&c.name))
      found[key+'producer']='Informe pelo menos um produtor. Pode ser o mesmo nome do artista.'
     if(t.contributors.some(c=>!c.profile_id||!c.name))
      found[key+'contributors']='Selecione um perfil em cada colaborador.'
     const composers=composerItems(t.key)
     if(!composers.length||composers.some(c=>c.legalName.trim().split(/\s+/).length<2))
      found[key+'composers']='Informe o nome completo de cada compositor.'
     const forbidden=new Set(t.contributors.filter(c=>['vocal','producer'].includes(c.role)).map(c=>c.profile_id))
     if(composers.some(c=>(c.profile_id&&forbidden.has(c.profile_id))||t.contributors.some(v=>['vocal','producer'].includes(v.role)&&v.name.trim().toLowerCase()===c.legalName.trim().toLowerCase())))
      found[key+'composers']='Produtores e vocais não podem ser selecionados como compositores.'
     if(!LANGUAGES.some(l=>l.code===t.language))found[key+'language']='Selecione um idioma.'
     if(t.tiktokPreviewStart<0||spec&&t.tiktokPreviewStart>Math.max(0,spec.duration-5))
      found[key+'preview']='Trecho de prévia fora da duração da faixa.'
     if(![true,false].includes(t.isOriginal)||![true,false].includes(t.isInstrumental)||![true,false].includes(t.isRemix))
      found[key+'advanced']='Responda às perguntas de versão.'
    })
   }
   if(stepIndex===1){
    if(!title.trim()&&!tracks[0]?.title.trim())found.title='Informe o título do lançamento.'
    if(!cover)found.cover='Envie a capa JPG de 1440×1440 ou 3000×3000 px.'
    if(date<afterDays(14)||date>afterDays(1095))found.date='Selecione a data a partir de 14 dias.'
    if(!pHolder.trim()||!cHolder.trim())found.copyright='Informe os titulares ℗ e ©.'
    if(pYear<1900||cYear<1900||pYear>2200||cYear>2200)found.copyright='Ano inválido.'
    if(!label.trim())found.label='Informe o selo.'
    if(hasExistingUpc&&!/^\d{12,13}$/.test(upc))found.upc='Informe UPC/EAN de 12 ou 13 dígitos.'
    if(useSpecificTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(releaseTime))found.time='Horário inválido.'
    if(!effectivePlatforms.length)found.platforms='Selecione pelo menos uma plataforma.'
    if(dspLoading||dspError)found.platforms=dspError||'Aguarde a lista de lojas.'
    if(!currentPlan||planLoading)found.plan='Plano indisponível.'
    if(currentPlan?.monthly_releases_limit!=null&&monthlyUsed>=currentPlan.monthly_releases_limit)
     found.plan='Limite mensal de lançamentos atingido.'
   }
   if(stepIndex===2&&!rights)found.rights='Confirme os direitos e autorizações.'
   setErrors(found)
   return !Object.keys(found).length
  }
  const next=()=>{
   setGeneralError('')
   if(!check(step))return
   if(step===0&&!title.trim())setTitle(tracks[0]?.title||'')
   setStep(i=>Math.min(2,i+1))
  }
  async function saveDraft(){
   if(busy)return
   setDraftMessage('')
   const payload={
    format,artists,tracks:tracks.map(({file,...t})=>t),title,genre,subgenre,language,date,releaseTime,upc,label,composerProfiles,isrcModes,useSpecificTime,hasExistingUpc,
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
      for(let i=0;i<readyTracks.length;i++){
        const t=readyTracks[i],ext=/\.flac$/i.test(t.file!.name)?'flac':'wav'
        const audioPath=user.id+'/'+id+'/tracks/'+String(i+1).padStart(2,'0')+'.'+ext
        uploadPaths.current.push({bucket:'audio',path:audioPath})
        await uploadReleaseAsset('audio',audioPath,t.file!,p=>setProgress('Faixa '+(i+1)+'/'+tracks.length+': '+p+'%'))
        payloadTracks.push({
          title:t.title.trim(),isrc:t.isrc.replace(/-/g,'').toUpperCase().trim(),
          audio_path:audioPath,featured_artists:t.featured_artists.trim(),
          composers:t.composers.trim(),producers:t.producers.trim(),
          lyricists:t.lyricists.trim(),credits:t.credits.trim(),
          explicit:t.explicit,language:t.language,duration_seconds:audioSpecs[t.key]?.duration||null,
          audio_sample_rate:audioSpecs[t.key]?.sampleRate,audio_bit_depth:audioSpecs[t.key]?.bitDepth,
          is_original:t.isOriginal,is_instrumental:t.isInstrumental,is_remix:t.isRemix,tiktok_preview_start:t.tiktokPreviewStart,genre:t.genre,subgenre:t.subgenre,
          contributors:t.contributors.map(c=>({name:c.name.trim(),role:c.role}))
        })
      }
      setProgress('Registrando lançamento e enviando para revisão...')
      const payload={
        id,type:format,title:title.trim(),genre:(tracks[0]?.genre||genre).trim(),language,release_time:useSpecificTime?releaseTime:'00:00',
        subgenre:subgenre.trim(),release_date:date,upc:hasExistingUpc?upc.replace(/\s/g,''):'',
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

  const roleTitle:Record<ArtistRole,string>={primary:'Artista primário',featured:'Participação',remixer:'Remixer'}
  const stepTitles=['Dados da faixa','Dados do lançamento','Revisão']

  const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  const roles:Record<Contributor['role'],string>={vocal:'Vocal / Intérprete',producer:'Produtor',featured:'Participação / feat.',instrumentalist:'Instrumentista',remixer:'Remixer',engineer:'Técnico de áudio'}
  const duration=(n:number)=>Number.isFinite(n)?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'—'
  const toggleStore=(name:string,checked:boolean)=>{
   if(addonPaid)return
   setPlatforms(prev=>checked?[...new Set([...prev,name])]:prev.filter(x=>x!==name))
  }
  return <div className="sr sr-two">
   <header className="sr-two-heading">
    <div><span className="sr-two-kicker">SINTONE / DISTRIBUIÇÃO MUSICAL</span>
      <h1>Cadastre sua música</h1><p>Organize os créditos, revise os direitos e envie à equipe SINTONE.</p></div>
    <div className="sr-two-counter">Etapa {Math.min(step+1,2)} de 2</div>
   </header>
   <nav aria-label="Etapas do cadastro" className="sr-two-steps">
    {stepTitles.map((label,i)=><button key={label} type="button" className={i===step?'active':i<step?'done':''}
     disabled={busy||i>step} aria-current={step===i?'step':undefined} onClick={()=>{if(i<step){setStep(i);setErrors({})}}}>
     <span>{i<step?<Check size={15}/>:i+1}</span>{label}</button>)}
   </nav>
   {step===0&&<div className="sr-two-sections">
    <section className="sr-two-panel">
     <div className="sr-two-panel-heading"><span>01</span><div><h2>Dados dos artistas da música</h2><p>Utilize os perfis artísticos vinculados à sua conta.</p></div></div>
     {profilesLoading&&<p className="sr-two-muted">Carregando seus perfis...</p>}
     {!profilesLoading&&!profiles.length&&<p className="sr-two-error">Cadastre um perfil na área Artistas antes de continuar.</p>}
     {artists.map((a,i)=><div className="sr-two-row" key={a.key}>
      <label>Perfil do artista
       <select value={a.profile_id} onChange={e=>selectProfile(a,e.target.value)}>
        <option value="">Selecione o artista</option>
        {profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
       </select>
      </label>
      <label>Função<select value={a.role} onChange={e=>editArtist(a.key,{role:e.target.value as ArtistRole})}>
       {(Object.keys(roleTitle) as ArtistRole[]).map(k=><option key={k} value={k}>{roleTitle[k]}</option>)}
      </select></label>
      {i>0&&<button type="button" className="sr-two-delete" aria-label="Remover artista" onClick={()=>setArtists(arr=>arr.filter(x=>x.key!==a.key))}><Trash2 size={17}/></button>}
     </div>)}
     {err('artists')}{err('primary')}
     <button type="button" className="sr-two-add" disabled={artists.length>=20} onClick={addArtist}><Plus size={16}/> Adicionar artista</button>
    </section>

    <section className="sr-two-panel">
     <div className="sr-two-panel-heading"><span>02</span><div><h2>Dados da música</h2><p>Informações e arquivo de áudio de cada faixa.</p></div></div>
     <div className="sr-two-subheader"><strong>{tracks.length} faixa(s) · {fmtTitle[format]}</strong>
       <button type="button" className="sr-two-add" onClick={()=>{const t=trackNew();setTracks(v=>[...v,t]);setExpandedTrack(t.key)}} disabled={tracks.length>=100}><Plus size={15}/> Nova faixa</button></div>
     <label className={'sr-two-upload '+(dropActive?'dragging':'')} onDragOver={e=>{e.preventDefault();setDropActive(true)}}
      onDragLeave={e=>{e.preventDefault();setDropActive(false)}} onDrop={e=>{e.preventDefault();setDropActive(false);void addAudioFiles(Array.from(e.dataTransfer.files))}}>
      <UploadCloud size={25}/><strong>Insira o arquivo de áudio</strong>
      <small>Arraste ou selecione WAV / FLAC · 16 bits / 44,1 kHz ou 24 bits / 96 kHz · 5 a 1.800 segundos</small>
      <input type="file" accept=".wav,.flac" multiple onChange={e=>{void addAudioFiles(Array.from(e.target.files||[]));e.target.value=''}}/>
     </label>
     {err('tracks')}
     {tracks.map((t,index)=><article className="sr-two-track" key={t.key}>
      <div className="sr-two-track-top"><div><strong>{index+1}. {t.title||'Nova música'}</strong>
       <small>{t.file?.name||'Nenhum áudio selecionado'} {audioSpecs[t.key]?' · '+duration(audioSpecs[t.key].duration):''}</small></div>
       <div className="sr-two-inline">
        <button type="button" className="sr-two-add" onClick={()=>setExpandedTrack(expandedTrack===t.key?null:t.key)}>
         {expandedTrack===t.key?'Fechar':'Editar faixa'}</button>
        <button type="button" className="sr-two-delete" onClick={()=>{removeTrack(t.key);if(tracks.length===1)setTracks([trackNew()])}} aria-label="Excluir faixa"><Trash2 size={16}/></button>
       </div></div>
      <div className="sr-two-player"><span><Headphones size={16}/> Ouça aqui a sua música</span>
       <ReleaseAudioMini file={t.file} onDuration={n=>setTrackDurations(old=>({...old,[t.key]:n}))}/></div>
      {expandedTrack===t.key&&<div className="sr-two-track-fields">
       <div className="sr-two-subsection">
        <h3>ISRC</h3>
        <div className="sr-two-radio-group">
         <label><input type="radio" name={'isrc-'+t.key} checked={isrcModes[t.key]==='have'} onChange={()=>setIsrcModes(v=>({...v,[t.key]:'have'}))}/> Tenho o ISRC desta música e quero informar.</label>
         <label><input type="radio" name={'isrc-'+t.key} checked={isrcModes[t.key]!=='have'} onChange={()=>{setIsrcModes(v=>({...v,[t.key]:'generate'}));editTrack(t.key,{isrc:''})}}/> Não tenho o ISRC e quero que a distribuidora crie.</label>
        </div>
        {isrcModes[t.key]==='have'&&<label>ISRC da música *<input value={t.isrc} maxLength={15} onChange={e=>editTrack(t.key,{isrc:e.target.value.toUpperCase()})} placeholder="BRABC2600001"/>{err('track.'+t.key+'.isrc')}</label>}
        <div className="sr-two-grid">
         <label>Nome da música *<input maxLength={160} value={t.title} onChange={e=>editTrack(t.key,{title:e.target.value})}/>{err('track.'+t.key+'.title')}</label>
         <label>Gênero principal *<select value={t.genre} onChange={e=>{editTrack(t.key,{genre:e.target.value});if(index===0)setGenre(e.target.value)}}>
          <option value="">Selecione</option>{GENRES.map(g=><option value={g} key={g}>{g}</option>)}</select>{err('track.'+t.key+'.genre')}</label>
        </div>
        <label>Áudio selecionado<input value={t.file?.name||'Selecione acima o arquivo WAV ou FLAC'} disabled readOnly/>{err('track.'+t.key+'.audio')}</label>
        {audioSpecs[t.key]&&<p className="sr-two-valid"><Check size={15}/> {audioSpecs[t.key].bitDepth} bits / {(audioSpecs[t.key].sampleRate/1000).toLocaleString('pt-BR')} kHz · {duration(audioSpecs[t.key].duration)} · parâmetros conferidos</p>}
       </div>
       <div className="sr-two-subsection">
        <h3>Colaboradores da faixa</h3>
        {t.contributors.map(c=><div key={c.key} className="sr-two-row">
         <label>Perfil<select value={c.profile_id||''} onChange={e=>{const p=profiles.find(x=>x.id===e.target.value);changeContributor(t.key,c.key,{profile_id:p?.id||'',name:p?.name||''})}}>
          <option value="">Selecione um perfil</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
         <label>Função<select value={c.role} onChange={e=>changeContributor(t.key,c.key,{role:e.target.value as Contributor['role']})}>
          {(Object.keys(roles) as Contributor['role'][]).map(key=><option key={key} value={key}>{roles[key]}</option>)}</select></label>
         <button type="button" className="sr-two-delete" onClick={()=>editTrack(t.key,{contributors:t.contributors.filter(x=>x.key!==c.key)})} aria-label="Remover colaborador"><Trash2 size={16}/></button>
        </div>)}
        {err('track.'+t.key+'.vocal')}{err('track.'+t.key+'.producer')}{err('track.'+t.key+'.contributors')}
        <button type="button" className="sr-two-add" onClick={()=>editTrack(t.key,{contributors:[...t.contributors,{key:crypto.randomUUID(),name:'',role:'instrumentalist'}]})}><Plus size={15}/> Adicionar colaborador</button>
       </div>
       <div className="sr-two-subsection">
        <h3>Compositores da faixa</h3>
        {composerItems(t.key).map(c=><div key={c.key} className="sr-two-row">
         <label>Perfil do compositor<select value={c.profile_id} onChange={e=>updateComposer(t.key,c.key,{profile_id:e.target.value})}>
          <option value="">Outro / Não cadastrado</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
         <label>Nome completo civil *<input value={c.legalName} maxLength={160} onChange={e=>updateComposer(t.key,c.key,{legalName:e.target.value})} placeholder="Nome e sobrenome"/></label>
         <button type="button" className="sr-two-delete" onClick={()=>setComposerProfiles(old=>({...old,[t.key]:composerItems(t.key).filter(x=>x.key!==c.key)}))} aria-label="Remover compositor"><Trash2 size={16}/></button>
        </div>)}
        {err('track.'+t.key+'.composers')}
        <div className="sr-two-warning"><ShieldAlert size={18}/> <p>Atenção ao nome do Compositor. Certifique-se de que o nome completo esteja correto, pois ele será utilizado para o registro de direitos autorais. Nomes artísticos serão barrados e rejeitados pelas plataformas. Produtores e vocais não podem ser selecionados como compositores.</p></div>
        <button type="button" className="sr-two-add" onClick={()=>addComposer(t.key)}><Plus size={15}/> Adicionar compositor</button>
       </div>
       <div className="sr-two-subsection">
        <h3>Dados complementares</h3>
        <strong className="sr-two-label">Classificação indicativa</strong>
        <div className="sr-two-radio-group">
         <label><input type="radio" checked={t.explicit} name={'explicit-'+t.key} onChange={()=>editTrack(t.key,{explicit:true})}/> Explícito</label>
         <label><input type="radio" checked={!t.explicit} name={'explicit-'+t.key} onChange={()=>editTrack(t.key,{explicit:false})}/> Não explícito — adequado para menores</label>
        </div>
        <label>Idioma<select value={t.language} onChange={e=>editTrack(t.key,{language:e.target.value})}>
         {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}</select>{err('track.'+t.key+'.language')}</label>
        <button type="button" className="sr-two-advanced" aria-expanded={!!advancedTracks[t.key]} onClick={()=>setAdvancedTracks(v=>({...v,[t.key]:!v[t.key]}))}>
         Dados avançados <ChevronRight size={15}/></button>
        {!!advancedTracks[t.key]&&<div className="sr-two-advanced-body">
         <strong className="sr-two-label">Esta música é autoral?</strong>
         <div className="sr-two-radio-group"><label><input type="radio" name={'original-'+t.key} checked={t.isOriginal} onChange={()=>editTrack(t.key,{isOriginal:true})}/> Sim, esta versão é a primeira</label>
          <label><input type="radio" name={'original-'+t.key} checked={!t.isOriginal} onChange={()=>editTrack(t.key,{isOriginal:false})}/> Não, ela é versão de outra música</label></div>
         <strong className="sr-two-label">Esta música é instrumental?</strong>
         <div className="sr-two-radio-group"><label><input type="radio" name={'inst-'+t.key} checked={t.isInstrumental} onChange={()=>editTrack(t.key,{isInstrumental:true})}/> Sim, é apenas melodia</label>
          <label><input type="radio" name={'inst-'+t.key} checked={!t.isInstrumental} onChange={()=>editTrack(t.key,{isInstrumental:false})}/> Não, ela contém letra</label></div>
         <strong className="sr-two-label">Esta música é um remix?</strong>
         <div className="sr-two-radio-group"><label><input type="radio" name={'remix-'+t.key} checked={t.isRemix} onChange={()=>editTrack(t.key,{isRemix:true})}/> Sim, é montagem de outra música</label>
          <label><input type="radio" name={'remix-'+t.key} checked={!t.isRemix} onChange={()=>editTrack(t.key,{isRemix:false})}/> Não, a trilha é única</label></div>
         <div className="sr-two-grid">
          <label>Gênero secundário<select value={t.subgenre} onChange={e=>editTrack(t.key,{subgenre:e.target.value})}>
           <option value="">Nenhum</option>{GENRES.map(g=><option key={g} value={g}>{g}</option>)}</select></label>
          <label>Preview TikTok — início do trecho (segundos)<input type="number" min={0} max={Math.max(0,(audioSpecs[t.key]?.duration||0)-5)}
           step={1} value={t.tiktokPreviewStart} onChange={e=>editTrack(t.key,{tiktokPreviewStart:Number(e.target.value)})}/>{err('track.'+t.key+'.preview')}</label>
         </div>
         <p className="sr-two-muted">O trecho escolhido será enviado como preferência para análise da equipe; a loja pode não oferecer suporte à seleção exata.</p>
        </div>}
       </div>
      </div>}
     </article>)}
    </section>
   </div>}
   {step===1&&<div className="sr-two-sections">
    <section className="sr-two-panel">
     <div className="sr-two-panel-heading"><span>01</span><div><h2>Dados do lançamento</h2><p>Data, direitos de publicação e lojas de distribuição.</p></div></div>
     <label>Nome do lançamento *<input maxLength={160} value={title} placeholder="Título do Single, EP ou Álbum" onChange={e=>setTitle(e.target.value)}/>{err('title')}</label>
     <div className="sr-two-calendar">
      <div className="sr-two-recommended"><span>Sugestão de data com maior alcance</span><strong>{afterDays(28)}</strong><small>Prazo recomendado de planejamento (28 dias)</small></div>
      <label>Escolha a data do seu lançamento *<input type="date" min={afterDays(14)} max={afterDays(1095)} value={date} onChange={e=>setDate(e.target.value)}/>{err('date')}</label>
      <p className="sr-two-valid"><Check size={15}/> Data selecionada: {date||'Nenhuma'}</p>
     </div>
     <div className="sr-two-grid">
      <label>Ano de publicação ℗<select value={pYear} onChange={e=>setPYear(Number(e.target.value))}>
       {Array.from({length:101},(_,i)=>new Date().getFullYear()+1-i).map(y=><option value={y} key={y}>{y}</option>)}</select></label>
      <label>Titular do Copyright ℗ *<input maxLength={150} value={pHolder} onChange={e=>setPHolder(e.target.value)}/></label>
      <label>Ano de publicação ©<select value={cYear} onChange={e=>setCYear(Number(e.target.value))}>
       {Array.from({length:101},(_,i)=>new Date().getFullYear()+1-i).map(y=><option value={y} key={y}>{y}</option>)}</select></label>
      <label>Titular do Copyright © *<input maxLength={150} value={cHolder} onChange={e=>setCHolder(e.target.value)}/></label>
     </div>{err('copyright')}
     <label>Selo *<input maxLength={150} value={label} onChange={e=>setLabel(e.target.value)}/>{err('label')}</label>
     <h3>Escolha onde você quer distribuir sua música</h3>
     <div className="sr-two-radio-group">
      <label><input type="radio" name="platformMode" checked={platformMode==='all'} onChange={()=>{setPlatformMode('all');setPlatforms(allowedDSP.filter(x=>!x.is_extra).map(x=>x.name));setShowStoreChooser(false)}}/> Todas as plataformas incluídas no plano</label>
      <label><input type="radio" name="platformMode" checked={platformMode==='selected'} onChange={()=>{setPlatformMode('selected');setShowStoreChooser(true)}}/> Apenas em plataformas selecionadas</label>
     </div>
     {platformMode==='selected'&&<button className="sr-two-add" type="button" onClick={()=>setShowStoreChooser(v=>!v)}>Selecione as plataformas aqui <ChevronRight size={15}/></button>}
     {platformMode==='selected'&&showStoreChooser&&<div className="sr-two-stores">
      {allowedDSP.map(store=><ReleaseStoreItem key={store.slug} name={store.name}
       checked={platforms.includes(store.name)} disabled={addonPaid}
       fee={store.is_extra&&!currentPlan?.has_instagram_included?Number(store.extra_fee):store.is_extra?0:undefined}
       onChange={v=>toggleStore(store.name,v)}/>)}
     </div>}
     {err('platforms')}{err('plan')}{dspError&&<p className="sr-two-error">{dspError}</p>}
     <div className="sr-two-total"><span>Extras selecionados</span><strong>{money(extraTotal)}</strong></div>
    </section>
    <section className="sr-two-panel">
     <div className="sr-two-panel-heading"><span>02</span><div><h2>Capa para as plataformas</h2><p>Selecione uma imagem do seu dispositivo.</p></div></div>
     <label className="sr-two-cover">
      {coverUrl?<img src={coverUrl} alt="Prévia da capa"/>:<UploadCloud size={29}/>}
      <strong>{cover?'Trocar capa':'Subir minha capa'}</strong>
      <small>{cover?.name||'Selecione um JPG do computador ou celular'}</small>
      <input type="file" accept=".jpg,.jpeg,image/jpeg" onChange={e=>{void selectCover(e.target.files?.[0]);e.target.value=''}}/>
     </label>{err('cover')}
     <div className="sr-two-warning"><Info size={18}/><div><strong>Diretrizes para capa</strong>
      <p>Formato aceito: JPG | Tamanho aceito: 1440×1440px ou 3000×3000px. Sem sites/URLs, sem imagens pixeladas ou de baixa qualidade, sem logotipos de lojas (Spotify, iTunes etc.), sem pornografia ou discurso de ódio e sem reutilizar artes de outros álbuns.</p>
     </div></div>
    </section>
    <section className="sr-two-panel">
     <div className="sr-two-panel-heading"><span>03</span><div><h2>Dados avançados</h2><p>Horário e código identificador do lançamento.</p></div></div>
     <strong className="sr-two-label">Especificar horário de lançamento?</strong>
     <div className="sr-two-radio-group">
      <label><input type="radio" name="hour" checked={useSpecificTime} onChange={()=>setUseSpecificTime(true)}/> Sim, quero um horário específico</label>
      <label><input type="radio" name="hour" checked={!useSpecificTime} onChange={()=>{setUseSpecificTime(false);setReleaseTime('00:00')}}/> Não, quero o lançamento padrão às 0h</label>
     </div>
     {useSpecificTime&&<label>Horário pretendido<input type="time" step={60} value={releaseTime} onChange={e=>setReleaseTime(e.target.value)}/>{err('time')}</label>}
     <strong className="sr-two-label">Esta música já tem UPC?</strong>
     <div className="sr-two-radio-group">
      <label><input type="radio" name="upc" checked={hasExistingUpc} onChange={()=>setHasExistingUpc(true)}/> Sim, esta música já foi lançada</label>
      <label><input type="radio" name="upc" checked={!hasExistingUpc} onChange={()=>{setHasExistingUpc(false);setUpc('')}}/> Não lancei esta música ainda</label>
     </div>
     {hasExistingUpc&&<label>UPC / EAN *<input inputMode="numeric" maxLength={13} value={upc} onChange={e=>setUpc(e.target.value.replace(/\D/g,''))}/>{err('upc')}</label>}
     <p className="sr-two-muted">Se não houver UPC, a equipe SINTONE cuidará da identificação durante a distribuição.</p>
    </section>
   </div>}
   {step===2&&<section className="sr-two-panel">
    <div className="sr-two-panel-heading"><span><Check size={18}/></span><div><h2>Revisão dos dados</h2><p>Confira todas as informações antes de enviar o lançamento.</p></div></div>
    <div className="sr-two-review-top">{coverUrl&&<img src={coverUrl} alt="Capa do lançamento"/>}
     <div><h3>{title||'Sem título'}</h3><p>{fmtTitle[format]} · {tracks.length} faixa(s)</p>
      <p>{artists.filter(a=>a.role==='primary').map(a=>a.name).join(', ')}</p>
      <p>Lançamento: {date} · {useSpecificTime?releaseTime:'00:00'}</p></div></div>
    <div className="sr-two-review-grid">
     <div><small>Selo</small><strong>{label}</strong></div>
     <div><small>℗ Gravação</small><strong>{pYear} · {pHolder}</strong></div>
     <div><small>© Lançamento</small><strong>{cYear} · {cHolder}</strong></div>
     <div><small>UPC</small><strong>{hasExistingUpc?upc:'Pendente — SINTONE'}</strong></div>
    </div>
    <h3>Faixas e créditos</h3>
    {readyTracks.map((t,i)=><div key={t.key} className="sr-two-review-track">
     <strong>{i+1}. {t.title}</strong><small>{t.genre} · {duration(audioSpecs[t.key]?.duration||0)} · {t.explicit?'Explícito':'Não explícito'} · ISRC {t.isrc||'a atribuir'}</small>
     <small>Compositores: {t.composers}</small></div>)}
    <h3>Plataformas ({effectivePlatforms.length})</h3>
    <div className="sr-two-stores">{effectivePlatforms.map(name=><div className="sr-two-review-store" key={name}><DspIcon name={name} size={27}/>{name}</div>)}</div>
    <div className="sr-two-total"><span>Taxa adicional</span><strong>{money(extraTotal)}</strong></div>
    <label className="sr-two-consent"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>
     Declaro possuir todos os direitos e autorizações necessários para distribuir a gravação, os compositores, os samples e a capa.</label>
    {err('rights')}
   </section>}
   {addonCheckout&&currentPlan&&<SubscriptionCardForm plan={{id:currentPlan.id,name:currentPlan.name,price_brl:currentPlan.price_brl,frequency:1}}
    addonReleaseId={releaseId.current} addonPrice={extraTotal} selectedStores={effectivePlatforms}
    onClose={()=>{setAddonCheckout(false);void checkReleaseExtras(releaseId.current).then(setAddonPaid)}}/>}
   {generalError&&<p role="alert" className="sr-two-error">{generalError}</p>}
   {draftMessage&&<p role="status" className="sr-two-info">{draftMessage}</p>}
   {progress&&<p role="status" className="sr-two-info">{progress}</p>}
   <footer className="sr-two-footer">
    {step>0&&<button type="button" className="sr-two-secondary" disabled={busy} onClick={()=>{setStep(v=>v-1);setErrors({})}}><ChevronLeft size={16}/> Voltar</button>}
    <button type="button" className="sr-two-secondary" disabled={busy} onClick={()=>void saveDraft()}>Salvar rascunho</button>
    <span>{step===2?'Revisão final':step===0?'Página 1 de 2':'Página 2 de 2'}</span>
    {step<2?<button type="button" className="sr-two-primary" disabled={busy} onClick={next}>
     {step===1?'Ir para revisão dos dados':'Próximo'} <ChevronRight size={17}/></button>:
    <button type="button" className="sr-two-primary" disabled={busy||extraTotal>0&&addonCheckout} onClick={()=>void send()}>
     {busy?'Enviando...':extraTotal>0&&!addonPaid?'Pagar extras e distribuir':'Distribuir'} <Check size={17}/></button>}
   </footer>
  </div>
}
