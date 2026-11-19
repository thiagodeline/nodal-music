import {ImageResponse} from 'next/og'

export const runtime='edge'
export const alt='SINTONE — Distribuição Musical Digital Brasileira'
export const size={width:1200,height:630}
export const contentType='image/png'

export default function OpenGraphImage(){
 return new ImageResponse(
  <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',background:'#080c15',color:'#fff',padding:'82px 90px',fontFamily:'Arial,sans-serif'}}>
   <div style={{display:'flex',alignItems:'center',gap:24}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:72,height:72,borderRadius:18,background:'#2563eb',fontSize:46,fontWeight:900}}>S</div>
    <span style={{fontSize:42,fontWeight:900,letterSpacing:6}}>SINTONE</span>
   </div>
   <div style={{display:'flex',flexDirection:'column',gap:22}}>
    <span style={{fontSize:23,fontWeight:700,color:'#93c5fd',letterSpacing:3}}>DISTRIBUIÇÃO MUSICAL DIGITAL</span>
    <span style={{fontSize:65,fontWeight:900,lineHeight:1.1,maxWidth:930}}>Sua música em mais plataformas. Sua carreira no controle.</span>
   </div>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:24,color:'#cbd5e1'}}>
    <span>Distribuição independente brasileira</span><span>sintone.com.br</span>
   </div>
  </div>,
  size
 )
}
