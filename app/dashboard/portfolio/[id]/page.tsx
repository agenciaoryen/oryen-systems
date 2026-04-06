// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import PropertyForm from '../PropertyForm'

export default function EditPropertyPage() {
  const params = useParams()
  const propertyId = params.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}`)
        if (!res.ok) {
          setError(true)
          return
        }
        const json = await res.json()
        setData(json.property)
      } catch (err) {
        console.error('Failed to fetch property:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    if (propertyId) fetchProperty()
  }, [propertyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p style={{ color: 'var(--color-text-secondary)' }}>Imóvel não encontrado</p>
      </div>
    )
  }

  return <PropertyForm propertyId={propertyId} initialData={data} />
}
