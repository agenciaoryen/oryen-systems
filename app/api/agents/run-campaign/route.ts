// app/api/agents/run-campaign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runHunterCampaign } from '@/lib/agents/hunter/runner'

// Runner local pode demorar até ~30s (Serper + scraping de sites + inserts).
// Vercel padrão é 10s — eleva pra 60s.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Slugs com runner LOCAL (sem n8n).
 * Quando o slug está aqui, executa direto no Vercel — não chama webhook.
 */
const LOCAL_RUNNERS = new Set(['hunter_b2b'])

/**
 * Mapa de webhooks N8N pros agentes que ainda dependem de workflow externo.
 * À medida que cada agente migra pra runner local, é removido daqui.
 *
 * Não listar aqui:
 *   - sdr_imobiliario / sdr → roda via /api/sdr/process (Redis + Claude + UAZAPI),
 *     disparado pelo /api/sdr/webhook quando o WhatsApp envia mensagem. Não usa
 *     este endpoint nem agent_runs/agent_campaigns.
 *   - followup_imobiliario / followup → roda via /api/sdr/follow-up (Vercel cron
 *     horário), lê follow_up_queue. Também não passa por aqui.
 *   - bdr_email → roda via lib/prospection/engine.ts (cron de prospecção).
 */
const WEBHOOK_MAP: Record<string, string | undefined> = {
  'bdr_prospector': process.env.N8N_BDR_WEBHOOK_URL,
}

/**
 * POST /api/agents/run-campaign
 * 
 * Executa uma campanha específica (manual ou agendada)
 * Funciona para qualquer agente — resolve o webhook pelo solution_slug.
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

    // Buscar dados da org (país, idioma, etc)
    const { data: org } = await supabase
      .from('orgs')
      .select('id, name, country, language, timezone, niche')
      .eq('id', agent.org_id)
      .single()

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

    // ─────────────────────────────────────────────────────────────────────
    // 6a. Runner LOCAL — executa direto no Vercel sem chamar n8n.
    // Disponível para slugs em LOCAL_RUNNERS.
    // ─────────────────────────────────────────────────────────────────────
    if (LOCAL_RUNNERS.has(agent.solution_slug)) {
      const result = await runHunterCampaign({
        runId: run.id,
        campaign,
        agent,
        org: {
          id: agent.org_id,
          country: org?.country,
          language: org?.language,
          name: org?.name,
          niche: org?.niche,
        },
        maxLeads: leadsToFetch,
      })

      // Atualiza o run com resultados
      await supabase
        .from('agent_runs')
        .update({
          status: result.status,
          finished_at: new Date().toISOString(),
          duration_ms: result.duration_ms,
          results: {
            leads_found: result.leads_found,
            leads_saved: result.leads_saved,
            leads_duplicated: result.leads_duplicated,
          },
          error_message: result.error_message || null,
        })
        .eq('id', run.id)

      // Atualiza métricas da campanha
      if (result.leads_saved > 0) {
        const currentMetrics = campaign.metrics || {}
        const newCaptured = (currentMetrics.leads_captured || 0) + result.leads_saved
        const newTotalRuns = (currentMetrics.total_runs || 0) + 1

        const updateData: any = {
          metrics: {
            ...currentMetrics,
            leads_captured: newCaptured,
            total_runs: newTotalRuns,
            last_run_status: result.status,
          },
          last_run_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (campaign.target_leads && newCaptured >= campaign.target_leads) {
          updateData.status = 'completed'
          updateData.completed_at = new Date().toISOString()
        }

        await supabase
          .from('agent_campaigns')
          .update(updateData)
          .eq('id', campaign_id)

        // Atualiza uso do agente
        const newAgentUsage = (agent.current_usage?.leads_captured || 0) + result.leads_saved
        await supabase
          .from('agents')
          .update({
            current_usage: { ...agent.current_usage, leads_captured: newAgentUsage },
            updated_at: new Date().toISOString(),
          })
          .eq('id', agent.id)
      } else {
        // Mesmo sem leads salvos, atualiza last_run_at
        await supabase
          .from('agent_campaigns')
          .update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', campaign_id)
      }

      return NextResponse.json({
        success: result.status === 'success',
        run_id: run.id,
        runner: 'local',
        solution_slug: agent.solution_slug,
        leads_found: result.leads_found,
        leads_saved: result.leads_saved,
        leads_duplicated: result.leads_duplicated,
        duration_ms: result.duration_ms,
        error: result.error_message,
      })
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
      
      // Dados da organização
      org: {
        name: org?.name || '',
        country: org?.country || 'CL',
        language: org?.language || 'es',
        timezone: org?.timezone || 'America/Santiago',
        niche: org?.niche || 'general'
      },
      
      // Callback URL
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/agents/run-callback`,
      
      // Metadados
      campaign_name: campaign.name,
      solution_slug: agent.solution_slug,
      trigger_type: trigger_type,
      timestamp: new Date().toISOString()
    }

    // 7. Resolver webhook pelo solution_slug do agente
    const n8nWebhookUrl = WEBHOOK_MAP[agent.solution_slug]
    let webhookStatus = 'not_configured'
    
    if (n8nWebhookUrl) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        webhookStatus = webhookResponse.ok ? 'success' : `error_${webhookResponse.status}`
        console.log(`[${agent.solution_slug}] Webhook response:`, webhookResponse.status)
      } catch (err: any) {
        console.error(`[${agent.solution_slug}] Error calling n8n webhook:`, err.message)
        webhookStatus = `error_${err.code || 'unknown'}`
      }
    } else {
      console.warn(`[${agent.solution_slug}] No webhook configured. Check WEBHOOK_MAP and env vars.`)
      console.log('Payload:', JSON.stringify(webhookPayload, null, 2))
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
      solution_slug: agent.solution_slug,
      message: 'Campaign execution started',
      webhook_configured: !!n8nWebhookUrl,
      webhook_status: webhookStatus
    })

  } catch (error: any) {
    console.error('Run campaign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}