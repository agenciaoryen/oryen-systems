// lib/financing/constants.ts
// Presets bancários e limites para financiamento imobiliário — Internacional

import type { BankPreset, CountryCode, CountryConfig } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTRY CONFIGS
// ═══════════════════════════════════════════════════════════════════════════════

export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  BR: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    currency: 'BRL',
    currencySymbol: 'R$',
    locale: 'pt-BR',
    maxTermMonths: 420,       // 35 anos
    minTermMonths: 60,        // 5 anos
    maxFinancingPercent: 90,
    minDownPaymentPercent: 10,
    hasInsuranceMIP: true,
    hasInsuranceDFI: true,
    transferTaxRate: 0.02,    // ITBI ~2%
    registryRate: 0.01,
    evaluationFee: 3_500,
    propertyTaxLabel: 'IPTU',
    amortizationMethods: ['SAC', 'PRICE'],
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    maxTermMonths: 360,       // 30 anos
    minTermMonths: 60,
    maxFinancingPercent: 97,  // FHA permite até 96.5%
    minDownPaymentPercent: 3, // Conventional 3%, FHA 3.5%
    hasInsuranceMIP: false,
    hasInsuranceDFI: false,
    transferTaxRate: 0.01,    // ~1% (varia por estado)
    registryRate: 0.005,
    evaluationFee: 500,       // ~$400-600
    propertyTaxLabel: 'Property Tax',
    amortizationMethods: ['PRICE'],  // US usa só fixed-rate (Price)
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    maxTermMonths: 420,       // 35 anos
    minTermMonths: 60,
    maxFinancingPercent: 95,
    minDownPaymentPercent: 5,
    hasInsuranceMIP: false,
    hasInsuranceDFI: false,
    transferTaxRate: 0.03,    // Stamp Duty ~3% (faixa 125k-250k)
    registryRate: 0.003,
    evaluationFee: 350,       // ~£300-400
    propertyTaxLabel: 'Council Tax',
    amortizationMethods: ['PRICE'],  // Repayment mortgage (Price)
  },
  ES: {
    code: 'ES',
    name: 'España',
    flag: '🇪🇸',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'es-ES',
    maxTermMonths: 360,       // 30 anos
    minTermMonths: 60,
    maxFinancingPercent: 80,
    minDownPaymentPercent: 20,
    hasInsuranceMIP: false,
    hasInsuranceDFI: false,
    transferTaxRate: 0.07,    // ITP ~6-10%, média 7%
    registryRate: 0.005,
    evaluationFee: 400,       // ~€300-500
    propertyTaxLabel: 'IBI',
    amortizationMethods: ['PRICE'],  // Hipoteca francesa (Price)
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'pt-PT',
    maxTermMonths: 480,       // 40 anos (até 30 se >30 anos de idade)
    minTermMonths: 60,
    maxFinancingPercent: 90,
    minDownPaymentPercent: 10,
    hasInsuranceMIP: true,
    hasInsuranceDFI: true,
    transferTaxRate: 0.06,    // IMT ~6% (varia por valor/uso)
    registryRate: 0.005,
    evaluationFee: 300,       // ~€250-350
    propertyTaxLabel: 'IMI',
    amortizationMethods: ['PRICE'],
  },
  MX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    currency: 'MXN',
    currencySymbol: '$',
    locale: 'es-MX',
    maxTermMonths: 240,       // 20 anos
    minTermMonths: 60,
    maxFinancingPercent: 90,
    minDownPaymentPercent: 10,
    hasInsuranceMIP: true,
    hasInsuranceDFI: true,
    transferTaxRate: 0.02,    // ISAI ~2%
    registryRate: 0.01,
    evaluationFee: 8_000,     // ~MXN$6,000-10,000
    propertyTaxLabel: 'Predial',
    amortizationMethods: ['PRICE'],
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    currency: 'COP',
    currencySymbol: '$',
    locale: 'es-CO',
    maxTermMonths: 240,       // 20 anos
    minTermMonths: 60,
    maxFinancingPercent: 70,
    minDownPaymentPercent: 30,
    hasInsuranceMIP: true,
    hasInsuranceDFI: true,
    transferTaxRate: 0.01,    // ~1% registro + boleta fiscal
    registryRate: 0.005,
    evaluationFee: 500_000,   // ~COP$400k-600k
    propertyTaxLabel: 'Predial',
    amortizationMethods: ['SAC', 'PRICE'],  // Colombia usa ambos (cuota fija e abono constante)
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    currency: 'CLP',
    currencySymbol: '$',
    locale: 'es-CL',
    maxTermMonths: 360,       // 30 anos
    minTermMonths: 60,
    maxFinancingPercent: 80,
    minDownPaymentPercent: 20,
    hasInsuranceMIP: true,    // Seguro de desgravamen
    hasInsuranceDFI: true,    // Seguro de incendio
    transferTaxRate: 0.02,    // ~2% (impuesto de timbres y estampillas)
    registryRate: 0.005,
    evaluationFee: 250_000,   // ~CLP$200k-300k
    propertyTaxLabel: 'Contribuciones',
    amortizationMethods: ['PRICE'],
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// BANK PRESETS POR PAÍS
// ═══════════════════════════════════════════════════════════════════════════════

export const BANK_PRESETS_BY_COUNTRY: Record<CountryCode, BankPreset[]> = {
  BR: [
    { id: 'caixa',      name: 'Caixa Econômica',    rate: 9.99,  maxFinancing: 80, fgts: false, country: 'BR' },
    { id: 'bb',          name: 'Banco do Brasil',     rate: 10.49, maxFinancing: 80, fgts: false, country: 'BR' },
    { id: 'itau',        name: 'Itaú',                rate: 10.79, maxFinancing: 80, fgts: false, country: 'BR' },
    { id: 'bradesco',    name: 'Bradesco',             rate: 10.99, maxFinancing: 80, fgts: false, country: 'BR' },
    { id: 'santander',   name: 'Santander',            rate: 11.29, maxFinancing: 90, fgts: false, country: 'BR' },
    { id: 'inter',       name: 'Banco Inter',          rate: 10.49, maxFinancing: 80, fgts: false, country: 'BR' },
    { id: 'caixa_fgts',  name: 'Caixa (Pró-cotista)',  rate: 7.66,  maxFinancing: 80, fgts: true,  country: 'BR' },
  ],
  US: [
    { id: 'wells_fargo',    name: 'Wells Fargo',         rate: 6.45, maxFinancing: 80, fgts: false, country: 'US' },
    { id: 'chase',           name: 'JPMorgan Chase',      rate: 6.50, maxFinancing: 80, fgts: false, country: 'US' },
    { id: 'bofa',            name: 'Bank of America',     rate: 6.55, maxFinancing: 80, fgts: false, country: 'US' },
    { id: 'usbank',          name: 'US Bank',             rate: 6.60, maxFinancing: 80, fgts: false, country: 'US' },
    { id: 'citi',            name: 'Citibank',            rate: 6.50, maxFinancing: 80, fgts: false, country: 'US' },
    { id: 'fha',             name: 'FHA Loan',            rate: 6.20, maxFinancing: 96, fgts: false, country: 'US' },
  ],
  UK: [
    { id: 'hsbc_uk',      name: 'HSBC',              rate: 5.75, maxFinancing: 90, fgts: false, country: 'UK' },
    { id: 'barclays',     name: 'Barclays',           rate: 5.80, maxFinancing: 90, fgts: false, country: 'UK' },
    { id: 'natwest',      name: 'NatWest',            rate: 5.84, maxFinancing: 90, fgts: false, country: 'UK' },
    { id: 'lloyds',       name: 'Lloyds',             rate: 5.79, maxFinancing: 90, fgts: false, country: 'UK' },
    { id: 'nationwide',   name: 'Nationwide',          rate: 5.69, maxFinancing: 95, fgts: false, country: 'UK' },
  ],
  ES: [
    { id: 'santander_es', name: 'Santander',          rate: 2.95, maxFinancing: 80, fgts: false, country: 'ES' },
    { id: 'caixabank',    name: 'CaixaBank',           rate: 3.10, maxFinancing: 80, fgts: false, country: 'ES' },
    { id: 'bbva_es',      name: 'BBVA',                rate: 2.80, maxFinancing: 80, fgts: false, country: 'ES' },
    { id: 'sabadell',     name: 'Banco Sabadell',      rate: 3.20, maxFinancing: 80, fgts: false, country: 'ES' },
    { id: 'bankinter',    name: 'Bankinter',            rate: 3.05, maxFinancing: 80, fgts: false, country: 'ES' },
  ],
  PT: [
    { id: 'cgd',          name: 'Caixa Geral de Depósitos', rate: 3.20, maxFinancing: 90, fgts: false, country: 'PT' },
    { id: 'millennium',   name: 'Millennium BCP',            rate: 3.50, maxFinancing: 90, fgts: false, country: 'PT' },
    { id: 'novo_banco',   name: 'Novo Banco',                rate: 3.40, maxFinancing: 85, fgts: false, country: 'PT' },
    { id: 'santander_pt', name: 'Santander PT',              rate: 3.30, maxFinancing: 90, fgts: false, country: 'PT' },
    { id: 'bpi',          name: 'BPI',                       rate: 2.90, maxFinancing: 90, fgts: false, country: 'PT' },
  ],
  MX: [
    { id: 'bbva_mx',      name: 'BBVA México',         rate: 10.80, maxFinancing: 90, fgts: false, country: 'MX' },
    { id: 'banorte',      name: 'Banorte',              rate: 11.50, maxFinancing: 90, fgts: false, country: 'MX' },
    { id: 'hsbc_mx',      name: 'HSBC México',          rate: 11.20, maxFinancing: 85, fgts: false, country: 'MX' },
    { id: 'santander_mx', name: 'Santander México',     rate: 11.80, maxFinancing: 90, fgts: false, country: 'MX' },
    { id: 'scotiabank_mx',name: 'Scotiabank',           rate: 10.50, maxFinancing: 85, fgts: false, country: 'MX' },
  ],
  CO: [
    { id: 'bancolombia',  name: 'Bancolombia',          rate: 13.00, maxFinancing: 70, fgts: false, country: 'CO' },
    { id: 'davivienda',   name: 'Davivienda',           rate: 12.80, maxFinancing: 70, fgts: false, country: 'CO' },
    { id: 'bbva_co',      name: 'BBVA Colombia',        rate: 12.50, maxFinancing: 70, fgts: false, country: 'CO' },
    { id: 'bogota',       name: 'Banco de Bogotá',      rate: 13.20, maxFinancing: 70, fgts: false, country: 'CO' },
    { id: 'scotiabank_co',name: 'Scotiabank Colpatria', rate: 12.90, maxFinancing: 70, fgts: false, country: 'CO' },
  ],
  CL: [
    { id: 'santander_cl', name: 'Santander Chile',     rate: 4.80, maxFinancing: 80, fgts: false, country: 'CL' },
    { id: 'bci',           name: 'BCI',                 rate: 4.90, maxFinancing: 80, fgts: false, country: 'CL' },
    { id: 'chile',         name: 'Banco de Chile',      rate: 4.70, maxFinancing: 80, fgts: false, country: 'CL' },
    { id: 'estado',        name: 'BancoEstado',         rate: 4.50, maxFinancing: 80, fgts: false, country: 'CL' },
    { id: 'itau_cl',       name: 'Itaú Chile',          rate: 5.00, maxFinancing: 80, fgts: false, country: 'CL' },
  ],
}

// Retrocompatibilidade — exporta presets do Brasil como default
export const BANK_PRESETS = BANK_PRESETS_BY_COUNTRY.BR

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITES (defaults globais — use COUNTRY_CONFIGS para país específico)
// ═══════════════════════════════════════════════════════════════════════════════

export const MAX_TERM_MONTHS = 420
export const MIN_TERM_MONTHS = 60
export const MAX_FINANCING_PERCENT = 90
export const MIN_DOWN_PAYMENT_PERCENT = 10
export const MAX_FGTS_PROPERTY_VALUE = 2_250_000
export const MAX_INCOME_COMMITMENT = 0.30

// ═══════════════════════════════════════════════════════════════════════════════
// TAXAS DE SEGURO (Brasil — outros países usam os defaults do CountryConfig)
// ═══════════════════════════════════════════════════════════════════════════════

export const MIP_RATE_BASE = 0.0003
export const DFI_RATE = 0.0001

export const ITBI_RATE_DEFAULT = 0.02
export const ITBI_RATE_BH = 0.03
export const REGISTRY_RATE = 0.01
export const EVALUATION_FEE = 3_500

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

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getCountryConfig(country: CountryCode = 'BR'): CountryConfig {
  return COUNTRY_CONFIGS[country]
}

export function getBankPresets(country: CountryCode = 'BR'): BankPreset[] {
  return BANK_PRESETS_BY_COUNTRY[country] || BANK_PRESETS_BY_COUNTRY.BR
}

/** Formata moeda usando locale e currency do país */
export function formatCurrency(value: number, country: CountryCode = 'BR'): string {
  const config = COUNTRY_CONFIGS[country]
  return value.toLocaleString(config.locale, { style: 'currency', currency: config.currency })
}

/** Formata moeda de forma compacta (ex: $1.2M, R$ 500k) */
export function formatCurrencyCompact(value: number, country: CountryCode = 'BR'): string {
  const config = COUNTRY_CONFIGS[country]
  if (value >= 1_000_000) return `${config.currencySymbol} ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${config.currencySymbol} ${(value / 1_000).toFixed(0)}k`
  return formatCurrency(value, country)
}

/** Parse de input monetário (suporta , e . como separadores) */
export function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/** Formata valor para input (sem símbolo, só número formatado) */
export function formatInputValue(value: number, country: CountryCode = 'BR'): string {
  if (value === 0) return ''
  const config = COUNTRY_CONFIGS[country]
  // Países com moeda sem centavos (CLP, COP) → sem decimais
  const decimals = ['CLP', 'COP'].includes(config.currency) ? 0 : 2
  return value.toLocaleString(config.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
