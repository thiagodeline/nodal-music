export type AudioTechnicalInfo={duration:number;sampleRate:number;bitDepth:number;format:'wav'|'flac'}
const accepted=(rate:number,bits:number)=>(rate===44100&&bits===16)||(rate===96000&&bits===24)
export async function inspectReleaseAudio(file:File):Promise<AudioTechnicalInfo>{
 if(!/\.(wav|flac)$/i.test(file.name)||file.size<1000||file.size>250*1024*1024)
  throw new Error('Use WAV ou FLAC de até 250 MB.')
 const buffer=await file.slice(0,Math.min(file.size,1048576)).arrayBuffer()
 const view=new DataView(buffer),bytes=new Uint8Array(buffer)
 const ascii=(pos:number,n:number)=>String.fromCharCode(...bytes.slice(pos,pos+n))
 let sampleRate=0,bitDepth=0,duration=0
 const format=/\.flac$/i.test(file.name)?'flac':'wav'
 if(format==='wav'){
  if(ascii(0,4)!=='RIFF'||ascii(8,4)!=='WAVE')throw new Error('Arquivo WAV não reconhecido.')
  let pos=12,channels=0,blockAlign=0,found=false
  while(pos+8<=bytes.length){
   const tag=ascii(pos,4),len=view.getUint32(pos+4,true),next=pos+8+len+(len%2)
   if(tag==='fmt '&&len>=16&&pos+24<=bytes.length){
    const audioFormat=view.getUint16(pos+8,true)
    if(audioFormat!==1)throw new Error('WAV deve ser PCM sem compressão.')
    channels=view.getUint16(pos+10,true)
    sampleRate=view.getUint32(pos+12,true)
    blockAlign=view.getUint16(pos+20,true)
    bitDepth=view.getUint16(pos+22,true)
   }
   if(tag==='data'&&blockAlign>0&&sampleRate>0){
    duration=len/(blockAlign*sampleRate);found=true;break
   }
   if(next<=pos||next>bytes.length)break
   pos=next
  }
  if(!found||channels<1||!duration)throw new Error('Não foi possível ler os parâmetros do arquivo WAV.')
 }else{
  if(ascii(0,4)!=='fLaC'||bytes.length<42)throw new Error('Arquivo FLAC não reconhecido.')
  let pos=4,found=false
  while(pos+4<=bytes.length){
   const kind=bytes[pos]&0x7f,len=(bytes[pos+1]<<16)|(bytes[pos+2]<<8)|bytes[pos+3]
   if(kind===0&&len>=34&&pos+4+len<=bytes.length){
    const z=pos+4+10
    sampleRate=(bytes[z]<<12)|(bytes[z+1]<<4)|(bytes[z+2]>>4)
    bitDepth=(((bytes[z+2]&1)<<4)|(bytes[z+3]>>4))+1
    const samples=(bytes[z+3]&15)*4294967296+
      bytes[z+4]*16777216+bytes[z+5]*65536+bytes[z+6]*256+bytes[z+7]
    duration=samples/sampleRate
    found=true;break
   }
   pos+=4+len
  }
  if(!found)throw new Error('Metadados FLAC STREAMINFO não encontrados.')
 }
 if(!accepted(sampleRate,bitDepth))throw new Error('Áudio deve ser 16 bits / 44,1 kHz ou 24 bits / 96 kHz.')
 if(!Number.isFinite(duration)||duration<5||duration>1800)
  throw new Error('A faixa precisa ter duração de 5 a 1.800 segundos.')
 return {duration:Math.round(duration),sampleRate,bitDepth,format}
}
