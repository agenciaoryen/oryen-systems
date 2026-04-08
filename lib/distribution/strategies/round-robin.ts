// lib/distribution/strategies/round-robin.ts
// Estratégia: corretor com menos leads ativos recebe o próximo lead

import type { BrokerProfile, LeadContext, AssignmentResult } from '../types'

export function roundRobin(brokers: BrokerProfile[], _ctx: LeadContext): AssignmentResult {
  if (brokers.length === 0) {
    return { assignedTo: null, strategy: 'round_robin', reason: 'no_brokers' }
  }

  // Ordenar por quantidade de leads ativos (ascendente)
  const sorted = [...brokers].sort((a, b) => a.activeLeadCount - b.activeLeadCount)

  return {
    assignedTo: sorted[0].userId,
    strategy: 'round_robin',
    reason: `least_loaded (${sorted[0].activeLeadCount} leads)`,
  }
}
