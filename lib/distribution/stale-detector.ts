// lib/distribution/stale-detector.ts
// Detecta leads estagnados no pipeline e reatribui automaticamente

import { createClient } from '@supabase/supabase-js'
import type { StaleLead } from './types'
import { getDistributionConfig } from './engine'
import { reassignLead } from './engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTAR LEADS ESTAGNADOS
// ═══════════════════════════════════════════════════════════════════════════════

export async function detectStaleLeads(orgId: string): Promise<StaleLead[]> {
  const config = await getDistributionConfig(orgId)
  const thresholdDays = config.stale_threshold_days || 5

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays)

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, stage, assigned_to, updated_at, score, score_label')
    .eq('org_id', orgId)
    .not('stage', 'in', '("won","lost","perdido","ganho")')
    .lt('updated_at', cutoffDate.toISOString())
    .order('updated_at', { ascending: true })
    .limit(100)

  if (!leads || leads.length === 0) return []

  // Buscar nomes dos corretores atribuídos
  const assignedIds = [...new Set(leads.filter(l => l.assigned_to).map(l => l.assigned_to))]
  const userMap = new Map<string, string>()

  if (assignedIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', assignedIds)

    if (users) {
      users.forEach(u => userMap.set(u.id, u.full_name || 'Corretor'))
    }
  }

  return leads.map(lead => {
    const updatedAt = new Date(lead.updated_at)
    const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

    return {
      leadId: lead.id,
      leadName: lead.name || `Lead ${lead.phone?.slice(-4) || '????'}`,
      phone: lead.phone || '',
      stage: lead.stage || 'unknown',
      assignedTo: lead.assigned_to,
      assignedToName: lead.assigned_to ? (userMap.get(lead.assigned_to) || null) : null,
      daysSinceUpdate,
      score: lead.score || 0,
      scoreLabel: lead.score_label || 'cold',
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSAR REATRIBUIÇÕES DE LEADS ESTAGNADOS
// ═══════════════════════════════════════════════════════════════════════════════

export async function processStaleReassignments(orgId: string): Promise<number> {
  const config = await getDistributionConfig(orgId)

  if (!config.enabled || !config.auto_reassign_enabled) return 0

  const staleLeads = await detectStaleLeads(orgId)

  // Só reatribui leads que já tem assigned_to (se não tem, é outro problema)
  const assignedStale = staleLeads.filter(l => l.assignedTo)

  let reassigned = 0

  for (const lead of assignedStale) {
    try {
      const result = await reassignLead(
        lead.leadId,
        orgId,
        'stale_lead_reassign'
      )
      if (result.assignedTo) reassigned++
    } catch (err: any) {
      console.warn(`[StaleDetector] Erro ao reatribuir lead ${lead.leadId}: ${err.message}`)
    }
  }

  if (reassigned > 0) {
    console.log(`[StaleDetector] ✓ ${reassigned} leads estagnados reatribuídos para org ${orgId}`)
  }

  return reassigned
}
