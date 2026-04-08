'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'
import { useAuth } from '@/lib/AuthContext'
import { COMMISSION_STATUS_COLORS, COMMISSION_STATUS_LABELS } from '@/lib/financial/constants'
import type { Commission } from '@/lib/financial/types'

type CommissionStatus = Commission['status']

interface Props {
  orgId: string
  currency: string
  lang: 'pt' | 'en' | 'es'
  onUpdate: () => void
}

const translations = {
  pt: {
    title: 'Comissões',
    all: 'Todas',
    pending: 'Pendentes',
    approved: 'Aprovadas',
    paid: 'Pagas',
    lead: 'Lead',
    broker: 'Corretor',
    dealValue: 'Valor do Negócio',
    rate: 'Taxa',
    commission: 'Comissão',
    split: 'Divisão Agência/Corretor',
    status: 'Status',
    actions: 'Ações',
    approve: 'Aprovar',
    markPaid: 'Marcar Pago',
    cancel: 'Cancelar',
    loading: 'Carregando...',
    empty: 'Nenhuma comissão encontrada.',
    unknown: 'Desconhecido',
  },
  en: {
    title: 'Commissions',
    all: 'All',
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',
    lead: 'Lead',
    broker: 'Broker',
    dealValue: 'Deal Value',
    rate: 'Rate',
    commission: 'Commission',
    split: 'Agency/Broker Split',
    status: 'Status',
    actions: 'Actions',
    approve: 'Approve',
    markPaid: 'Mark Paid',
    cancel: 'Cancel',
    loading: 'Loading...',
    empty: 'No commissions found.',
    unknown: 'Unknown',
  },
  es: {
    title: 'Comisiones',
    all: 'Todas',
    pending: 'Pendientes',
    approved: 'Aprobadas',
    paid: 'Pagadas',
    lead: 'Lead',
    broker: 'Corredor',
    dealValue: 'Valor del Negocio',
    rate: 'Tasa',
    commission: 'Comisión',
    split: 'División Agencia/Corredor',
    status: 'Estado',
    actions: 'Acciones',
    approve: 'Aprobar',
    markPaid: 'Marcar Pagado',
    cancel: 'Cancelar',
    loading: 'Cargando...',
    empty: 'No se encontraron comisiones.',
    unknown: 'Desconocido',
  },
}

type FilterStatus = 'all' | CommissionStatus

export default function CommissionsPanel({ orgId, currency, lang, onUpdate }: Props) {
  const t = translations[lang]
  const { user } = useAuth()

  const [commissions, setCommissions] = useState<(Commission & { lead_name?: string })[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [commissionsRes, usersRes] = await Promise.all([
        supabase
          .from('commissions')
          .select('*, leads(name)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, name')
          .eq('org_id', orgId),
      ])

      const userMap: Record<string, string> = {}
      if (usersRes.data) {
        for (const u of usersRes.data) {
          userMap[u.id] = u.name
        }
      }
      setUsersMap(userMap)

      if (commissionsRes.data) {
        const mapped = commissionsRes.data.map((c: any) => ({
          ...c,
          lead_name: c.leads?.name || undefined,
          leads: undefined,
        }))
        setCommissions(mapped)
      }
    } catch (err) {
      console.error('Error fetching commissions:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAction = async (id: string, action: 'approve' | 'pay' | 'cancel') => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/financial/commissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) {
        onUpdate()
        await fetchData()
      }
    } catch (err) {
      console.error('Error performing action:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = filter === 'all'
    ? commissions
    : commissions.filter((c) => c.status === filter)

  const statusLabels = COMMISSION_STATUS_LABELS[lang] || COMMISSION_STATUS_LABELS['en']

  const filterButtons: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: t.all },
    { key: 'pending', label: t.pending },
    { key: 'approved', label: t.approved },
    { key: 'paid', label: t.paid },
  ]

  return (
    <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', color: 'var(--color-text-primary)', fontSize: 18, fontWeight: 600 }}>
        {t.title}
      </h3>

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filterButtons.map((fb) => (
          <button
            key={fb.key}
            onClick={() => setFilter(fb.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: filter === fb.key ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: filter === fb.key ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
              color: filter === fb.key ? '#fff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            {fb.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {[t.lead, t.broker, t.dealValue, t.rate, t.commission, t.split, t.status, t.actions].map((h) => (
                <th
                  key={h}
                  style={{
                    position: 'sticky',
                    top: 0,
                    textAlign: 'left',
                    padding: '10px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-text-muted)',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-bg-surface)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={{ padding: '12px' }}>
                      <div
                        style={{
                          height: 14,
                          borderRadius: 4,
                          background: 'var(--color-bg-hover)',
                          animation: 'pulse 1.5s ease-in-out infinite',
                          width: j === 0 || j === 1 ? 120 : j === 7 ? 100 : 80,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '40px 12px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: 14,
                  }}
                >
                  {t.empty}
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const colors = COMMISSION_STATUS_COLORS[c.status]
                return (
                  <tr
                    key={c.id}
                    onMouseEnter={() => setHoveredRow(c.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: hoveredRow === c.id ? 'var(--color-bg-hover)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={cellStyle}>{c.lead_name || t.unknown}</td>
                    <td style={cellStyle}>{usersMap[c.broker_id] || t.unknown}</td>
                    <td style={cellStyle}>{formatPrice(c.deal_value, currency)}</td>
                    <td style={cellStyle}>{(c.commission_rate * 100).toFixed(1)}%</td>
                    <td style={cellStyle}>{formatPrice(c.total_commission, currency)}</td>
                    <td style={cellStyle}>
                      {formatPrice(c.agency_amount, currency)} / {formatPrice(c.broker_amount, currency)}
                    </td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {statusLabels[c.status] || c.status}
                      </span>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.status === 'pending' && (
                          <button
                            onClick={() => handleAction(c.id, 'approve')}
                            disabled={actionLoading === c.id}
                            style={actionBtnStyle('var(--color-success)')}
                          >
                            {t.approve}
                          </button>
                        )}
                        {c.status === 'approved' && (
                          <button
                            onClick={() => handleAction(c.id, 'pay')}
                            disabled={actionLoading === c.id}
                            style={actionBtnStyle('var(--color-primary)')}
                          >
                            {t.markPaid}
                          </button>
                        )}
                        {(c.status === 'pending' || c.status === 'approved') && (
                          <button
                            onClick={() => handleAction(c.id, 'cancel')}
                            disabled={actionLoading === c.id}
                            style={actionBtnStyle('var(--color-error)')}
                          >
                            {t.cancel}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
}

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 6,
    border: `1px solid ${color}`,
    background: 'transparent',
    color: color,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'opacity 0.15s ease',
  }
}
