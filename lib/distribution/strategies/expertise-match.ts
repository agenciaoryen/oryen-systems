// lib/distribution/strategies/expertise-match.ts
// Estratégia: match por expertise do corretor com o lead
//
// Pesos:
// - Cidade/região do lead vs broker (40%)
// - Tipo de imóvel (25%)
// - Tipo de transação (15%)
// - Faixa de preço (20%)
//
// Se nenhum broker tem match acima do threshold, retorna null (fallback para round-robin)

import type { BrokerProfile, LeadContext, AssignmentResult } from '../types'

const MATCH_THRESHOLD = 0.15 // mínimo 15% de match para ser considerado

export function expertiseMatch(brokers: BrokerProfile[], ctx: LeadContext): AssignmentResult {
  if (brokers.length === 0) {
    return { assignedTo: null, strategy: 'expertise_match', reason: 'no_brokers' }
  }

  // Se o lead não tem info de contexto suficiente, não dá para fazer match
  const hasContext = ctx.city || ctx.region || ctx.propertyType || ctx.transactionType || ctx.priceRange
  if (!hasContext) {
    return { assignedTo: null, strategy: 'expertise_match', reason: 'no_lead_context_for_matching' }
  }

  const scored = brokers.map(broker => {
    let totalScore = 0
    let totalWeight = 0

    // ─── Cidade/Região (40%) ───
    if (ctx.city || ctx.region) {
      const weight = 0.4
      totalWeight += weight

      const cityMatch = ctx.city
        ? broker.cities.some(c => normalize(c) === normalize(ctx.city!))
        : false
      const regionMatch = ctx.region
        ? broker.regions.some(r => normalize(r) === normalize(ctx.region!))
        : false

      if (cityMatch) {
        totalScore += weight * 1.0
      } else if (regionMatch) {
        totalScore += weight * 0.6
      }
      // Se broker não tem cidades/regiões configuradas, damos match parcial
      else if (broker.cities.length === 0 && broker.regions.length === 0) {
        totalScore += weight * 0.3
      }
    }

    // ─── Tipo de imóvel (25%) ───
    if (ctx.propertyType) {
      const weight = 0.25
      totalWeight += weight

      if (broker.propertyTypes.length === 0) {
        totalScore += weight * 0.3 // não configurado = generalista
      } else if (broker.propertyTypes.some(t => normalize(t) === normalize(ctx.propertyType!))) {
        totalScore += weight * 1.0
      }
    }

    // ─── Tipo de transação (15%) ───
    if (ctx.transactionType) {
      const weight = 0.15
      totalWeight += weight

      if (broker.transactionTypes.length === 0) {
        totalScore += weight * 0.3
      } else if (broker.transactionTypes.some(t => normalize(t) === normalize(ctx.transactionType!))) {
        totalScore += weight * 1.0
      }
    }

    // ─── Faixa de preço (20%) ───
    if (ctx.priceRange && ctx.priceRange > 0) {
      const weight = 0.2
      totalWeight += weight

      if (!broker.priceRangeMin && !broker.priceRangeMax) {
        totalScore += weight * 0.3 // não configurado
      } else {
        const min = broker.priceRangeMin ?? 0
        const max = broker.priceRangeMax ?? Infinity

        if (ctx.priceRange >= min && ctx.priceRange <= max) {
          totalScore += weight * 1.0
        } else {
          // Distância proporcional da faixa
          const mid = (min + (max === Infinity ? min * 3 : max)) / 2
          const distance = Math.abs(ctx.priceRange - mid) / mid
          const proximity = Math.max(0, 1 - distance)
          totalScore += weight * proximity * 0.5
        }
      }
    }

    // Normalizar score se não usamos todos os pesos
    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0

    return { broker, matchScore: normalizedScore }
  })

  // Ordenar por match score (descendente)
  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
    // Desempate: menor carga
    return a.broker.activeLeadCount - b.broker.activeLeadCount
  })

  const best = scored[0]

  // Se melhor match está abaixo do threshold, retornar null para fallback
  if (best.matchScore < MATCH_THRESHOLD) {
    return {
      assignedTo: null,
      strategy: 'expertise_match',
      matchScore: Math.round(best.matchScore * 100),
      reason: `best_match_below_threshold (${(best.matchScore * 100).toFixed(0)}% < ${MATCH_THRESHOLD * 100}%)`,
    }
  }

  return {
    assignedTo: best.broker.userId,
    strategy: 'expertise_match',
    matchScore: Math.round(best.matchScore * 100),
    reason: `expertise_match (${(best.matchScore * 100).toFixed(0)}% match)`,
  }
}

function normalize(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
