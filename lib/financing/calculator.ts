// lib/financing/calculator.ts
// Engine de cálculo de financiamento imobiliário — SAC e Price
// Funções puras, client-side, sem dependências externas

import type {
  SimulationInput,
  MonthlyPayment,
  AmortizationSchedule,
  ClosingCosts,
  ComparisonResult,
} from './types'
import {
  MIP_RATE_BASE,
  DFI_RATE,
  ITBI_RATE_DEFAULT,
  ITBI_RATE_BH,
  REGISTRY_RATE,
  EVALUATION_FEE,
  getMIPMultiplier,
} from './constants'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Converte taxa anual para mensal (juros compostos) */
export function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1
}

/** Estima seguro MIP mensal */
export function estimateInsuranceMIP(outstandingBalance: number, age?: number): number {
  const multiplier = getMIPMultiplier(age)
  return outstandingBalance * MIP_RATE_BASE * multiplier
}

/** Estima seguro DFI mensal */
export function estimateInsuranceDFI(propertyValue: number): number {
  return propertyValue * DFI_RATE
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABELA PRICE (parcelas fixas)
// ═══════════════════════════════════════════════════════════════════════════════

export function calculatePrice(input: SimulationInput): AmortizationSchedule {
  const loanAmount = input.propertyValue - input.downPayment
  const i = annualToMonthlyRate(input.annualInterestRate)
  const n = input.termMonths
  const condoMonthly = input.condoFee || 0
  const iptuMonthly = (input.iptu || 0) / 12
  const dfi = estimateInsuranceDFI(input.propertyValue)

  // PMT = PV × [i(1+i)^n] / [(1+i)^n - 1]
  const factor = Math.pow(1 + i, n)
  const pmt = loanAmount * (i * factor) / (factor - 1)

  const payments: MonthlyPayment[] = []
  let outstanding = loanAmount
  let totalPaid = 0
  let totalInterest = 0
  let totalInsurance = 0

  for (let month = 1; month <= n; month++) {
    const interest = outstanding * i
    const amortization = pmt - interest
    outstanding = Math.max(0, outstanding - amortization)

    const mip = estimateInsuranceMIP(outstanding + amortization, input.borrowerAge)
    const totalWithInsurance = pmt + mip + dfi
    const totalMonthlyCost = totalWithInsurance + condoMonthly + iptuMonthly

    totalPaid += pmt
    totalInterest += interest
    totalInsurance += mip + dfi

    payments.push({
      month,
      payment: round(pmt),
      amortization: round(amortization),
      interest: round(interest),
      outstandingBalance: round(outstanding),
      insuranceMIP: round(mip),
      insuranceDFI: round(dfi),
      totalWithInsurance: round(totalWithInsurance),
      totalMonthlyCost: round(totalMonthlyCost),
    })
  }

  return {
    method: 'PRICE',
    payments,
    totalPaid: round(totalPaid),
    totalInterest: round(totalInterest),
    totalInsurance: round(totalInsurance),
    firstPayment: round(pmt),
    lastPayment: round(pmt),
    averagePayment: round(pmt),
    loanAmount: round(loanAmount),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABELA SAC (amortização constante)
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateSAC(input: SimulationInput): AmortizationSchedule {
  const loanAmount = input.propertyValue - input.downPayment
  const i = annualToMonthlyRate(input.annualInterestRate)
  const n = input.termMonths
  const condoMonthly = input.condoFee || 0
  const iptuMonthly = (input.iptu || 0) / 12
  const dfi = estimateInsuranceDFI(input.propertyValue)

  const amortization = loanAmount / n // constante

  const payments: MonthlyPayment[] = []
  let outstanding = loanAmount
  let totalPaid = 0
  let totalInterest = 0
  let totalInsurance = 0

  for (let month = 1; month <= n; month++) {
    const interest = outstanding * i
    const payment = amortization + interest
    outstanding = Math.max(0, outstanding - amortization)

    const mip = estimateInsuranceMIP(outstanding + amortization, input.borrowerAge)
    const totalWithInsurance = payment + mip + dfi
    const totalMonthlyCost = totalWithInsurance + condoMonthly + iptuMonthly

    totalPaid += payment
    totalInterest += interest
    totalInsurance += mip + dfi

    payments.push({
      month,
      payment: round(payment),
      amortization: round(amortization),
      interest: round(interest),
      outstandingBalance: round(outstanding),
      insuranceMIP: round(mip),
      insuranceDFI: round(dfi),
      totalWithInsurance: round(totalWithInsurance),
      totalMonthlyCost: round(totalMonthlyCost),
    })
  }

  const firstPmt = payments[0]?.payment || 0
  const lastPmt = payments[payments.length - 1]?.payment || 0
  const avgPmt = totalPaid / n

  return {
    method: 'SAC',
    payments,
    totalPaid: round(totalPaid),
    totalInterest: round(totalInterest),
    totalInsurance: round(totalInsurance),
    firstPayment: round(firstPmt),
    lastPayment: round(lastPmt),
    averagePayment: round(avgPmt),
    loanAmount: round(loanAmount),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOS DE ENTRADA
// ═══════════════════════════════════════════════════════════════════════════════

export function estimateClosingCosts(propertyValue: number, city?: string): ClosingCosts {
  const cityLower = (city || '').toLowerCase().trim()
  const itbiRate = cityLower.includes('belo horizonte') || cityLower.includes('bh')
    ? ITBI_RATE_BH
    : ITBI_RATE_DEFAULT

  const itbi = propertyValue * itbiRate
  const registry = propertyValue * REGISTRY_RATE
  const evaluation = EVALUATION_FEE

  return {
    itbi: round(itbi),
    registry: round(registry),
    evaluation,
    total: round(itbi + registry + evaluation),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARAÇÃO SAC vs PRICE
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateComparison(input: SimulationInput): ComparisonResult {
  const sac = calculateSAC(input)
  const price = calculatePrice(input)
  const closingCosts = estimateClosingCosts(input.propertyValue, input.city)
  const savings = price.totalInterest - sac.totalInterest

  return { sac, price, closingCosts, input, savings }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DADOS PARA GRÁFICO (amostragem a cada 12 meses)
// ═══════════════════════════════════════════════════════════════════════════════

export function getChartData(comparison: ComparisonResult): Array<{
  month: number
  year: number
  sac: number
  price: number
  sacBalance: number
  priceBalance: number
}> {
  const data: Array<{
    month: number
    year: number
    sac: number
    price: number
    sacBalance: number
    priceBalance: number
  }> = []

  const sacPayments = comparison.sac.payments
  const pricePayments = comparison.price.payments

  // Primeiro mês + a cada 12 meses + último mês
  for (let i = 0; i < sacPayments.length; i++) {
    if (i === 0 || (i + 1) % 12 === 0 || i === sacPayments.length - 1) {
      data.push({
        month: sacPayments[i].month,
        year: Math.ceil(sacPayments[i].month / 12),
        sac: sacPayments[i].payment,
        price: pricePayments[i].payment,
        sacBalance: sacPayments[i].outstandingBalance,
        priceBalance: pricePayments[i].outstandingBalance,
      })
    }
  }

  return data
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

export function validateInput(input: SimulationInput): string | null {
  if (input.propertyValue <= 0) return 'Valor do imóvel deve ser positivo'
  if (input.downPayment < 0) return 'Entrada não pode ser negativa'
  if (input.downPayment >= input.propertyValue) return 'Entrada deve ser menor que o valor do imóvel'
  if (input.annualInterestRate <= 0 || input.annualInterestRate > 30) return 'Taxa de juros inválida'
  if (input.termMonths < 12 || input.termMonths > 420) return 'Prazo deve ser entre 12 e 420 meses'

  const minDown = input.propertyValue * 0.10
  if (input.downPayment < minDown) return `Entrada mínima: 10% (${formatBRL(minDown)})`

  return null
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
