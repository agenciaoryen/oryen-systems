// app/api/plan-limit/route.ts
// GET /api/plan-limit?org_id=X&resource=leads|documents|properties|users|sites
// Retorna { allowed, current, limit } para o frontend validar antes de inserir

import { NextRequest, NextResponse } from 'next/server'
import { checkPlanLimit, checkMonthlyPlanLimit } from '@/lib/planLimits'

// Mapeamento recurso → { limitKey, table, monthly?, filters? }
const RESOURCE_MAP: Record<string, {
  limitKey: string
  table: string
  monthly?: boolean
  filters?: Record<string, any>
}> = {
  users:      { limitKey: 'maxUsers',             table: 'users',          filters: { status: 'active' } },
  leads:      { limitKey: 'maxActiveLeads',       table: 'leads' },
  properties: { limitKey: 'maxProperties',        table: 'properties' },
  sites:      { limitKey: 'maxSites',             table: 'site_settings' },
  documents:  { limitKey: 'maxDocumentsPerMonth',  table: 'lead_documents', monthly: true },
  messages:   { limitKey: 'maxMonthlyMessages',    table: 'sdr_messages',   monthly: true, filters: { role: 'assistant' } },
}

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id')
    const resource = request.nextUrl.searchParams.get('resource')

    if (!orgId || !resource) {
      return NextResponse.json({ error: 'org_id and resource required' }, { status: 400 })
    }

    const config = RESOURCE_MAP[resource]
    if (!config) {
      return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 400 })
    }

    const result = config.monthly
      ? await checkMonthlyPlanLimit(orgId, config.limitKey as any, config.table, 'created_at', config.filters)
      : await checkPlanLimit(orgId, config.limitKey as any, config.table, config.filters)

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
