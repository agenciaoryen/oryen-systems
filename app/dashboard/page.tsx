'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'
import NoOrganizationState from './components/NoOrganizationState'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts'
import { 
  TrendingUp, Users, Calendar, DollarSign, 
  Activity, ArrowUpRight, ArrowDownRight, Download, Settings, X,
  Loader2, RefreshCw
} from 'lucide-react'
import { format, subDays, parseISO, startOfMonth } from 'date-fns'
import { ptBR, enUS, es, type Locale } from 'date-fns/locale'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface Lead {
  id: string
  created_at: string
  total_em_vendas: number | null
  stage: string | null
  agendou_reuniao: boolean
  compareceu_reuniao: boolean
  name: string | null
  nome_empresa?: string
  owner: string | null
  source: string | null
}

interface Message {
  direction: 'inbound' | 'outbound'
  emotion: string | null
  created_at: string
}

interface ChartDataPoint {
  name: string
  leads: number
  vendas: number
  valor: number
}

interface SentimentDataPoint {
  name: string
  value: number
  color: string
  [key: string]: string | number  // Index signature para compatibilidade com Recharts
}

interface SourceDataPoint {
  name: string
  rate: string | number
  volume: number
}

interface HourlyDataPoint {
  hour: string
  responses: number
}

interface KPIs {
  totalFaturamento: number
  leadsTotal: number
  taxaConversao: number
  reunioesAgendadas: number
  reunioesRealizadas: number
  leadsQualificados: number
  disparos: number
  respostas: number
  metaAtingida: number
  custoPorLead: number
}

interface Goals {
  revenue: number
  ads: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = { 
  success: '#10B981', 
  danger: '#F43F5E', 
  text: '#9CA3AF',
  blue: '#3B82F6',
  purple: '#8B5CF6'
} as const

const DATE_LOCALES: Record<string, Locale> = { pt: ptBR, en: enUS, es }

const RANGE_OPTIONS = [7, 15, 30, 90] as const

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════════

const parseDateSafe = (dateValue: unknown): Date => {
  try {
    if (!dateValue) return new Date()
    if (dateValue instanceof Date) return dateValue
    const d = parseISO(String(dateValue))
    return isNaN(d.getTime()) ? new Date() : d
  } catch {
    return new Date()
  }
}

const daysSince = (date: Date): number => {
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    overview: 'Visão Geral',
    performance: 'Performance da operação',
    goals: 'Metas',
    goalsModalTitle: 'Configurar Metas do Mês',
    revenueGoal: 'Meta de Faturamento',
    adsBudget: 'Investimento Marketing',
    save: 'Salvar',
    saving: 'Salvando...',
    cancel: 'Cancelar',
    revenue: 'Receita',
    goalProgress: 'Progresso da meta',
    reached: 'atingida',
    leadsCaptured: 'Leads Captados',
    costPerLead: 'Custo por Lead (Est.)',
    scheduling: 'Agendamentos',
    attendanceRate: 'Taxa Comparecimento',
    activePipeline: 'Pipeline Ativo',
    advancedStages: 'Fases Avançadas',
    opportunities: 'oportunidades',
    flowTitle: 'Fluxo de Cadência & Receita',
    sales: 'Vendas',
    sentimentTitle: 'Humor das Conversas',
    positive: 'Positivo',
    neutral: 'Neutro',
    negative: 'Negativo',
    funnelTitle: 'Eficiência do Funil',
    capture: 'Captura',
    qualification: 'Qualificação',
    attention: 'Atenção Necessária',
    stalledLeads: 'Leads de alto valor parados (+5 dias)',
    cleanState: 'Tudo limpo! Nenhum lead estagnado.',
    stalled: 'Parado',
    responseTimes: 'Horários de Resposta',
    peakTimes: 'Picos de resposta dos leads (Histórico)',
    conversionRate: 'Taxa de Conversão',
    sourceBase: 'Base',
    recentInteractions: 'Últimas Interações',
    viewAll: 'Ver todos',
    tableLead: 'Lead / Empresa',
    tableStatus: 'Status',
    tableDate: 'Entrada',
    tableMeeting: 'Reunião',
    tableValue: 'Valor',
    export: 'Exportar',
    loading: 'Calculando métricas...',
    refresh: 'Atualizar',
    noData: 'Nenhum lead encontrado neste período.',
    alerts: 'alertas',
    yes: 'Sim',
    companyNotInformed: 'Empresa não inf.',
    insufficientData: 'Dados insuficientes.',
    errorLoadingData: 'Erro ao carregar dados. Tente novamente.',
    errorSavingGoals: 'Erro ao salvar metas. Tente novamente.'
  },
  en: {
    overview: 'Overview',
    performance: 'Operation performance',
    goals: 'Goals',
    goalsModalTitle: 'Set Monthly Goals',
    revenueGoal: 'Revenue Target',
    adsBudget: 'Marketing Budget',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    revenue: 'Revenue',
    goalProgress: 'Goal progress',
    reached: 'reached',
    leadsCaptured: 'Leads Captured',
    costPerLead: 'Cost per Lead (Est.)',
    scheduling: 'Scheduled',
    attendanceRate: 'Attendance Rate',
    activePipeline: 'Active Pipeline',
    advancedStages: 'Advanced Stages',
    opportunities: 'opportunities',
    flowTitle: 'Cadence & Revenue Flow',
    sales: 'Sales',
    sentimentTitle: 'Conversation Sentiment',
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
    funnelTitle: 'Funnel Efficiency',
    capture: 'Capture',
    qualification: 'Qualification',
    attention: 'Attention Required',
    stalledLeads: 'High-value leads stalled (+5 days)',
    cleanState: 'All clear! No stalled leads.',
    stalled: 'Stalled',
    responseTimes: 'Response Times',
    peakTimes: 'Lead response peaks (History)',
    conversionRate: 'Conversion Rate',
    sourceBase: 'Base',
    recentInteractions: 'Recent Interactions',
    viewAll: 'View all',
    tableLead: 'Lead / Company',
    tableStatus: 'Status',
    tableDate: 'Date',
    tableMeeting: 'Meeting',
    tableValue: 'Value',
    export: 'Export',
    loading: 'Calculating metrics...',
    refresh: 'Refresh',
    noData: 'No leads found in this period.',
    alerts: 'alerts',
    yes: 'Yes',
    companyNotInformed: 'Company not inf.',
    insufficientData: 'Insufficient data.',
    errorLoadingData: 'Error loading data. Please try again.',
    errorSavingGoals: 'Error saving goals. Please try again.'
  },
  es: {
    overview: 'Visión General',
    performance: 'Rendimiento de la operación',
    goals: 'Metas',
    goalsModalTitle: 'Configurar Metas del Mes',
    revenueGoal: 'Meta de Facturación',
    adsBudget: 'Presupuesto Marketing',
    save: 'Guardar',
    saving: 'Guardando...',
    cancel: 'Cancelar',
    revenue: 'Ingresos',
    goalProgress: 'Progreso de la meta',
    reached: 'alcanzada',
    leadsCaptured: 'Leads Captados',
    costPerLead: 'Costo por Lead (Est.)',
    scheduling: 'Agendamientos',
    attendanceRate: 'Tasa de Asistencia',
    activePipeline: 'Pipeline Activo',
    advancedStages: 'Fases Avanzadas',
    opportunities: 'oportunidades',
    flowTitle: 'Flujo de Cadencia e Ingresos',
    sales: 'Ventas',
    sentimentTitle: 'Sentimiento de Conversación',
    positive: 'Positivo',
    neutral: 'Neutro',
    negative: 'Negativo',
    funnelTitle: 'Eficiencia del Embudo',
    capture: 'Captura',
    qualification: 'Calificación',
    attention: 'Atención Necesaria',
    stalledLeads: 'Leads de alto valor estancados (+5 días)',
    cleanState: '¡Todo limpio! Sin leads estancados.',
    stalled: 'Estancado',
    responseTimes: 'Horarios de Respuesta',
    peakTimes: 'Picos de respuesta (Histórico)',
    conversionRate: 'Tasa de Conversión',
    sourceBase: 'Base',
    recentInteractions: 'Últimas Interacciones',
    viewAll: 'Ver todos',
    tableLead: 'Lead / Empresa',
    tableStatus: 'Estado',
    tableDate: 'Fecha',
    tableMeeting: 'Reunión',
    tableValue: 'Valor',
    export: 'Exportar',
    loading: 'Calculando métricas...',
    refresh: 'Actualizar',
    noData: 'No se encontraron leads en este período.',
    alerts: 'alertas',
    yes: 'Sí',
    companyNotInformed: 'Empresa no inf.',
    insufficientData: 'Datos insuficientes.',
    errorLoadingData: 'Error al cargar datos. Inténtalo de nuevo.',
    errorSavingGoals: 'Error al guardar metas. Inténtalo de nuevo.'
  }
} as const

type Language = keyof typeof TRANSLATIONS

// Tipo flexível para as traduções (não readonly)
type TranslationKeys = {
  [K in keyof typeof TRANSLATIONS['pt']]: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES UI
// ═══════════════════════════════════════════════════════════════════════════════

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

const Card = ({ children, className = '', onClick }: CardProps) => (
  <div 
    className={`bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
)

interface StatBadgeProps {
  value: string | number
  label: string
  trend?: number
}

const StatBadge = ({ value, label, trend }: StatBadgeProps) => (
  <div className="flex flex-col">
    <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-widest">{label}</p>
    <div className="flex items-end gap-2 mt-1">
      <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{value}</span>
      {trend !== undefined && (
        <span className={`text-[10px] sm:text-xs flex items-center mb-1 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL DE METAS
// ═══════════════════════════════════════════════════════════════════════════════

interface GoalsModalProps {
  isOpen: boolean
  onClose: () => void
  currentGoals: Goals
  onSave: (revenue: number, ads: number) => Promise<void>
  loading: boolean
  t: TranslationKeys
  currencyCode: string
}

const GoalsModal = ({ isOpen, onClose, currentGoals, onSave, loading, t, currencyCode }: GoalsModalProps) => {
  const [revenue, setRevenue] = useState(currentGoals.revenue)
  const [ads, setAds] = useState(currentGoals.ads)

  useEffect(() => {
    setRevenue(currentGoals.revenue)
    setAds(currentGoals.ads)
  }, [currentGoals])

  if (!isOpen) return null

  const handleSubmit = async () => {
    await onSave(revenue, ads)
  }

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white">{t.goalsModalTitle}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              {t.revenueGoal} ({currencyCode})
            </label>
            <input 
              type="number" 
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="Ex: 50000"
              min={0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              {t.adsBudget} ({currencyCode})
            </label>
            <input 
              type="number" 
              value={ads}
              onChange={(e) => setAds(Number(e.target.value))}
              className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="Ex: 1500"
              min={0}
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            {t.cancel}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════════

const DashboardSkeleton = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-600/30 rounded-full" />
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
      </div>
      <p className="text-gray-500 text-sm animate-pulse">{message}</p>
    </div>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter()
  
  // ═══ ATUALIZADO: Usa os novos hooks do AuthContext ═══
  const { user, loading: authLoading, activeOrgName } = useAuth()
  const activeOrgId = useActiveOrgId()  // ← Hook simplificado!
  
  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<number>(30)
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false)
  const [savingGoals, setSavingGoals] = useState(false)

  // Configurações do usuário
  const userLang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]
  const dateLocale = DATE_LOCALES[userLang]
  const userCurrency = user?.currency || 'BRL'

  // Estados dos Dados
  const [goals, setGoals] = useState<Goals>({ revenue: 0, ads: 0 })
  const [leads, setLeads] = useState<Lead[]>([])
  const [messages, setMessages] = useState<Message[]>([])

  // ─── CARREGAR DADOS ───
  const loadData = useCallback(async () => {
    if (!activeOrgId) return
    
    setLoading(true)
    setError(null)
    
    const startDate = subDays(new Date(), range).toISOString()
    const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    try {
      // Fetch em paralelo para melhor performance
      const [goalsResult, leadsResult, messagesResult] = await Promise.all([
        supabase
          .from('goals')
          .select('revenue_target, ads_budget')
          .eq('org_id', activeOrgId)
          .eq('month', currentMonth)
          .maybeSingle(),
        
        supabase
          .from('leads')
          .select('id, created_at, total_em_vendas, stage, agendou_reuniao, compareceu_reuniao, name, nome_empresa, owner, source')
          .eq('org_id', activeOrgId)
          .gte('created_at', startDate)
          .order('created_at', { ascending: true }),
        
        supabase
          .from('messages')
          .select('direction, emotion, created_at')
          .eq('org_id', activeOrgId)
          .gte('created_at', startDate)
          .neq('emotion', null)
      ])

      if (leadsResult.error) throw leadsResult.error
      if (messagesResult.error) throw messagesResult.error

      setGoals({
        revenue: goalsResult.data?.revenue_target || 0,
        ads: goalsResult.data?.ads_budget || 0
      })
      
      setLeads(leadsResult.data || [])
      setMessages(messagesResult.data || [])

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setError(t.errorLoadingData)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, range, t.errorLoadingData])

  // ═══ IMPORTANTE: Re-carrega quando activeOrgId muda (staff trocou de org) ═══
  useEffect(() => {
    if (activeOrgId) loadData()
  }, [activeOrgId, loadData])

  // ─── CÁLCULOS MEMOIZADOS (Performance) ───
  const kpis = useMemo<KPIs>(() => {
    const totalVendas = leads.reduce((acc, curr) => acc + (Number(curr.total_em_vendas) || 0), 0)
    const leadsComVenda = leads.filter(l => Number(l.total_em_vendas) > 0).length
    const leadsQualificados = leads.filter(l => 
      ['qualificado', 'reuniao', 'fechamento', 'proposta'].includes(l.stage?.toLowerCase() || '')
    ).length
    const reunioesAgendadas = leads.filter(l => l.agendou_reuniao).length
    const reunioesRealizadas = leads.filter(l => l.compareceu_reuniao).length

    return {
      totalFaturamento: totalVendas,
      leadsTotal: leads.length,
      taxaConversao: leads.length > 0 ? (leadsComVenda / leads.length) * 100 : 0,
      reunioesAgendadas,
      reunioesRealizadas,
      leadsQualificados,
      disparos: messages.filter(m => m.direction === 'outbound').length,
      respostas: messages.filter(m => m.direction === 'inbound').length,
      metaAtingida: goals.revenue > 0 ? (totalVendas / goals.revenue) * 100 : 0,
      custoPorLead: leads.length > 0 ? goals.ads / leads.length : 0
    }
  }, [leads, messages, goals])

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const dailyMap = new Map<string, ChartDataPoint>()
    
    leads.forEach(lead => {
      const day = format(parseDateSafe(lead.created_at), 'dd/MM')
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { name: day, leads: 0, vendas: 0, valor: 0 })
      }
      const current = dailyMap.get(day)!
      current.leads += 1
      const valor = Number(lead.total_em_vendas) || 0
      if (valor > 0) {
        current.vendas += 1
        current.valor += valor
      }
    })
    
    return Array.from(dailyMap.values())
  }, [leads])

  const sentimentData = useMemo<SentimentDataPoint[]>(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 }
    
    messages.forEach(m => {
      const emotion = m.emotion?.toLowerCase() || ''
      if (['positiva', 'positivo', 'positive'].includes(emotion)) counts.positive++
      else if (['neutra', 'neutro', 'neutral'].includes(emotion)) counts.neutral++
      else if (['negativa', 'negativo', 'negative'].includes(emotion)) counts.negative++
    })

    return [
      { name: t.positive, value: counts.positive, color: COLORS.success },
      { name: t.neutral, value: counts.neutral, color: COLORS.text },
      { name: t.negative, value: counts.negative, color: COLORS.danger },
    ]
  }, [messages, t])

  const stalledLeads = useMemo(() => {
    return leads
      .filter(l => {
        if (['ganho', 'perdido', 'venda'].includes(l.stage?.toLowerCase() || '')) return false
        const days = daysSince(parseDateSafe(l.created_at))
        return days > 5 && Number(l.total_em_vendas) > 0
      })
      .sort((a, b) => Number(b.total_em_vendas) - Number(a.total_em_vendas))
      .slice(0, 4)
  }, [leads])

  const hourlyData = useMemo<HourlyDataPoint[]>(() => {
    const hoursMap = new Array(24).fill(0)
    
    messages
      .filter(m => m.direction === 'inbound')
      .forEach(m => {
        const hour = parseDateSafe(m.created_at).getHours()
        if (!isNaN(hour)) hoursMap[hour]++
      })
    
    return hoursMap
      .map((count, hour) => ({ hour: `${hour}h`, responses: count }))
      .filter(h => h.responses > 0)
  }, [messages])

  const sourceData = useMemo<SourceDataPoint[]>(() => {
    const bySource: Record<string, { total: number; vendas: number }> = {}
    
    leads.forEach(l => {
      const source = l.source || 'Desconhecido'
      if (!bySource[source]) bySource[source] = { total: 0, vendas: 0 }
      bySource[source].total++
      if (Number(l.total_em_vendas) > 0) bySource[source].vendas++
    })

    return Object.entries(bySource)
      .map(([name, data]) => ({
        name,
        rate: data.total > 0 ? ((data.vendas / data.total) * 100).toFixed(1) : '0',
        volume: data.total
      }))
      .sort((a, b) => Number(b.rate) - Number(a.rate))
  }, [leads])

  const recentLeads = useMemo(() => {
    return [...leads].reverse().slice(0, 5)
  }, [leads])

  const sentimentPercentage = useMemo(() => {
    const total = sentimentData.reduce((sum, s) => sum + s.value, 0)
    return total > 0 ? ((sentimentData[0].value / total) * 100).toFixed(0) : '0'
  }, [sentimentData])

  // ─── SALVAR METAS ───
  const handleSaveGoals = async (newRevenue: number, newAds: number) => {
    if (!activeOrgId) return
    setSavingGoals(true)
    
    const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    try {
      const { error } = await supabase
        .from('goals')
        .upsert({ 
          org_id: activeOrgId, 
          month: currentMonth,
          revenue_target: newRevenue,
          ads_budget: newAds
        }, { onConflict: 'org_id,month' })

      if (error) throw error

      setGoals({ revenue: newRevenue, ads: newAds })
      setIsGoalsModalOpen(false)

    } catch (err) {
      console.error('Erro ao salvar metas:', err)
      alert(t.errorSavingGoals)
    } finally {
      setSavingGoals(false)
    }
  }

  // ─── EXPORTAR CSV ───
  const handleExport = useCallback(() => {
    if (leads.length === 0) return
    
    const headers = ['ID', t.tableLead, 'Empresa', t.tableDate, t.tableStatus, t.tableMeeting, t.tableValue, 'Responsável']
    const rows = leads.map(lead => [
      lead.id,
      `"${lead.name || ''}"`,
      `"${lead.nome_empresa || ''}"`,
      format(parseDateSafe(lead.created_at), 'dd/MM/yyyy HH:mm'),
      lead.stage || '',
      lead.agendou_reuniao ? t.yes : 'Não',
      Number(lead.total_em_vendas || 0).toFixed(2).replace('.', ','),
      lead.owner || 'N/A'
    ])
    
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `relatorio_leads_${format(new Date(), 'dd-MM-yyyy')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [leads, t])

  // ─── RENDERIZAÇÃO CONDICIONAL ───
  
  // Loading inicial de autenticação
  if (authLoading) {
    return <DashboardSkeleton message={t.loading} />
  }

  // Usuário sem organização (e não é staff)
  if (user && !activeOrgId) {
    return <NoOrganizationState />
  }

  // Loading dos dados
  if (loading) {
    return <DashboardSkeleton message={t.loading} />
  }

  // ─── RENDER PRINCIPAL ───
  return (
    <div className="space-y-6 sm:space-y-8 relative max-w-[1600px] mx-auto">
      
      {/* Modal de Metas */}
      <GoalsModal 
        isOpen={isGoalsModalOpen} 
        onClose={() => setIsGoalsModalOpen(false)} 
        currentGoals={goals}
        onSave={handleSaveGoals}
        loading={savingGoals}
        t={t}
        currencyCode={userCurrency}
      />

      {/* Erro */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{t.overview}</h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2 text-sm sm:text-base">
            <Activity size={16} className="text-emerald-500 shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-[400px]">
              {t.performance} <span className="text-white font-medium">{activeOrgName}</span>
            </span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          {/* Botão Metas */}
          <button 
            onClick={() => setIsGoalsModalOpen(true)}
            className="flex-1 lg:flex-none justify-center flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border border-white/10"
          >
            <Settings size={16} /> 
            <span className="hidden sm:inline">{t.goals}</span>
          </button>

          {/* Seletor de Range */}
          <div className="bg-[#111] border border-white/10 rounded-lg p-1 flex overflow-x-auto hide-scrollbar w-full sm:w-auto order-last sm:order-none mt-2 sm:mt-0">
            {RANGE_OPTIONS.map((d) => (
              <button 
                key={d}
                onClick={() => setRange(d)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  range === d ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Botão Refresh */}
          <button 
            onClick={loadData}
            disabled={loading}
            className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-white/10 disabled:opacity-50"
            title={t.refresh}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Botão Exportar */}
          <button 
            onClick={handleExport}
            disabled={leads.length === 0}
            className="flex-1 lg:flex-none justify-center flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> 
            <span className="hidden sm:inline">{t.export}</span>
          </button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        
        {/* KPI: Receita & Meta */}
        <Card 
          className="col-span-12 md:col-span-5 lg:col-span-4 p-5 sm:p-6 relative group"
          onClick={() => setIsGoalsModalOpen(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-4 relative">
            <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
              <DollarSign size={20} className="sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
              Meta: {formatPrice(goals.revenue, userCurrency, userLang)}
            </span>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm font-medium relative">{t.revenue} ({range}d)</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-1 sm:mt-2 tracking-tight relative">
            {formatPrice(kpis.totalFaturamento, userCurrency, userLang)}
          </h2>
          <div className="mt-4 w-full bg-gray-800 rounded-full overflow-hidden h-1.5 sm:h-2 relative">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
              style={{ width: `${Math.min(kpis.metaAtingida, 100)}%` }} 
            /> 
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-2 flex justify-between font-medium relative">
            <span>{t.goalProgress}</span>
            <span className="text-white">{kpis.metaAtingida.toFixed(1)}% {t.reached}</span>
          </p>
        </Card>

        {/* KPIs Rápidos */}
        <div className="col-span-12 md:col-span-7 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Leads */}
          <Card className="p-4 sm:p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.leadsTotal} label={t.leadsCaptured} trend={5.2} />
              <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400">
                <Users size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 sm:pt-4 border-t border-white/5 flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium">
              <span title="Baseado no investimento configurado">{t.costPerLead}</span>
              <span className="text-white font-bold">{formatPrice(kpis.custoPorLead, userCurrency, userLang)}</span>
            </div>
          </Card>

          {/* Agendamentos */}
          <Card className="p-4 sm:p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.reunioesAgendadas} label={t.scheduling} trend={-2.1} />
              <div className="p-2 bg-purple-900/20 rounded-lg text-purple-400 border border-purple-500/20">
                <Calendar size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 sm:pt-4 border-t border-white/5 flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium">
              <span>{t.attendanceRate}</span>
              <span className="text-white font-bold">
                {kpis.reunioesAgendadas > 0 
                  ? ((kpis.reunioesRealizadas / kpis.reunioesAgendadas) * 100).toFixed(0) 
                  : 0}%
              </span>
            </div>
          </Card>

          {/* Pipeline */}
          <Card className="p-4 sm:p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.leadsQualificados} label={t.activePipeline} trend={15} />
              <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-400 border border-emerald-500/20">
                <TrendingUp size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 sm:pt-4 border-t border-white/5 flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium">
              <span>{t.advancedStages}</span>
              <span className="text-white font-bold">{kpis.leadsQualificados} {t.opportunities}</span>
            </div>
          </Card>
        </div>

        {/* Gráfico de Área */}
        <Card className="col-span-12 lg:col-span-8 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-white">{t.flowTitle}</h3>
            <div className="flex gap-4 text-[10px] sm:text-xs font-medium bg-white/5 px-3 py-1.5 rounded-full">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                {t.sales} ({userCurrency})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Leads
              </div>
            </div>
          </div>
          
          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="valor" stroke={COLORS.blue} strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" name={t.sales} />
                <Area type="monotone" dataKey="leads" stroke={COLORS.success} strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" name="Leads" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sentiment & Funnel */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 sm:gap-6">
          {/* Sentiment */}
          <Card className="p-4 sm:p-6 flex-1">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              {t.sentimentTitle}
            </h3>
            <div className="h-[140px] sm:h-[160px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={sentimentData} 
                    innerRadius="70%" 
                    outerRadius="90%" 
                    paddingAngle={5} 
                    dataKey="value" 
                    stroke="none"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="block text-2xl sm:text-3xl font-black text-white">
                    {sentimentPercentage}%
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    {t.positive}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm items-center bg-white/5 p-2 rounded-lg">
                <span className="flex items-center gap-2 text-gray-300 font-medium">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                  {t.positive}
                </span>
                <span className="text-white font-mono font-bold">{sentimentData[0]?.value || 0}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm items-center bg-white/5 p-2 rounded-lg">
                <span className="flex items-center gap-2 text-gray-300 font-medium">
                  <div className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_5px_rgba(244,63,94,0.8)]" />
                  {t.negative}
                </span>
                <span className="text-white font-mono font-bold">{sentimentData[2]?.value || 0}</span>
              </div>
            </div>
          </Card>

          {/* Funnel */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              {t.funnelTitle}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium mb-1.5">
                  <span>{t.capture} ({kpis.leadsTotal})</span>
                  <span>100%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-500 rounded-full w-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium mb-1.5">
                  <span>{t.qualification} ({kpis.leadsQualificados})</span>
                  <span className="text-blue-400">
                    {kpis.leadsTotal > 0 ? ((kpis.leadsQualificados / kpis.leadsTotal) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                    style={{ width: `${kpis.leadsTotal > 0 ? (kpis.leadsQualificados / kpis.leadsTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium mb-1.5">
                  <span>{t.sales} ({Math.round(kpis.taxaConversao * kpis.leadsTotal / 100)})</span>
                  <span className="text-emerald-400 font-bold">{kpis.taxaConversao.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" 
                    style={{ width: `${kpis.taxaConversao}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bloco de Inteligência Tática */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Leads Estagnados */}
          <Card className="p-4 sm:p-6 border-l-4 border-l-amber-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Activity size={16} className="text-amber-500 animate-pulse" />
                  {t.attention}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{t.stalledLeads}</p>
              </div>
              <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded border border-amber-500/20">
                {stalledLeads.length} {t.alerts}
              </span>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {stalledLeads.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm">
                  {t.cleanState}
                </div>
              ) : (
                stalledLeads.map(lead => (
                  <div 
                    key={lead.id} 
                    onClick={() => router.push(`/dashboard/crm/${lead.id}`)} 
                    className="bg-white/5 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/10 hover:border-white/10 border border-transparent transition-all group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-gray-200 text-xs sm:text-sm truncate group-hover:text-amber-400 transition-colors">
                        {lead.name}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">
                        {lead.stage} • {format(parseDateSafe(lead.created_at), 'dd/MM')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-emerald-400 text-xs sm:text-sm font-bold">
                        {formatPrice(Number(lead.total_em_vendas), userCurrency, userLang)}
                      </p>
                      <span className="text-[9px] sm:text-[10px] text-rose-400 font-medium mt-0.5 inline-block">
                        {t.stalled}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Horários de Resposta */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar size={14} /> {t.responseTimes}
            </h3>
            <div className="h-[140px] sm:h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.6}/>
                      <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#555" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                  />
                  <Area type="step" dataKey="responses" stroke={COLORS.purple} fill="url(#colorHours)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] sm:text-[10px] text-gray-500 mt-2 text-center uppercase tracking-wide">
              {t.peakTimes}
            </p>
          </Card>

          {/* Taxa de Conversão por Fonte */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} /> {t.conversionRate}
            </h3>
            <div className="space-y-4 overflow-y-auto max-h-[160px] sm:max-h-[200px] pr-2 hide-scrollbar">
              {sourceData.length === 0 ? (
                <p className="text-gray-500 text-xs text-center mt-8 sm:mt-10">{t.insufficientData}</p>
              ) : (
                sourceData.map((source, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                      <span className="text-gray-300 font-medium truncate pr-2">{source.name}</span>
                      <span className={`font-bold shrink-0 ${Number(source.rate) > 10 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {source.rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          Number(source.rate) > 10 ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-blue-500'
                        }`} 
                        style={{ width: `${Math.min(Number(source.rate) * 3, 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-gray-600 mt-1.5 text-right">
                      {t.sourceBase}: {source.volume} leads
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Tabela de Leads Recentes */}
        <div className="col-span-12">
          <Card className="p-0 border border-white/5">
            <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-base sm:text-lg font-semibold text-white">{t.recentInteractions}</h3>
              <button 
                onClick={() => router.push('/dashboard/crm')} 
                className="text-[10px] sm:text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
              >
                {t.viewAll}
              </button>
            </div>
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
                <thead className="bg-black/40 text-gray-400 uppercase text-[9px] sm:text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{t.tableLead}</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{t.tableStatus}</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{t.tableDate}</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{t.tableMeeting}</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-right">{t.tableValue}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                        {t.noData}
                      </td>
                    </tr>
                  ) : (
                    recentLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        onClick={() => router.push(`/dashboard/crm/${lead.id}`)} 
                        className="hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <p className="font-bold text-gray-200 group-hover:text-blue-400 transition-colors">
                            {lead.name}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                            {lead.nome_empresa || t.companyNotInformed}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <span className={`px-2 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase border ${
                            lead.stage === 'venda' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : lead.stage === 'qualificado' 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                : 'bg-gray-800/50 text-gray-400 border-gray-700/50'
                          }`}>
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-400 font-medium">
                          {format(parseDateSafe(lead.created_at), "dd MMM, HH:mm", { locale: dateLocale })}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          {lead.agendou_reuniao ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <Calendar size={12}/> {t.yes}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono text-gray-300 font-bold group-hover:text-white transition-colors">
                          {Number(lead.total_em_vendas) > 0 
                            ? formatPrice(Number(lead.total_em_vendas), userCurrency, userLang) 
                            : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}