'use client'
import {useEffect,useMemo,useState} from 'react'
import {Search,Save,SlidersHorizontal} from 'lucide-react'
import {DspIcon} from '@/components/dashboard/DspIcon'
import './dsp-manager.css'
type Store={id:string;name:string;slug:string;active:boolean;is_extra:boolean;extra_fee:number;category:string}
export default function DspManager(){
 const [rows,setRows]=useState<Store[]>([]),[query,setQuery]=useState(''),[busy,setBusy]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>{void fetch('/api/admin/dsp-settings',{cache:'no-store'}).then(x=>x.json()).then(x=>{
  if(x.error)setNotice(x.error);else setRows(x.platforms||[])
 }).catch(()=>setNotice('Falha ao carregar plataformas.'))},[])
 const visible=useMemo(()=>rows.filter(r=>r.name.toLowerCase().includes(query.toLowerCase())),[rows,query])
 const update=(slug:string,changes:Partial<Store>)=>setRows(r=>r.map(x=>x.slug===slug?{...x,...changes}:x))
 async function save(s:Store){
  setBusy(s.slug);setNotice('')
  try{
   const response=await fetch('/api/admin/dsp-settings',{method:'PUT',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({slug:s.slug,active:s.active,is_extra:s.is_extra,extra_fee:Number(s.extra_fee)})})
   const body=await response.json()
   if(!response.ok)throw Error(body.error||'Falha ao salvar.')
   setNotice('Alterações salvas em '+s.name+'.')
  }catch(e){setNotice(e instanceof Error?e.message:'Falha ao salvar.')}
  finally{setBusy('')}
 }
 return <main className="dm"><header className="dm-header"><div><small>ADMINISTRAÇÃO / DISTRIBUIÇÃO</small>
  <h1><SlidersHorizontal size={24}/> Configuração de plataformas</h1>
  <p>Ative ou desative lojas e configure o preço adicional cobrado por lançamento. As mudanças são aplicadas aos novos envios.</p>
 </div><a href="/admin">Voltar</a></header>
 {notice&&<p role="status" className="dm-notice">{notice}</p>}
 <label className="dm-search"><Search size={18}/><input placeholder="Buscar plataformas" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <div className="dm-table-wrap"><table><thead><tr><th>Loja / DSP</th><th>Ativa</th><th>Tipo</th><th>Taxa (R$)</th><th>Ação</th></tr></thead>
 <tbody>{visible.map(r=><tr key={r.id}><td><div className="dm-store"><DspIcon name={r.name}/><div><strong>{r.name}</strong><small>{r.slug}</small></div></div></td>
 <td><label className="dm-toggle"><input type="checkbox" checked={r.active} onChange={e=>update(r.slug,{active:e.target.checked})}/> Habilitada</label></td>
 <td><select value={r.is_extra?'extra':'standard'} onChange={e=>update(r.slug,{is_extra:e.target.value==='extra'})}>
  <option value="standard">Padrão</option><option value="extra">Extra paga</option></select></td>
 <td><input className="dm-money" aria-label={'Taxa de '+r.name} type="number" min="0" max="100000" step=".01" disabled={!r.is_extra} value={r.is_extra?r.extra_fee:0} onChange={e=>update(r.slug,{extra_fee:Number(e.target.value)})}/></td>
 <td><button disabled={busy!==''} onClick={()=>void save(r)}><Save size={15}/>{busy===r.slug?'Salvando':'Salvar'}</button></td>
 </tr>)}</tbody></table></div>
 <p className="dm-note">As cobranças são calculadas no servidor. O artista só consegue enviar as plataformas extras depois da confirmação do Pix. A cobrança depende do plano do artista: planos pagos podem isentar taxas extras; o plano gratuito sempre segue as taxas cadastradas.</p>
 </main>
}
