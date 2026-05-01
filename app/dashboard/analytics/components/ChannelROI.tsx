'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { SourceConversion } from '@/lib/analytics/types'

interface Props {
  sources: SourceConversion[]
  lang: 'pt' | 'en' | 'es'
  currency: string
}

const t = {
  pt: {
    revenue: 'Receita por Fonte',
    table: 'Tabela de Conversão',
    source: 'Fonte',
    leads: 'Leads',
    won: 'Ganhos',
    conv: 'Conv.%',
    avgValue: 'Valor Médio',
    revenueCol: 'Receita',
    totalLeads: 'Total de Leads',
    avgDealValue: 'Valor Médio',
    noData: 'Sem dados disponíveis',
  },
  en: {
    revenue: 'Revenue by Source',
    table: 'Conversion Table',
    source: 'Source',
    leads: 'Leads',
    won: 'Won',
    conv: 'Conv.%',
    avgValue: 'Avg Value',
    revenueCol: 'Revenue',
    totalLeads: 'Total Leads',
    avgDealValue: 'Avg Deal Value',
    noData: 'No data available',
  },
  es: {
    revenue: 'Ingresos por Fuente',
    table: 'Tabla de Conversión',
    source: 'Fuente',
    leads: 'Leads',
    won: 'Ganados',
    conv: 'Conv.%',
    avgValue: 'Valor Medio',
    revenueCol: 'Ingresos',
    totalLeads: 'Total de Leads',
    avgDealValue: 'Valor Medio',
    noData: 'Sin datos disponibles',
  },
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '20px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  marginBottom: '16px',
}

const emptyStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
  padding: '32px 0',
}

const thStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  padding: '8px 12px',
  textAlign: 'left',
  borderBottom: '1px solid var(--color-border-subtle)',
  cursor: 'pointer',
  userSelect: 'none',
}

const tdStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-primary)',
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-border-subtle)',
}

type SortKey = 'source' | 'totalLeads' | 'wonLeads' | 'conversionRate' | 'avgDealValue' | 'estimatedRevenue'

// Mapeamento de nomes do banco para nomes amigáveis
const SOURCE_LABELS: Record<string, Record<string, string>> = {
  pt: {
    site: 'Site',
    csv_import: 'Importação CSV',
    whatsapp_inbound: 'WhatsApp',
    whatsapp: 'WhatsApp',
    manual: 'Manual',
    facebook: 'Facebook',
    instagram: 'Instagram',
    google: 'Google',
    referral: 'Indicação',
    api: 'API',
    landing_page: 'Landing Page',
    email: 'E-mail',
    phone: 'Telefone',
    agente_captacao: '🤖 Hunter B2B (IA)',
    hunter_b2b: '🤖 Hunter B2B (IA)',
    other: 'Outro',
  },
  en: {
    site: 'Website',
    csv_import: 'CSV Import',
    whatsapp_inbound: 'WhatsApp',
    whatsapp: 'WhatsApp',
    manual: 'Manual',
    facebook: 'Facebook',
    instagram: 'Instagram',
    google: 'Google',
    referral: 'Referral',
    api: 'API',
    landing_page: 'Landing Page',
    email: 'Email',
    phone: 'Phone',
    agente_captacao: '🤖 Hunter B2B (AI)',
    hunter_b2b: '🤖 Hunter B2B (AI)',
    other: 'Other',
  },
  es: {
    site: 'Sitio Web',
    csv_import: 'Importación CSV',
    whatsapp_inbound: 'WhatsApp',
    whatsapp: 'WhatsApp',
    manual: 'Manual',
    facebook: 'Facebook',
    instagram: 'Instagram',
    google: 'Google',
    referral: 'Referencia',
    api: 'API',
    landing_page: 'Landing Page',
    email: 'Correo',
    phone: 'Teléfono',
    agente_captacao: '🤖 Hunter B2B (IA)',
    hunter_b2b: '🤖 Hunter B2B (IA)',
    other: 'Otro',
  },
}

function friendlySource(source: string, lang: string): string {
  const labels = SOURCE_LABELS[lang] || SOURCE_LABELS.pt
  return labels[source] || source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCurrency(value: number, lang: string, currency: string) {
  return value.toLocaleString(
    lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US',
    { style: 'currency', currency }
  )
}

function formatCompact(value: number, currency: string) {
  const sym = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  if (value >= 1e6) return `${sym}${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${sym}${(value / 1e3).toFixed(0)}k`
  return `${sym}${value.toFixed(0)}`
}

export default function ChannelROI({ sources, lang, currency }: Props) {
  const l = t[lang]
  const [sortKey, setSortKey] = useState<SortKey>('estimatedRevenue')
  const [sortAsc, setSortAsc] = useState(false)

  const isEmpty = !sources || sources.length === 0

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const sorted = isEmpty
    ? []
    : [...sources].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (typeof av === 'string' && typeof bv === 'string') {
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
        }
        return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
      })

  const chartData = isEmpty
    ? []
    : sources.map((s) => ({
        source: friendlySource(s.source, lang),
        totalLeads: s.totalLeads,
        avgDealValue: s.avgDealValue,
      }))

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortAsc ? ' ↑' : ' ↓'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* A) Revenue by Source */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.revenue}</div>
        {isEmpty ? (
          <div style={emptyStyle}>{l.noData}</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis
                dataKey="source"
                tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                tickFormatter={(v) => formatCompact(v, currency)}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                labelStyle={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}
                formatter={(value: number, name: string) => {
                  if (name === 'avgDealValue') return [formatCurrency(value, lang, currency), l.avgDealValue]
                  return [value, l.totalLeads]
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => (
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {value === 'totalLeads' ? l.totalLeads : l.avgDealValue}
                  </span>
                )}
              />
              <Bar yAxisId="left" dataKey="totalLeads" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="avgDealValue" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* B) Conversion Table */}
      <div style={cardStyle}>
        <div style={titleStyle}>{l.table}</div>
        {isEmpty ? (
          <div style={emptyStyle}>{l.noData}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort('source')}>
                    {l.source}{sortIndicator('source')}
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('totalLeads')}>
                    {l.leads}{sortIndicator('totalLeads')}
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('wonLeads')}>
                    {l.won}{sortIndicator('wonLeads')}
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('conversionRate')}>
                    {l.conv}{sortIndicator('conversionRate')}
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('avgDealValue')}>
                    {l.avgValue}{sortIndicator('avgDealValue')}
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('estimatedRevenue')}>
                    {l.revenueCol}{sortIndicator('estimatedRevenue')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.source}>
                    <td style={tdStyle}>{friendlySource(s.source, lang)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{s.totalLeads}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{s.wonLeads}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{s.conversionRate.toFixed(1)}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(s.avgDealValue, lang, currency)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(s.estimatedRevenue, lang, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
