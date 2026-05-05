// app/dashboard/crm/components/PipelineCard.tsx
'use client'

import type { DragEvent } from 'react'
import { Mail, Phone, Clock, Tag as TagIcon, User as UserIcon, Bot } from 'lucide-react'

// ─── Tipos ─────────────────────────────────────────────────────────────────────
// Mantidos compatíveis com os tipos já existentes em app/dashboard/crm/page.tsx.
interface Lead {
  id: string
  name: string
  nome_empresa?: string
  email: string
  phone?: string
  stage?: string
  source?: string
  nicho?: string
  created_at: string
  updated_at?: string
  total_em_vendas?: number
  org_id?: string
  conversa_finalizada?: boolean
  score?: number
  score_label?: 'hot' | 'warm' | 'cold' | 'lost'
  assigned_to?: string
  assigned_to_name?: string
}

interface Tag {
  id: string
  org_id: string
  name: string
  color: string
}

interface LeadTag {
  lead_id: string
  tag_id: string
}

interface Translations {
  contactLabel: string
  stale: string
  unassigned: string
  aiActive: string
  aiPaused: string
}

interface PipelineCardProps {
  lead: Lead
  leadTags: LeadTag[]
  tags: Tag[]
  cardFields: string[]
  cardShowStale: boolean
  cardShowAiStatus: boolean
  userLang: string
  userCurrency: string
  userTimezone: string
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
  isDragging?: boolean
  translations: Translations
}

// ─── Helpers de apresentação (locais) ──────────────────────────────────────────
// Não usam Supabase; só formatação. As versões "de verdade" estão em lib/format.

function formatPriceLocal(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${currency} ${value.toFixed(0)}`
  }
}

function formatShortId(id: string) {
  // L-XXXX a partir dos últimos 4 chars do uuid (estável, fácil de scanear no kanban)
  const tail = id.replace(/-/g, '').slice(-4).toUpperCase()
  return `#L-${tail}`
}

function getInitials(name: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function getDaysSinceUpdate(updatedAt?: string) {
  if (!updatedAt) return 0
  const diff = Date.now() - new Date(updatedAt).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Configuração visual da temperatura — usa tokens semânticos.
const TEMP_CONFIG: Record<NonNullable<Lead['score_label']>, { label: string; classes: string }> = {
  hot:  { label: 'QUENTE', classes: 'bg-error-subtle text-error border-error-subtle' },
  warm: { label: 'MORNO',  classes: 'bg-warning-subtle text-warning border-warning-subtle' },
  cold: { label: 'FRIO',   classes: 'bg-bg-hover text-text-tertiary border-border-subtle' },
  lost: { label: 'PERDIDO',classes: 'bg-bg-hover text-text-disabled border-border-subtle' },
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function PipelineCard({
  lead,
  leadTags,
  tags,
  cardFields,
  cardShowStale,
  cardShowAiStatus,
  userCurrency,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  translations,
}: PipelineCardProps) {
  const days = getDaysSinceUpdate(lead.updated_at || lead.created_at)
  const isStale = cardShowStale && days >= 7
  const temp = lead.score_label ? TEMP_CONFIG[lead.score_label] : null

  // Tags do lead — limita a 3 visíveis, resto vira "+N"
  const myTagIds = leadTags.filter(lt => lt.lead_id === lead.id).map(lt => lt.tag_id)
  const myTags = tags.filter(t => myTagIds.includes(t.id))
  const visibleTags = myTags.slice(0, 3)
  const extraTagsCount = myTags.length - visibleTags.length

  const showField = (key: string) => cardFields.includes(key)

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        group relative flex flex-col gap-2 px-3 py-3
        bg-elevated border border-border-subtle rounded-md
        cursor-grab active:cursor-grabbing
        hover:border-border hover:bg-bg-hover
        transition-all
        ${isDragging ? 'opacity-40' : ''}
      `}
    >
      {/* Topo: ID + temperatura */}
      <header className="flex items-center justify-between gap-2">
        <span className="font-mono text-caption text-text-tertiary tracking-uppercase">
          {formatShortId(lead.id)}
        </span>

        <div className="flex items-center gap-1.5">
          {cardShowAiStatus && (
            <span
              title={lead.conversa_finalizada ? translations.aiPaused : translations.aiActive}
              className={`
                inline-flex items-center justify-center w-4 h-4 rounded-full
                ${lead.conversa_finalizada ? 'bg-accent-subtle text-accent' : 'bg-success-subtle text-success'}
              `}
            >
              <Bot size={10} strokeWidth={2.25} />
            </span>
          )}
          {temp && (
            <span
              className={`
                inline-flex items-center px-1.5 py-0.5 rounded
                font-mono text-caption uppercase tracking-uppercase border
                ${temp.classes}
              `}
            >
              {temp.label}
            </span>
          )}
        </div>
      </header>

      {/* Nome + empresa */}
      <div className="flex flex-col gap-0.5">
        <h3 className="font-display font-semibold text-body-lg text-text-primary leading-tight">
          {lead.name || '—'}
        </h3>
        {lead.nome_empresa && (
          <span className="text-body-sm text-text-secondary truncate">
            {lead.nome_empresa}
          </span>
        )}
      </div>

      {/* Valor */}
      {showField('total_em_vendas') && lead.total_em_vendas != null && lead.total_em_vendas > 0 && (
        <div className="font-mono text-body text-text-primary">
          {formatPriceLocal(lead.total_em_vendas, userCurrency)}
        </div>
      )}

      {/* Tags */}
      {showField('tags') && visibleTags.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1">
          {visibleTags.map(tag => (
            <li
              key={tag.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-caption border"
              style={{
                background: `var(--tag-${tag.color}-bg)`,
                color: `var(--tag-${tag.color}-text)`,
                borderColor: `var(--tag-${tag.color}-border)`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: `var(--tag-${tag.color}-text)` }} />
              {tag.name}
            </li>
          ))}
          {extraTagsCount > 0 && (
            <li className="font-mono text-caption text-text-tertiary px-1">
              +{extraTagsCount}
            </li>
          )}
        </ul>
      )}

      {/* Linha inferior: ícones + dias parado + atribuição */}
      <footer className="flex items-center justify-between gap-2 pt-1 mt-auto">
        <div className="flex items-center gap-2 text-text-tertiary">
          {showField('phone') && lead.phone && (
            <Phone size={12} strokeWidth={1.75} aria-label="phone" />
          )}
          {showField('email') && lead.email && (
            <Mail size={12} strokeWidth={1.75} aria-label="email" />
          )}
          {isStale && (
            <span className="inline-flex items-center gap-1 font-mono text-caption text-warning">
              <Clock size={11} strokeWidth={1.75} />
              {days}d
            </span>
          )}
        </div>

        {lead.assigned_to_name ? (
          <div className="flex items-center gap-1.5 text-accent text-caption font-medium">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-subtle font-mono text-caption">
              {getInitials(lead.assigned_to_name)}
            </span>
            <span className="truncate max-w-[80px]">{lead.assigned_to_name}</span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-text-tertiary text-caption">
            <UserIcon size={11} strokeWidth={1.75} />
            {translations.unassigned}
          </span>
        )}
      </footer>
    </article>
  )
}
