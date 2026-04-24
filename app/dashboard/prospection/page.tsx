'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProspectionHomePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/prospection/my-day')
  }, [router])
  return null
}
