'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  DollarSign,
  Percent,
  Home,
  Building2,
  User,
  Calendar,
  Save,
  ExternalLink,
  BadgeCheck,
  Globe,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { calculateComparison, getChartData, validateInput, annualToMonthlyRate } from '@/lib/financing/calculator'
import {
  getBankPresets,
  getCountryConfig,
  formatCurrency,
  formatCurrencyCompact,
  parseCurrencyInput,
  formatInputValue,
  COUNTRY_CONFIGS,
} from '@/lib/financing/constants'
import type { ComparisonResult, SimulationInput, CountryCode } from '@/lib/financing/types'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FinancingCalculatorProps {
  initialPropertyValue?: number
  initialCondoFee?: number
  initialIptu?: number
  initialCity?: string
  initialCountry?: CountryCode
  onSave?: (result: ComparisonResult) => void
  compact?: boolean
  lang?: 'pt' | 'en' | 'es'
}

type DownPaymentMode = 'percent' | 'absolute'
type AmortizationTab = 'SAC' | 'PRICE'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Simulador de Financiamento',
    propertyValue: 'Valor do Imóvel',
    downPayment: 'Entrada',
    bank: 'Banco',
    customRate: 'Taxa Personalizada',
    customRateOption: 'Taxa personalizada',
    term: 'Prazo',
    age: 'Idade do comprador',
    condoFee: 'Condomínio',
    iptu: 'Imposto Predial (anual)',
    simulate: 'Simular',
    loanAmount: 'Valor Financiado',
    payment: 'Parcela',
    firstPaymentSac: '1ª Parcela SAC',
    paymentPrice: 'Parcela Price',
    totalInterest: 'Total de Juros',
    totalCost: 'Custo Total',
    savings: 'Economia',
    comparison: 'Comparativo SAC vs Price',
    comparisonPriceOnly: 'Detalhes do Financiamento',
    amortizationTable: 'Tabela de Amortização',
    viewFull: 'Ver tabela completa',
    collapsTable: 'Recolher tabela',
    closingCosts: 'Custos de Entrada',
    monthlyTotalCost: 'Custo Mensal Total',
    saveSimulation: 'Salvar Simulação',
    viewFullSimulation: 'Ver simulação completa',
    years: 'anos',
    months: 'meses',
    month: 'Mês',
    paymentCol: 'Parcela',
    amortization: 'Amortização',
    interest: 'Juros',
    insurance: 'Seguro',
    balance: 'Saldo',
    firstPayment: '1ª Parcela',
    lastPayment: 'Última Parcela',
    averagePayment: 'Parcela Média',
    totalPaid: 'Total Pago',
    totalInterestRow: 'Total de Juros',
    totalInsurance: 'Total Seguro',
    itbi: 'Imposto de Transferência',
    registry: 'Registro',
    evaluation: 'Avaliação',
    total: 'Total',
    downPaymentLabel: 'Entrada',
    costs: 'Custos',
    totalForDeed: 'Total para Escritura',
    paymentSac: 'Parcela (SAC 1ª)',
    paymentFixed: 'Parcela Fixa',
    insuranceMip: 'Seguro MIP',
    insuranceDfi: 'Seguro DFI',
    condoFeeLabel: 'Condomínio',
    iptuMonthly: 'Imp. Predial/12',
    totalMonthly: 'Total Mensal',
    rateLabel: 'a.a.',
    paymentEvolution: 'Evolução das Parcelas',
    sacLabel: 'SAC',
    priceLabel: 'Price',
    fixedLabel: 'Fixa',
    year: 'Ano',
    validationError: 'Erro de validação',
    ageOptional: 'opcional',
    city: 'Cidade',
    country: 'País',
  },
  en: {
    title: 'Financing Calculator',
    propertyValue: 'Property Value',
    downPayment: 'Down Payment',
    bank: 'Bank',
    customRate: 'Custom Rate',
    customRateOption: 'Custom rate',
    term: 'Term',
    age: 'Buyer age',
    condoFee: 'Condo Fee',
    iptu: 'Property Tax (annual)',
    simulate: 'Simulate',
    loanAmount: 'Loan Amount',
    payment: 'Payment',
    firstPaymentSac: '1st Payment SAC',
    paymentPrice: 'Fixed Payment',
    totalInterest: 'Total Interest',
    totalCost: 'Total Cost',
    savings: 'Savings',
    comparison: 'SAC vs Fixed Comparison',
    comparisonPriceOnly: 'Financing Details',
    amortizationTable: 'Amortization Table',
    viewFull: 'View full table',
    collapsTable: 'Collapse table',
    closingCosts: 'Closing Costs',
    monthlyTotalCost: 'Total Monthly Cost',
    saveSimulation: 'Save Simulation',
    viewFullSimulation: 'View full simulation',
    years: 'years',
    months: 'months',
    month: 'Month',
    paymentCol: 'Payment',
    amortization: 'Amortization',
    interest: 'Interest',
    insurance: 'Insurance',
    balance: 'Balance',
    firstPayment: '1st Payment',
    lastPayment: 'Last Payment',
    averagePayment: 'Average Payment',
    totalPaid: 'Total Paid',
    totalInterestRow: 'Total Interest',
    totalInsurance: 'Total Insurance',
    itbi: 'Transfer Tax',
    registry: 'Registry',
    evaluation: 'Appraisal',
    total: 'Total',
    downPaymentLabel: 'Down Payment',
    costs: 'Costs',
    totalForDeed: 'Total Upfront',
    paymentSac: 'Payment (SAC 1st)',
    paymentFixed: 'Fixed Payment',
    insuranceMip: 'MIP Insurance',
    insuranceDfi: 'DFI Insurance',
    condoFeeLabel: 'Condo Fee',
    iptuMonthly: 'Tax/12',
    totalMonthly: 'Total Monthly',
    rateLabel: 'p.a.',
    paymentEvolution: 'Payment Evolution',
    sacLabel: 'SAC',
    priceLabel: 'Fixed',
    fixedLabel: 'Fixed',
    year: 'Year',
    validationError: 'Validation error',
    ageOptional: 'optional',
    city: 'City',
    country: 'Country',
  },
  es: {
    title: 'Simulador de Financiamiento',
    propertyValue: 'Valor del Inmueble',
    downPayment: 'Enganche',
    bank: 'Banco',
    customRate: 'Tasa Personalizada',
    customRateOption: 'Tasa personalizada',
    term: 'Plazo',
    age: 'Edad del comprador',
    condoFee: 'Condominio',
    iptu: 'Impuesto Predial (anual)',
    simulate: 'Simular',
    loanAmount: 'Valor Financiado',
    payment: 'Cuota',
    firstPaymentSac: '1ª Cuota SAC',
    paymentPrice: 'Cuota Fija',
    totalInterest: 'Total Intereses',
    totalCost: 'Costo Total',
    savings: 'Ahorro',
    comparison: 'Comparativo SAC vs Cuota Fija',
    comparisonPriceOnly: 'Detalles del Financiamiento',
    amortizationTable: 'Tabla de Amortización',
    viewFull: 'Ver tabla completa',
    collapsTable: 'Colapsar tabla',
    closingCosts: 'Costos de Entrada',
    monthlyTotalCost: 'Costo Mensual Total',
    saveSimulation: 'Guardar Simulación',
    viewFullSimulation: 'Ver simulación completa',
    years: 'años',
    months: 'meses',
    month: 'Mes',
    paymentCol: 'Cuota',
    amortization: 'Amortización',
    interest: 'Intereses',
    insurance: 'Seguro',
    balance: 'Saldo',
    firstPayment: '1ª Cuota',
    lastPayment: 'Última Cuota',
    averagePayment: 'Cuota Promedio',
    totalPaid: 'Total Pagado',
    totalInterestRow: 'Total Intereses',
    totalInsurance: 'Total Seguro',
    itbi: 'Impuesto de Transferencia',
    registry: 'Registro',
    evaluation: 'Avalúo',
    total: 'Total',
    downPaymentLabel: 'Enganche',
    costs: 'Costos',
    totalForDeed: 'Total para Escritura',
    paymentSac: 'Cuota (SAC 1ª)',
    paymentFixed: 'Cuota Fija',
    insuranceMip: 'Seguro MIP',
    insuranceDfi: 'Seguro DFI',
    condoFeeLabel: 'Condominio',
    iptuMonthly: 'Impuesto/12',
    totalMonthly: 'Total Mensual',
    rateLabel: 'a.a.',
    paymentEvolution: 'Evolución de Cuotas',
    sacLabel: 'SAC',
    priceLabel: 'Fija',
    fixedLabel: 'Fija',
    year: 'Año',
    validationError: 'Error de validación',
    ageOptional: 'opcional',
    city: 'Ciudad',
    country: 'País',
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
  card: {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '16px',
    overflow: 'hidden',
  } as React.CSSProperties,
  input: {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '8px 16px',
    color: 'var(--color-text-primary)',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
  } as React.CSSProperties,
  primaryBtn: {
    background: 'var(--color-primary)',
    color: 'white',
    borderRadius: '12px',
    padding: '12px 24px',
    fontWeight: 600,
    fontSize: '15px',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.15s',
  } as React.CSSProperties,
  secondaryBtn: {
    background: 'transparent',
    color: 'var(--color-primary)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontWeight: 500,
    fontSize: '13px',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  } as React.CSSProperties,
  kpiCard: {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '16px',
  } as React.CSSProperties,
  tableHeader: {
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)',
    padding: '8px 12px',
    textAlign: 'left' as const,
    borderBottom: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  tableCell: {
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  betterValue: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  } as React.CSSProperties,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function FinancingCalculator({
  initialPropertyValue,
  initialCondoFee,
  initialIptu,
  initialCity,
  initialCountry,
  onSave,
  compact = false,
  lang = 'pt',
}: FinancingCalculatorProps) {
  const t = TRANSLATIONS[lang]

  // ─── State ──────────────────────────────────────────────────────────────────
  const [country, setCountry] = useState<CountryCode>(initialCountry || 'BR')
  const countryConfig = useMemo(() => getCountryConfig(country), [country])
  const bankPresets = useMemo(() => getBankPresets(country), [country])
  const hasSAC = countryConfig.amortizationMethods.includes('SAC')

  // Currency helpers bound to current country
  const fmt = useCallback((value: number) => formatCurrency(value, country), [country])
  const fmtCompact = useCallback((value: number) => formatCurrencyCompact(value, country), [country])
  const fmtInput = useCallback((value: number) => formatInputValue(value, country), [country])

  const [propertyValue, setPropertyValue] = useState(initialPropertyValue ?? 0)
  const [propertyValueDisplay, setPropertyValueDisplay] = useState(
    initialPropertyValue ? formatInputValue(initialPropertyValue, initialCountry || 'BR') : ''
  )
  const [downPaymentMode, setDownPaymentMode] = useState<DownPaymentMode>('percent')
  const [downPaymentPercent, setDownPaymentPercent] = useState(20)
  const [downPaymentAbsolute, setDownPaymentAbsolute] = useState(
    initialPropertyValue ? initialPropertyValue * 0.2 : 0
  )
  const [downPaymentDisplay, setDownPaymentDisplay] = useState(
    initialPropertyValue ? formatInputValue(initialPropertyValue * 0.2, initialCountry || 'BR') : ''
  )
  const [selectedBankId, setSelectedBankId] = useState(bankPresets[0]?.id || 'custom')
  const [customRate, setCustomRate] = useState(10)
  const [termMonths, setTermMonths] = useState(Math.min(360, countryConfig.maxTermMonths))
  const [borrowerAge, setBorrowerAge] = useState<number | undefined>(undefined)
  const [condoFee, setCondoFee] = useState(initialCondoFee ?? 0)
  const [condoFeeDisplay, setCondoFeeDisplay] = useState(
    initialCondoFee ? formatInputValue(initialCondoFee, initialCountry || 'BR') : ''
  )
  const [iptu, setIptu] = useState(initialIptu ?? 0)
  const [iptuDisplay, setIptuDisplay] = useState(
    initialIptu ? formatInputValue(initialIptu, initialCountry || 'BR') : ''
  )
  const [city, setCity] = useState(initialCity ?? '')

  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [amortizationTab, setAmortizationTab] = useState<AmortizationTab>(hasSAC ? 'SAC' : 'PRICE')
  const [showFullTable, setShowFullTable] = useState(false)

  // ─── Country change handler ─────────────────────────────────────────────────
  const handleCountryChange = useCallback((newCountry: CountryCode) => {
    setCountry(newCountry)
    const newConfig = getCountryConfig(newCountry)
    const newPresets = getBankPresets(newCountry)
    setSelectedBankId(newPresets[0]?.id || 'custom')
    setTermMonths(Math.min(360, newConfig.maxTermMonths))
    setResult(null)
    setError(null)
    if (!newConfig.amortizationMethods.includes('SAC')) {
      setAmortizationTab('PRICE')
    } else {
      setAmortizationTab('SAC')
    }
  }, [])

  // ─── Derived ────────────────────────────────────────────────────────────────
  const isCustomRate = selectedBankId === 'custom'
  const selectedBank = bankPresets.find((b) => b.id === selectedBankId)
  const annualRate = isCustomRate ? customRate : (selectedBank?.rate ?? 10)

  const downPaymentValue = useMemo(() => {
    if (downPaymentMode === 'percent') {
      return propertyValue * (downPaymentPercent / 100)
    }
    return downPaymentAbsolute
  }, [downPaymentMode, downPaymentPercent, downPaymentAbsolute, propertyValue])

  const termYears = Math.floor(termMonths / 12)
  const termRemainingMonths = termMonths % 12

  const termLabel = useMemo(() => {
    let label = `${termYears} ${t.years}`
    if (termRemainingMonths > 0) {
      label += ` ${termRemainingMonths}m`
    }
    label += ` (${termMonths} ${t.months})`
    return label
  }, [termYears, termRemainingMonths, termMonths, t])

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handlePropertyValueBlur = useCallback(() => {
    const val = parseCurrencyInput(propertyValueDisplay)
    setPropertyValue(val)
    setPropertyValueDisplay(val > 0 ? fmtInput(val) : '')
    if (downPaymentMode === 'percent') {
      setDownPaymentAbsolute(val * (downPaymentPercent / 100))
      setDownPaymentDisplay(fmtInput(val * (downPaymentPercent / 100)))
    }
  }, [propertyValueDisplay, downPaymentMode, downPaymentPercent, fmtInput])

  const handleDownPaymentPercentChange = useCallback(
    (pct: number) => {
      const clamped = Math.min(90, Math.max(0, pct))
      setDownPaymentPercent(clamped)
      const abs = propertyValue * (clamped / 100)
      setDownPaymentAbsolute(abs)
      setDownPaymentDisplay(abs > 0 ? fmtInput(abs) : '')
    },
    [propertyValue, fmtInput]
  )

  const handleDownPaymentAbsoluteBlur = useCallback(() => {
    const val = parseCurrencyInput(downPaymentDisplay)
    setDownPaymentAbsolute(val)
    setDownPaymentDisplay(val > 0 ? fmtInput(val) : '')
    if (propertyValue > 0) {
      setDownPaymentPercent(Math.round((val / propertyValue) * 100 * 10) / 10)
    }
  }, [downPaymentDisplay, propertyValue, fmtInput])

  const handleCondoBlur = useCallback(() => {
    const val = parseCurrencyInput(condoFeeDisplay)
    setCondoFee(val)
    setCondoFeeDisplay(val > 0 ? fmtInput(val) : '')
  }, [condoFeeDisplay, fmtInput])

  const handleIptuBlur = useCallback(() => {
    const val = parseCurrencyInput(iptuDisplay)
    setIptu(val)
    setIptuDisplay(val > 0 ? fmtInput(val) : '')
  }, [iptuDisplay, fmtInput])

  const handleSimulate = useCallback(() => {
    setError(null)
    const input: SimulationInput = {
      propertyValue,
      downPayment: downPaymentValue,
      annualInterestRate: annualRate,
      termMonths,
      condoFee: condoFee || undefined,
      iptu: iptu || undefined,
      borrowerAge,
      city: city || undefined,
      country,
    }

    const validationError = validateInput(input)
    if (validationError) {
      setError(validationError)
      return
    }

    const comparison = calculateComparison(input)
    setResult(comparison)
    setShowFullTable(false)
  }, [propertyValue, downPaymentValue, annualRate, termMonths, condoFee, iptu, borrowerAge, city, country])

  const handleSave = useCallback(() => {
    if (result && onSave) {
      onSave(result)
    }
  }, [result, onSave])

  // ─── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!result) return []
    return getChartData(result)
  }, [result])

  // ─── Amortization visible rows ──────────────────────────────────────────────
  const amortizationPayments = useMemo(() => {
    if (!result) return []
    const payments = amortizationTab === 'SAC' ? result.sac.payments : result.price.payments
    return showFullTable ? payments : payments.slice(0, 12)
  }, [result, amortizationTab, showFullTable])

  const totalAmortizationRows = result
    ? (amortizationTab === 'SAC' ? result.sac.payments.length : result.price.payments.length)
    : 0

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Calculator size={20} style={{ color: 'var(--color-primary)' }} />
        <h2
          style={{
            fontSize: compact ? '18px' : '20px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {t.title}
        </h2>
      </div>

      {/* ─── Section 1: Input Panel ──────────────────────────────────────── */}
      <div style={styles.card}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
            gap: '16px',
          }}
        >
          {/* Country Selector */}
          <div>
            <label style={styles.label}>
              <Globe size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t.country}
            </label>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
              style={{ ...styles.input, cursor: 'pointer', appearance: 'auto' }}
            >
              {Object.values(COUNTRY_CONFIGS).map((cfg) => (
                <option key={cfg.code} value={cfg.code}>
                  {cfg.flag} {cfg.name} ({cfg.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Property Value */}
          <div>
            <label style={styles.label}>
              <Home size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t.propertyValue}
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                  pointerEvents: 'none',
                }}
              >
                {countryConfig.currencySymbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={propertyValueDisplay}
                onChange={(e) => setPropertyValueDisplay(e.target.value)}
                onBlur={handlePropertyValueBlur}
                placeholder="500.000,00"
                style={{ ...styles.input, paddingLeft: `${Math.max(36, countryConfig.currencySymbol.length * 12 + 16)}px` }}
              />
            </div>
          </div>

          {/* Down Payment */}
          <div>
            <label style={styles.label}>
              <DollarSign size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t.downPayment}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Toggle buttons */}
              <div
                style={{
                  display: 'flex',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setDownPaymentMode('percent')}
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    background:
                      downPaymentMode === 'percent'
                        ? 'var(--color-primary)'
                        : 'var(--color-bg-elevated)',
                    color: downPaymentMode === 'percent' ? 'white' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  <Percent size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDownPaymentMode('absolute')}
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    borderLeft: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    background:
                      downPaymentMode === 'absolute'
                        ? 'var(--color-primary)'
                        : 'var(--color-bg-elevated)',
                    color: downPaymentMode === 'absolute' ? 'white' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {countryConfig.currencySymbol}
                </button>
              </div>
              {/* Input */}
              {downPaymentMode === 'percent' ? (
                <input
                  type="number"
                  min={countryConfig.minDownPaymentPercent}
                  max={90}
                  step={1}
                  value={downPaymentPercent}
                  onChange={(e) => handleDownPaymentPercentChange(Number(e.target.value))}
                  style={{ ...styles.input, flex: 1 }}
                />
              ) : (
                <input
                  type="text"
                  inputMode="decimal"
                  value={downPaymentDisplay}
                  onChange={(e) => setDownPaymentDisplay(e.target.value)}
                  onBlur={handleDownPaymentAbsoluteBlur}
                  placeholder="100.000,00"
                  style={{ ...styles.input, flex: 1 }}
                />
              )}
            </div>
            {propertyValue > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                {downPaymentMode === 'percent'
                  ? fmt(propertyValue * (downPaymentPercent / 100))
                  : `${propertyValue > 0 ? ((downPaymentAbsolute / propertyValue) * 100).toFixed(1) : 0}%`}
              </span>
            )}
          </div>

          {/* Bank */}
          <div>
            <label style={styles.label}>
              <Building2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t.bank}
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              style={{ ...styles.input, cursor: 'pointer', appearance: 'auto' }}
            >
              {bankPresets.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name} — {bank.rate.toFixed(2)}% {t.rateLabel}
                </option>
              ))}
              <option value="custom">{t.customRateOption}</option>
            </select>
            {isCustomRate && (
              <div style={{ marginTop: '8px' }}>
                <label style={{ ...styles.label, fontSize: '12px' }}>{t.customRate} (% {t.rateLabel})</label>
                <input
                  type="number"
                  step={0.01}
                  min={0.1}
                  max={30}
                  value={customRate}
                  onChange={(e) => setCustomRate(Number(e.target.value))}
                  style={styles.input}
                />
              </div>
            )}
          </div>

          {/* Term */}
          <div>
            <label style={styles.label}>
              <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {t.term}
            </label>
            <input
              type="range"
              min={countryConfig.minTermMonths}
              max={countryConfig.maxTermMonths}
              step={12}
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--color-primary)',
                cursor: 'pointer',
                marginBottom: '4px',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {termLabel}
            </span>
          </div>

          {/* Buyer Age (only for countries with MIP insurance) */}
          {countryConfig.hasInsuranceMIP && (
            <div>
              <label style={styles.label}>
                <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {t.age}{' '}
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>({t.ageOptional})</span>
              </label>
              <input
                type="number"
                min={18}
                max={80}
                value={borrowerAge ?? ''}
                onChange={(e) =>
                  setBorrowerAge(e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="35"
                style={styles.input}
              />
            </div>
          )}

          {/* Condo Fee */}
          <div>
            <label style={styles.label}>{t.condoFee}</label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                  pointerEvents: 'none',
                }}
              >
                {countryConfig.currencySymbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={condoFeeDisplay}
                onChange={(e) => setCondoFeeDisplay(e.target.value)}
                onBlur={handleCondoBlur}
                placeholder="800,00"
                style={{ ...styles.input, paddingLeft: `${Math.max(36, countryConfig.currencySymbol.length * 12 + 16)}px` }}
              />
            </div>
          </div>

          {/* Property Tax */}
          <div>
            <label style={styles.label}>{countryConfig.propertyTaxLabel} ({t.iptu.includes('anual') || t.iptu.includes('annual') ? t.iptu.split('(')[1]?.replace(')', '') || 'anual' : 'anual'})</label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                  pointerEvents: 'none',
                }}
              >
                {countryConfig.currencySymbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={iptuDisplay}
                onChange={(e) => setIptuDisplay(e.target.value)}
                onBlur={handleIptuBlur}
                placeholder="3.600,00"
                style={{ ...styles.input, paddingLeft: `${Math.max(36, countryConfig.currencySymbol.length * 12 + 16)}px` }}
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label style={styles.label}>{t.city}</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={country === 'BR' ? 'São Paulo' : country === 'US' ? 'New York' : country === 'UK' ? 'London' : country === 'ES' ? 'Madrid' : ''}
              style={styles.input}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '13px',
            }}
          >
            {t.validationError}: {error}
          </div>
        )}

        {/* Simulate Button */}
        <button
          type="button"
          onClick={handleSimulate}
          style={{ ...styles.primaryBtn, marginTop: '16px' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
        >
          <Calculator size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          {t.simulate}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* RESULTS (only after simulation) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {result && (
        <>
          {/* ─── Section 2: KPI Summary ────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
              gap: '12px',
            }}
          >
            {/* Loan Amount */}
            <div style={styles.kpiCard}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                {t.loanAmount}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {fmtCompact(result.sac.loanAmount)}
              </div>
            </div>

            {/* 1st Payment SAC / Price */}
            <div style={styles.kpiCard}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                {hasSAC ? `${t.firstPaymentSac} / ${t.paymentPrice}` : t.paymentFixed}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {hasSAC ? fmt(result.sac.firstPayment) : fmt(result.price.firstPayment)}
              </div>
              {hasSAC && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {t.priceLabel}: {fmt(result.price.firstPayment)}
                </div>
              )}
            </div>

            {/* Total Interest */}
            <div style={styles.kpiCard}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                {t.totalInterest}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {fmtCompact(hasSAC ? result.sac.totalInterest : result.price.totalInterest)}
              </div>
              {hasSAC && result.savings > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <TrendingDown size={12} />
                  {t.savings}: {fmtCompact(result.savings)}
                </span>
              )}
            </div>

            {/* Total Cost */}
            <div style={styles.kpiCard}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                {t.totalCost}{hasSAC ? ' (SAC)' : ''}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {fmtCompact(hasSAC ? result.sac.totalPaid : result.price.totalPaid)}
              </div>
            </div>
          </div>

          {/* ─── Section 3: Payment Evolution Chart ────────────────────────── */}
          <div style={styles.card}>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                margin: '0 0 16px 0',
              }}
            >
              {t.paymentEvolution}
            </h3>
            <div style={{ width: '100%', height: compact ? 220 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSAC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    label={{ value: t.year, position: 'insideBottomRight', offset: -4, fontSize: 11, fill: 'var(--color-text-muted)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                    tickFormatter={(v: number) => fmtCompact(v)}
                    width={70}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    formatter={(value: any, name: any) => [
                      fmt(value),
                      name === 'sac' ? t.sacLabel : (hasSAC ? t.priceLabel : t.fixedLabel),
                    ]}
                    labelFormatter={(label: number) => `${t.year} ${label}`}
                  />
                  <Legend
                    verticalAlign="top"
                    formatter={(value: string) => (value === 'sac' ? t.sacLabel : (hasSAC ? t.priceLabel : t.fixedLabel))}
                    wrapperStyle={{ fontSize: '13px' }}
                  />
                  {hasSAC && (
                    <Area
                      type="monotone"
                      dataKey="sac"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#gradSAC)"
                      name="sac"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fill="url(#gradPrice)"
                    name="price"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* NON-COMPACT sections */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {!compact ? (
            <>
              {/* ─── Section 4: Comparison Table ─────────────────────────────── */}
              <div style={styles.card}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: '0 0 16px 0',
                  }}
                >
                  {hasSAC ? t.comparison : t.comparisonPriceOnly}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}></th>
                        {hasSAC && <th style={{ ...styles.tableHeader, textAlign: 'right' }}>SAC</th>}
                        <th style={{ ...styles.tableHeader, textAlign: 'right' }}>{hasSAC ? 'Price' : t.fixedLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: t.firstPayment,
                          sac: result.sac.firstPayment,
                          price: result.price.firstPayment,
                        },
                        {
                          label: t.lastPayment,
                          sac: result.sac.lastPayment,
                          price: result.price.lastPayment,
                        },
                        {
                          label: t.averagePayment,
                          sac: result.sac.averagePayment,
                          price: result.price.averagePayment,
                        },
                        {
                          label: t.totalPaid,
                          sac: result.sac.totalPaid,
                          price: result.price.totalPaid,
                        },
                        {
                          label: t.totalInterestRow,
                          sac: result.sac.totalInterest,
                          price: result.price.totalInterest,
                        },
                        {
                          label: t.totalInsurance,
                          sac: result.sac.totalInsurance,
                          price: result.price.totalInsurance,
                        },
                      ].map((row) => {
                        const sacBetter = row.sac <= row.price
                        const priceBetter = row.price <= row.sac
                        return (
                          <tr key={row.label}>
                            <td style={{ ...styles.tableCell, fontWeight: 500 }}>{row.label}</td>
                            {hasSAC && (
                              <td
                                style={{
                                  ...styles.tableCell,
                                  textAlign: 'right',
                                  fontVariantNumeric: 'tabular-nums',
                                  ...(sacBetter && !priceBetter ? styles.betterValue : {}),
                                }}
                              >
                                {fmt(row.sac)}
                              </td>
                            )}
                            <td
                              style={{
                                ...styles.tableCell,
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                                ...(hasSAC && priceBetter && !sacBetter ? styles.betterValue : {}),
                              }}
                            >
                              {fmt(row.price)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── Section 5: Monthly Cost Breakdown ───────────────────────── */}
              <div style={styles.card}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: '0 0 12px 0',
                  }}
                >
                  {t.monthlyTotalCost}
                </h3>
                {(() => {
                  const firstPayments = hasSAC ? result.sac.payments[0] : result.price.payments[0]
                  if (!firstPayments) return null
                  const condoMonthly = result.input.condoFee ?? 0
                  const iptuMonthly = (result.input.iptu ?? 0) / 12
                  const totalMonthly = firstPayments.payment + firstPayments.insuranceMIP + firstPayments.insuranceDFI + condoMonthly + iptuMonthly

                  const rows = [
                    { label: hasSAC ? t.paymentSac : t.paymentFixed, value: firstPayments.payment },
                    ...(firstPayments.insuranceMIP > 0 ? [{ label: t.insuranceMip, value: firstPayments.insuranceMIP }] : []),
                    ...(firstPayments.insuranceDFI > 0 ? [{ label: t.insuranceDfi, value: firstPayments.insuranceDFI }] : []),
                    ...(condoMonthly > 0 ? [{ label: t.condoFeeLabel, value: condoMonthly }] : []),
                    ...(iptuMonthly > 0 ? [{ label: `${countryConfig.propertyTaxLabel}/12`, value: iptuMonthly }] : []),
                  ]

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {rows.map((r) => (
                        <div
                          key={r.label}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: 'var(--color-text-secondary)',
                            padding: '4px 0',
                          }}
                        >
                          <span>{r.label}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(r.value)}</span>
                        </div>
                      ))}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--color-text-primary)',
                          borderTop: '1px solid var(--color-border)',
                          paddingTop: '8px',
                          marginTop: '4px',
                        }}
                      >
                        <span>{t.totalMonthly}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totalMonthly)}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* ─── Section 6: Closing Costs ────────────────────────────────── */}
              <div style={styles.card}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: '0 0 12px 0',
                  }}
                >
                  {t.closingCosts}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: t.itbi, value: result.closingCosts.itbi },
                    { label: t.registry, value: result.closingCosts.registry },
                    { label: t.evaluation, value: result.closingCosts.evaluation },
                  ].map((r) => (
                    <div
                      key={r.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        padding: '4px 0',
                      }}
                    >
                      <span>{r.label}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(r.value)}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <span>{t.total}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(result.closingCosts.total)}</span>
                  </div>

                  {/* Entrada + Custos = Total para escritura */}
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'var(--color-bg-elevated)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '4px',
                      }}
                    >
                      <span>{t.downPaymentLabel}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(result.input.downPayment)}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '8px',
                      }}
                    >
                      <span>{t.costs}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(result.closingCosts.total)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        borderTop: '1px solid var(--color-border)',
                        paddingTop: '8px',
                      }}
                    >
                      <span>{t.totalForDeed}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(result.input.downPayment + result.closingCosts.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Section 7: Amortization Table ───────────────────────────── */}
              <div style={styles.card}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      margin: 0,
                    }}
                  >
                    {t.amortizationTable}
                  </h3>
                  {/* Tabs — only show if country supports SAC */}
                  {hasSAC && (
                    <div
                      style={{
                        display: 'flex',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {(['SAC', 'PRICE'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setAmortizationTab(tab)
                            setShowFullTable(false)
                          }}
                          style={{
                            padding: '6px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            background:
                              amortizationTab === tab
                                ? 'var(--color-primary)'
                                : 'var(--color-bg-elevated)',
                            color: amortizationTab === tab ? 'white' : 'var(--color-text-secondary)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {tab === 'SAC' ? t.sacLabel : t.priceLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr>
                        {[t.month, t.paymentCol, t.amortization, t.interest, t.insurance, t.balance].map(
                          (header) => (
                            <th key={header} style={{ ...styles.tableHeader, textAlign: 'right' }}>
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {amortizationPayments.map((row) => (
                        <tr key={row.month}>
                          <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 500 }}>
                            {row.month}
                          </td>
                          <td
                            style={{
                              ...styles.tableCell,
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fmt(row.payment)}
                          </td>
                          <td
                            style={{
                              ...styles.tableCell,
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fmt(row.amortization)}
                          </td>
                          <td
                            style={{
                              ...styles.tableCell,
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fmt(row.interest)}
                          </td>
                          <td
                            style={{
                              ...styles.tableCell,
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fmt(row.insuranceMIP + row.insuranceDFI)}
                          </td>
                          <td
                            style={{
                              ...styles.tableCell,
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fmt(row.outstandingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalAmortizationRows > 12 && (
                  <button
                    type="button"
                    onClick={() => setShowFullTable((prev) => !prev)}
                    style={{
                      ...styles.secondaryBtn,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: '12px auto 0',
                    }}
                  >
                    {showFullTable ? (
                      <>
                        <ChevronUp size={14} />
                        {t.collapsTable}
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        {t.viewFull} ({totalAmortizationRows} {t.months})
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ─── Compact: "Ver simulação completa" link ───────────────────── */
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                style={{
                  ...styles.secondaryBtn,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ExternalLink size={14} />
                {t.viewFullSimulation}
              </button>
            </div>
          )}

          {/* ─── Save Button ─────────────────────────────────────────────── */}
          {onSave && (
            <button
              type="button"
              onClick={handleSave}
              style={{
                ...styles.primaryBtn,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'transparent',
                color: 'var(--color-primary)',
                border: '2px solid var(--color-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-primary)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-primary)'
              }}
            >
              <Save size={16} />
              {t.saveSimulation}
            </button>
          )}
        </>
      )}
    </div>
  )
}
