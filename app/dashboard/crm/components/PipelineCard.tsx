// app/dashboard/crm/components/PipelineCard.tsx
'use client'

import { type DragEvent, useState } from 'react'
import { Clock, Bot, Phone, Mail, MoreHorizontal, MessageCircle } from 'lucide-react'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

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

interface PipelineCardProps {
  lead: Lead
  leadTags: LeadTag[]
  tags: Tag[]
  density?: 'compact' | 'balanced' | 'detailed'
  userCurrency: string
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
  isDragging?: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatPriceLocal(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${currency} ${value.toFixed(0)}`
  }
}

function formatShortId(id: string) {
  const tail = id.replace(/-/g, '').slice(-4).toUpperCase()
  return `#L-${tail}`
}

function getInitials(name: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function getDaysSinceUpdate(updatedAt?: string) {
  if (!updatedAt) return 0
  return Math.ceil((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
}

// Config visual das temperaturas
const TEMP_CONFIG: Record<string, { label: string; borderColor: string; textColor: string }> = {
  hot:  { label: 'QUENTE', borderColor: '#D95454', textColor: '#E89090' },
  warm: { label: 'MORNO',  borderColor: '#F0A030', textColor: '#E8C878' },
  cold: { label: 'FRIO',   borderColor: '#5A7AE6', textColor: '#93B0F5' },
  lost: { label: 'PERDIDO',borderColor: '#4A4D58', textColor: '#6E7280' },
}

function stripPhone(phone?: string) {
  if (!phone) return ''
  return phone.replace(/[^\d+]/g, '')
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function PipelineCard({
  lead,
  leadTags,
  tags,
  density = 'balanced',
  userCurrency,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
}: PipelineCardProps) {
  const days = getDaysSinceUpdate(lead.updated_at || lead.created_at)
  const isStale = days >= 5
  const temp = lead.score_label ? TEMP_CONFIG[lead.score_label] : null
  const iaStatus: 'active' | 'paused' | null =
    lead.conversa_finalizada === false ? 'active' :
    lead.conversa_finalizada === true ? 'paused' : null

  const showSource = density !== 'compact'
  const showProperty = density === 'detailed'
  const showActions = density !== 'compact'
  const showOwner = density !== 'compact'
  const showScore = density === 'detailed'

  // Tags do lead — limita a 3 visíveis
  const myTagIds = leadTags.filter(lt => lt.lead_id === lead.id).map(lt => lt.tag_id)
  const myTags = tags.filter(t => myTagIds.includes(t.id))
  const visibleTags = myTags.slice(0, 3)
  const extraTagsCount = myTags.length - visibleTags.length

  // Canais disponíveis (smart-hide: só mostra se tem dado)
  const phone = stripPhone(lead.phone)
  const hasPhone = phone.length > 0
  const hasEmail = !!lead.email

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        group relative flex flex-col gap-2
        bg-elevated border border-border-subtle rounded-lg
        cursor-grab active:cursor-grabbing
        hover:border-border hover:bg-bg-hover
        transition-all
        ${density === 'compact' ? 'px-2.5 py-2' : 'px-3 py-2.5'}
        ${isDragging ? 'opacity-40' : ''}
      `}
      style={{
        borderLeft: temp ? `2px solid ${temp.borderColor}` : undefined,
      }}
    >
      {/* Linha 1: ID mono + cluster de status + label de temperatura */}
      <header className="flex items-center justify-between gap-2">
        <span className="font-mono text-caption text-text-tertiary tracking-uppercase">
          {formatShortId(lead.id)}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Stale indicator */}
          {isStale && (
            <span
              title="Lead parado há 5+ dias"
              className="inline-flex items-center justify-center w-4 h-4 rounded text-[10px]"
              style={{ background: 'rgba(217, 84, 84, 0.14)', color: '#E89090' }}
            >
              <Clock size={10} strokeWidth={2.25} />
            </span>
          )}

          {/* IA status */}
          {iaStatus && (
            <span
              title={iaStatus === 'active' ? 'IA Ativa' : 'IA Pausada'}
              className="inline-flex items-center justify-center w-4 h-4 rounded text-[10px]"
              style={{
                background: iaStatus === 'active' ? 'rgba(52, 179, 104, 0.14)' : 'rgba(107, 114, 128, 0.12)',
                color: iaStatus === 'active' ? '#6FD69A' : '#828693',
              }}
            >
              <Bot size={10} strokeWidth={2.25} />
            </span>
          )}

          {/* Temperatura */}
          {temp && (
            <span
              className="inline-flex items-center px-1.5 py-px rounded font-mono text-[9.5px] uppercase tracking-uppercase border font-semibold"
              style={{
                color: temp.textColor,
                borderColor: temp.borderColor,
                opacity: 0.95,
              }}
            >
              {temp.label}
            </span>
          )}
        </div>
      </header>

      {/* Linha 2: Nome + origem/cidade + avatar do responsável */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-body text-text-primary leading-tight truncate">
            {lead.name || '—'}
          </h3>
          {showSource && (lead.source || lead.nome_empresa) && (
            <p className="font-mono text-[11px] text-text-tertiary mt-0.5 truncate">
              {[lead.source, lead.nome_empresa].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {showOwner && lead.assigned_to_name && (
          <span
            className="shrink-0 inline-flex items-center justify-center w-[22px] h-[22px] rounded-full font-mono text-[9.5px]"
            style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' }}
            title={lead.assigned_to_name}
          >
            {getInitials(lead.assigned_to_name)}
          </span>
        )}
      </div>

      {/* Linha 3: Imóvel (só detalhado) */}
      {showProperty && lead.nicho && (
        <div className="flex items-center gap-1.5 text-text-tertiary text-[11px] py-0.5 border-t border-border-subtle">
          <span className="font-mono text-[10px] text-text-muted">{lead.nicho}</span>
        </div>
      )}

      {/* Linha 4: Valor + Score */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-body text-text-primary font-semibold tabular-nums">
          {lead.total_em_vendas != null && lead.total_em_vendas > 0
            ? formatPriceLocal(lead.total_em_vendas, userCurrency)
            : '—'}
        </span>
        {showScore && lead.score != null && (
          <span className="font-mono text-[10.5px] text-text-tertiary">
            score{' '}
            <span
              className="font-semibold text-xs"
              style={{
                color: lead.score >= 80 ? 'var(--color-success)' :
                       lead.score >= 60 ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}
            >
              {lead.score}
            </span>
          </span>
        )}
      </div>

      {/* Tags (balanced+) */}
      {showActions && visibleTags.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1">
          {visibleTags.map(tag => (
            <li
              key={tag.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border"
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
            <li className="font-mono text-[10px] text-text-tertiary px-1">+{extraTagsCount}</li>
          )}
        </ul>
      )}

      {/* Linha de ações + tempo desde update */}
      {showActions && (
        <footer className="flex items-center justify-between gap-2 pt-1.5 border-t border-border-subtle">
          <div className="flex items-center gap-0.5">
            {hasPhone && <ActionButton icon={MessageCircle} label="WhatsApp" href={`https://wa.me/${phone}`} tone="success" />}
            {hasPhone && <ActionButton icon={Phone} label="Ligar" href={`tel:${phone}`} />}
            {hasEmail && <ActionButton icon={Mail} label="E-mail" href={`mailto:${lead.email}`} />}
            <ActionButton icon={MoreHorizontal} label="Mais" />
          </div>
          <span className="font-mono text-[10.5px] text-text-tertiary shrink-0">
            {days === 0 ? 'hoje' : days === 1 ? 'há 1 dia' : `há ${days} dias`}
          </span>
        </footer>
      )}
    </article>
  )
}

function ActionButton({
  icon: Icon,
  label,
  href,
  tone,
}: {
  icon: typeof Phone
  label: string
  href?: string
  tone?: 'success'
}) {
  const [hover, setHover] = useState(false)

  const btn = (
    <button
      title={label}
      onClick={href ? (e) => {
        e.stopPropagation()
        window.open(href, '_blank', 'noopener,noreferrer')
      } : (e) => e.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center justify-center w-6 h-6 rounded transition-colors"
      style={{
        color: hover
          ? tone === 'success' ? 'var(--color-success)' : 'var(--color-text-primary)'
          : 'var(--color-text-muted)',
        background: hover ? 'var(--color-bg-hover)' : 'transparent',
      }}
    >
      <Icon size={13} strokeWidth={1.75} />
    </button>
  )

  return btn
}
