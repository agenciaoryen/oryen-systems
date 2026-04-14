// app/api/agents/scheduler/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateCronSecret } from '@/lib/api-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/agents/scheduler
 *
 * Verifica campanhas que precisam ser executadas (next_run_at <= now)
 * e dispara a execução de cada uma.
 *
 * Este endpoint deve ser chamado por um cron job externo (ex: Vercel Cron, n8n schedule)
 * a cada 5-15 minutos.
 */
export async function GET(request: NextRequest) {
  try {
    // Validar CRON_SECRET (obrigatório)
    if (!validateCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // 1. Buscar campanhas que precisam executar
    // - status = 'active'
    // - next_run_at <= now
    // - schedule_frequency != 'manual'
    const { data: campaigns, error: campaignsError } = await supabase
      .from('agent_campaigns')
      .select('id, name, next_run_at, schedule_frequency')
      .eq('status', 'active')
      .neq('schedule_frequency', 'manual')
      .lte('next_run_at', now)
      .order('next_run_at', { ascending: true })
      .limit(10) // Processar no máximo 10 por vez

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No campaigns to run',
        checked_at: now,
        campaigns_executed: 0
      })
    }

    // 2. Executar cada campanha
    const results: Array<{
      campaign_id: string
      campaign_name: string
      success: boolean
      error?: string
      run_id?: string
    }> = []

    for (const campaign of campaigns) {
      try {
        // Chamar a API de run-campaign
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/agents/run-campaign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: campaign.id,
              trigger_type: 'schedule'
            })
          }
        )

        const data = await response.json()

        if (response.ok) {
          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            success: true,
            run_id: data.run_id
          })
        } else {
          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            success: false,
            error: data.error
          })
        }
      } catch (err: any) {
        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          success: false,
          error: err.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      checked_at: now,
      campaigns_found: campaigns.length,
      campaigns_executed: successCount,
      campaigns_failed: failedCount,
      results
    })

  } catch (error: any) {
    console.error('Scheduler error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agents/scheduler
 * 
 * Mesmo que GET, mas aceita body para configurações extras
 */
export async function POST(request: NextRequest) {
  return GET(request)
}