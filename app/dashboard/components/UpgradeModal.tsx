// app/dashboard/components/UpgradeModal.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { usePlan } from '@/lib/usePlan'
import { ArrowRight, Loader2, TrendingUp, X, Zap } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  resource: string       // ex: 'leads', 'messages', 'users'
  current: number
  limit: number
}

const RESOURCE_LABELS: Record<string, { pt: string; en: string; es: string }> = {
  leads:      { pt: 'leads ativos', en: 'active leads', es: 'leads activos' },
  users:      { pt: 'usuários', en: 'users', es: 'usuarios' },
  messages:   { pt: 'mensagens IA/mês', en: 'AI messages/mo', es: 'mensajes IA/mes' },
  properties: { pt: 'imóveis', en: 'properties', es: 'propiedades' },
  documents:  { pt: 'documentos/mês', en: 'documents/mo', es: 'documentos/mes' },
  sites:      { pt: 'sites', en: 'sites', es: 'sitios' },
  whatsapp:   { pt: 'números WhatsApp', en: 'WhatsApp numbers', es: 'números WhatsApp' },
}

export default function UpgradeModal({ isOpen, onClose, resource, current, limit }: UpgradeModalProps) {
  const { user, activeOrgId } = useAuth()
  const { plan, getUpgradePlanConfig, getFormattedPrice } = usePlan()
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const lang = (user?.language as 'pt' | 'en' | 'es') || 'pt'
  const resourceLabel = RESOURCE_LABELS[resource]?.[lang] || resource
  const nextPlan = getUpgradePlanConfig()

  const handleUpgrade = async () => {
    if (!activeOrgId || !nextPlan) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: activeOrgId,
          planName: nextPlan.name,
          userId: user?.id,
          userEmail: user?.email,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  const T = {
    pt: {
      title: 'Limite atingido',
      desc: `Você atingiu o limite de ${limit} ${resourceLabel} do plano atual.`,
      using: `Usando ${current} de ${limit}`,
      upgradeTitle: 'Faça upgrade para continuar',
      upgradeBtn: `Upgrade para ${nextPlan?.displayName}`,
      upgradePrice: nextPlan ? `${getFormattedPrice(lang === 'pt' ? 'BRL' : 'USD')}/mês → ${lang === 'pt' ? 'R$' : '$'}${lang === 'pt' ? nextPlan.priceBrl : nextPlan.priceUsd}/mês` : '',
      noUpgrade: 'Você está no plano máximo. Entre em contato para limites personalizados.',
      close: 'Fechar',
    },
    en: {
      title: 'Limit reached',
      desc: `You've reached the limit of ${limit} ${resourceLabel} on your current plan.`,
      using: `Using ${current} of ${limit}`,
      upgradeTitle: 'Upgrade to continue',
      upgradeBtn: `Upgrade to ${nextPlan?.displayName}`,
      upgradePrice: nextPlan ? `${getFormattedPrice('USD')}/mo → $${nextPlan.priceUsd}/mo` : '',
      noUpgrade: 'You are on the highest plan. Contact us for custom limits.',
      close: 'Close',
    },
    es: {
      title: 'Límite alcanzado',
      desc: `Alcanzaste el límite de ${limit} ${resourceLabel} en tu plan actual.`,
      using: `Usando ${current} de ${limit}`,
      upgradeTitle: 'Mejora para continuar',
      upgradeBtn: `Mejorar a ${nextPlan?.displayName}`,
      upgradePrice: nextPlan ? `${getFormattedPrice('USD')}/mes → $${nextPlan.priceUsd}/mes` : '',
      noUpgrade: 'Estás en el plan más alto. Contáctanos para límites personalizados.',
      close: 'Cerrar',
    },
  }

  const t = T[lang]
  const percentage = Math.min((current / limit) * 100, 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
      style={{ background: 'var(--color-bg-overlay)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl w-full max-w-sm animate-in fade-in zoom-in-95 overflow-hidden"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Header com barra de uso */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-error-subtle)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <TrendingUp size={20} style={{ color: 'var(--color-error)' }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
              <X size={18} />
            </button>
          </div>

          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{t.desc}</p>

          {/* Barra de uso */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-tertiary)' }}>{t.using}</span>
              <span className="font-bold" style={{ color: 'var(--color-error)' }}>{Math.round(percentage)}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
              <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: 'var(--color-error)' }} />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          {nextPlan ? (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>{t.upgradePrice}</p>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 16px rgba(90, 122, 230, 0.25)' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {t.upgradeBtn}
                {!loading && <ArrowRight size={16} />}
              </button>
            </>
          ) : (
            <p className="text-sm text-center" style={{ color: 'var(--color-text-tertiary)' }}>{t.noUpgrade}</p>
          )}
        </div>
      </div>
    </div>
  )
}
