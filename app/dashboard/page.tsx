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
  data_agendamento: string | null
  updated_at: string | null
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
  [key: string]: string | number
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
  success: '#22C55E',
  danger: '#EF4444',
  text: '#8888AA',
  blue: '#4F6FFF',
  purple: '#6E5FFF'
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

const isDateInRange = (dateStr: string | null, startDate: Date): boolean => {
  if (!dateStr) return false
  const date = parseDateSafe(dateStr)
  return date >= startDate
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
    leadsCaptured: 'Contatos Recebidos',
    costPerLead: 'Custo por Contato (Est.)',
    scheduling: 'Visitas Agendadas',
    attendanceRate: 'Taxa de Comparecimento',
    activePipeline: 'Pipeline Ativo',
    advancedStages: 'Fases Avançadas',
    opportunities: 'oportunidades',
    flowTitle: 'Desempenho de Negócios',
    sales: 'Fechamentos',
    sentimentTitle: 'Humor das Conversas',
    positive: 'Positivo',
    neutral: 'Neutro',
    negative: 'Negativo',
    funnelTitle: 'Eficiência do Pipeline',
    capture: 'Captura',
    qualification: 'Qualificação',
    attention: 'Atenção Necessária',
    stalledLeads: 'Contatos de alto valor parados (+5 dias)',
    cleanState: 'Tudo limpo! Nenhum contato parado.',
    stalled: 'Parado',
    responseTimes: 'Horários de Resposta',
    peakTimes: 'Picos de resposta dos contatos (Histórico)',
    conversionRate: 'Taxa de Fechamento',
    sourceBase: 'Base',
    sourceLabels: {
      whatsapp_inbound: 'WhatsApp (Recebido)',
      whatsapp_outbound: 'WhatsApp (Enviado)',
      site: 'Site',
      site_property: 'Site (Imóvel)',
      instagram: 'Instagram',
      facebook: 'Facebook',
      google: 'Google',
      manual: 'Cadastro Manual',
      indicacao: 'Indicação',
      referral: 'Indicação',
      agente_captacao: 'Agente de Captação',
      follow_up: 'Follow-up Automático',
      import: 'Importação',
      other: 'Outro',
      unknown: 'Desconhecido',
    } as Record<string, string>,
    recentInteractions: 'Últimas Interações',
    viewAll: 'Ver todos',
    tableLead: 'Contato',
    tableStatus: 'Status',
    tableDate: 'Entrada',
    tableMeeting: 'Visita',
    tableValue: 'Valor',
    export: 'Exportar',
    loading: 'Calculando métricas...',
    refresh: 'Atualizar',
    noData: 'Nenhum contato encontrado neste período.',
    alerts: 'alertas',
    yes: 'Sim',
    companyNotInformed: 'Sem empresa',
    insufficientData: 'Dados insuficientes.',
    errorLoadingData: 'Erro ao carregar dados. Tente novamente.',
    errorSavingGoals: 'Erro ao salvar metas. Tente novamente.',
    scheduledInPeriod: 'agendados no período',
    attendedInPeriod: 'compareceram'
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
    leadsCaptured: 'Contacts Received',
    costPerLead: 'Cost per Contact (Est.)',
    scheduling: 'Visits Scheduled',
    attendanceRate: 'Attendance Rate',
    activePipeline: 'Active Pipeline',
    advancedStages: 'Advanced Stages',
    opportunities: 'opportunities',
    flowTitle: 'Business Performance',
    sales: 'Closings',
    sentimentTitle: 'Conversation Sentiment',
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
    funnelTitle: 'Pipeline Efficiency',
    capture: 'Capture',
    qualification: 'Qualification',
    attention: 'Attention Required',
    stalledLeads: 'High-value contacts stalled (+5 days)',
    cleanState: 'All clear! No stalled contacts.',
    stalled: 'Stalled',
    responseTimes: 'Response Times',
    peakTimes: 'Contact response peaks (History)',
    conversionRate: 'Closing Rate',
    sourceBase: 'Base',
    sourceLabels: {
      whatsapp_inbound: 'WhatsApp (Incoming)',
      whatsapp_outbound: 'WhatsApp (Outgoing)',
      site: 'Website',
      site_property: 'Website (Property)',
      instagram: 'Instagram',
      facebook: 'Facebook',
      google: 'Google',
      manual: 'Manual Entry',
      indicacao: 'Referral',
      referral: 'Referral',
      agente_captacao: 'Capture Agent',
      follow_up: 'Auto Follow-up',
      import: 'Import',
      other: 'Other',
      unknown: 'Unknown',
    } as Record<string, string>,
    recentInteractions: 'Recent Interactions',
    viewAll: 'View all',
    tableLead: 'Contact',
    tableStatus: 'Status',
    tableDate: 'Date',
    tableMeeting: 'Visit',
    tableValue: 'Value',
    export: 'Export',
    loading: 'Calculating metrics...',
    refresh: 'Refresh',
    noData: 'No contacts found in this period.',
    alerts: 'alerts',
    yes: 'Yes',
    companyNotInformed: 'No company',
    insufficientData: 'Insufficient data.',
    errorLoadingData: 'Error loading data. Please try again.',
    errorSavingGoals: 'Error saving goals. Please try again.',
    scheduledInPeriod: 'scheduled in period',
    attendedInPeriod: 'attended'
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
    leadsCaptured: 'Contactos Recibidos',
    costPerLead: 'Costo por Contacto (Est.)',
    scheduling: 'Visitas Agendadas',
    attendanceRate: 'Tasa de Asistencia',
    activePipeline: 'Pipeline Activo',
    advancedStages: 'Fases Avanzadas',
    opportunities: 'oportunidades',
    flowTitle: 'Rendimiento de Negocios',
    sales: 'Cierres',
    sentimentTitle: 'Sentimiento de Conversación',
    positive: 'Positivo',
    neutral: 'Neutro',
    negative: 'Negativo',
    funnelTitle: 'Eficiencia del Pipeline',
    capture: 'Captura',
    qualification: 'Calificación',
    attention: 'Atención Necesaria',
    stalledLeads: 'Contactos de alto valor estancados (+5 días)',
    cleanState: '¡Todo limpio! Sin contactos estancados.',
    stalled: 'Estancado',
    responseTimes: 'Horarios de Respuesta',
    peakTimes: 'Picos de respuesta (Histórico)',
    conversionRate: 'Tasa de Cierre',
    sourceBase: 'Base',
    sourceLabels: {
      whatsapp_inbound: 'WhatsApp (Recibido)',
      whatsapp_outbound: 'WhatsApp (Enviado)',
      site: 'Sitio Web',
      site_property: 'Sitio Web (Propiedad)',
      instagram: 'Instagram',
      facebook: 'Facebook',
      google: 'Google',
      manual: 'Registro Manual',
      indicacao: 'Referencia',
      referral: 'Referencia',
      agente_captacao: 'Agente de Captación',
      follow_up: 'Seguimiento Automático',
      import: 'Importación',
      other: 'Otro',
      unknown: 'Desconocido',
    } as Record<string, string>,
    recentInteractions: 'Últimas Interacciones',
    viewAll: 'Ver todos',
    tableLead: 'Contacto',
    tableStatus: 'Estado',
    tableDate: 'Fecha',
    tableMeeting: 'Visita',
    tableValue: 'Valor',
    export: 'Exportar',
    loading: 'Calculando métricas...',
    refresh: 'Actualizar',
    noData: 'No se encontraron contactos en este período.',
    alerts: 'alertas',
    yes: 'Sí',
    companyNotInformed: 'Sin empresa',
    insufficientData: 'Datos insuficientes.',
    errorLoadingData: 'Error al cargar datos. Inténtalo de nuevo.',
    errorSavingGoals: 'Error al guardar metas. Inténtalo de nuevo.',
    scheduledInPeriod: 'agendados en el período',
    attendedInPeriod: 'asistieron'
  }
} as const

type Language = keyof typeof TRANSLATIONS

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
    className={`rounded-2xl overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
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
    <p className="text-[10px] sm:text-xs font-medium uppercase" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>{label}</p>
    <div className="flex items-end gap-2 mt-1">
      <span className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{value}</span>
      {trend !== undefined && (
        <span className="text-[10px] sm:text-xs flex items-center mb-1" style={{ color: trend >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg-overlay)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md p-6 rounded-2xl"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{t.goalsModalTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-tertiary)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.03em' }}>
              {t.revenueGoal} ({currencyCode})
            </label>
            <input type="number" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))}
              className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-150"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 111, 255, 0.1)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
              placeholder="Ex: 50000" min={0} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.03em' }}>
              {t.adsBudget} ({currencyCode})
            </label>
            <input type="number" value={ads} onChange={(e) => setAds(Number(e.target.value))}
              className="w-full rounded-xl p-3 text-sm outline-none transition-all duration-150"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 111, 255, 0.1)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
              placeholder="Ex: 1500" min={0} />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-medium rounded-xl transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}>
            {t.cancel}
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 16px rgba(79, 111, 255, 0.25)' }}>
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
  <div className="flex items-center justify-center py-32">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full" style={{ border: '4px solid var(--color-border)' }} />
        <div className="w-12 h-12 rounded-full animate-spin absolute inset-0" style={{ border: '4px solid var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
      <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-tertiary)' }}>{message}</p>
    </div>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter()
  
  const { user, loading: authLoading, activeOrgName } = useAuth()
  const activeOrgId = useActiveOrgId()
  
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
  const [leadsCreatedInPeriod, setLeadsCreatedInPeriod] = useState<Lead[]>([])
  const [allActiveLeads, setAllActiveLeads] = useState<Lead[]>([])
  const [messages, setMessages] = useState<Message[]>([])

  // Data de início do período
  const startDate = useMemo(() => subDays(new Date(), range), [range])

  // ─── CARREGAR DADOS ───
  const loadData = useCallback(async () => {
    if (!activeOrgId) return
    
    setLoading(true)
    setError(null)
    
    const startDateStr = startDate.toISOString()
    const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    try {
      // Fetch em paralelo
      const [goalsResult, leadsCreatedResult, allLeadsResult, messagesResult] = await Promise.all([
        // Metas do mês
        supabase
          .from('goals')
          .select('revenue_target, ads_budget')
          .eq('org_id', activeOrgId)
          .eq('month', currentMonth)
          .maybeSingle(),
        
        // Leads CRIADOS no período (para métricas de captação)
        supabase
          .from('leads')
          .select('id, created_at, total_em_vendas, stage, agendou_reuniao, compareceu_reuniao, name, nome_empresa, owner, source, data_agendamento, updated_at')
          .eq('org_id', activeOrgId)
          .gte('created_at', startDateStr)
          .order('created_at', { ascending: true }),
        
        // TODOS os leads ativos (para métricas de agendamento por data_agendamento)
        // Filtra por data_agendamento OU leads criados no período
        supabase
          .from('leads')
          .select('id, created_at, total_em_vendas, stage, agendou_reuniao, compareceu_reuniao, name, nome_empresa, owner, source, data_agendamento, updated_at')
          .eq('org_id', activeOrgId)
          .or(`created_at.gte.${startDateStr},data_agendamento.gte.${startDateStr}`)
          .order('created_at', { ascending: false }),
        
        // Mensagens do período
        supabase
          .from('messages')
          .select('direction, emotion, created_at')
          .eq('org_id', activeOrgId)
          .gte('created_at', startDateStr)
          .neq('emotion', null)
      ])

      if (leadsCreatedResult.error) throw leadsCreatedResult.error
      if (allLeadsResult.error) throw allLeadsResult.error
      if (messagesResult.error) throw messagesResult.error

      setGoals({
        revenue: goalsResult.data?.revenue_target || 0,
        ads: goalsResult.data?.ads_budget || 0
      })
      
      setLeadsCreatedInPeriod(leadsCreatedResult.data || [])
      setAllActiveLeads(allLeadsResult.data || [])
      setMessages(messagesResult.data || [])

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setError(t.errorLoadingData)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, startDate, t.errorLoadingData])

  useEffect(() => {
    if (activeOrgId) loadData()
  }, [activeOrgId, loadData])

  // ─── CÁLCULOS MEMOIZADOS ───
  
  // Leads com agendamento NO PERÍODO (baseado em data_agendamento)
  const leadsScheduledInPeriod = useMemo(() => {
    return allActiveLeads.filter(lead => 
      lead.agendou_reuniao && isDateInRange(lead.data_agendamento, startDate)
    )
  }, [allActiveLeads, startDate])

  // Leads que compareceram à reunião (agendada no período)
  const leadsAttendedInPeriod = useMemo(() => {
    return leadsScheduledInPeriod.filter(lead => lead.compareceu_reuniao)
  }, [leadsScheduledInPeriod])

  // Leads com venda no período (baseado em updated_at quando stage = ganho/venda)
  const leadsWithSalesInPeriod = useMemo(() => {
    return allActiveLeads.filter(lead => {
      const hasValue = Number(lead.total_em_vendas) > 0
      const isWonStage = ['ganho', 'venda', 'won', 'fechado'].includes(lead.stage?.toLowerCase() || '')
      // Considera venda no período se updated_at está no período E tem valor E stage de ganho
      const updatedInPeriod = isDateInRange(lead.updated_at, startDate)
      return hasValue && isWonStage && updatedInPeriod
    })
  }, [allActiveLeads, startDate])

  // KPIs calculados
  const kpis = useMemo<KPIs>(() => {
    // Faturamento: soma de vendas fechadas NO PERÍODO
    const totalVendas = leadsWithSalesInPeriod.reduce((acc, curr) => acc + (Number(curr.total_em_vendas) || 0), 0)
    
    // Leads captados no período
    const leadsTotal = leadsCreatedInPeriod.length
    
    // Taxa de conversão baseada em leads criados no período
    const leadsComVenda = leadsCreatedInPeriod.filter(l => Number(l.total_em_vendas) > 0).length
    
    // Leads qualificados (criados no período)
    const leadsQualificados = leadsCreatedInPeriod.filter(l => 
      ['qualificado', 'reuniao', 'fechamento', 'proposta'].includes(l.stage?.toLowerCase() || '')
    ).length

    // Agendamentos: usa data_agendamento no período
    const reunioesAgendadas = leadsScheduledInPeriod.length
    const reunioesRealizadas = leadsAttendedInPeriod.length

    return {
      totalFaturamento: totalVendas,
      leadsTotal,
      taxaConversao: leadsTotal > 0 ? (leadsComVenda / leadsTotal) * 100 : 0,
      reunioesAgendadas,
      reunioesRealizadas,
      leadsQualificados,
      disparos: messages.filter(m => m.direction === 'outbound').length,
      respostas: messages.filter(m => m.direction === 'inbound').length,
      metaAtingida: goals.revenue > 0 ? (totalVendas / goals.revenue) * 100 : 0,
      custoPorLead: leadsTotal > 0 ? goals.ads / leadsTotal : 0
    }
  }, [leadsCreatedInPeriod, leadsScheduledInPeriod, leadsAttendedInPeriod, leadsWithSalesInPeriod, messages, goals])

  // Gráfico de área (baseado em leads criados)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const dailyMap = new Map<string, ChartDataPoint>()
    
    leadsCreatedInPeriod.forEach(lead => {
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
  }, [leadsCreatedInPeriod])

  // Sentimento das mensagens
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

  // Leads estagnados
  const stalledLeads = useMemo(() => {
    return allActiveLeads
      .filter(l => {
        if (['ganho', 'perdido', 'venda'].includes(l.stage?.toLowerCase() || '')) return false
        const days = daysSince(parseDateSafe(l.created_at))
        return days > 5 && Number(l.total_em_vendas) > 0
      })
      .sort((a, b) => Number(b.total_em_vendas) - Number(a.total_em_vendas))
      .slice(0, 4)
  }, [allActiveLeads])

  // Horários de resposta
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

  // Taxa de conversão por fonte
  const sourceData = useMemo<SourceDataPoint[]>(() => {
    const bySource: Record<string, { total: number; vendas: number }> = {}
    
    leadsCreatedInPeriod.forEach(l => {
      const source = l.source || 'unknown'
      if (!bySource[source]) bySource[source] = { total: 0, vendas: 0 }
      bySource[source].total++
      if (Number(l.total_em_vendas) > 0) bySource[source].vendas++
    })

    return Object.entries(bySource)
      .map(([name, data]) => ({
        name: t.sourceLabels[name] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        rate: data.total > 0 ? ((data.vendas / data.total) * 100).toFixed(1) : '0',
        volume: data.total
      }))
      .sort((a, b) => Number(b.rate) - Number(a.rate))
  }, [leadsCreatedInPeriod, t.sourceLabels])

  // Leads recentes (para tabela)
  const recentLeads = useMemo(() => {
    return [...leadsCreatedInPeriod].reverse().slice(0, 5)
  }, [leadsCreatedInPeriod])

  // Porcentagem de sentimento positivo
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
    if (leadsCreatedInPeriod.length === 0) return
    
    const headers = ['ID', t.tableLead, 'Empresa', t.tableDate, t.tableStatus, t.tableMeeting, t.tableValue, 'Responsável']
    const rows = leadsCreatedInPeriod.map(lead => [
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
  }, [leadsCreatedInPeriod, t])

  // ─── RENDERIZAÇÃO CONDICIONAL ───
  
  if (authLoading) {
    return <DashboardSkeleton message={t.loading} />
  }

  if (user && !activeOrgId) {
    return <NoOrganizationState />
  }

  if (loading) {
    return <DashboardSkeleton message={t.loading} />
  }

  // ─── RENDER PRINCIPAL ───
  return (
    <div className="space-y-6 sm:space-y-8 relative max-w-[1600px] mx-auto pb-16">
      
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
        <div className="px-4 py-3 rounded-xl flex items-center justify-between"
          style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error-subtle-fg)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <span className="text-sm">{error}</span>
          <button onClick={loadData} className="transition-colors" style={{ color: 'var(--color-error)' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 pb-6"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>{t.overview}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
            <Activity size={16} style={{ color: 'var(--color-success)' }} className="shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-[400px]">
              {t.performance} <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{activeOrgName}</span>
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <button onClick={() => setIsGoalsModalOpen(true)}
            className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
            <Settings size={16} />
            <span className="hidden sm:inline">{t.goals}</span>
          </button>

          <div className="rounded-lg p-1 flex overflow-x-auto hide-scrollbar w-full sm:w-auto order-last sm:order-none mt-2 sm:mt-0"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            {RANGE_OPTIONS.map((d) => (
              <button key={d} onClick={() => setRange(d)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap"
                style={{
                  background: range === d ? 'var(--color-primary-subtle)' : 'transparent',
                  color: range === d ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                }}>
                {d}D
              </button>
            ))}
          </div>

          <button onClick={loadData} disabled={loading}
            className="p-2 sm:p-2.5 rounded-lg transition-all duration-150 disabled:opacity-50"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            title={t.refresh}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button onClick={handleExport} disabled={leadsCreatedInPeriod.length === 0}
            className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 4px 16px rgba(79, 111, 255, 0.2)' }}>
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
          <div className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to bottom right, rgba(79, 111, 255, 0.1), transparent, transparent)' }} />
          <div className="flex items-center justify-between mb-4 relative">
            <div className="p-2.5 sm:p-3 rounded-xl" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(79, 111, 255, 0.2)' }}>
              <DollarSign size={20} className="sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-mono px-2 py-1 rounded flex items-center gap-1" style={{ color: 'var(--color-success)', background: 'var(--color-success-subtle)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              Meta: {formatPrice(goals.revenue, userCurrency, userLang)}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium relative" style={{ color: 'var(--color-text-tertiary)' }}>{t.revenue} ({range}d)</p>
          <h2 className="text-3xl sm:text-4xl font-black mt-1 sm:mt-2 tracking-tight relative" style={{ color: 'var(--color-text-primary)' }}>
            {formatPrice(kpis.totalFaturamento, userCurrency, userLang)}
          </h2>
          <div className="mt-4 w-full rounded-full overflow-hidden h-1.5 sm:h-2 relative" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-full transition-all duration-1000"
              style={{ width: `${Math.min(kpis.metaAtingida, 100)}%`, background: 'var(--color-primary)', boxShadow: '0 0 10px rgba(79, 111, 255, 0.5)' }}
            />
          </div>
          <p className="text-[10px] sm:text-xs mt-2 flex justify-between font-medium relative" style={{ color: 'var(--color-text-muted)' }}>
            <span>{t.goalProgress}</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{kpis.metaAtingida.toFixed(1)}% {t.reached}</span>
          </p>
        </Card>

        {/* KPIs Rápidos */}
        <div className="col-span-12 md:col-span-7 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Leads */}
          <Card className="p-4 sm:p-6 flex flex-col justify-between transition-colors" style={{ borderColor: 'transparent' }} onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-hover)' }} onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}>
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.leadsTotal} label={t.leadsCaptured} trend={5.2} />
              <div className="p-2 rounded-lg" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', border: '1px solid rgba(240, 160, 48, 0.2)' }}>
                <Users size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 sm:pt-4 flex justify-between text-[10px] sm:text-xs font-medium" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
              <span title="Baseado no investimento configurado">{t.costPerLead}</span>
              <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatPrice(kpis.custoPorLead, userCurrency, userLang)}</span>
            </div>
          </Card>

          {/* Agendamentos */}
          <Card className="p-4 sm:p-6 flex flex-col justify-between transition-colors" style={{ borderColor: 'transparent' }} onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-hover)' }} onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}>
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.reunioesAgendadas} label={t.scheduling} />
              <div className="p-2 rounded-lg" style={{ background: 'var(--color-indigo-subtle)', color: 'var(--color-indigo)', border: '1px solid rgba(110, 95, 255, 0.2)' }}>
                <Calendar size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 sm:pt-4 flex justify-between text-[10px] sm:text-xs font-medium" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
              <span>{t.attendanceRate}</span>
              <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {kpis.reunioesAgendadas > 0
                  ? ((kpis.reunioesRealizadas / kpis.reunioesAgendadas) * 100).toFixed(0)
                  : 0}%
              </span>
            </div>
            <p className="text-[9px] mt-1 text-right" style={{ color: 'var(--color-text-muted)' }}>
              {kpis.reunioesRealizadas} {t.attendedInPeriod}
            </p>
          </Card>

          {/* Pipeline */}
          <Card className="p-4 sm:p-6 flex flex-col justify-between transition-colors" style={{ borderColor: 'transparent' }} onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-hover)' }} onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}>
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.leadsQualificados} label={t.activePipeline} trend={15} />
              <div className="p-2 rounded-lg" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <TrendingUp size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 sm:pt-4 flex justify-between text-[10px] sm:text-xs font-medium" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
              <span>{t.advancedStages}</span>
              <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{kpis.leadsQualificados} {t.opportunities}</span>
            </div>
          </Card>
        </div>

        {/* Gráfico de Área */}
        <Card className="col-span-12 lg:col-span-8 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.flowTitle}</h3>
            <div className="flex gap-4 text-[10px] sm:text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: 'var(--color-bg-hover)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)', boxShadow: '0 0 8px rgba(79, 111, 255, 0.8)' }} />
                {t.sales} ({userCurrency})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-success)', boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)' }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}
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
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
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
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="block text-2xl sm:text-3xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {sentimentPercentage}%
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    {t.positive}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm items-center p-2 rounded-lg" style={{ background: 'var(--color-bg-hover)' }}>
                <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-success)', boxShadow: '0 0 5px rgba(34, 197, 94, 0.8)' }} />
                  {t.positive}
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>{sentimentData[0]?.value || 0}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm items-center p-2 rounded-lg" style={{ background: 'var(--color-bg-hover)' }}>
                <span className="flex items-center gap-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-error)', boxShadow: '0 0 5px rgba(239, 68, 68, 0.8)' }} />
                  {t.negative}
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>{sentimentData[2]?.value || 0}</span>
              </div>
            </div>
          </Card>

          {/* Funnel */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
              {t.funnelTitle}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] sm:text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  <span>{t.capture} ({kpis.leadsTotal})</span>
                  <span>100%</span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full w-full" style={{ background: 'var(--color-text-muted)' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] sm:text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  <span>{t.qualification} ({kpis.leadsQualificados})</span>
                  <span style={{ color: 'var(--color-primary)' }}>
                    {kpis.leadsTotal > 0 ? ((kpis.leadsQualificados / kpis.leadsTotal) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${kpis.leadsTotal > 0 ? (kpis.leadsQualificados / kpis.leadsTotal) * 100 : 0}%`, background: 'var(--color-primary)', boxShadow: '0 0 8px rgba(79, 111, 255, 0.6)' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] sm:text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  <span>{t.sales} ({Math.round(kpis.taxaConversao * kpis.leadsTotal / 100)})</span>
                  <span className="font-bold" style={{ color: 'var(--color-success)' }}>{kpis.taxaConversao.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${kpis.taxaConversao}%`, background: 'var(--color-success)', boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)' }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bloco de Inteligência Tática */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Leads Estagnados */}
          <Card className="p-4 sm:p-6" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <Activity size={16} className="animate-pulse" style={{ color: 'var(--color-accent)' }} />
                  {t.attention}
                </h3>
                <p className="text-[10px] sm:text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.stalledLeads}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', border: '1px solid rgba(240, 160, 48, 0.2)' }}>
                {stalledLeads.length} {t.alerts}
              </span>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {stalledLeads.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t.cleanState}
                </div>
              ) : (
                stalledLeads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => router.push(`/dashboard/crm/${lead.id}`)}
                    className="p-3 rounded-xl flex justify-between items-center cursor-pointer transition-all group"
                    style={{ background: 'var(--color-bg-hover)', border: '1px solid transparent' }}
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-elevated)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)' }}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-hover)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-xs sm:text-sm truncate transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                        {lead.name}
                      </p>
                      <p className="text-[9px] sm:text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {lead.stage} • {format(parseDateSafe(lead.created_at), 'dd/MM')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs sm:text-sm font-bold" style={{ color: 'var(--color-success)' }}>
                        {formatPrice(Number(lead.total_em_vendas), userCurrency, userLang)}
                      </p>
                      <span className="text-[9px] sm:text-[10px] font-medium mt-0.5 inline-block" style={{ color: 'var(--color-error)' }}>
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
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
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
                  <XAxis dataKey="hour" stroke="var(--color-text-muted)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '12px' }}
                  />
                  <Area type="step" dataKey="responses" stroke={COLORS.purple} fill="url(#colorHours)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] sm:text-[10px] mt-2 text-center uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              {t.peakTimes}
            </p>
          </Card>

          {/* Taxa de Conversão por Fonte */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
              <TrendingUp size={14} /> {t.conversionRate}
            </h3>
            <div className="space-y-4 overflow-y-auto max-h-[160px] sm:max-h-[200px] pr-2 hide-scrollbar">
              {sourceData.length === 0 ? (
                <p className="text-xs text-center mt-8 sm:mt-10" style={{ color: 'var(--color-text-muted)' }}>{t.insufficientData}</p>
              ) : (
                sourceData.map((source, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                      <span className="font-medium truncate pr-2" style={{ color: 'var(--color-text-secondary)' }}>{source.name}</span>
                      <span className="font-bold shrink-0" style={{ color: Number(source.rate) > 10 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {source.rate}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(Number(source.rate) * 3, 100)}%`,
                          background: Number(source.rate) > 10 ? 'var(--color-success)' : 'var(--color-primary)',
                          boxShadow: Number(source.rate) > 10 ? '0 0 5px rgba(34, 197, 94, 0.8)' : 'none',
                        }}
                      />
                    </div>
                    <p className="text-[9px] sm:text-[10px] mt-1.5 text-right" style={{ color: 'var(--color-text-muted)' }}>
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
          <Card className="p-0" style={{ border: '1px solid var(--color-border)' }}>
            <div className="p-4 sm:p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-hover)' }}>
              <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.recentInteractions}</h3>
              <button
                onClick={() => router.push('/dashboard/crm')}
                className="text-[10px] sm:text-xs font-bold transition-colors uppercase tracking-wider"
                style={{ color: 'var(--color-primary)' }}
              >
                {t.viewAll}
              </button>
            </div>
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
                <thead className="uppercase text-[9px] sm:text-[10px] tracking-wider" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)' }}>
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{t.tableLead}</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{t.tableStatus}</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{t.tableDate}</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold">{t.tableMeeting}</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-right">{t.tableValue}</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: '1px solid var(--color-border)' }}>
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {t.noData}
                      </td>
                    </tr>
                  ) : (
                    recentLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => router.push(`/dashboard/crm/${lead.id}`)}
                        className="transition-colors group cursor-pointer"
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={(e: React.MouseEvent<HTMLTableRowElement>) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-bg-hover)' }}
                        onMouseLeave={(e: React.MouseEvent<HTMLTableRowElement>) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                      >
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <p className="font-bold transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                            {lead.name}
                          </p>
                          <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {lead.nome_empresa || t.companyNotInformed}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <span className="px-2 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase" style={
                            lead.stage === 'venda'
                              ? { background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid rgba(34, 197, 94, 0.2)' }
                              : lead.stage === 'qualificado'
                                ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(79, 111, 255, 0.2)' }
                                : { background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }
                          }>
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                          {format(parseDateSafe(lead.created_at), "dd MMM, HH:mm", { locale: dateLocale })}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          {lead.agendou_reuniao ? (
                            <span className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-success)' }}>
                              <Calendar size={12}/> {t.yes}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono font-bold transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
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