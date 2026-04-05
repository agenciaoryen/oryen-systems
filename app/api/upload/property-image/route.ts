// app/api/upload/property-image/route.ts
// POST: upload de imagem de imóvel para Supabase Storage

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * POST /api/upload/property-image
 * FormData: file (imagem), org_id, property_id
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const orgId = formData.get('org_id') as string | null
    const propertyId = formData.get('property_id') as string | null

    if (!file || !orgId || !propertyId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, org_id, property_id' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, png, webp' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max: 5MB' },
        { status: 400 }
      )
    }

    // Gerar nome único
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const path = `${orgId}/${propertyId}/${timestamp}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(path)

    return NextResponse.json({
      url: urlData.publicUrl,
      path,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
