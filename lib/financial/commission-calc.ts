// lib/financial/commission-calc.ts
// Funcoes puras para calculo de comissao (client-side preview)

import type { CommissionTier } from './types'

/**
 * Calcula a taxa efetiva de comissao baseada nos tiers.
 * Tiers devem estar ordenados por up_to ascending (null = ultimo).
 */
export function calculateTieredRate(tiers: CommissionTier[], dealValue: number): number {
  if (!tiers || tiers.length === 0) return 0

  const sorted = [...tiers].sort((a, b) => {
    if (a.up_to === null) return 1
    if (b.up_to === null) return -1
    return a.up_to - b.up_to
  })

  for (const tier of sorted) {
    if (tier.up_to === null || dealValue <= tier.up_to) {
      return tier.rate
    }
  }

  return 0
}

/**
 * Calcula o valor total da comissao.
 */
export function calculateCommission(dealValue: number, rate: number): number {
  return Math.round(dealValue * (rate / 100) * 100) / 100
}

/**
 * Calcula o split entre agencia e corretor.
 */
export function calculateSplit(
  totalCommission: number,
  agencySplitPct: number
): { agency: number; broker: number } {
  const agency = Math.round(totalCommission * (agencySplitPct / 100) * 100) / 100
  const broker = Math.round((totalCommission - agency) * 100) / 100
  return { agency, broker }
}

/**
 * Calcula comissao completa (rate + split) de um deal.
 */
export function calculateFullCommission(
  dealValue: number,
  tiers: CommissionTier[],
  agencySplitPct: number
) {
  const rate = calculateTieredRate(tiers, dealValue)
  const total = calculateCommission(dealValue, rate)
  const split = calculateSplit(total, agencySplitPct)

  return {
    rate,
    total,
    agencyAmount: split.agency,
    brokerAmount: split.broker,
  }
}
