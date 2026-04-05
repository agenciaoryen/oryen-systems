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

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/properties?org_id=_&limit=1&search=_`)
        // Buscar direto pelo supabase client-side
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: property } = await supabase
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .single()

        setData(property)
      } catch (err) {
        console.error('Failed to fetch property:', err)
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

  return <PropertyForm propertyId={propertyId} initialData={data} />
}
