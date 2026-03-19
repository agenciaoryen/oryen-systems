// lib/agents/index.ts

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { 
  AgentSolution, 
  Agent, 
  AgentCampaign,
  AgentRun,
  Language,
  UsageInfo,
  CampaignStatus
} from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS DE TRADUÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrai texto traduzido de um objeto multilíngue
 */
export function t(obj: Record<string, string> | undefined | null, lang: Language): string {
  if (!obj) return ''
  return obj[lang] || obj['es'] || obj['pt'] || obj['en'] || ''
}

/**
 * Extrai array de features traduzidas
 */
export function tFeatures(features: Array<Record<string, string>> | undefined, lang: Language): string[] {
  if (!features) return []
  return features.map(f => t(f, lang))
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS - SOLUTIONS (Catálogo)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para buscar catálogo de soluções disponíveis
 */
export function useAgentSolutions() {
  const [solutions, setSolutions] = useState<AgentSolution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error: fetchError } = await supabase
          .from('agent_solutions')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')

        if (fetchError) throw fetchError
        setSolutions(data || [])
      } catch (err: any) {
        console.error('Error fetching agent solutions:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return { solutions, loading, error }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS - AGENTS (Contratação da Org)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para buscar agentes contratados pela org
 */
export function useOrgAgents(orgId: string | undefined) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!orgId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Buscar agentes
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (agentsError) throw agentsError
      
      if (!agentsData || agentsData.length === 0) {
        setAgents([])
        setLoading(false)
        return
      }

      // Buscar solutions para join
      const slugs = [...new Set(agentsData.map(a => a.solution_slug))]
      const { data: solutionsData } = await supabase
        .from('agent_solutions')
        .select('*')
        .in('slug', slugs)

      // Buscar contagem de campanhas por agente
      const { data: campaignCounts } = await supabase
        .from('agent_campaigns')
        .select('agent_id')
        .eq('org_id', orgId)
        .in('agent_id', agentsData.map(a => a.id))

      // Contar campanhas por agente
      const countsMap: Record<string, number> = {}
      campaignCounts?.forEach(c => {
        countsMap[c.agent_id] = (countsMap[c.agent_id] || 0) + 1
      })

      // Join manual
      const agentsWithData = agentsData.map(agent => ({
        ...agent,
        solution: solutionsData?.find(s => s.slug === agent.solution_slug) || null,
        campaigns_count: countsMap[agent.id] || 0
      }))
      
      setAgents(agentsWithData)
    } catch (err: any) {
      console.error('Error fetching agents:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { agents, loading, error, refresh }
}

/**
 * Hook para buscar um agente específico com detalhes
 */
export function useAgent(agentId: string | undefined) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [campaigns, setCampaigns] = useState<AgentCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!agentId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Buscar agente
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()

      if (agentError) throw agentError
      
      // Buscar solution
      if (agentData?.solution_slug) {
        const { data: solutionData } = await supabase
          .from('agent_solutions')
          .select('*')
          .eq('slug', agentData.solution_slug)
          .single()
        
        agentData.solution = solutionData || null
      }
      
      setAgent(agentData)

      // Buscar campanhas
      const { data: campaignsData } = await supabase
        .from('agent_campaigns')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      setCampaigns(campaignsData || [])

    } catch (err: any) {
      console.error('Error fetching agent:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { agent, campaigns, loading, error, refresh }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS - CAMPAIGNS (Personalização do User)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para buscar campanhas de um agente
 */
export function useCampaigns(agentId: string | undefined) {
  const [campaigns, setCampaigns] = useState<AgentCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!agentId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const { data, error: fetchError } = await supabase
        .from('agent_campaigns')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setCampaigns(data || [])
    } catch (err: any) {
      console.error('Error fetching campaigns:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { campaigns, loading, error, refresh }
}

/**
 * Hook para buscar uma campanha específica com runs
 */
export function useCampaign(campaignId: string | undefined) {
  const [campaign, setCampaign] = useState<AgentCampaign | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!campaignId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Buscar campanha
      const { data: campaignData, error: campaignError } = await supabase
        .from('agent_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // Buscar runs
      const { data: runsData } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('started_at', { ascending: false })
        .limit(50)

      setRuns(runsData || [])

    } catch (err: any) {
      console.error('Error fetching campaign:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { campaign, runs, loading, error, refresh }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE AÇÃO - AGENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contratar um agente (criar contratação para a org)
 */
export async function hireAgent(
  orgId: string, 
  solutionSlug: string,
  limits?: Record<string, number>
): Promise<{ agent: Agent | null; error: string | null }> {
  try {
    // Buscar limites padrão da solution
    const { data: solution } = await supabase
      .from('agent_solutions')
      .select('default_limits')
      .eq('slug', solutionSlug)
      .single()

    const finalLimits = { ...(solution?.default_limits || {}), ...(limits || {}) }

    const { data, error } = await supabase
      .from('agents')
      .insert({
        org_id: orgId,
        solution_slug: solutionSlug,
        status: 'active',
        limits: finalLimits,
        current_usage: { leads_captured: 0, period_start: new Date().toISOString() },
        activated_at: new Date().toISOString(),
        billing_started_at: new Date().toISOString(),
        current_period_start: new Date().toISOString()
      })
      .select('*')
      .single()

    if (error) throw error
    return { agent: data, error: null }
  } catch (err: any) {
    console.error('hireAgent error:', err)
    return { agent: null, error: err.message }
  }
}

/**
 * Pausar/ativar agente
 */
export async function toggleAgentStatus(
  agentId: string,
  currentStatus: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    const updateData: any = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    if (newStatus === 'paused') {
      updateData.paused_at = new Date().toISOString()
    } else {
      updateData.paused_at = null
    }

    const { error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agentId)

    if (error) throw error
    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE AÇÃO - CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Criar nova campanha
 */
export async function createCampaign(
  agentId: string,
  orgId: string,
  userId: string,
  data: {
    name: string
    description?: string
    config: Record<string, any>
    target_leads?: number
    schedule_frequency?: string
    schedule_time?: string
  }
): Promise<{ campaign: AgentCampaign | null; error: string | null }> {
  try {
    // Calcular próxima execução
    const nextRunAt = calculateNextRun(
      data.schedule_frequency || 'daily',
      data.schedule_time || '08:00'
    )

    const { data: campaign, error } = await supabase
      .from('agent_campaigns')
      .insert({
        agent_id: agentId,
        org_id: orgId,
        user_id: userId,
        name: data.name,
        description: data.description || null,
        config: data.config,
        target_leads: data.target_leads || null,
        status: 'active',
        schedule_frequency: data.schedule_frequency || 'daily',
        schedule_time: data.schedule_time || '08:00',
        next_run_at: nextRunAt,
        metrics: { leads_captured: 0, total_runs: 0 }
      })
      .select('*')
      .single()

    if (error) throw error
    return { campaign, error: null }
  } catch (err: any) {
    console.error('createCampaign error:', err)
    return { campaign: null, error: err.message }
  }
}

/**
 * Atualizar campanha
 */
export async function updateCampaign(
  campaignId: string,
  data: Partial<{
    name: string
    description: string
    config: Record<string, any>
    target_leads: number | null
    status: CampaignStatus
    schedule_frequency: string
    schedule_time: string
  }>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData: any = { ...data, updated_at: new Date().toISOString() }
    
    // Recalcular próxima execução se mudou agendamento
    if (data.schedule_frequency || data.schedule_time) {
      const { data: current } = await supabase
        .from('agent_campaigns')
        .select('schedule_frequency, schedule_time')
        .eq('id', campaignId)
        .single()
      
      const freq = data.schedule_frequency || current?.schedule_frequency || 'daily'
      const time = data.schedule_time || current?.schedule_time || '08:00'
      updateData.next_run_at = calculateNextRun(freq, time)
    }

    const { error } = await supabase
      .from('agent_campaigns')
      .update(updateData)
      .eq('id', campaignId)

    if (error) throw error
    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Pausar/ativar campanha
 */
export async function toggleCampaignStatus(
  campaignId: string,
  currentStatus: CampaignStatus
): Promise<{ newStatus: CampaignStatus | null; error: string | null }> {
  try {
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      return { newStatus: null, error: 'Campanha finalizada não pode ser alterada' }
    }

    const newStatus: CampaignStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    const updateData: any = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // Se reativando, recalcular próxima execução
    if (newStatus === 'active') {
      const { data: campaign } = await supabase
        .from('agent_campaigns')
        .select('schedule_frequency, schedule_time')
        .eq('id', campaignId)
        .single()
      
      if (campaign) {
        updateData.next_run_at = calculateNextRun(
          campaign.schedule_frequency,
          campaign.schedule_time
        )
      }
    }

    const { error } = await supabase
      .from('agent_campaigns')
      .update(updateData)
      .eq('id', campaignId)

    if (error) throw error
    return { newStatus, error: null }
  } catch (err: any) {
    return { newStatus: null, error: err.message }
  }
}

/**
 * Deletar campanha
 */
export async function deleteCampaign(
  campaignId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('agent_campaigns')
      .delete()
      .eq('id', campaignId)

    if (error) throw error
    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcular próxima execução baseado na frequência
 */
function calculateNextRun(frequency: string, time: string): string {
  const now = new Date()
  const [hours, minutes] = time.split(':').map(Number)
  
  let next = new Date(now)
  next.setHours(hours, minutes, 0, 0)
  
  // Se já passou do horário hoje, vai para o próximo período
  if (next <= now) {
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
  }
  
  return next.toISOString()
}

/**
 * Calcular informações de uso do agente
 */
export function calculateUsage(agent: Agent): UsageInfo {
  const limit = agent.limits?.leads_per_month || 0
  const used = agent.current_usage?.leads_captured || 0
  const remaining = Math.max(limit - used, 0)
  const percentage = limit > 0 ? (used / limit) * 100 : 0

  return { limit, used, remaining, percentage }
}

/**
 * Verificar se campanha pode capturar mais leads
 */
export function canCampaignCapture(
  campaign: AgentCampaign,
  agentUsage: UsageInfo
): { canCapture: boolean; reason?: string } {
  // Verificar se campanha está ativa
  if (campaign.status !== 'active') {
    return { canCapture: false, reason: 'campaign_not_active' }
  }

  // Verificar limite da org
  if (agentUsage.remaining <= 0) {
    return { canCapture: false, reason: 'org_limit_reached' }
  }

  // Verificar meta da campanha
  if (campaign.target_leads) {
    const captured = campaign.metrics?.leads_captured || 0
    if (captured >= campaign.target_leads) {
      return { canCapture: false, reason: 'campaign_target_reached' }
    }
  }

  return { canCapture: true }
}