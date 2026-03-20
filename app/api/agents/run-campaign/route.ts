// app/api/agents/run-callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      run_id,
      campaign_id,
      agent_id,
      org_id,
      status,           // 'success' | 'error' | 'partial'
      leads_found,      // total encontrados
      leads_saved,      // salvos com sucesso
      leads_duplicated, // duplicados ignorados
      error_message,
      duration_ms
    } = body

    if (!run_id) {
      return NextResponse.json(
        { error: 'run_id is required' },
        { status: 400 }
      )
    }

    // 1. Atualizar o run com os resultados
    const { error: runError } = await supabase
      .from('agent_runs')
      .update({
        status: status || 'success',
        finished_at: new Date().toISOString(),
        duration_ms: duration_ms || null,
        results: {
          leads_found: leads_found || 0,
          leads_saved: leads_saved || 0,
          leads_duplicated: leads_duplicated || 0
        },
        error_message: error_message || null
      })
      .eq('id', run_id)

    if (runError) {
      console.error('Error updating run:', runError)
    }

    // 2. Atualizar métricas da campanha
    if (campaign_id && leads_saved > 0) {
      // Buscar métricas atuais
      const { data: campaign } = await supabase
        .from('agent_campaigns')
        .select('metrics, target_leads')
        .eq('id', campaign_id)
        .single()

      const currentMetrics = campaign?.metrics || {}
      const newCaptured = (currentMetrics.leads_captured || 0) + leads_saved
      const newTotalRuns = (currentMetrics.total_runs || 0) + 1

      const updateData: any = {
        metrics: {
          ...currentMetrics,
          leads_captured: newCaptured,
          total_runs: newTotalRuns,
          last_run_status: status
        },
        updated_at: new Date().toISOString()
      }

      // Verificar se atingiu a meta
      if (campaign?.target_leads && newCaptured >= campaign.target_leads) {
        updateData.status = 'completed'
        updateData.completed_at = new Date().toISOString()
      }

      await supabase
        .from('agent_campaigns')
        .update(updateData)
        .eq('id', campaign_id)
    }

    // 3. Atualizar uso do agente (limite da org)
    if (agent_id && leads_saved > 0) {
      const { data: agent } = await supabase
        .from('agents')
        .select('current_usage')
        .eq('id', agent_id)
        .single()

      const currentUsage = agent?.current_usage || {}
      const newLeadsCaptured = (currentUsage.leads_captured || 0) + leads_saved

      await supabase
        .from('agents')
        .update({
          current_usage: {
            ...currentUsage,
            leads_captured: newLeadsCaptured
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', agent_id)
    }

    // 4. Calcular próxima execução da campanha
    if (campaign_id) {
      const { data: campaign } = await supabase
        .from('agent_campaigns')
        .select('schedule_frequency, schedule_time, status')
        .eq('id', campaign_id)
        .single()

      // Só atualiza próxima execução se ainda estiver ativa
      if (campaign && campaign.status === 'active') {
        const nextRun = calculateNextRun(
          campaign.schedule_frequency,
          campaign.schedule_time
        )

        await supabase
          .from('agent_campaigns')
          .update({ next_run_at: nextRun })
          .eq('id', campaign_id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Run results recorded',
      leads_saved
    })

  } catch (error: any) {
    console.error('Run callback error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Função para calcular próxima execução
function calculateNextRun(frequency: string, time: string): string {
  const now = new Date()
  const [hours, minutes] = (time || '08:00').split(':').map(Number)
  
  let next = new Date(now)
  next.setHours(hours, minutes, 0, 0)
  
  // Sempre vai para o próximo período após uma execução
  switch (frequency) {
    case 'hourly':
      next.setHours(next.getHours() + 1)
      break
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    default:
      next.setDate(next.getDate() + 1)
  }
  
  return next.toISOString()
}