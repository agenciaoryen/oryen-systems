'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import {
  Eye, Users, TrendingUp, Home, Loader2, RefreshCw,
  ArrowUpDown, ChevronUp, ChevronDown, MousePointerClick,
  MessageSquare, Image as ImageIcon, BarChart3
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { formatPrice, formatArea } from '@/lib/properties/constants'
import type { PropertyStat, PortfolioOverview, DailyPoint } from '@/lib/properties/analytics'

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Estatísticas do Portfólio',
    subtitle: 'Acompanhe a performance de cada propriedade no seu site',
    refresh: 'Atualizar',
    loading: 'Carregando estatísticas...',
    noData: 'Nenhum dado disponível para o período selecionado',
    noProperties: 'Nenhuma propriedade cadastrada ainda',
    // KPIs
    totalViews: 'Visualizações',
    totalLeads: 'Leads Captados',
    avgConversion: 'Conversão Média',
    topProperty: 'Mais Vista',
    activeProperties: 'Propriedades Ativas',
    // Chart
    chartTitle: 'Visualizações por Dia',
    views: 'Visualizações',
    clicks: 'Cliques',
    leads: 'Leads',
    // Table
    tableTitle: 'Performance por Propriedade',
    property: 'Propriedade',
    visitors: 'Visitantes',
    gallery: 'Galeria',
    contacts: 'Contatos',
    conversion: 'Conversão',
    daysOnMarket: 'Dias no Mercado',
    priceM2: 'Preço/m²',
    // Period
    last7: '7 dias',
    last30: '30 dias',
    last90: '90 dias',
  },
  en: {
    title: 'Property Statistics',
    subtitle: 'Track the performance of each property on your site',
    refresh: 'Refresh',
    loading: 'Loading statistics...',
    noData: 'No data available for the selected period',
    noProperties: 'No properties registered yet',
    totalViews: 'Views',
    totalLeads: 'Leads Captured',
    avgConversion: 'Avg Conversion',
    topProperty: 'Most Viewed',
    activeProperties: 'Active Properties',
    chartTitle: 'Views per Day',
    views: 'Views',
    clicks: 'Clicks',
    leads: 'Leads',
    tableTitle: 'Performance by Property',
    property: 'Property',
    visitors: 'Visitors',
    gallery: 'Gallery',
    contacts: 'Contacts',
    conversion: 'Conversion',
    daysOnMarket: 'Days on Market',
    priceM2: 'Price/m²',
    last7: '7 days',
    last30: '30 days',
    last90: '90 days',
  },
  es: {
    title: 'Estadísticas del Portafolio',
    subtitle: 'Acompañe el rendimiento de cada propiedad en su sitio',
    refresh: 'Actualizar',
    loading: 'Cargando estadísticas...',
    noData: 'Sin datos disponibles para el período seleccionado',
    noProperties: 'Ninguna propiedad registrada aún',
    totalViews: 'Visualizaciones',
    totalLeads: 'Leads Captados',
    avgConversion: 'Conversión Media',
    topProperty: 'Más Vista',
    activeProperties: 'Propiedades Activas',
    chartTitle: 'Visualizaciones por Día',
    views: 'Visualizaciones',
    clicks: 'Clics',
    leads: 'Leads',
    tableTitle: 'Rendimiento por Propiedad',
    property: 'Propiedad',
    visitors: 'Visitantes',
    gallery: 'Galería',
    contacts: 'Contactos',
    conversion: 'Conversión',
    daysOnMarket: 'Días en Mercado',
    priceM2: 'Precio/m²',
    last7: '7 días',
    last30: '30 días',
    last90: '90 días',
  },
}

type Lang = keyof typeof TRANSLATIONS
type SortKey = 'views' | 'leads_count' | 'conversion_rate' | 'days_on_market' | 'unique_visitors'

// ═══════════════════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════════════════

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function PropertyStatsPage() {
  const { user, org } = useAuth()
  const orgId = useActiveOrgId()
  const router = useRouter()

  const lang = ((user as any)?.language as Lang) || 'pt'
  const currency = (org as any)?.currency || 'BRL'
  const t = TRANSLATIONS[lang]

  const [days, setDays] = useState<number>(30)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [overview, setOverview] = useState<PortfolioOverview | null>(null)
  const [stats, setStats] = useState<PropertyStat[]>([])
  const [daily, setDaily] = useState<DailyPoint[]>([])

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('views')
  const [sortAsc, setSortAsc] = useState(false)

  const fetchData = useCallback(async (showLoader = true) => {
    if (!orgId) return
    if (showLoader) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await fetch(`/api/properties/analytics?org_id=${orgId}&days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setOverview(data.overview)
        setStats(data.stats || [])
        setDaily(data.daily || [])
      }
    } catch (err) {
      console.error('Failed to fetch property analytics:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orgId, days])

  useEffect(() => { fetchData() }, [fetchData])

  // Sorted stats
  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [stats, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} style={{ color: 'var(--color-text-muted)' }} />
    return sortAsc
      ? <ChevronUp size={12} style={{ color: 'var(--color-primary)' }} />
      : <ChevronDown size={12} style={{ color: 'var(--color-primary)' }} />
  }

  if (!orgId) return null

  return (
    <div className="space-y-6 pb-16">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-primary-subtle)', border: '1px solid rgba(90, 122, 230, 0.2)' }}
          >
            <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-xl p-1" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            {([7, 30, 90] as const).map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={days === d
                  ? { background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' }
                  : { color: 'var(--color-text-tertiary)' }
                }
              >
                {d === 7 ? t.last7 : d === 30 ? t.last30 : t.last90}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl transition-all"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}
            title={t.refresh}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ═══ LOADING ═══ */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.loading}</span>
        </div>
      )}

      {!loading && overview && (
        <>
          {/* ═══ KPI CARDS ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Eye}
              label={t.totalViews}
              value={overview.total_views.toLocaleString('pt-BR')}
              color="#5a7ae6"
            />
            <KpiCard
              icon={Users}
              label={t.totalLeads}
              value={overview.total_leads}
              color="#10b981"
            />
            <KpiCard
              icon={TrendingUp}
              label={t.avgConversion}
              value={`${overview.avg_conversion_rate}%`}
              color="#f59e0b"
            />
            <KpiCard
              icon={Home}
              label={t.topProperty}
              value={overview.top_property?.title || '—'}
              sub={overview.top_property ? `${overview.top_property.views} ${t.views.toLowerCase()}` : undefined}
              color="#8b5cf6"
            />
          </div>

          {/* ═══ CHART ═══ */}
          {daily.length > 0 && (
            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
            >
              <h2 className="text-sm font-bold uppercase mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {t.chartTitle}
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + 'T00:00:00')
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'var(--color-text-primary)',
                    }}
                    itemStyle={{ color: 'var(--color-text-secondary)' }}
                    labelStyle={{ color: 'var(--color-text-primary)' }}
                    labelFormatter={(v: string) => {
                      const d = new Date(v + 'T00:00:00')
                      return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en', { day: 'numeric', month: 'short' })
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(value: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>} />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name={t.views}
                    stroke="#5a7ae6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    name={t.clicks}
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name={t.leads}
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ═══ PERFORMANCE POR IMÓVEL ═══ */}
          {sortedStats.length > 0 ? (
            <div>
              <div className="p-1 pb-3">
                <h2 className="text-sm font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  {t.tableTitle} ({sortedStats.length})
                </h2>
              </div>

              {/* ─── CARDS (mobile) ─── */}
              <div className="flex flex-col gap-3 lg:hidden">
                {sortedStats.map((p) => (
                  <div
                    key={p.property_id}
                    className="rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98]"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
                    onClick={() => router.push(`/dashboard/portfolio/${p.property_id}`)}
                  >
                    {/* Header: foto + nome */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
                        style={{ background: 'var(--color-bg-surface)' }}
                      >
                        {p.cover_url ? (
                          <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home size={16} style={{ color: 'var(--color-text-muted)' }} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {p.title}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          {p.address_neighborhood || '—'}
                          {p.status !== 'active' && (
                            <span
                              className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
                            >
                              {p.status}
                            </span>
                          )}
                        </p>
                      </div>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {/* Métricas em grid 2x3 */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-bg-surface)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.views}</p>
                        <p className="text-sm font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>{p.views}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-bg-surface)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.visitors}</p>
                        <p className="text-sm font-bold font-mono" style={{ color: 'var(--color-text-secondary)' }}>{p.unique_visitors}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-bg-surface)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.leads}</p>
                        <p className="text-sm font-bold font-mono" style={{ color: p.leads_count > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{p.leads_count}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-bg-surface)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.conversion}</p>
                        <p className="text-sm font-bold font-mono" style={{
                          color: p.conversion_rate > 5 ? 'var(--color-success)' : p.conversion_rate > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        }}>{p.conversion_rate}%</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-bg-surface)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.daysOnMarket}</p>
                        <p className="text-sm font-bold font-mono" style={{ color: 'var(--color-text-secondary)' }}>{p.days_on_market || '—'}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-bg-surface)' }}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.priceM2}</p>
                        <p className="text-sm font-bold font-mono" style={{ color: 'var(--color-text-secondary)' }}>{p.price_per_m2 ? formatPrice(p.price_per_m2, currency) : '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ─── TABLE (desktop) ─── */}
              <div
                className="rounded-2xl overflow-hidden hidden lg:block"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>
                          {t.property}
                        </th>
                        <ThSortable label={t.views} column="views" icon={Eye} />
                        <ThSortable label={t.visitors} column="unique_visitors" icon={Users} />
                        <ThSortable label={t.leads} column="leads_count" icon={MessageSquare} />
                        <ThSortable label={t.conversion} column="conversion_rate" icon={TrendingUp} />
                        <ThSortable label={t.daysOnMarket} column="days_on_market" icon={Home} />
                        <th className="text-right px-5 py-3 text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>
                          {t.priceM2}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStats.map((p) => (
                        <tr
                          key={p.property_id}
                          className="transition-colors cursor-pointer"
                          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                          onClick={() => router.push(`/dashboard/portfolio/${p.property_id}`)}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '' }}
                        >
                          {/* Property info */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                                style={{ background: 'var(--color-bg-surface)' }}
                              >
                                {p.cover_url ? (
                                  <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Home size={14} style={{ color: 'var(--color-text-muted)' }} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate max-w-[200px]" style={{ color: 'var(--color-text-primary)' }}>
                                  {p.title}
                                </p>
                                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                  {p.address_neighborhood || '—'}
                                  {p.status !== 'active' && (
                                    <span
                                      className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                                      style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
                                    >
                                      {p.status}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Views */}
                          <td className="px-5 py-3 text-center">
                            <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {p.views}
                            </span>
                          </td>

                          {/* Unique visitors */}
                          <td className="px-5 py-3 text-center">
                            <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                              {p.unique_visitors}
                            </span>
                          </td>

                          {/* Leads */}
                          <td className="px-5 py-3 text-center">
                            <span
                              className="font-mono font-bold"
                              style={{ color: p.leads_count > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                            >
                              {p.leads_count}
                            </span>
                          </td>

                          {/* Conversion */}
                          <td className="px-5 py-3 text-center">
                            <span
                              className="font-mono text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: p.conversion_rate > 5 ? 'var(--color-success-subtle)' : p.conversion_rate > 0 ? 'var(--color-accent-subtle)' : 'var(--color-bg-surface)',
                                color: p.conversion_rate > 5 ? 'var(--color-success)' : p.conversion_rate > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                              }}
                            >
                              {p.conversion_rate}%
                            </span>
                          </td>

                          {/* Days on market */}
                          <td className="px-5 py-3 text-center">
                            <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                              {p.days_on_market || '—'}
                            </span>
                          </td>

                          {/* Price/m² */}
                          <td className="px-5 py-3 text-right">
                            <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {p.price_per_m2 ? formatPrice(p.price_per_m2, currency) : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
            >
              <Home size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noProperties}</p>
            </div>
          )}
        </>
      )}
    </div>
  )

  // ═══ Helper: Sortable table header ═══
  function ThSortable({ label, column, icon: Icon }: { label: string; column: SortKey; icon: React.ElementType }) {
    return (
      <th
        className="px-5 py-3 text-center cursor-pointer select-none"
        onClick={() => handleSort(column)}
      >
        <span className="inline-flex items-center gap-1 text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>
          <Icon size={10} />
          {label}
          <SortIcon column={column} />
        </span>
      </th>
    )
  }
}
