'use client'
import {useState} from 'react'
import {CheckCircle2, Circle} from 'lucide-react'
const items=[{title:'Arquivos WAV / FLAC',detail:'Qualidade de áudio'},{title:'Capa 3000 × 3000 px',detail:'Arte de lançamento'},{title:'Códigos ISRC / UPC',detail:'Conferência dos dados'}] as const
export default function QCChecklist(){
 const [checked,setChecked]=useState([true,true,false])
 return <div className="sb-qc-preview"><span>CHECKLIST ILUSTRATIVA · CLIQUE PARA MARCAR</span><ul className="sb-qc-list">
 {items.map((item,i)=><li key={item.title}><button type="button" aria-pressed={checked[i]} onClick={()=>setChecked(s=>s.map((v,j)=>j===i?!v:v))}>{checked[i]?<CheckCircle2 size={19}/>:<Circle size={19}/>}<span>{item.title}</span><small>{item.detail}</small></button></li>)}
 </ul></div>
}
