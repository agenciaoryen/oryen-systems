// lib/agents/index.ts

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { 
  AgentSolution, 
  Agent, 
  AgentRun, 
  AgentMetrics,
  AgentEvent,
  AgentStatus 
} from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES DOS AGENTES
// ═══════════════════════════════════════════════════════════════════════════════

export const AGENT_TRANSLATIONS: Record<string, Record<string, { name: string; description: string; features: string[] }>> = {
  'sdr': {
    pt: {
      name: 'SDR Conversacional',
      description: 'Responde leads automaticamente via WhatsApp com IA. Qualifica, agenda e transfere para o time comercial.',
      features: ['Respostas instantâneas 24/7', 'Qualificação automática', 'Agendamento integrado', 'Transferência inteligente']
    },
    en: {
      name: 'Conversational SDR',
      description: 'Automatically responds to leads via WhatsApp with AI. Qualifies, schedules, and transfers to sales team.',
      features: ['24/7 instant responses', 'Auto qualification', 'Integrated scheduling', 'Smart handoff']
    },
    es: {
      name: 'SDR Conversacional',
      description: 'Responde leads automáticamente vía WhatsApp con IA. Califica, agenda y transfiere al equipo comercial.',
      features: ['Respuestas instantáneas 24/7', 'Calificación automática', 'Agendamiento integrado', 'Transferencia inteligente']
    }
  },
  'captacao': {
    pt: {
      name: 'Hunter Captação',
      description: 'Busca e captura leads qualificados automaticamente usando Google Maps, redes sociais e bases públicas.',
      features: ['Busca ativa por nicho', 'Enriquecimento de dados', 'Validação de contatos', 'Importação automática']
    },
    en: {
      name: 'Hunter Prospecting',
      description: 'Searches and captures qualified leads automatically using Google Maps, social media, and public databases.',
      features: ['Active niche search', 'Data enrichment', 'Contact validation', 'Auto import']
    },
    es: {
      name: 'Hunter Captación',
      description: 'Busca y captura leads calificados automáticamente usando Google Maps, redes sociales y bases públicas.',
      features: ['Búsqueda activa por nicho', 'Enriquecimiento de datos', 'Validación de contactos', 'Importación automática']
    }
  },
  'followup': {
    pt: {
      name: 'Follow-up Automático',
      description: 'Envia sequências de mensagens personalizadas para leads que não responderam. Nunca perca uma oportunidade.',
      features: ['Sequências automáticas', 'Personalização por lead', 'Horários inteligentes', 'Detecção de resposta']
    },
    en: {
      name: 'Auto Follow-up',
      description: 'Sends personalized message sequences to leads who haven\'t responded. Never miss an opportunity.',
      features: ['Auto sequences', 'Lead personalization', 'Smart timing', 'Response detection']
    },
    es: {
      name: 'Follow-up Automático',
      description: 'Envía secuencias de mensajes personalizados a leads que no respondieron. Nunca pierdas una oportunidad.',
      features: ['Secuencias automáticas', 'Personalización por lead', 'Horarios inteligentes', 'Detección de respuesta']
    }
  },
  'bdr': {
    pt: {
      name: 'BDR Outbound',
      description: 'Campanhas de prospecção ativa multicanal: email, LinkedIn e WhatsApp. Ideal para B2B.',
      features: ['Campanhas multicanal', 'Cadências personalizadas', 'A/B testing', 'Integração CRM']
    },
    en: {
      name: 'BDR Outbound',
      description: 'Multichannel active prospecting campaigns: email, LinkedIn, and WhatsApp. Ideal for B2B.',
      features: ['Multichannel campaigns', 'Custom cadences', 'A/B testing', 'CRM integration']
    },
    es: {
      name: 'BDR Outbound',
      description: 'Campañas de prospección activa multicanal: email, LinkedIn y WhatsApp. Ideal para B2B.',
      features: ['Campañas multicanal', 'Cadencias personalizadas', 'A/B testing', 'Integración CRM']
    }
  },
  'atendimento': {
    pt: {
      name: 'SAC Inteligente',
      description: 'Atende clientes 24/7 com respostas baseadas na sua base de conhecimento. Escala para humanos quando necessário.',
      features: ['Base de conhecimento', 'Respostas contextuais', 'Escalação inteligente', 'Análise de sentimento']
    },
    en: {
      name: 'Smart Support',
      description: 'Serves customers 24/7 with responses based on your knowledge base. Escalates to humans when needed.',
      features: ['Knowledge base', 'Contextual responses', 'Smart escalation', 'Sentiment analysis']
    },
    es: {
      name: 'SAC Inteligente',
      description: 'Atiende clientes 24/7 con respuestas basadas en tu base de conocimiento. Escala a humanos cuando es necesario.',
      features: ['Base de conocimiento', 'Respuestas contextuales', 'Escalación inteligente', 'Análisis de sentimiento']
    }
  },
  'onboarding': {
    pt: {
      name: 'Onboarding Guiado',
      description: 'Guia novos clientes pelo processo de ativação com mensagens personalizadas e suporte proativo.',
      features: ['Boas-vindas automáticas', 'Checklist interativo', 'Lembretes proativos', 'Suporte contextual']
    },
    en: {
      name: 'Guided Onboarding',
      description: 'Guides new customers through activation with personalized messages and proactive support.',
      features: ['Auto welcome', 'Interactive checklist', 'Proactive reminders', 'Contextual support']
    },
    es: {
      name: 'Onboarding Guiado',
      description: 'Guía a nuevos clientes por el proceso de activación con mensajes personalizados y soporte proactivo.',
      features: ['Bienvenida automática', 'Checklist interactivo', 'Recordatorios proactivos', 'Soporte contextual']
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
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
          .order('sort_order')

        if (fetchError) throw fetchError
        
        // Filtrar apenas ativos (campo pode não existir em todos os registros)
        const activeSolutions = (data || []).filter(s => s.is_active !== false)
        setSolutions(activeSolutions)
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

/**
 * Hook para buscar agentes da organização
 */
export function useMyAgents(orgId: string | undefined) {
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
      
      // Buscar agentes sem JOIN (evita erro de FK)
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (agentsError) throw agentsError
      
      // Se não tem agentes, retorna vazio
      if (!agentsData || agentsData.length === 0) {
        setAgents([])
        setLoading(false)
        return
      }

      // Buscar solutions separadamente para fazer join manual
      const kinds = [...new Set(agentsData.map(a => a.kind).filter(Boolean))]
      
      if (kinds.length > 0) {
        const { data: solutionsData } = await supabase
          .from('agent_solutions')
          .select('*')
          .in('slug', kinds)

        // Join manual
        const agentsWithSolutions = agentsData.map(agent => ({
          ...agent,
          solution: solutionsData?.find(s => s.slug === agent.kind) || null
        }))
        
        setAgents(agentsWithSolutions)
      } else {
        setAgents(agentsData)
      }
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
 * Hook para buscar detalhes de um agente específico
 */
export function useAgent(agentId: string | undefined) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [metrics, setMetrics] = useState<AgentMetrics[]>([])
  const [events, setEvents] = useState<AgentEvent[]>([])
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
      
      // Buscar solution separadamente
      if (agentData?.kind) {
        const { data: solutionData } = await supabase
          .from('agent_solutions')
          .select('*')
          .eq('slug', agentData.kind)
          .single()
        
        agentData.solution = solutionData || null
      }
      
      setAgent(agentData)

      // Buscar últimas execuções
      const { data: runsData } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(50)

      setRuns(runsData || [])

      // Buscar métricas dos últimos 30 dias
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: metricsData } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('agent_id', agentId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })

      setMetrics(metricsData || [])

      // Buscar eventos recentes
      const { data: eventsData } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20)

      setEvents(eventsData || [])

    } catch (err: any) {
      console.error('Error fetching agent details:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { agent, runs, metrics, events, loading, error, refresh }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE AÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contratar/ativar um agente
 */
export async function hireAgent(
  orgId: string, 
  solutionSlug: string, 
  initialConfig?: Record<string, any>
): Promise<{ agent: Agent | null; error: string | null }> {
  try {
    console.log('Hiring agent:', { orgId, solutionSlug, initialConfig })
    
    const { data, error } = await supabase
      .from('agents')
      .insert({
        org_id: orgId,
        kind: solutionSlug,
        status: 'active',
        cfg: initialConfig || {},
        activated_at: new Date().toISOString(),
        billing_started_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (error) {
      console.error('Insert agent error:', error)
      throw error
    }

    console.log('Agent created:', data)

    // Registrar evento (não bloquear se falhar)
    try {
      await supabase.from('agent_events').insert({
        agent_id: data.id,
        org_id: orgId,
        event_type: 'activated',
        title: 'Agente ativado',
        description: `Agente ${solutionSlug} foi contratado e ativado.`
      })
    } catch (eventErr) {
      console.warn('Failed to create event:', eventErr)
    }

    return { agent: data, error: null }
  } catch (err: any) {
    console.error('hireAgent error:', err)
    return { agent: null, error: err.message }
  }
}

/**
 * Atualizar configuração do agente
 */
export async function updateAgentConfig(
  agentId: string, 
  orgId: string,
  config: Record<string, any>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('agents')
      .update({ 
        cfg: config,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)

    if (error) throw error

    // Registrar evento
    await supabase.from('agent_events').insert({
      agent_id: agentId,
      org_id: orgId,
      event_type: 'config_changed',
      title: 'Configuração alterada',
      metadata: { new_config: config }
    })

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Alterar status do agente (pausar/ativar)
 */
export async function toggleAgentStatus(
  agentId: string,
  orgId: string,
  currentStatus: AgentStatus,
  reason?: string
): Promise<{ newStatus: AgentStatus | null; error: string | null }> {
  try {
    if (currentStatus === 'maintenance') {
      return { newStatus: null, error: 'Agente em manutenção não pode ser alterado.' }
    }

    if (currentStatus === 'pending_setup') {
      return { newStatus: null, error: 'Agente aguardando setup.' }
    }

    const newStatus: AgentStatus = currentStatus === 'active' ? 'paused' : 'active'
    const updateData: any = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    if (newStatus === 'paused') {
      updateData.paused_at = new Date().toISOString()
      updateData.paused_reason = reason || null
    } else {
      updateData.paused_at = null
      updateData.paused_reason = null
    }

    const { error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agentId)

    if (error) throw error

    // Registrar evento
    await supabase.from('agent_events').insert({
      agent_id: agentId,
      org_id: orgId,
      event_type: newStatus === 'active' ? 'resumed' : 'paused',
      title: newStatus === 'active' ? 'Agente reativado' : 'Agente pausado',
      description: reason || null
    })

    return { newStatus, error: null }
  } catch (err: any) {
    return { newStatus: null, error: err.message }
  }
}

/**
 * Calcular estatísticas agregadas dos runs
 */
export function calculateAgentStats(runs: AgentRun[]) {
  if (!runs || runs.length === 0) {
    return {
      totalRuns: 0,
      successRate: 0,
      totalCost: 0,
      avgDuration: 0,
      lastRunAt: null,
      lastRunStatus: null
    }
  }

  const total = runs.length
  const successful = runs.filter(r => r.status === 'success').length
  const totalCost = runs.reduce((acc, r) => acc + (Number(r.cost_usd) || 0), 0)
  const avgDuration = runs.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / total
  
  const lastRun = runs[0]

  return {
    totalRuns: total,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    totalCost,
    avgDuration,
    lastRunAt: lastRun?.started_at || null,
    lastRunStatus: lastRun?.status || null
  }
}

/**
 * Helper para obter conteúdo traduzido do agente
 */
export function getAgentTranslation(slug: string, lang: string) {
  const translation = AGENT_TRANSLATIONS[slug]?.[lang]
  if (translation) return translation
  
  // Fallback para português
  return AGENT_TRANSLATIONS[slug]?.pt || {
    name: slug,
    description: '',
    features: []
  }
}