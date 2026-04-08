// lib/financing/types.ts
// Tipos para a calculadora de financiamento imobiliário

export type CountryCode = 'BR' | 'US' | 'UK' | 'ES' | 'PT' | 'MX' | 'CO' | 'CL'

export interface CountryConfig {
  code: CountryCode
  name: string                    // ex: "Brasil"
  flag: string                    // ex: "🇧🇷"
  currency: string                // ex: "BRL"
  currencySymbol: string          // ex: "R$"
  locale: string                  // ex: "pt-BR"
  maxTermMonths: number
  minTermMonths: number
  maxFinancingPercent: number
  minDownPaymentPercent: number
  hasInsuranceMIP: boolean        // seguro morte/invalidez obrigatório
  hasInsuranceDFI: boolean        // seguro danos físicos ao imóvel
  transferTaxRate: number         // ITBI (BR), Stamp Duty (UK), etc.
  registryRate: number
  evaluationFee: number           // taxa fixa de avaliação
  propertyTaxLabel: string        // "IPTU", "Property Tax", "IBI", etc.
  amortizationMethods: ('SAC' | 'PRICE')[]  // métodos disponíveis no país
}

export interface BankPreset {
  id: string
  name: string
  rate: number          // taxa anual (ex: 9.99 para 9.99%)
  maxFinancing: number  // % máximo financiável (ex: 80)
  fgts: boolean
  country: CountryCode
}

export interface SimulationInput {
  propertyValue: number
  downPayment: number
  annualInterestRate: number
  termMonths: number
  condoFee?: number
  iptu?: number                  // property tax anual
  borrowerAge?: number
  city?: string
  country?: CountryCode
}

export interface MonthlyPayment {
  month: number
  payment: number
  amortization: number
  interest: number
  outstandingBalance: number
  insuranceMIP: number
  insuranceDFI: number
  totalWithInsurance: number
  totalMonthlyCost: number
}

export interface AmortizationSchedule {
  method: 'SAC' | 'PRICE'
  payments: MonthlyPayment[]
  totalPaid: number
  totalInterest: number
  totalInsurance: number
  firstPayment: number
  lastPayment: number
  averagePayment: number
  loanAmount: number
}

export interface ClosingCosts {
  itbi: number       // transfer tax (ITBI, Stamp Duty, ITP, etc.)
  registry: number
  evaluation: number
  total: number
}

export interface ComparisonResult {
  sac: AmortizationSchedule
  price: AmortizationSchedule
  closingCosts: ClosingCosts
  input: SimulationInput
  savings: number
}

export interface SavedSimulation {
  id: string
  saved_at: string
  saved_by: string
  property_value: number
  down_payment: number
  rate: number
  term_months: number
  bank: string
  first_payment_sac: number
  first_payment_price: number
  total_cost_sac: number
  total_cost_price: number
}
