// lib/financing/calculator.ts
// Engine de cálculo de financiamento imobiliário — SAC e Price
// Funções puras, client-side, sem dependências externas

import type {
  SimulationInput,
  MonthlyPayment,
  AmortizationSchedule,
  ClosingCosts,
  ComparisonResult,
  CountryCode,
} from './types'
import {
  MIP_RATE_BASE,
  DFI_RATE,
  getMIPMultiplier,
  getCountryConfig,
  formatCurrency,
} from './constants'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Converte taxa anual para mensal (juros compostos) */
export function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1
}

/** Estima seguro MIP mensal (obrigatório em BR, PT, MX, CO, CL) */
export function estimateInsuranceMIP(outstandingBalance: number, age?: number, country: CountryCode = 'BR'): number {
  const config = getCountryConfig(country)
  if (!config.hasInsuranceMIP) return 0
  const multiplier = getMIPMultiplier(age)
  return outstandingBalance * MIP_RATE_BASE * multiplier
}

/** Estima seguro DFI mensal (obrigatório em BR, PT, MX, CO, CL) */
export function estimateInsuranceDFI(propertyValue: number, country: CountryCode = 'BR'): number {
  const config = getCountryConfig(country)
  if (!config.hasInsuranceDFI) return 0
  return propertyValue * DFI_RATE
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABELA PRICE (parcelas fixas / Fixed-rate mortgage)
// ═══════════════════════════════════════════════════════════════════════════════

export function calculatePrice(input: SimulationInput): AmortizationSchedule {
  const country = input.country || 'BR'
  const loanAmount = input.propertyValue - input.downPayment
  const i = annualToMonthlyRate(input.annualInterestRate)
  const n = input.termMonths
  const condoMonthly = input.condoFee || 0
  const iptuMonthly = (input.iptu || 0) / 12
  const dfi = estimateInsuranceDFI(input.propertyValue, country)

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

    const mip = estimateInsuranceMIP(outstanding + amortization, input.borrowerAge, country)
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
// TABELA SAC (amortização constante / Constant Amortization)
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateSAC(input: SimulationInput): AmortizationSchedule {
  const country = input.country || 'BR'
  const loanAmount = input.propertyValue - input.downPayment
  const i = annualToMonthlyRate(input.annualInterestRate)
  const n = input.termMonths
  const condoMonthly = input.condoFee || 0
  const iptuMonthly = (input.iptu || 0) / 12
  const dfi = estimateInsuranceDFI(input.propertyValue, country)

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

    const mip = estimateInsuranceMIP(outstanding + amortization, input.borrowerAge, country)
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
// CUSTOS DE ENTRADA (country-aware)
// ═══════════════════════════════════════════════════════════════════════════════

export function estimateClosingCosts(propertyValue: number, city?: string, country: CountryCode = 'BR'): ClosingCosts {
  const config = getCountryConfig(country)

  let transferTaxRate = config.transferTaxRate

  // Ajustes específicos por cidade (Brasil: BH tem 3%)
  if (country === 'BR') {
    const cityLower = (city || '').toLowerCase().trim()
    if (cityLower.includes('belo horizonte') || cityLower.includes('bh')) {
      transferTaxRate = 0.03
    }
  }

  const itbi = propertyValue * transferTaxRate
  const registry = propertyValue * config.registryRate
  const evaluation = config.evaluationFee

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
  const country = input.country || 'BR'
  const config = getCountryConfig(country)

  const price = calculatePrice(input)

  // Se o país suporta SAC, calcula; senão, usa Price como fallback
  const sac = config.amortizationMethods.includes('SAC')
    ? calculateSAC(input)
    : price

  const closingCosts = estimateClosingCosts(input.propertyValue, input.city, country)
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
// VALIDAÇÃO (country-aware)
// ═══════════════════════════════════════════════════════════════════════════════

export function validateInput(input: SimulationInput): string | null {
  const country = input.country || 'BR'
  const config = getCountryConfig(country)

  if (input.propertyValue <= 0) return 'Valor do imóvel deve ser positivo'
  if (input.downPayment < 0) return 'Entrada não pode ser negativa'
  if (input.downPayment >= input.propertyValue) return 'Entrada deve ser menor que o valor do imóvel'
  if (input.annualInterestRate <= 0 || input.annualInterestRate > 30) return 'Taxa de juros inválida'
  if (input.termMonths < config.minTermMonths || input.termMonths > config.maxTermMonths) {
    return `Prazo deve ser entre ${config.minTermMonths} e ${config.maxTermMonths} meses`
  }

  const minDown = input.propertyValue * (config.minDownPaymentPercent / 100)
  if (input.downPayment < minDown) {
    return `Entrada mínima: ${config.minDownPaymentPercent}% (${formatCurrency(minDown, country)})`
  }

  return null
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
