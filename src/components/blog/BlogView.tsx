'use client'
import {useEffect} from 'react'
export default function BlogView({id}:{id:string}){
 useEffect(()=>{
  const key='sintone-blog-view-'+id
  try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{}
  void fetch('/api/blog/view',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({id}),credentials:'same-origin'}).catch(()=>{})
 },[id])
 return null
}
