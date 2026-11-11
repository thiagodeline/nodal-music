'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import './legal.css'
export default function CookieBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => { try { if (!localStorage.getItem('nodal_cookies_notice')) setShow(true) } catch {} }, [])
  if (!show) return null
  return (<div className="cookie" role="region" aria-label="Aviso de cookies">
    <p>Usamos apenas cookies essenciais, para manter você conectado. Não usamos cookies de publicidade. <Link href="/cookies">Saiba mais</Link></p>
    <button className="btn sm" onClick={() => { try { localStorage.setItem('nodal_cookies_notice', '1') } catch {} setShow(false) }}>Entendi</button>
  </div>)
}
