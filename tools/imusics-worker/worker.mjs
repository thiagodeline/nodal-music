import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import {createWriteStream} from 'node:fs'
import {pipeline} from 'node:stream/promises'
import {Readable} from 'node:stream'
import {chromium} from 'playwright'

const PORT=4371
const HOST='127.0.0.1'
const ALLOWED_ORIGINS=new Set(['https://sintone-sintone.vercel.app','http://localhost:3000'])
const SUPABASE_ORIGIN='https://jklitdqichsuymgspvbe.supabase.co'
const profilePath=path.join(os.homedir(),'.sintone','imusics-browser')
let current={phase:'idle',detail:'Aguardando tarefa da SINTONE.'}
let working=false
let browserContext=null

function json(res,status,value){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'})
 res.end(JSON.stringify(value))
}
function validAsset(url,bucket){
 try{
  const u=new URL(url)
  return u.origin===SUPABASE_ORIGIN&&
   u.pathname.startsWith('/storage/v1/object/sign/'+bucket+'/') &&
   u.searchParams.has('token')
 }catch{return false}
}
async function download(url,target){
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(180000)})
 if(!response.ok||!response.body)throw Error('Não foi possível baixar arquivo privado ('+response.status+'). Inicie novamente pelo painel.')
 const len=Number(response.headers.get('content-length')||0)
 if(len>350*1024*1024)throw Error('Arquivo maior que o limite de 350 MB do robô.')
 let total=0
 const limited=Readable.fromWeb(response.body).on('data',chunk=>{
  total+=chunk.length
  if(total>350*1024*1024)limited.destroy(Error('Arquivo acima de 350 MB.'))
 })
 await pipeline(limited,createWriteStream(target,{flags:'wx',mode:0o600}))
}
async function tryStep(label,action){
 try{await action();console.log('  OK: '+label);return true}
 catch(e){console.log('  Revisar manualmente: '+label+' ('+String(e.message).slice(0,100)+')');return false}
}
async function fillJob(job){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sintone-imusics-'))
 let browserOpen=false
 try{
  current={phase:'running',detail:'Baixando áudio e capa temporariamente.',releaseId:job.id}
  const audio=path.join(dir,'audio.wav'),cover=path.join(dir,'capa.jpg')
  await Promise.all([download(job.audioUrl,audio),download(job.coverUrl,cover)])
  await fs.mkdir(path.dirname(profilePath),{recursive:true,mode:0o700})
  current={phase:'running',detail:'Abrindo iMusics. Entre na sua conta se aparecer o login.',releaseId:job.id}
  browserContext=await chromium.launchPersistentContext(profilePath,{headless:false,viewport:{width:1440,height:900},acceptDownloads:false})
  browserOpen=true
  const page=browserContext.pages()[0]||await browserContext.newPage()
  await page.goto('https://api.imusics.com/distribuicao/single',{waitUntil:'domcontentloaded'})
  // O usuário pode precisar fazer o login ou confirmar verificação de segurança.
  await page.locator('app-colaborador-musical-select').first().waitFor({timeout:600000})
  console.log('Formulário identificado. Iniciando preenchimento assistido.')
  current={phase:'running',detail:'Preenchendo os dados identificados no formulário.',releaseId:job.id}
  await tryStep('Artista principal',async()=>{
   const sel=page.locator('app-colaborador-musical-select').first()
   await sel.getByRole('button',{name:'dropdown trigger'}).click({timeout:10000})
   await page.getByText(job.artist,{exact:true}).last().click({timeout:10000})
   // A função primário é selecionada apenas se o campo estiver disponível.
   await page.getByText('selecione',{exact:true}).first().click({timeout:5000})
   await page.getByText('Artista primário',{exact:true}).last().click({timeout:5000})
  })
  const reachedMusic=await tryStep('Avançar para dados da música',async()=>{
   await page.getByRole('button',{name:'próximo'}).click({timeout:8000})
   await page.getByRole('textbox',{name:'* Nome da música'}).waitFor({timeout:10000})
  })
  if(reachedMusic){
   await tryStep('Nome da música',()=>page.getByRole('textbox',{name:'* Nome da música'}).fill(job.title,{timeout:10000}))
   await tryStep('Gênero',async()=>{
    await page.locator('app-genero-musical-autocomplete').getByRole('button').click({timeout:6000})
    await page.getByRole('option',{name:job.genre,exact:true}).click({timeout:6000})
   })
   await tryStep('Arquivo de áudio',async()=>{
    const region=page.getByRole('region',{name:/Dados da música/})
    await region.locator('input[type="file"]').first().setInputFiles(audio,{timeout:12000})
   })
   if(job.explicit)await tryStep('Classificação explícita',async()=>{
    await page.locator('#opcaoExplicito .p-radiobutton-box').click({timeout:6000})
   })
   const reachedRelease=await tryStep('Avançar para dados do lançamento',async()=>{
    await page.getByRole('button',{name:'próximo'}).click({timeout:8000})
    await page.getByRole('textbox',{name:'Nome do selo'}).waitFor({timeout:10000})
   })
   if(reachedRelease){
    await tryStep('Selo',()=>page.getByRole('textbox',{name:'Nome do selo'}).fill(job.label,{timeout:8000}))
    await tryStep('Arquivo da capa',async()=>{
     const region=page.getByRole('region',{name:/Dados do Lançamento/})
     await region.locator('input[type="file"]').first().setInputFiles(cover,{timeout:12000})
    })
   }
  }
  current={phase:'manual',detail:'Automação finalizada. Confira a iMusics e preencha os campos restantes manualmente. NÃO envia/publica automaticamente.',releaseId:job.id}
  console.log('Concluído. Termine e confirme o lançamento MANUALMENTE na janela da iMusics.')
  // Mantemos navegador aberto para revisão; o próximo trabalho exige fechar a janela.
  await new Promise(resolve=>browserContext.on('close',resolve))
 }catch(e){
  current={phase:'error',detail:'Falha: '+String(e?.message||e).slice(0,350),releaseId:job.id}
  console.error('Erro no robô:',String(e?.message||e))
  if(browserOpen)console.log('Se o navegador continuar aberto, você poderá verificar o formulário manualmente.')
 }finally{
  try{if(browserContext)await browserContext.close()}catch{}
  browserContext=null
  await fs.rm(dir,{recursive:true,force:true}).catch(()=>{})
  working=false
 }
}
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin||''
 if(origin&& !ALLOWED_ORIGINS.has(origin)){json(res,403,{message:'Origem não autorizada.'});return}
 if(origin){
  res.setHeader('Access-Control-Allow-Origin',origin)
  res.setHeader('Vary','Origin')
  res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Sintone-Bridge')
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Private-Network','true')
 }
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
 if(req.method==='GET'&&req.url==='/health'){json(res,200,{ok:true});return}
 if(req.method==='GET'&&req.url==='/status'){json(res,200,current);return}
 if(req.method!=='POST'||req.url!=='/job'){json(res,404,{message:'Rota desconhecida.'});return}
 if(req.headers['x-sintone-bridge']!=='1'||!origin||!ALLOWED_ORIGINS.has(origin)){
  json(res,403,{message:'Envie a tarefa pelo painel autenticado da SINTONE.'});return
 }
 if(working){json(res,409,{message:'Já existe um envio em andamento. Feche o navegador do robô para iniciar outro.'});return}
 try{
  let body=''
  for await(const chunk of req){
   body+=chunk
   if(body.length>16*1024)throw Error('Tarefa acima do tamanho permitido.')
  }
  const job=JSON.parse(body)
  if(!/^[0-9a-f-]{36}$/i.test(job.id)||typeof job.artist!=='string'||!job.artist.trim()||
   typeof job.title!=='string'||!job.title.trim()||typeof job.genre!=='string'||
   typeof job.label!=='string'||typeof job.explicit!=='boolean'||
   !validAsset(job.audioUrl,'audio')||!validAsset(job.coverUrl,'covers'))
   throw Error('Tarefa inválida ou arquivos fora do Supabase da SINTONE.')
  working=true
  current={phase:'accepted',detail:'Tarefa recebida.',releaseId:job.id}
  json(res,202,{ok:true})
  void fillJob(job)
 }catch(e){json(res,400,{message:String(e.message).slice(0,180)})}
})
server.listen(PORT,HOST,()=>{
 console.log('SINTONE — Robô local pronto.')
 console.log('Servidor local: http://127.0.0.1:'+PORT)
 console.log('Abra Admin > Ingestão na SINTONE e clique em Enviar para iMusics (robô local).')
 console.log('Nunca coloque senha ou service_role do Supabase neste programa.')
})
