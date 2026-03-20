// app/api/agents/run-campaign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaign_id, triggered_by } = body

    if (!campaign_id) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      )
    }

    // 1. Buscar dados da campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('agent_campaigns')
      .select(`
        *,
        agents (
          id,
          org_id,
          solution_slug,
          limits,
          current_usage
        )
      `)
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // 2. Verificar se campanha está ativa
    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      )
    }

    // 3. Verificar limite da org
    const agent = campaign.agents
    const limitLeads = agent?.limits?.leads_per_month || 500
    const usedLeads = agent?.current_usage?.leads_captured || 0
    const remainingLeads = limitLeads - usedLeads

    if (remainingLeads <= 0) {
      return NextResponse.json(
        { error: 'Organization limit reached' },
        { status: 400 }
      )
    }

    // 4. Calcular quantos leads buscar nesta execução
    // Se campanha tem meta, respeita. Senão, busca até 10 por run
    const campaignCaptured = campaign.metrics?.leads_captured || 0
    const campaignTarget = campaign.target_leads
    
    let leadsToFetch = 10 // default por execução
    
    if (campaignTarget) {
      const campaignRemaining = campaignTarget - campaignCaptured
      leadsToFetch = Math.min(leadsToFetch, campaignRemaining)
    }
    
    // Não pode buscar mais do que o limite da org permite
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
        status: 'pending',
        trigger_type: triggered_by ? 'manual' : 'schedule',
        triggered_by: triggered_by || null
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
      
      // Configuração da busca (vem do config da campanha)
      config: campaign.config,
      /*
        Exemplo de config para Hunter B2B:
        {
          "business_type": "Barbearias",
          "locations": ["Lajeado", "Santa Maria"],
          "keywords": ["premium"],
          "exclude_keywords": [],
          "min_rating": "4",
          "has_website": false,
          "has_phone": true
        }
      */
      
      // Controles
      max_leads: leadsToFetch,
      
      // Callback URL para o n8n retornar os resultados
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/agents/run-callback`,
      
      // Metadados
      campaign_name: campaign.name,
      solution_slug: agent.solution_slug,
      timestamp: new Date().toISOString()
    }

    // 7. Chamar webhook do N8N
    const n8nWebhookUrl = process.env.N8N_HUNTER_WEBHOOK_URL
    
    if (!n8nWebhookUrl) {
      // Se não tem webhook configurado, apenas marca como pendente
      console.log('N8N webhook not configured, run created as pending')
      return NextResponse.json({
        success: true,
        run_id: run.id,
        message: 'Run created, waiting for n8n webhook configuration',
        payload: webhookPayload
      })
    }

    // Disparar webhook (não espera resposta - fire and forget)
    fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    }).catch(err => {
      console.error('Error calling n8n webhook:', err)
    })

    // 8. Atualizar status do run para "running"
    await supabase
      .from('agent_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', run.id)

    // 9. Atualizar última execução da campanha
    await supabase
      .from('agent_campaigns')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', campaign_id)

    return NextResponse.json({
      success: true,
      run_id: run.id,
      max_leads: leadsToFetch,
      message: 'Campaign execution started'
    })

  } catch (error: any) {
    console.error('Run campaign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}