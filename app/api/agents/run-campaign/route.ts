// app/api/agents/run-campaign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/agents/run-campaign
 * 
 * Executa uma campanha específica (manual ou agendada)
 * 
 * Body:
 * - campaign_id: string (obrigatório)
 * - triggered_by?: string (user_id se manual)
 * - trigger_type?: 'manual' | 'schedule' (default: 'manual')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaign_id, triggered_by, trigger_type = 'manual' } = body

    if (!campaign_id) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      )
    }

    // 1. Buscar dados da campanha com agent
    const { data: campaign, error: campaignError } = await supabase
      .from('agent_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Buscar agent separadamente (sem FK)
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', campaign.agent_id)
      .single()

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // 2. Verificar se campanha está ativa
    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active', status: campaign.status },
        { status: 400 }
      )
    }

    // 3. Verificar limite da org
    const limitLeads = agent.limits?.leads_per_month || 500
    const usedLeads = agent.current_usage?.leads_captured || 0
    const remainingLeads = limitLeads - usedLeads

    if (remainingLeads <= 0) {
      return NextResponse.json(
        { error: 'Organization limit reached', limit: limitLeads, used: usedLeads },
        { status: 400 }
      )
    }

    // 4. Calcular quantos leads buscar nesta execução
    const campaignCaptured = campaign.metrics?.leads_captured || 0
    const campaignTarget = campaign.target_leads
    
    let leadsToFetch = 10 // default por execução
    
    if (campaignTarget) {
      const campaignRemaining = campaignTarget - campaignCaptured
      leadsToFetch = Math.min(leadsToFetch, campaignRemaining)
    }
    
    leadsToFetch = Math.min(leadsToFetch, remainingLeads)

    if (leadsToFetch <= 0) {
      // Campanha atingiu a meta - marcar como completed
      await supabase
        .from('agent_campaigns')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaign_id)

      return NextResponse.json(
        { error: 'Campaign target reached', completed: true },
        { status: 400 }
      )
    }

    // 5. Criar registro de run
    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .insert({
        campaign_id: campaign.id,
        agent_id: agent.id,
        org_id: agent.org_id,
        status: 'running',
        trigger_type: trigger_type,
        triggered_by: triggered_by || null,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (runError) {
      console.error('Error creating run:', runError)
      return NextResponse.json(
        { error: 'Failed to create run' },
        { status: 500 }
      )
    }

    // 6. Preparar payload para o N8N
    const webhookPayload = {
      // Identificadores
      run_id: run.id,
      campaign_id: campaign.id,
      agent_id: agent.id,
      org_id: agent.org_id,
      
      // Configuração da busca
      config: campaign.config,
      
      // Controles
      max_leads: leadsToFetch,
      
      // Callback URL
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/agents/run-callback`,
      
      // Metadados
      campaign_name: campaign.name,
      solution_slug: agent.solution_slug,
      trigger_type: trigger_type,
      timestamp: new Date().toISOString()
    }

    // 7. Chamar webhook do N8N
    const n8nWebhookUrl = process.env.N8N_HUNTER_WEBHOOK_URL
    
    if (n8nWebhookUrl) {
      // Disparar webhook (fire and forget)
      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      }).catch(err => {
        console.error('Error calling n8n webhook:', err)
      })
    } else {
      console.log('N8N webhook not configured. Payload:', webhookPayload)
    }

    // 8. Atualizar última execução da campanha
    await supabase
      .from('agent_campaigns')
      .update({ 
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id)

    return NextResponse.json({
      success: true,
      run_id: run.id,
      max_leads: leadsToFetch,
      trigger_type: trigger_type,
      message: 'Campaign execution started',
      webhook_configured: !!n8nWebhookUrl
    })

  } catch (error: any) {
    console.error('Run campaign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}