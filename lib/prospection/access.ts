// Gate de acesso do módulo Prospecção.
// Valida que a org é do nicho ai_agency antes de permitir qualquer operação.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const NICHES_WITH_PROSPECTION = ['ai_agency']

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function ensureProspectionAccess(orgId: string): Promise<NextResponse | null> {
  const { data, error } = await supabaseAdmin
    .from('orgs')
    .select('niche')
    .eq('id', orgId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  if (!NICHES_WITH_PROSPECTION.includes(data.niche)) {
    return NextResponse.json(
      { error: 'Módulo de prospecção não disponível para esta organização' },
      { status: 403 }
    )
  }

  return null
}

export { NICHES_WITH_PROSPECTION }
