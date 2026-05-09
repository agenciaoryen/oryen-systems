'use client'

import { Sparkles, Target, LineChart, Calendar, MessageSquare } from 'lucide-react'
import CoachBubble from './CoachBubble'

const T = {
  pt: {
    title: 'Seu Coach Pessoal',
    description: 'Analiso seus números, acompanho sua evolução e te ajudo a tomar melhores decisões todos os dias.',
    capabilities: [
      { icon: LineChart, label: 'Pipeline & Metas', desc: 'Acompanho seu progresso em tempo real' },
      { icon: Calendar, label: 'Rotina & Follow-ups', desc: 'Te ajudo a priorizar o que importa' },
      { icon: Target, label: 'Estratégia', desc: 'Sugiro ações baseadas nos seus dados' },
      { icon: MessageSquare, label: 'Disponível 24h', desc: 'Converse quando precisar' },
    ],
  },
  en: {
    title: 'Your Personal Coach',
    description: 'I analyze your numbers, track your progress, and help you make better decisions every day.',
    capabilities: [
      { icon: LineChart, label: 'Pipeline & Goals', desc: 'Real-time progress tracking' },
      { icon: Calendar, label: 'Routine & Follow-ups', desc: 'Help you prioritize what matters' },
      { icon: Target, label: 'Strategy', desc: 'Data-driven action suggestions' },
      { icon: MessageSquare, label: 'Available 24/7', desc: 'Talk whenever you need' },
    ],
  },
  es: {
    title: 'Tu Coach Personal',
    description: 'Analizo tus números, sigo tu evolución y te ayudo a tomar mejores decisiones cada día.',
    capabilities: [
      { icon: LineChart, label: 'Pipeline & Metas', desc: 'Seguimiento en tiempo real' },
      { icon: Calendar, label: 'Rutina & Follow-ups', desc: 'Te ayudo a priorizar' },
      { icon: Target, label: 'Estrategia', desc: 'Sugerencias basadas en datos' },
      { icon: MessageSquare, label: 'Disponible 24/7', desc: 'Habla cuando necesites' },
    ],
  },
}

interface CoachMessage {
  id: string
  role: 'user' | 'coach'
  body: string
  message_type: string
  metadata?: any
  created_at: string
}

interface Props {
  greeting: CoachMessage
  onSuggestionClick: (text: string) => void
}

export default function CoachWelcome({ greeting, onSuggestionClick }: Props) {
  const lang = 'pt' // TODO: get from context
  const t = T[lang as keyof typeof T] || T.pt

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center py-4">
        <div
          className="inline-flex p-3 rounded-2xl mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(79, 111, 255, 0.12), rgba(139, 92, 246, 0.12))' }}
        >
          <Sparkles size={28} style={{ color: '#4F6FFF' }} />
        </div>
        <h2 className="text-lg font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h2>
        <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
          {t.description}
        </p>
      </div>

      {/* Capabilities */}
      <div className="grid grid-cols-2 gap-2">
        {t.capabilities.map((cap) => {
          const Icon = cap.icon
          return (
            <div
              key={cap.label}
              className="p-3 rounded-xl text-left"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
            >
              <Icon size={16} className="mb-1.5" style={{ color: 'var(--color-primary)' }} />
              <p className="text-[11px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{cap.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{cap.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Greeting message */}
      <CoachBubble message={greeting} />

      {/* Quick suggestions */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Sugestões rápidas
        </p>
        {[
          'Como está meu pipeline hoje?',
          'O que devo priorizar agora?',
          'Me ajude a planejar o dia',
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="block w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5"
            style={{
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
