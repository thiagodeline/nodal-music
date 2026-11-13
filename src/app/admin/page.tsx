'use client'
import { useEffect } from 'react'
// /admin e /admin#royalties levam para a aba certa do painel
export default function Admin() {
  useEffect(() => { location.replace('/dashboard' + (location.hash || '#admin')) }, [])
  return null
}
