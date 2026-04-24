// Lista de sequences da org.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Rocket, Plus, Loader2, ChevronRight, MessageSquare, Mail, Phone, Users } from 'lucide-react'
import { CHANNEL_LABELS } from '@/lib/prospection/types'

interface SequenceRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  exit_on_reply: boolean
  steps: { id: string; position: number; day_offset: number; channel: string; title: string | null; execution_mode: string }[]
  rules: { id: string; name: string; trigger_event: string; is_active: boolean; priority: number }[]
  active_count: number
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<SequenceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/prospection/sequences')
      .then((r) => r.json())
      .then((data) => setSequences(data.sequences || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sequences de Prospecção</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Templates de cadência multi-canal. Cada sequence define canais, dias, mensagens e regras de inscrição.
          </p>
        </div>

        <Link
          href="/dashboard/prospection/my-day"
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          ← Voltar ao Meu Dia
        </Link>
      </div>

      {sequences.length === 0 ? (
        <div className="border border-border rounded-xl p-12 text-center">
          <Rocket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Nenhuma sequence ainda</h3>
          <p className="text-sm text-muted-foreground">
            A sequence default deveria ter sido criada automaticamente. Se não aparecer, verifique se a org tem niche="ai_agency".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/prospection/sequences/${s.id}`}
              className="block border border-border rounded-xl bg-card hover:border-primary/50 transition group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base truncate">{s.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          s.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {s.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition flex-shrink-0" />
                </div>

                {/* Steps preview */}
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {s.steps.slice(0, 8).map((step) => {
                    const Icon =
                      step.channel === 'email' ? Mail : step.channel === 'call' ? Phone : MessageSquare
                    return (
                      <div
                        key={step.id}
                        className="inline-flex items-center gap-1 text-[10px] bg-muted/50 border border-border rounded px-1.5 py-1 text-muted-foreground"
                        title={`Dia ${step.day_offset} · ${CHANNEL_LABELS[step.channel as keyof typeof CHANNEL_LABELS]}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="font-semibold">D{step.day_offset}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{s.steps.length} etapas</span>
                  <span>·</span>
                  <span>{s.rules.length} regras</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {s.active_count} ativos
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
