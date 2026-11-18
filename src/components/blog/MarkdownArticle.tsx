import Link from 'next/link'
import Image from 'next/image'
import type {ReactNode} from 'react'
import {isBlogImage} from '@/lib/blog'
function safeHref(raw:string){return raw.startsWith('/')&&!raw.startsWith('//')?raw:/^https:\/\//i.test(raw)?raw:null}
function inline(text:string):ReactNode[]{
 const pattern=/(\*\*[^*]+\*\*|\*[^*]+\*|\`[^\`]+\`|\[[^\]]+\]\([^)]+\))/g
 return text.split(pattern).filter(Boolean).map((part,i)=>{
  if(part.startsWith('**')&&part.endsWith('**'))return <strong key={i}>{part.slice(2,-2)}</strong>
  if(part.startsWith('*')&&part.endsWith('*'))return <em key={i}>{part.slice(1,-1)}</em>
  if(part.startsWith('`')&&part.endsWith('`'))return <code key={i}>{part.slice(1,-1)}</code>
  const link=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
  if(link){const href=safeHref(link[2]);return href?<a key={i} href={href} target={href.startsWith('https:')?'_blank':undefined} rel={href.startsWith('https:')?'noopener noreferrer':undefined}>{link[1]}</a>:link[1]}
  return part
 })
}
export default function MarkdownArticle({content}:{content:string}){
 const lines=content.replace(/\r/g,'').split('\n')
 const blocks:ReactNode[]=[]
 for(let i=0;i<lines.length;){
  const line=lines[i].trim();if(!line){i++;continue}
  const key=i
  if(line.startsWith('```')){
   const lang=line.slice(3).trim();const code:string[]=[];i++
   while(i<lines.length&&!lines[i].startsWith('```')){code.push(lines[i]);i++}
   if(i<lines.length)i++
   blocks.push(<pre key={key}><code className={lang?'language-'+lang:undefined}>{code.join('\n')}</code></pre>);continue
  }
  const image=/^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line)
  if(image){blocks.push(isBlogImage(image[2])?<figure key={key}><div className="sb-body-image"><Image src={image[2]} alt={image[1]||'Imagem do artigo'} fill sizes="(max-width:780px) 100vw, 780px" unoptimized/></div>{image[1]&&<figcaption>{image[1]}</figcaption>}</figure>:null);i++;continue}
  if(/^\[CTA\]$/.test(line)){blocks.push(<div key={key} className="sb-inline-cta"><strong>PRONTO PARA DISTRIBUIR SUA MÚSICA?</strong><Link href="/register">CRIAR CONTA GRÁTIS NA SINTONE</Link></div>);i++;continue}
  if(/^#{2,3}\s/.test(line)){const level=line.startsWith('###')?3:2;const title=line.slice(level).trim()
   blocks.push(level===2?<h2 key={key}>{inline(title)}</h2>:<h3 key={key}>{inline(title)}</h3>);i++;continue}
  if(line.includes('|')&&i+1<lines.length&&/^\|?\s*[-:]+[\s|:-]*\|?$/.test(lines[i+1].trim())){
   const row=(raw:string)=>raw.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim())
   const header=row(lines[i]);i+=2;const rows:string[][]=[]
   while(i<lines.length&&lines[i].trim().startsWith('|')){rows.push(row(lines[i]));i++}
   blocks.push(<div className="sb-table-scroll" key={key}><table><thead><tr>{header.map((cell,j)=><th key={j}>{inline(cell)}</th>)}</tr></thead>
    <tbody>{rows.map((cells,j)=><tr key={j}>{header.map((_,k)=><td key={k}>{inline(cells[k]||'')}</td>)}</tr>)}</tbody></table></div>);continue
  }
  if(line.startsWith('>')){const quote:string[]=[];while(i<lines.length&&lines[i].trim().startsWith('>')){quote.push(lines[i].trim().slice(1).trim());i++}
   blocks.push(<blockquote key={key}>{inline(quote.join(' '))}</blockquote>);continue}
  if(/^[-*] /.test(line)||/^\d+\. /.test(line)){
   const ordered=/^\d+\. /.test(line),items:string[]=[]
   while(i<lines.length&&(ordered?/^\d+\. /.test(lines[i].trim()):/^[-*] /.test(lines[i].trim()))){
    items.push(lines[i].trim().replace(ordered?/^\d+\. /:/^[-*] /,''));i++}
   const lis=items.map((x,j)=><li key={j}>{inline(x)}</li>)
   blocks.push(ordered?<ol key={key}>{lis}</ol>:<ul key={key}>{lis}</ul>);continue
  }
  if(line==='---'){blocks.push(<hr key={key}/>);i++;continue}
  const paragraph:string[]=[]
  while(i<lines.length&&lines[i].trim()&&!/^(#{2,3} |>|[-*] |\d+\. |\|!|!\[|\[CTA\]|```|---$)/.test(lines[i].trim())){
   paragraph.push(lines[i].trim());i++}
  if(!paragraph.length){i++;continue}
  blocks.push(<p key={key}>{inline(paragraph.join(' '))}</p>)
 }
 return <div className="sb-prose">{blocks}</div>
}
