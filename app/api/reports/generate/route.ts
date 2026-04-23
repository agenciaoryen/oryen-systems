// app/api/reports/generate/route.ts
// Gera um relatório manual (sem envio) retornando dados agregados em JSON.
// O frontend pega esse JSON e monta um PDF via window.print().
//
// Body:
//   - from: YYYY-MM-DD (data início, inclusive)
//   - to:   YYYY-MM-DD (data fim, inclusive)
//   - metrics: { base: {...}, pipeline: [...], financial: {...}, site: {...}, goals: {...}, followup: {...} }
//   - name (opcional): título do relatório

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'
import { aggregateReportData } from '@/lib/reports/aggregator'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const orgId = resolveOrgId(auth, body.orgId)

    const { from, to, metrics, name } = body

    if (!from || !to) {
      return NextResponse.json({ error: 'from e to são obrigatórios (YYYY-MM-DD)' }, { status: 400 })
    }

    // Valida formato
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
      return NextResponse.json({ error: 'Datas devem estar no formato YYYY-MM-DD' }, { status: 400 })
    }

    if (new Date(from) > new Date(to)) {
      return NextResponse.json({ error: 'from não pode ser depois de to' }, { status: 400 })
    }

    // Usa a função existente — passa custom_from/custom_to pra ignorar frequency
    const reportConfig = {
      name: name || 'Relatório Manual',
      frequency: 'custom',
      custom_from: from,
      custom_to: to,
      metrics: metrics || {},
    }

    const data = await aggregateReportData(supabase, orgId, reportConfig)

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('[reports/generate] erro:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
