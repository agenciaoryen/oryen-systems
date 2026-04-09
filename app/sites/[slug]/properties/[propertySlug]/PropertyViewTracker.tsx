'use client'

import { useEffect } from 'react'
import { trackPropertyEvent } from '@/lib/properties/tracker'

export default function PropertyViewTracker({ siteSlug, propertyId }: { siteSlug: string; propertyId: string }) {
  useEffect(() => {
    trackPropertyEvent(siteSlug, propertyId, 'view')
  }, [siteSlug, propertyId])

  return null
}
