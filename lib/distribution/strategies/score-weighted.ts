// lib/distribution/strategies/score-weighted.ts
// Estratégia: distribui baseado no score do lead
//
// - Leads HOT (score ≥ 56) → corretor com maior taxa de conversão
// - Leads WARM (26-55) → distribuição balanceada
// - Leads COLD (< 26) → corretor com mais capacidade disponível
// - Leads sem score → round-robin simples

import type { BrokerProfile, LeadContext, AssignmentResult } from '../types'

export function scoreWeighted(brokers: BrokerProfile[], ctx: LeadContext): AssignmentResult {
  if (brokers.length === 0) {
    return { assignedTo: null, strategy: 'score_weighted', reason: 'no_brokers' }
  }

  const score = ctx.score ?? 0
  const label = ctx.scoreLabel || 'cold'

  // HOT leads → melhor conversor
  if (label === 'hot' || score >= 56) {
    const sorted = [...brokers].sort((a, b) => {
      // Priorizar conversão, desempate por menor carga
      if (b.conversionRate !== a.conversionRate) return b.conversionRate - a.conversionRate
      return a.activeLeadCount - b.activeLeadCount
    })
    return {
      assignedTo: sorted[0].userId,
      strategy: 'score_weighted',
      matchScore: score,
      reason: `hot_lead → best_converter (rate: ${sorted[0].conversionRate}%)`,
    }
  }

  // WARM leads → balancear entre conversão e carga
  if (label === 'warm' || score >= 26) {
    const maxActive = Math.max(...brokers.map(b => b.activeLeadCount), 1)
    const maxConversion = Math.max(...brokers.map(b => b.conversionRate), 1)

    const scored = brokers.map(broker => {
      const conversionNorm = broker.conversionRate / maxConversion
      const loadNorm = 1 - (broker.activeLeadCount / maxActive)
      // 50% conversão, 50% capacidade
      const totalScore = (conversionNorm * 0.5) + (loadNorm * 0.5)
      return { broker, totalScore }
    })

    scored.sort((a, b) => b.totalScore - a.totalScore)

    return {
      assignedTo: scored[0].broker.userId,
      strategy: 'score_weighted',
      matchScore: score,
      reason: `warm_lead → balanced (score: ${scored[0].totalScore.toFixed(2)})`,
    }
  }

  // COLD leads → mais capacidade
  const sorted = [...brokers].sort((a, b) => a.activeLeadCount - b.activeLeadCount)
  return {
    assignedTo: sorted[0].userId,
    strategy: 'score_weighted',
    matchScore: score,
    reason: `cold_lead → most_capacity (${sorted[0].activeLeadCount} active)`,
  }
}
