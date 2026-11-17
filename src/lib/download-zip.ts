/** ZIP stream sem bibliotecas adicionais. Usa STORE + data descriptor, sem carregar WAVs na memória. */
type Entry={name:string;source:()=>AsyncIterable<Uint8Array>}
const enc=new TextEncoder()
const crcTable=new Uint32Array(256)
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}
const crcChunk=(start:number,bytes:Uint8Array)=>{
 let crc=start
 for(const value of bytes)crc=crcTable[(crc^value)&255]^(crc>>>8)
 return crc>>>0
}
const toU32=(value:number)=>{
 if(value<0||value>0xffffffff)throw Error('Pacote excede o limite ZIP de 4 GB.')
 return value
}
const short=(buf:Uint8Array,offset:number,n:number)=>new DataView(buf.buffer,buf.byteOffset,buf.byteLength).setUint16(offset,n,true)
const long=(buf:Uint8Array,offset:number,n:number)=>new DataView(buf.buffer,buf.byteOffset,buf.byteLength).setUint32(offset,toU32(n),true)
const local=(name:Uint8Array)=>{
 const b=new Uint8Array(30+name.length)
 long(b,0,0x04034b50);short(b,4,20);short(b,6,0x0808);short(b,8,0)
 short(b,26,name.length);b.set(name,30);return b
}
const descriptor=(crc:number,size:number)=>{
 const b=new Uint8Array(16)
 long(b,0,0x08074b50);long(b,4,crc);long(b,8,size);long(b,12,size);return b
}
const central=(name:Uint8Array,crc:number,size:number,offset:number)=>{
 const b=new Uint8Array(46+name.length)
 long(b,0,0x02014b50);short(b,4,20);short(b,6,20);short(b,8,0x0808)
 long(b,16,crc);long(b,20,size);long(b,24,size)
 short(b,28,name.length);long(b,42,offset);b.set(name,46)
 return b
}
const ending=(count:number,length:number,start:number)=>{
 const b=new Uint8Array(22)
 long(b,0,0x06054b50);short(b,8,count);short(b,10,count)
 long(b,12,length);long(b,16,start);return b
}
/** Arquivos maiores que 4GB não são suportados. O corpo é consumido sob demanda. */
export function zipStream(entries:Entry[]){
 async function* build(){
  const centralRecords:Uint8Array[]=[]
  let position=0
  for(const entry of entries){
   const name=enc.encode(entry.name)
   if(name.length>65535)throw Error('Nome de arquivo muito grande.')
   const offset=position,header=local(name)
   yield header;position+=header.byteLength
   let crc=0xffffffff,size=0
   for await(const chunk of entry.source()){
    size=toU32(size+chunk.byteLength);crc=crcChunk(crc,chunk)
    yield chunk;position+=chunk.byteLength
   }
   crc=(crc^0xffffffff)>>>0
   const dd=descriptor(crc,size)
   yield dd;position+=dd.byteLength
   centralRecords.push(central(name,crc,size,offset))
  }
  const directoryStart=position
  for(const record of centralRecords){yield record;position+=record.byteLength}
  yield ending(centralRecords.length,position-directoryStart,directoryStart)
 }
 const iterator=build()
 return new ReadableStream<Uint8Array>({
  async pull(controller){
   try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(next.value)}
   catch(err){controller.error(err)}
  },
  async cancel(){await iterator.return(undefined)}
 })
}
export function zipTextEntry(name:string,content:string):Entry{
 const bytes=enc.encode(content)
 return {name,source:async function*(){yield bytes}}
}
export function zipRemoteEntry(name:string,body:ReadableStream<Uint8Array>):Entry{
 return {name,source:async function*(){
  const reader=body.getReader()
  try{while(true){const {done,value}=await reader.read();if(done)break;if(value)yield value}}
  finally{reader.releaseLock()}
 }}
}
