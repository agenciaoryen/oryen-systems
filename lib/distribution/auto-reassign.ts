// lib/distribution/auto-reassign.ts
// Reatribuição automática por timeout (corretor não respondeu em X minutos)

import { createClient } from '@supabase/supabase-js'
import { getDistributionConfig, reassignLead } from './engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSAR TIMEOUTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function processTimeoutReassignments(orgId: string): Promise<number> {
  const config = await getDistributionConfig(orgId)

  if (!config.enabled || !config.auto_reassign_enabled) return 0

  const timeoutMinutes = config.auto_reassign_timeout_minutes || 30
  const cutoffTime = new Date()
  cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes)

  // Buscar leads atribuídos que não tiveram resposta dentro do timeout
  const { data: unresponsedLeads } = await supabase
    .from('leads')
    .select('id, assigned_to')
    .eq('org_id', orgId)
    .not('assigned_to', 'is', null)
    .is('first_response_at', null)
    .lt('assigned_at', cutoffTime.toISOString())
    .not('stage', 'in', '("won","lost","perdido","ganho")')
    .limit(50)

  if (!unresponsedLeads || unresponsedLeads.length === 0) return 0

  let reassigned = 0

  for (const lead of unresponsedLeads) {
    try {
      const result = await reassignLead(
        lead.id,
        orgId,
        'auto_reassign'
      )
      if (result.assignedTo && result.assignedTo !== lead.assigned_to) {
        reassigned++
      }
    } catch (err: any) {
      console.warn(`[AutoReassign] Erro ao reatribuir lead ${lead.id}: ${err.message}`)
    }
  }

  if (reassigned > 0) {
    console.log(`[AutoReassign] ✓ ${reassigned} leads reatribuídos por timeout (${timeoutMinutes}min) — org ${orgId}`)
  }

  return reassigned
}
