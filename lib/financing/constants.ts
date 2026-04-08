// lib/financing/constants.ts
// Presets bancários e limites para financiamento imobiliário (Brasil 2026)

import type { BankPreset } from './types'

export const BANK_PRESETS: BankPreset[] = [
  { id: 'caixa',        name: 'Caixa Econômica',      rate: 9.99,  maxFinancing: 80, fgts: false },
  { id: 'bb',           name: 'Banco do Brasil',       rate: 10.49, maxFinancing: 80, fgts: false },
  { id: 'itau',         name: 'Itaú',                  rate: 10.79, maxFinancing: 80, fgts: false },
  { id: 'bradesco',     name: 'Bradesco',              rate: 10.99, maxFinancing: 80, fgts: false },
  { id: 'santander',    name: 'Santander',             rate: 11.29, maxFinancing: 90, fgts: false },
  { id: 'inter',        name: 'Banco Inter',           rate: 10.49, maxFinancing: 80, fgts: false },
  { id: 'caixa_fgts',   name: 'Caixa (Pró-cotista)',   rate: 7.66,  maxFinancing: 80, fgts: true },
]

// Limites regulatórios
export const MAX_TERM_MONTHS = 420          // 35 anos
export const MIN_TERM_MONTHS = 60           // 5 anos
export const MAX_FINANCING_PERCENT = 90     // máximo 90% financiável
export const MIN_DOWN_PAYMENT_PERCENT = 10  // mínimo 10% de entrada
export const MAX_FGTS_PROPERTY_VALUE = 2_250_000  // teto FGTS 2026
export const MAX_INCOME_COMMITMENT = 0.30   // 30% da renda bruta

// Taxas de seguro (estimativas médias)
export const MIP_RATE_BASE = 0.0003         // 0.03% do saldo devedor / mês
export const DFI_RATE = 0.0001              // 0.01% do valor do imóvel / mês

// ITBI por faixa (simplificado — varia por município)
export const ITBI_RATE_DEFAULT = 0.02       // 2% (SP, RJ, maioria)
export const ITBI_RATE_BH = 0.03            // 3% (BH)
export const REGISTRY_RATE = 0.01           // ~1% do valor
export const EVALUATION_FEE = 3_500         // taxa de avaliação fixa (~R$3.500)

// Faixas etárias para MIP (multiplicador sobre a base)
export const MIP_AGE_MULTIPLIERS: Record<string, number> = {
  '18-30': 0.8,
  '31-40': 1.0,
  '41-50': 1.3,
  '51-60': 1.8,
  '61-70': 2.5,
  '71-80': 3.5,
}

export function getMIPMultiplier(age?: number): number {
  if (!age) return 1.0
  if (age <= 30) return MIP_AGE_MULTIPLIERS['18-30']
  if (age <= 40) return MIP_AGE_MULTIPLIERS['31-40']
  if (age <= 50) return MIP_AGE_MULTIPLIERS['41-50']
  if (age <= 60) return MIP_AGE_MULTIPLIERS['51-60']
  if (age <= 70) return MIP_AGE_MULTIPLIERS['61-70']
  return MIP_AGE_MULTIPLIERS['71-80']
}
