'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import FinancingCalculator from '@/app/dashboard/components/FinancingCalculator'
import type { ComparisonResult } from '@/lib/financing/types'
import { Calculator, Clock, Trash2, RotateCcw } from 'lucide-react'

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
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export default function FinanciamentoPage() {
  const { user } = useAuth()
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = TRANSLATIONS[lang]

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [reloadKey, setReloadKey] = useState(0)
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
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(entry.propertyValue)}</span>
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
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(entry.firstPaymentSac)}</span>
                  </div>
                  <div>
                    <span className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{t.firstPaymentPrice}</span>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(entry.firstPaymentPrice)}</span>
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
