'use client'

import {useEffect,useRef,useState} from 'react'
import {Check,ChevronLeft,ChevronRight,Music2,Plus,Trash2,UploadCloud} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {uploadReleaseAsset} from '@/lib/upload-release-asset'
import WaveformPreview from './WaveformPreview'
import type {Data} from './ui'
import './release-wizard.css'

type Format='single'|'ep'|'album'
type ArtistRole='primary'|'featured'|'remixer'
type Artist={key:string;profile_id:string;name:string;role:ArtistRole}
type Contributor={key:string;name:string;role:'featured'|'producer'|'composer'|'instrumentalist'|'remixer'|'engineer'}
type Track={
  key:string;title:string;isrc:string;file:File|null;featured_artists:string;
  contributors:Contributor[];composers:string;producers:string;lyricists:string;
  credits:string;explicit:boolean;language:string
}
type Profile={id:string;name:string}
const DSP=['Spotify','Apple Music','Deezer','YouTube Music','Amazon Music','Tidal','TikTok','Instagram/Facebook','SoundCloud'] as const
const trackNew=():Track=>({
  key:crypto.randomUUID(),title:'',isrc:'',file:null,featured_artists:'',
  contributors:[],composers:'',producers:'',lyricists:'',credits:'',explicit:false,language:'pt'
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
  const [format,setFormat]=useState<Format>('single')
  const [artists,setArtists]=useState<Artist[]>([
    {key:'primary',profile_id:'',name:d.me?.artist_name||'',role:'primary'}
  ])
  const [profiles,setProfiles]=useState<Profile[]>([])
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
  const [platforms,setPlatforms]=useState<string[]>(['Spotify','Apple Music','Deezer','YouTube Music','Amazon Music'])
  const [cover,setCover]=useState<File|null>(null)
  const [coverUrl,setCoverUrl]=useState('')
  const [errors,setErrors]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState(false)
  const [progress,setProgress]=useState('')
  const [generalError,setGeneralError]=useState('')
  const [rights,setRights]=useState(false)
  const current=tracks[activeTrack]||tracks[0]
  const uploadPaths=useRef<{bucket:'audio'|'covers';path:string}[]>([])
  const success=useRef(false)

  useEffect(()=>{
    let mounted=true
    const sb=createClient()
    sb.from('artist_profiles').select('id,name').eq('owner_id',d.me?.id).order('created_at').then(({data,error})=>{
      if(!mounted)return
      if(error)setGeneralError('Não foi possível carregar seus perfis artísticos. Você ainda pode informar os nomes manualmente.')
      setProfiles(data||[])
    })
    return()=>{mounted=false}
  },[d.me?.id])
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
    editArtist(a.key,{profile_id:p?.id||'',name:p?.name||a.name})
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
    if(!/\.jpe?g$/i.test(f.name)||f.type!=='image/jpeg'||f.size>15*1024*1024){
      setErrors(v=>({...v,cover:'Envie um JPG/JPEG de até 15 MB.'}));return
    }
    const url=URL.createObjectURL(f)
    try{
      const pic=new Image()
      await new Promise<void>((resolve,reject)=>{
        pic.onload=()=>resolve();pic.onerror=()=>reject(new Error('Imagem inválida.'));pic.src=url
      })
      if(pic.naturalWidth!==3000||pic.naturalHeight!==3000)throw Error('A capa deve ter exatamente 3000 × 3000 pixels.')
      setCover(f);setCoverUrl(url);setErrors(v=>({...v,cover:''}))
    }catch(e){URL.revokeObjectURL(url);setErrors(v=>({...v,cover:e instanceof Error?e.message:'Capa inválida.'}))}
  }

  function check(s:number) {
    const errorsFound:Record<string,string>={}
    if(s===0){
      if(!artists.length||artists.filter(x=>x.role==='primary').length!==1)
        errorsFound.artists='Escolha exatamente um artista principal.'
      artists.forEach(a=>{
        if(!text(a.name))errorsFound['artist.'+a.key]='Informe o nome ou selecione um perfil.'
      })
    }
    if(s===1){
      if(!countValid(format,tracks.length))errorsFound.count='Número de faixas incompatível com '+fmtTitle[format]+'.'
      const seen=new Set<string>()
      tracks.forEach((t,i)=>{
        const tag='track.'+t.key+'.'
        if(!text(t.title))errorsFound[tag+'title']='Digite o título da faixa '+(i+1)+'.'
        const code=t.isrc.replace(/-/g,'').trim().toUpperCase()
        if(!isrcValid(code))errorsFound[tag+'isrc']='ISRC inválido (12 caracteres).'
        if(code&&seen.has(code))errorsFound[tag+'isrc']='ISRC repetido em outra faixa.'
        if(code)seen.add(code)
        if(!t.file)errorsFound[tag+'audio']='Envie o áudio WAV ou FLAC.'
        if(text(t.composers).length<2)errorsFound[tag+'composers']='Informe os nomes completos dos compositores.'
        t.contributors.forEach(c=>{if(!text(c.name))errorsFound[tag+'contributors']='Preencha os colaboradores adicionados.'})
      })
    }
    if(s===2){
      if(!text(title))errorsFound.title='Informe o título do lançamento.'
      if(text(genre).length<2)errorsFound.genre='Informe o gênero.'
      if(date<today()||date>afterDays(1095))errorsFound.date='Escolha uma data válida (hoje até três anos).'
      if(upc&&!/^\d{12,13}$/.test(upc.replace(/\s/g,'')))errorsFound.upc='UPC/EAN com 12 ou 13 números.'
      if(!text(label)||text(label).length<2)errorsFound.label='Informe o selo.'
      if(!text(pHolder)||!text(cHolder))errorsFound.copyright='Informe os dois titulares de direitos.'
      if(!Number.isInteger(pYear)||pYear<1900||pYear>2200||!Number.isInteger(cYear)||cYear<1900||cYear>2200)errorsFound.copyright='Ano de copyright inválido.'
      if(!platforms.length)errorsFound.platforms='Escolha pelo menos uma plataforma.'
      if(!cover)errorsFound.cover='Envie uma capa JPG 3000×3000.'
      if(!rights)errorsFound.rights='Confirme os direitos e autorizações do material.'
    }
    setErrors(errorsFound)
    return Object.keys(errorsFound).length===0
  }
  const next=()=>{
    setGeneralError('')
    if(!check(step))return
    if(step===1 && format==='single'&&!title) setTitle(tracks[0]?.title||'')
    setStep(i=>Math.min(2,i+1))
  }
  async function send(){
    if(!check(0)){setStep(0);return}
    if(!check(1)){setStep(1);return}
    if(!check(2)){setStep(2);return}
    if(busy)return
    setBusy(true);setGeneralError('');setProgress('Autenticando...')
    success.current=false;uploadPaths.current=[]
    const client=createClient()
    try{
      const {data:{user},error:authErr}=await client.auth.getUser()
      if(authErr||!user)throw new Error('Sessão expirada. Entre novamente.')
      const releaseId=crypto.randomUUID()
      const coverPath=user.id+'/'+releaseId+'/cover.jpg'
      setProgress('Enviando a capa...')
      uploadPaths.current.push({bucket:'covers',path:coverPath})
      await uploadReleaseAsset('covers',coverPath,cover!,p=>setProgress('Capa: '+p+'%'))
      const payloadTracks=[]
      for(let i=0;i<tracks.length;i++){
        const t=tracks[i],ext=/\.flac$/i.test(t.file!.name)?'flac':'wav'
        const audioPath=user.id+'/'+releaseId+'/tracks/'+String(i+1).padStart(2,'0')+'.'+ext
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
        id:releaseId,type:format,title:title.trim(),genre:genre.trim(),
        subgenre:subgenre.trim(),release_date:date,upc:upc.replace(/\s/g,''),
        artists:artists.map(a=>({profile_id:a.profile_id,name:a.name.trim(),role:a.role})),
        tracks:payloadTracks,cover_path:coverPath,rights_confirmed:rights,
        label_name:label.trim(),p_line:'℗ '+pYear+' '+pHolder.trim(),
        c_line:'© '+cYear+' '+cHolder.trim(),platforms
      }
      const {data,error}=await client.rpc('submit_sintone_release',{p:payload})
      if(error||data!==releaseId)throw new Error(error?.message||'O cadastro não foi confirmado. Confira seu catálogo.')
      success.current=true
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
  const steps=['1. Artistas','2. Faixas e créditos','3. Lançamento']

  return <div className="sr">
    <header className="sr-header">
      <span className="sr-kicker">DISTRIBUIÇÃO DIGITAL · SINTONE</span>
      <h2>Novo lançamento</h2>
      <p>Cadastre seu Single, EP ou Álbum. O envio ficará pendente de revisão.</p>
    </header>
    <div className="sr-steps" aria-label="Etapas do cadastro">
      {steps.map((label,i)=><button key={label} className={step===i?'sr-step active':step>i?'sr-step done':'sr-step'}
        type="button" disabled={busy||i>step} onClick={()=>{if(i<step){setStep(i);setErrors({})}}}>
        <span>{step>i?<Check size={15}/>:i+1}</span>{label}</button>)}
    </div>

    {step===0&&<section className="card sr-panel">
      <h3>Qual o formato do lançamento?</h3>
      <div className="sr-formats">
        {(['single','ep','album'] as Format[]).map(f=><button type="button" key={f}
          className={format===f?'sr-format selected':'sr-format'} onClick={()=>changeFormat(f)} disabled={busy}>
          <Music2 size={23}/><strong>{fmtTitle[f]}</strong>
          <small>{f==='single'?'1 faixa':f==='ep'?'2 a 6 faixas':'7 ou mais faixas'}</small>
        </button>)}
      </div>
      <h3>Dados dos artistas</h3>
      <p className="mut">Selecione um perfil cadastrado em “Meus Artistas” ou informe o nome manualmente. Cada participante precisa de uma função.</p>
      {artists.map((a,i)=><div className="sr-artist-row" key={a.key}>
        <span className="sr-num">{i+1}</span>
        <label>Perfil artístico
          <select value={a.profile_id} onChange={e=>selectProfile(a,e.target.value)}>
            <option value="">Nome manual</option>
            {profiles.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
          </select></label>
        <label>Nome do artista
          <input value={a.name} maxLength={120} className={show('artist.'+a.key)}
            disabled={!!a.profile_id} onChange={e=>editArtist(a.key,{name:e.target.value})}
            placeholder="Nome exibido nas plataformas"/>
          {err('artist.'+a.key)}
        </label>
        <label>Função
          <select value={a.role} onChange={e=>editArtist(a.key,{role:e.target.value as ArtistRole})}>
            {(Object.keys(roleTitle) as ArtistRole[]).map(k=><option key={k} value={k}>{roleTitle[k]}</option>)}
          </select></label>
        {i>0&&<button type="button" className="sr-icon" aria-label="Remover artista" onClick={()=>setArtists(v=>v.filter(x=>x.key!==a.key))}><Trash2 size={17}/></button>}
      </div>)}
      {err('artists')}
      <button type="button" className="btn ghost sm" onClick={addArtist} disabled={artists.length>=20}><Plus size={15}/> Adicionar artista</button>
    </section>}

    {step===1&&<section className="card sr-panel">
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

    {step===2&&<section className="card sr-panel">
      <h3>Dados do lançamento</h3>
      <div className="sr-grid">
        <label>Título do Single, EP ou Álbum *
          <input value={title} maxLength={160} className={show('title')} onChange={e=>setTitle(e.target.value)}/>
          {err('title')}</label>
        <label>Gênero *
          <input value={genre} maxLength={120} className={show('genre')} onChange={e=>setGenre(e.target.value)} placeholder="Rap / Hip-hop"/>
          {err('genre')}</label>
        <label>Subgênero
          <input value={subgenre} maxLength={120} onChange={e=>setSubgenre(e.target.value)} placeholder="Boom bap, Trap..."/></label>
        <label>UPC/EAN (opcional)
          <input value={upc} maxLength={14} className={show('upc')} onChange={e=>setUpc(e.target.value)} placeholder="12 ou 13 dígitos"/>
          {err('upc')}</label>
        <label>Data prevista de lançamento *
          <input type="date" min={today()} max={afterDays(1095)}
            value={date} className={show('date')} onChange={e=>setDate(e.target.value)}/>
          {err('date')}</label>
        <label>Nome do selo *
          <input value={label} maxLength={150} className={show('label')} onChange={e=>setLabel(e.target.value)}/>
          {err('label')}</label>
      </div>
      <div className={'sr-date-badge '+planning.tone}>{planning.label} · {Math.max(days,0)} dias até o lançamento.</div>
      <p className="sr-help mut">Planejar 28 dias ou mais pode dar tempo para revisão e apresentação às plataformas, mas não garante alcance ou posicionamento editorial.</p>
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
      <h3>Plataformas de distribuição *</h3>
      <div className="sr-platforms">{DSP.map(v=><label key={v} className="sr-platform">
        <input type="checkbox" checked={platforms.includes(v)} onChange={e=>setPlatforms(prev=>e.target.checked?[...prev,v]:prev.filter(k=>k!==v))}/>
        {v}</label>)}</div>
      {err('platforms')}
      <h3>Capa do lançamento *</h3>
      <label className="sr-cover-picker">
        {coverUrl?<img src={coverUrl} alt="Prévia da capa do lançamento"/>:<UploadCloud size={27}/>}
        <span>{cover?cover.name:'Selecionar capa JPG · exatamente 3000×3000 px · até 15 MB'}</span>
        <input type="file" accept=".jpg,.jpeg,image/jpeg" onChange={e=>void selectCover(e.target.files?.[0])}/>
      </label>
      {err('cover')}
      <h3>Revisão</h3>
      <div className="sr-summary">
        <span><strong>Formato</strong>{fmtTitle[format]} · {tracks.length} faixas</span>
        <span><strong>Artista principal</strong>{artists.find(a=>a.role==='primary')?.name||'—'}</span>
        <span><strong>Lançamento</strong>{title||'—'}</span>
        <span><strong>Plataformas</strong>{platforms.length} selecionadas</span>
        <span><strong>Data</strong>{date||'—'}</span>
        <span><strong>Capa</strong>{cover?.name||'Pendente'}</span>
      </div>
      <ol className="sr-track-review">{tracks.map((t,i)=><li key={t.key}>{i+1}. {t.title||'Sem título'} · {t.file?.name||'Áudio pendente'} · {t.isrc||'ISRC pela equipe'}</li>)}</ol>
      <label className="sr-check"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>
        Confirmo que tenho os direitos e autorizações necessários para distribuir as gravações, obras, beats, samples e capa.</label>
      {err('rights')}
    </section>}

    {generalError&&<p className="sr-error sr-global" role="alert">{generalError}</p>}
    {progress&&<p className="sr-progress" role="status">{progress}</p>}
    <div className="sr-footer">
      {step>0&&<button type="button" className="btn ghost" onClick={()=>{setStep(i=>i-1);setErrors({})}} disabled={busy}><ChevronLeft size={16}/> Voltar</button>}
      <span className="mut">Etapa {step+1} de 3</span>
      {step<2?<button type="button" className="btn" disabled={busy} onClick={next}>Continuar <ChevronRight size={16}/></button>:
        <button type="button" className="btn" disabled={busy} onClick={()=>void send()}>{busy?'Enviando arquivos...':'Enviar para revisão'} <Check size={16}/></button>}
    </div>
  </div>
}
