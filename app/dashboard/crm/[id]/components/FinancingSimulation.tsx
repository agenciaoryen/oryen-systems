'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import FinancingCalculator from '@/app/dashboard/components/FinancingCalculator'
import { formatCurrency } from '@/lib/financing/constants'
import type { ComparisonResult, SavedSimulation } from '@/lib/financing/types'
import { Calculator, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

const TRANSLATIONS = {
  pt: {
    title: 'Simulação de Financiamento',
    expand: 'Expandir',
    collapse: 'Recolher',
    savedSimulations: 'Simulações Salvas',
    noSaved: 'Nenhuma simulação salva para este lead.',
    delete: 'Excluir',
    saved: 'Simulação salva!',
    propertyValue: 'Imóvel',
    rate: 'Taxa',
    term: 'Prazo',
    sacPayment: '1ª SAC',
    pricePayment: 'Price',
    months: 'meses',
  },
  en: {
    title: 'Financing Simulation',
    expand: 'Expand',
    collapse: 'Collapse',
    savedSimulations: 'Saved Simulations',
    noSaved: 'No simulations saved for this lead.',
    delete: 'Delete',
    saved: 'Simulation saved!',
    propertyValue: 'Property',
    rate: 'Rate',
    term: 'Term',
    sacPayment: '1st SAC',
    pricePayment: 'Price',
    months: 'months',
  },
  es: {
    title: 'Simulación de Financiamiento',
    expand: 'Expandir',
    collapse: 'Contraer',
    savedSimulations: 'Simulaciones Guardadas',
    noSaved: 'No hay simulaciones guardadas para este lead.',
    delete: 'Eliminar',
    saved: '¡Simulación guardada!',
    propertyValue: 'Inmueble',
    rate: 'Tasa',
    term: 'Plazo',
    sacPayment: '1ª SAC',
    pricePayment: 'Price',
    months: 'meses',
  },
}

type Lang = keyof typeof TRANSLATIONS

function fmt(value: number): string {
  return formatCurrency(value)
}

interface Props {
  leadId: string
  totalEmVendas?: number
  city?: string
  userId?: string
  lang?: Lang
}

export default function FinancingSimulation({ leadId, totalEmVendas, city, userId, lang = 'pt' }: Props) {
  const t = TRANSLATIONS[lang]
  const [expanded, setExpanded] = useState(false)
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([])
  const [savedMsg, setSavedMsg] = useState(false)

  // Carregar simulações salvas do lead
  useEffect(() => {
    loadSimulations()
  }, [leadId])

  const loadSimulations = async () => {
    const { data } = await supabase
      .from('leads')
      .select('financing_simulations')
      .eq('id', leadId)
      .single()

    if (data?.financing_simulations) {
      setSavedSimulations(Array.isArray(data.financing_simulations) ? data.financing_simulations : [])
    }
  }

  const handleSave = async (result: ComparisonResult) => {
    const entry: SavedSimulation = {
      id: crypto.randomUUID(),
      saved_at: new Date().toISOString(),
      saved_by: userId || '',
      property_value: result.input.propertyValue,
      down_payment: result.input.downPayment,
      rate: result.input.annualInterestRate,
      term_months: result.input.termMonths,
      bank: '',
      first_payment_sac: result.sac.firstPayment,
      first_payment_price: result.price.firstPayment,
      total_cost_sac: result.sac.totalPaid,
      total_cost_price: result.price.totalPaid,
    }

    const updated = [entry, ...savedSimulations]
    setSavedSimulations(updated)

    await supabase
      .from('leads')
      .update({ financing_simulations: updated })
      .eq('id', leadId)

    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  const handleDelete = async (simId: string) => {
    const updated = savedSimulations.filter(s => s.id !== simId)
    setSavedSimulations(updated)

    await supabase
      .from('leads')
      .update({ financing_simulations: updated })
      .eq('id', leadId)
  }

  return (
    <div>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-1"
      >
        <div className="flex items-center gap-2">
          <Calculator size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            {t.title}
          </h3>
          {savedSimulations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
              {savedSimulations.length}
            </span>
          )}
          {savedMsg && (
            <span className="text-xs font-medium" style={{ color: '#10b981' }}>{t.saved}</span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} />
          : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
        }
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Calculator in compact mode */}
          <FinancingCalculator
            compact
            lang={lang}
            initialPropertyValue={totalEmVendas}
            initialCity={city}
            onSave={handleSave}
          />

          {/* Saved simulations */}
          {savedSimulations.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {t.savedSimulations}
              </h4>
              <div className="space-y-2">
                {savedSimulations.map(sim => (
                  <div key={sim.id} className="flex items-center gap-3 p-2.5 rounded-lg text-xs"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                    <div className="flex-1 grid grid-cols-2 gap-1">
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>{t.propertyValue}: </span>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(sim.property_value)}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>{t.rate}: </span>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{sim.rate}%</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>{t.sacPayment}: </span>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(sim.first_payment_sac)}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>{t.pricePayment}: </span>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{fmt(sim.first_payment_price)}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(sim.id)} className="p-1 rounded transition-colors hover:opacity-70"
                      style={{ color: 'var(--color-text-muted)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
