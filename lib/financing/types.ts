// lib/financing/types.ts
// Tipos para a calculadora de financiamento imobiliário

export interface BankPreset {
  id: string
  name: string
  rate: number          // taxa anual (ex: 9.99 para 9.99%)
  maxFinancing: number  // % máximo financiável (ex: 80)
  fgts: boolean
}

export interface SimulationInput {
  propertyValue: number
  downPayment: number            // valor absoluto em R$
  annualInterestRate: number     // ex: 10.49
  termMonths: number             // ex: 360
  condoFee?: number              // condomínio mensal
  iptu?: number                  // IPTU anual (será dividido por 12)
  borrowerAge?: number           // para cálculo do seguro MIP
  city?: string                  // para estimativa ITBI
}

export interface MonthlyPayment {
  month: number
  payment: number                // parcela (amortização + juros)
  amortization: number
  interest: number
  outstandingBalance: number
  insuranceMIP: number
  insuranceDFI: number
  totalWithInsurance: number     // parcela + MIP + DFI
  totalMonthlyCost: number       // totalWithInsurance + condomínio + IPTU/12
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
  itbi: number
  registry: number
  evaluation: number
  total: number
}

export interface ComparisonResult {
  sac: AmortizationSchedule
  price: AmortizationSchedule
  closingCosts: ClosingCosts
  input: SimulationInput
  savings: number  // quanto SAC economiza vs Price em juros totais
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
