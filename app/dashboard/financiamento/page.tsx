'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import FinancingCalculator from '@/app/dashboard/components/FinancingCalculator'
import type { ComparisonResult, CountryCode } from '@/lib/financing/types'
import { formatCurrency, RATES_LAST_UPDATED, isRatesUpdateDue } from '@/lib/financing/constants'
import { Calculator, Clock, Trash2, RotateCcw, AlertTriangle, X } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Calculadora de Financiamento',
    subtitle: 'Simule financiamento imobiliário com tabelas SAC e Price.',
    history: 'Simulações Recentes',
    noHistory: 'Nenhuma simulação salva ainda.',
    clearHistory: 'Limpar histórico',
    loadSimulation: 'Carregar',
    propertyValue: 'Valor do Imóvel',
    downPayment: 'Entrada',
    rate: 'Taxa',
    term: 'Prazo',
    firstPaymentSac: '1ª SAC',
    firstPaymentPrice: 'Parcela Price',
    months: 'meses',
  },
  en: {
    title: 'Financing Calculator',
    subtitle: 'Simulate real estate financing with SAC and Price tables.',
    history: 'Recent Simulations',
    noHistory: 'No saved simulations yet.',
    clearHistory: 'Clear history',
    loadSimulation: 'Load',
    propertyValue: 'Property Value',
    downPayment: 'Down Payment',
    rate: 'Rate',
    term: 'Term',
    firstPaymentSac: '1st SAC',
    firstPaymentPrice: 'Price Payment',
    months: 'months',
  },
  es: {
    title: 'Calculadora de Financiamiento',
    subtitle: 'Simule financiamiento inmobiliario con tablas SAC y Price.',
    history: 'Simulaciones Recientes',
    noHistory: 'Ninguna simulación guardada aún.',
    clearHistory: 'Limpiar historial',
    loadSimulation: 'Cargar',
    propertyValue: 'Valor del Inmueble',
    downPayment: 'Enganche',
    rate: 'Tasa',
    term: 'Plazo',
    firstPaymentSac: '1ª SAC',
    firstPaymentPrice: 'Cuota Price',
    months: 'meses',
  },
}

type Lang = keyof typeof TRANSLATIONS

const STORAGE_KEY = 'oryen:financing:history'
const MAX_HISTORY = 10

interface HistoryEntry {
  id: string
  date: string
  propertyValue: number
  downPayment: number
  rate: number
  termMonths: number
  bank: string
  firstPaymentSac: number
  firstPaymentPrice: number
  country?: CountryCode
}

function fmt(value: number, country: CountryCode = 'BR'): string {
  return formatCurrency(value, country)
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

const STAFF_ALERT_TRANSLATIONS = {
  pt: {
    alertTitle: 'Taxas bancárias podem estar desatualizadas',
    alertMsg: (date: string) => `Última atualização: ${date}. Recomendamos revisar as taxas a cada 3 meses para manter a precisão das simulações.`,
    alertAction: 'Solicitar atualização ao suporte',
    dismiss: 'Dispensar',
  },
  en: {
    alertTitle: 'Bank rates may be outdated',
    alertMsg: (date: string) => `Last updated: ${date}. We recommend reviewing rates every 3 months to keep simulations accurate.`,
    alertAction: 'Request update from support',
    dismiss: 'Dismiss',
  },
  es: {
    alertTitle: 'Las tasas bancarias pueden estar desactualizadas',
    alertMsg: (date: string) => `Última actualización: ${date}. Recomendamos revisar las tasas cada 3 meses para mantener la precisión de las simulaciones.`,
    alertAction: 'Solicitar actualización al soporte',
    dismiss: 'Descartar',
  },
}

const DISMISS_KEY = 'oryen:financing:rates-alert-dismissed'

export default function FinanciamentoPage() {
  const { user, isStaff } = useAuth()
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = TRANSLATIONS[lang]
  const tAlert = STAFF_ALERT_TRANSLATIONS[lang]

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [alertDismissed, setAlertDismissed] = useState(true)

  // Verificar se alerta de taxas desatualizadas deve aparecer (só para staff)
  useEffect(() => {
    if (!isStaff) return
    if (!isRatesUpdateDue()) return
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed === RATES_LAST_UPDATED) return // já dispensou para esta versão
    setAlertDismissed(false)
  }, [isStaff])

  const dismissAlert = () => {
    setAlertDismissed(true)
    localStorage.setItem(DISMISS_KEY, RATES_LAST_UPDATED)
  }
  const [initialValues, setInitialValues] = useState<{
    propertyValue?: number
    rate?: number
    termMonths?: number
    downPayment?: number
  }>({})

  // Carregar histórico do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
  }, [])

  const saveToHistory = (result: ComparisonResult) => {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      propertyValue: result.input.propertyValue,
      downPayment: result.input.downPayment,
      rate: result.input.annualInterestRate,
      termMonths: result.input.termMonths,
      bank: '',
      firstPaymentSac: result.sac.firstPayment,
      firstPaymentPrice: result.price.firstPayment,
      country: result.input.country || 'BR',
    }

    const updated = [entry, ...history].slice(0, MAX_HISTORY)
    setHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const loadFromHistory = (entry: HistoryEntry) => {
    setInitialValues({
      propertyValue: entry.propertyValue,
      rate: entry.rate,
      termMonths: entry.termMonths,
      downPayment: entry.downPayment,
    })
    setReloadKey(k => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
          <Calculator size={28} style={{ color: 'var(--color-primary)' }} />
          {t.title}
        </h1>
        <p className="mt-1" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t.subtitle}</p>
      </div>

      {/* Staff Alert: Rates outdated */}
      {isStaff && !alertDismissed && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}>
          <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>{tAlert.alertTitle}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {tAlert.alertMsg(new Date(RATES_LAST_UPDATED).toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en'))}
            </p>
          </div>
          <button onClick={dismissAlert} className="p-1 rounded-lg transition-colors hover:opacity-70" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Calculator */}
      <FinancingCalculator
        key={reloadKey}
        lang={lang}
        initialPropertyValue={initialValues.propertyValue}
        onSave={saveToHistory}
      />

      {/* History */}
      <div className="p-5 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.history}</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
              {history.length}
            </span>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
              <Trash2 size={12} />
              {t.clearHistory}
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>{t.noHistory}</p>
        ) : (
          <div className="space-y-2">
            {history.map(entry => (
              <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors hover:opacity-80"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
                onClick={() => loadFromHistory(entry)}>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  <div>
                    <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{t.propertyValue}</span>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(entry.propertyValue, entry.country)}</span>
                  </div>
                  <div>
                    <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{t.rate}</span>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{entry.rate}% a.a.</span>
                  </div>
                  <div>
                    <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{t.term}</span>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{entry.termMonths} {t.months}</span>
                  </div>
                  <div>
                    <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{t.firstPaymentSac}</span>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(entry.firstPaymentSac, entry.country)}</span>
                  </div>
                  <div>
                    <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{t.firstPaymentPrice}</span>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(entry.firstPaymentPrice, entry.country)}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <RotateCcw size={16} style={{ color: 'var(--color-primary)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
