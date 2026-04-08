// lib/distribution/strategies/balanced-load.ts
// Estratégia: distribuição balanceada considerando carga total, leads iniciais e tempo de resposta
//
// Score de carga (menor = melhor):
// - 60% peso: leads ativos totais (normalizado)
// - 30% peso: leads em estágio inicial (new/contacted) que precisam de atenção
// - 10% peso: tempo médio de resposta (menor = melhor)

import type { BrokerProfile, LeadContext, AssignmentResult } from '../types'

const EARLY_STAGES = ['new', 'novo', 'contacted', 'em atendimento']

export function balancedLoad(brokers: BrokerProfile[], _ctx: LeadContext): AssignmentResult {
  if (brokers.length === 0) {
    return { assignedTo: null, strategy: 'balanced_load', reason: 'no_brokers' }
  }

  // Calcular score de carga para cada broker
  const maxActive = Math.max(...brokers.map(b => b.activeLeadCount), 1)
  const maxResponseTime = Math.max(
    ...brokers.map(b => b.avgResponseTimeMin ?? 0).filter(t => t > 0),
    1
  )

  const scored = brokers.map(broker => {
    // Normalizar leads ativos (0-1, menor = melhor)
    const activeNorm = broker.activeLeadCount / maxActive

    // Estimar leads em estágio inicial como proporção
    // (sem query extra, usamos activeLeadCount como proxy — quem tem mais leads ativos
    //  provavelmente tem mais leads precisando de atenção)
    const earlyStageNorm = activeNorm

    // Normalizar tempo de resposta (0-1, menor = melhor)
    const responseNorm = broker.avgResponseTimeMin
      ? broker.avgResponseTimeMin / maxResponseTime
      : 0.5 // se não tem dado, valor médio

    // Score total (menor = melhor candidato)
    const loadScore = (activeNorm * 0.6) + (earlyStageNorm * 0.3) + (responseNorm * 0.1)

    return { broker, loadScore }
  })

  // Ordenar por score de carga (ascendente = menos carregado primeiro)
  scored.sort((a, b) => a.loadScore - b.loadScore)

  const best = scored[0]
  return {
    assignedTo: best.broker.userId,
    strategy: 'balanced_load',
    matchScore: Math.round((1 - best.loadScore) * 100),
    reason: `balanced (score: ${best.loadScore.toFixed(2)}, active: ${best.broker.activeLeadCount})`,
  }
}
