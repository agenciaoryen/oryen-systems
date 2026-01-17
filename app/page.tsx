'use client'

import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    supabase.auth.getSession().then(console.log)
  }, [])

  return <div>Supabase conectado</div>
}
