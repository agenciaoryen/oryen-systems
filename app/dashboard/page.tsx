// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
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
  ShieldCheck, Building2, Loader2
} from 'lucide-react'
import { format, subDays, parseISO, startOfMonth } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'

// --- CONSTANTES E FUNÇÕES DE SEGURANÇA FORA DO COMPONENTE ---
const COLORS = { success: '#10B981', danger: '#F43F5E', text: '#9CA3AF' }

// Previne a tela branca fatal do date-fns caso alguma data no banco venha corrompida, nula ou fora do padrão string
const parseDateSafe = (dateValue: any) => {
  try {
    if (!dateValue) return new Date()
    if (dateValue instanceof Date) return dateValue
    const d = parseISO(String(dateValue))
    return isNaN(d.getTime()) ? new Date() : d
  } catch (e) {
    return new Date()
  }
}

// --- DICIONÁRIO DE TRADUÇÃO (LOCAL) ---
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
    export: 'Exportar Excel',
    loading: 'Calculando métricas...'
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
    export: 'Export CSV',
    loading: 'Calculating metrics...'
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
    export: 'Exportar Excel',
    loading: 'Calculando métricas...'
  }
}

const DATE_LOCALES: Record<string, any> = {
  pt: ptBR,
  en: enUS,
  es: es
}

// --- COMPONENTES UI ---

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ${className}`}>
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

// --- MODAL DE METAS ---
const GoalsModal = ({ isOpen, onClose, currentGoals, onSave, loading, t, currencyCode }: any) => {
  const [revenue, setRevenue] = useState(currentGoals.revenue)
  const [ads, setAds] = useState(currentGoals.ads)

  useEffect(() => {
    setRevenue(currentGoals.revenue)
    setAds(currentGoals.ads)
  }, [currentGoals])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white">{t.goalsModalTitle}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">{t.revenueGoal} ({currencyCode})</label>
            <input 
              type="number" 
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
              placeholder="Ex: 50000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">{t.adsBudget} ({currencyCode})</label>
            <input 
              type="number" 
              value={ads}
              onChange={(e) => setAds(Number(e.target.value))}
              className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
              placeholder="Ex: 1500"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors">{t.cancel}</button>
          <button 
            onClick={() => onSave(revenue, ads)}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- DASHBOARD PRINCIPAL ---

export default function DashboardPage() {
  const { org, user } = useAuth()
  const router = useRouter()
  
  // ─── ESTADO STAFF E AUTENTICAÇÃO ───
  const [authLoading, setAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [orgsList, setOrgsList] = useState<{ id: string, name: string }[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false)
  const [savingGoals, setSavingGoals] = useState(false)

  const userLang = (user?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]
  const dateLocale = DATE_LOCALES[userLang]
  const userCurrency = user?.currency || 'BRL'

  // Estados dos Dados
  const [goals, setGoals] = useState({ revenue: 0, ads: 0 })
  const [stalledLeads, setStalledLeads] = useState<any[]>([])
  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [sourceData, setSourceData] = useState<any[]>([])
  const [kpis, setKpis] = useState({
    totalFaturamento: 0, leadsTotal: 0, taxaConversao: 0, reunioesAgendadas: 0,
    reunioesRealizadas: 0, leadsQualificados: 0, disparos: 0, respostas: 0,
    metaAtingida: 0, custoPorLead: 0
  })
  const [chartData, setChartData] = useState<{ name: string; leads: number; vendas: number; valor: number }[]>([])
  const [sentimentData, setSentimentData] = useState<{ name: string; value: number; color: string }[]>([])
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [rawDataLeads, setRawDataLeads] = useState<any[]>([]) 

  // ─── VERIFICAR STAFF ───
  useEffect(() => {
    async function checkStaff() {
      if (!user?.id) {
        setAuthLoading(false)
        return
      }

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('role, org_id')
          .eq('id', user.id)
          .maybeSingle() 

        if (profile) {
          setUserRole(profile.role)
          if (profile.role === 'staff') {
            const { data: orgsData } = await supabase.from('orgs').select('id, name').order('name')
            setOrgsList(orgsData || [])
          } else {
            setSelectedOrgId(org?.id || profile.org_id)
          }
        }
      } catch (err) {
        console.error('Erro ao verificar perfil:', err)
      } finally {
        setAuthLoading(false)
      }
    }
    checkStaff()
  }, [user, org])

  // ─── CARREGAR DADOS ───
  const loadAdvancedData = useCallback(async () => {
    if (!selectedOrgId) return
    setLoading(true)
    const startDate = subDays(new Date(), range).toISOString()

    try {
      const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      
      const { data: goalsData } = await supabase
        .from('goals')
        .select('revenue_target, ads_budget')
        .eq('org_id', selectedOrgId)
        .eq('month', currentMonth)
        .maybeSingle() 

      const revenueGoal = goalsData?.revenue_target || 0
      const adsBudget = goalsData?.ads_budget || 0
      setGoals({ revenue: revenueGoal, ads: adsBudget })

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, created_at, total_em_vendas, stage, agendou_reuniao, compareceu_reuniao, name, company:nome_empresa, owner, source')
        .eq('org_id', selectedOrgId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: true })

      if (leadsError) throw leadsError

      const { data: messages, error: msgsError } = await supabase
        .from('messages')
        .select('direction, emotion, created_at')
        .eq('org_id', selectedOrgId)
        .gte('created_at', startDate)
        .neq('emotion', null)

      if (msgsError) throw msgsError

      if (leads && messages) {
        setRawDataLeads(leads) 

        const totalVendas = leads.reduce((acc, curr) => acc + (Number(curr.total_em_vendas) || 0), 0)
        const leadsComVenda = leads.filter(l => Number(l.total_em_vendas) > 0).length
        const leadsQualificados = leads.filter(l => ['qualificado', 'reuniao', 'fechamento', 'proposta'].includes(l.stage?.toLowerCase())).length

        const metaAtingida = revenueGoal > 0 ? (totalVendas / revenueGoal) * 100 : 0
        const custoPorLead = leads.length > 0 ? (adsBudget / leads.length) : 0

        const dailyMap = new Map()
        leads.forEach(lead => {
          const day = format(parseDateSafe(lead.created_at), 'dd/MM')
          if (!dailyMap.has(day)) dailyMap.set(day, { name: day, leads: 0, vendas: 0, valor: 0 })
          const current = dailyMap.get(day)
          current.leads += 1
          if (Number(lead.total_em_vendas) > 0) {
            current.vendas += 1
            current.valor += Number(lead.total_em_vendas)
          }
        })
        const chart = Array.from(dailyMap.values())

        const positiveCount = messages.filter(m => ['positiva', 'positivo', 'positive'].includes(m.emotion?.toLowerCase())).length
        const neutralCount = messages.filter(m => ['neutra', 'neutro', 'neutral'].includes(m.emotion?.toLowerCase())).length
        const negativeCount = messages.filter(m => ['negativa', 'negativo', 'negative'].includes(m.emotion?.toLowerCase())).length
        
        const sentimentChart = [
          { name: t.positive, value: positiveCount, color: COLORS.success },
          { name: t.neutral, value: neutralCount, color: COLORS.text },
          { name: t.negative, value: negativeCount, color: COLORS.danger },
        ]

        const today = new Date()
        const leadsEstagnadosCalc = leads.filter(l => {
          if (['ganho', 'perdido', 'venda'].includes(l.stage?.toLowerCase())) return false
          const lastUpdate = parseDateSafe(l.created_at)
          const diffTime = Math.abs(today.getTime() - lastUpdate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays > 5 && Number(l.total_em_vendas) > 0 
        }).sort((a, b) => Number(b.total_em_vendas) - Number(a.total_em_vendas)).slice(0, 4)

        const hoursMap = new Array(24).fill(0)
        messages.filter(m => m.direction === 'inbound').forEach(m => {
          const hour = parseDateSafe(m.created_at).getHours()
          if (!isNaN(hour)) hoursMap[hour]++
        })
        const bestHoursDataCalc = hoursMap.map((count, hour) => ({ hour: `${hour}h`, responses: count })).filter(h => h.responses > 0)

        const conversionBySource: Record<string, { name: string, total: number, vendas: number }> = {}
        leads.forEach(l => {
          const source = l.source || 'Desconhecido'
          if (!conversionBySource[source]) conversionBySource[source] = { name: source, total: 0, vendas: 0 }
          conversionBySource[source].total += 1
          if (Number(l.total_em_vendas) > 0) conversionBySource[source].vendas += 1
        })
        const sourceChartDataCalc = Object.values(conversionBySource).map((s) => ({
          name: s.name,
          rate: s.total > 0 ? ((s.vendas / s.total) * 100).toFixed(1) : 0,
          volume: s.total
        })).sort((a: any, b: any) => b.rate - a.rate)

        setKpis({
          totalFaturamento: totalVendas,
          leadsTotal: leads.length,
          taxaConversao: leads.length > 0 ? (leadsComVenda / leads.length) * 100 : 0,
          reunioesAgendadas: leads.filter(l => l.agendou_reuniao).length,
          reunioesRealizadas: leads.filter(l => l.compareceu_reuniao).length,
          leadsQualificados,
          disparos: messages.filter(m => m.direction === 'outbound').length,
          respostas: messages.filter(m => m.direction === 'inbound').length,
          metaAtingida,
          custoPorLead
        })

        setChartData(chart)
        setSentimentData(sentimentChart)
        setRecentLeads([...leads].reverse().slice(0, 5))
        setStalledLeads(leadsEstagnadosCalc)
        setHourlyData(bestHoursDataCalc)
        setSourceData(sourceChartDataCalc)
      }

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedOrgId, range, t, userCurrency, userLang]) 

  useEffect(() => {
    if (selectedOrgId) loadAdvancedData()
  }, [selectedOrgId, loadAdvancedData])

  // --- SALVAR METAS ---
  const handleSaveGoals = async (newRevenue: number, newAds: number) => {
    if (!selectedOrgId) return
    setSavingGoals(true)
    
    const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    try {
      const { error } = await supabase
        .from('goals')
        .upsert({ 
          org_id: selectedOrgId, 
          month: currentMonth,
          revenue_target: newRevenue,
          ads_budget: newAds
        }, { onConflict: 'org_id,month' }) 

      if (error) throw error

      setGoals({ revenue: newRevenue, ads: newAds })
      setIsGoalsModalOpen(false)
      loadAdvancedData()

    } catch (err) {
      console.error('Erro ao salvar metas:', err)
      alert('Erro ao salvar metas. Tente novamente.')
    } finally {
      setSavingGoals(false)
    }
  }

  const handleExport = () => {
    if (!rawDataLeads || rawDataLeads.length === 0) return
    const headers = ['ID', t.tableLead, 'Empresa', t.tableDate, t.tableStatus, t.tableMeeting, t.tableValue, 'Responsável']
    const rows = rawDataLeads.map(lead => [
      lead.id, `"${lead.name || ''}"`, `"${lead.company || ''}"`, format(parseDateSafe(lead.created_at), 'dd/MM/yyyy HH:mm'),
      lead.stage, lead.agendou_reuniao ? 'Sim' : 'Não', Number(lead.total_em_vendas || 0).toFixed(2).replace('.', ','), lead.owner || 'N/A'
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
  }

  // ─── TELAS DE CARREGAMENTO E BLOQUEIO ───
  if (authLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  )

  if (userRole === 'staff' && !selectedOrgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-black z-0 pointer-events-none" />
        <div className="bg-[#111] border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Painel Staff</h2>
          <p className="text-gray-400 text-sm mb-8">
            Selecione uma organização abaixo para carregar os dados financeiros e leads correspondentes.
          </p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {orgsList.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrgId(o.id)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left group"
              >
                <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{o.name}</span>
                <Building2 className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
              </button>
            ))}
            {orgsList.length === 0 && (
              <p className="text-sm text-gray-500 py-4">Nenhuma organização encontrada no banco de dados.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (user && !selectedOrgId && userRole !== 'staff') {
    return <NoOrganizationState />
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm animate-pulse">{t.loading}</p>
      </div>
    </div>
  )

  const activeOrgName = orgsList.find(o => o.id === selectedOrgId)?.name || org?.name || 'Organização'

  return (
    <div className="min-h-screen bg-black pb-20">
      
      {/* BARRA SUPERIOR STAFF */}
      {userRole === 'staff' && (
        <div className="bg-indigo-950/50 border-b border-indigo-500/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-40 relative backdrop-blur-md">
          <div className="flex items-center gap-2 font-medium text-indigo-300">
            <ShieldCheck className="w-4 h-4" />
            <span className="uppercase tracking-widest font-bold">Modo Staff Ativo</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-indigo-400 hidden sm:inline">Visualizando Cliente:</span>
            <select
              value={selectedOrgId || ''}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-black border border-indigo-500/30 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:w-auto p-2 font-bold shadow-sm outline-none transition-colors hover:border-indigo-400"
            >
              {orgsList.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 lg:p-8 relative max-w-[1600px] mx-auto">
        
        {/* MODAL DE METAS */}
        <GoalsModal 
          isOpen={isGoalsModalOpen} 
          onClose={() => setIsGoalsModalOpen(false)} 
          currentGoals={goals}
          onSave={handleSaveGoals}
          loading={savingGoals}
          t={t}
          currencyCode={userCurrency}
        />

        {/* HEADER RESPONSIVO */}
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
            <button 
              onClick={() => setIsGoalsModalOpen(true)}
              className="flex-1 lg:flex-none justify-center flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border border-white/10"
            >
              <Settings size={16} /> <span className="hidden sm:inline">{t.goals}</span>
            </button>

            <div className="bg-[#111] border border-white/10 rounded-lg p-1 flex overflow-x-auto hide-scrollbar w-full sm:w-auto order-last sm:order-none mt-2 sm:mt-0">
              {[7, 15, 30, 90].map((d) => (
                <button 
                  key={d}
                  onClick={() => setRange(d)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${range === d ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  {d}D
                </button>
              ))}
            </div>

            <button 
              onClick={handleExport}
              className="flex-1 lg:flex-none justify-center flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95"
            >
              <Download size={16} /> <span className="hidden sm:inline">{t.export}</span>
            </button>
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-12 gap-4 sm:gap-6">
          
          {/* KPI: RECEITA & META */}
          <Card className="col-span-12 md:col-span-5 lg:col-span-4 p-5 sm:p-6 relative group cursor-pointer" >
            <div onClick={() => setIsGoalsModalOpen(true)} className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                <DollarSign size={20} className="sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                 Meta: {formatPrice(goals.revenue, userCurrency, userLang)}
              </span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm font-medium">{t.revenue} ({range}d)</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-1 sm:mt-2 tracking-tight">
              {formatPrice(kpis.totalFaturamento, userCurrency, userLang)}
            </h2>
            <div className="mt-4 w-full bg-gray-800 rounded-full overflow-hidden h-1.5 sm:h-2">
               <div 
                 className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                 style={{ width: `${Math.min(kpis.metaAtingida, 100)}%` }} 
               /> 
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 flex justify-between font-medium">
              <span>{t.goalProgress}</span>
              <span className="text-white">{kpis.metaAtingida.toFixed(1)}% {t.reached}</span>
            </p>
          </Card>

          {/* KPI: METRICAS RAPIDAS */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <StatBadge value={kpis.leadsTotal} label={t.leadsCaptured} trend={5.2} />
                <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400"><Users size={16} className="sm:w-5 sm:h-5" /></div>
              </div>
              <div className="mt-4 pt-3 sm:pt-4 border-t border-white/5 flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium">
                <span title={`Baseado no investimento configurado`}>{t.costPerLead}</span>
                <span className="text-white font-bold">{formatPrice(kpis.custoPorLead, userCurrency, userLang)}</span>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <StatBadge value={kpis.reunioesAgendadas} label={t.scheduling} trend={-2.1} />
                <div className="p-2 bg-purple-900/20 rounded-lg text-purple-400 border border-purple-500/20"><Calendar size={16} className="sm:w-5 sm:h-5" /></div>
              </div>
              <div className="mt-4 pt-3 sm:pt-4 border-t border-white/5 flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium">
                <span>{t.attendanceRate}</span>
                <span className="text-white font-bold">{kpis.reunioesAgendadas > 0 ? ((kpis.reunioesRealizadas / kpis.reunioesAgendadas) * 100).toFixed(0) : 0}%</span>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <StatBadge value={kpis.leadsQualificados} label={t.activePipeline} trend={15} />
                <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-400 border border-emerald-500/20"><TrendingUp size={16} className="sm:w-5 sm:h-5" /></div>
              </div>
              <div className="mt-4 pt-3 sm:pt-4 border-t border-white/5 flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium">
                <span>{t.advancedStages}</span>
                <span className="text-white font-bold">{kpis.leadsQualificados} {t.opportunities}</span>
              </div>
            </Card>
          </div>

          {/* CHART: AREA CHART */}
          <Card className="col-span-12 lg:col-span-8 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-white">{t.flowTitle}</h3>
              <div className="flex gap-4 text-[10px] sm:text-xs font-medium bg-white/5 px-3 py-1.5 rounded-full">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div> {t.sales} ({userCurrency})</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> Leads</div>
              </div>
            </div>
            
            <div className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" name={t.sales} />
                  <Area type="monotone" dataKey="leads" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" name="Leads" yAxisId={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* SENTIMENT & FUNNEL */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6 flex-1">
              <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t.sentimentTitle}</h3>
              <div className="h-[140px] sm:h-[160px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sentimentData} innerRadius="70%" outerRadius="90%" paddingAngle={5} dataKey="value" stroke="none">
                      {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-2xl sm:text-3xl font-black text-white">
                      {(sentimentData[0]?.value + sentimentData[1]?.value + sentimentData[2]?.value) > 0 
                        ? ((sentimentData[0].value / (sentimentData[0].value + sentimentData[1].value + sentimentData[2].value)) * 100).toFixed(0) 
                        : 0}%
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t.positive}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm items-center bg-white/5 p-2 rounded-lg">
                    <span className="flex items-center gap-2 text-gray-300 font-medium"><div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div> {t.positive}</span>
                    <span className="text-white font-mono font-bold">{sentimentData[0]?.value || 0}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm items-center bg-white/5 p-2 rounded-lg">
                    <span className="flex items-center gap-2 text-gray-300 font-medium"><div className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_5px_rgba(244,63,94,0.8)]"></div> {t.negative}</span>
                    <span className="text-white font-mono font-bold">{sentimentData[2]?.value || 0}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t.funnelTitle}</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium mb-1.5">
                    <span>{t.capture} ({kpis.leadsTotal})</span>
                    <span>100%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gray-500 rounded-full w-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium mb-1.5">
                    <span>{t.qualification} ({kpis.leadsQualificados})</span>
                    <span className="text-blue-400">{kpis.leadsTotal > 0 ? ((kpis.leadsQualificados / kpis.leadsTotal)*100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" style={{ width: `${kpis.leadsTotal > 0 ? (kpis.leadsQualificados / kpis.leadsTotal)*100 : 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-medium mb-1.5">
                    <span>{t.sales} ({Math.round(kpis.taxaConversao * kpis.leadsTotal / 100)})</span>
                    <span className="text-emerald-400 font-bold">{kpis.taxaConversao.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" style={{ width: `${kpis.taxaConversao}%` }}></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* --- BLOCO DE INTELIGÊNCIA TÁTICA --- */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6 border-l-4 border-l-amber-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Activity size={16} className="text-amber-500 animate-pulse" />
                    {t.attention}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{t.stalledLeads}</p>
                </div>
                <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded border border-amber-500/20">{stalledLeads.length} alertas</span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {stalledLeads.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm">{t.cleanState}</div>
                ) : (
                  stalledLeads.map(lead => (
                    <div key={lead.id} onClick={() => router.push(`/dashboard/crm/${lead.id}`)} className="bg-white/5 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/10 hover:border-white/10 border border-transparent transition-all group">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-gray-200 text-xs sm:text-sm truncate group-hover:text-amber-400 transition-colors">{lead.name}</p>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">{lead.stage} • {format(parseDateSafe(lead.created_at), 'dd/MM')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-emerald-400 text-xs sm:text-sm font-bold">
                          {formatPrice(Number(lead.total_em_vendas), userCurrency, userLang)}
                        </p>
                        <span className="text-[9px] sm:text-[10px] text-rose-400 font-medium mt-0.5 inline-block">{t.stalled}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} /> {t.responseTimes}</h3>
              <div className="h-[140px] sm:h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" stroke="#555" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Area type="step" dataKey="responses" stroke="#8B5CF6" fill="url(#colorHours)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[9px] sm:text-[10px] text-gray-500 mt-2 text-center uppercase tracking-wide">{t.peakTimes}</p>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14} /> {t.conversionRate}</h3>
              <div className="space-y-4 overflow-y-auto max-h-[160px] sm:max-h-[200px] pr-2 hide-scrollbar">
                {sourceData.map((source: any, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                      <span className="text-gray-300 font-medium truncate pr-2">{source.name}</span>
                      <span className={`font-bold shrink-0 ${Number(source.rate) > 10 ? 'text-emerald-400' : 'text-gray-500'}`}>{source.rate}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${Number(source.rate) > 10 ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-blue-500'}`} style={{ width: `${Math.min(source.rate * 3, 100)}%` }}></div>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-gray-600 mt-1.5 text-right">{t.sourceBase}: {source.volume} leads</p>
                  </div>
                ))}
                {sourceData.length === 0 && <p className="text-gray-500 text-xs text-center mt-8 sm:mt-10">Dados insuficientes.</p>}
              </div>
            </Card>
          </div>

          {/* LISTA DE LEADS RECENTES */}
          <div className="col-span-12">
            <Card className="p-0 border border-white/5">
               <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <h3 className="text-base sm:text-lg font-semibold text-white">{t.recentInteractions}</h3>
                  <button onClick={() => router.push('/dashboard/crm')} className="text-[10px] sm:text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider">{t.viewAll}</button>
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
                        {recentLeads.map((lead) => (
                          <tr key={lead.id} onClick={() => router.push(`/dashboard/crm/${lead.id}`)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                             <td className="px-4 sm:px-6 py-3 sm:py-4">
                                <p className="font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{lead.name}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{lead.company || 'Empresa não inf.'}</p>
                             </td>
                             <td className="px-4 sm:px-6 py-3 sm:py-4">
                                <span className={`px-2 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase border ${lead.stage === 'venda' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : lead.stage === 'qualificado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-gray-800/50 text-gray-400 border-gray-700/50'}`}>{lead.stage}</span>
                             </td>
                             <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-400 font-medium">
                               {format(parseDateSafe(lead.created_at), "dd MMM, HH:mm", { locale: dateLocale })}
                             </td>
                             <td className="px-4 sm:px-6 py-3 sm:py-4">
                               {lead.agendou_reuniao ? <span className="flex items-center gap-1.5 text-emerald-400 font-medium"><Calendar size={12}/> Sim</span> : <span className="text-gray-600">-</span>}
                             </td>
                             <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono text-gray-300 font-bold group-hover:text-white transition-colors">
                               {Number(lead.total_em_vendas) > 0 ? formatPrice(Number(lead.total_em_vendas), userCurrency, userLang) : '-'}
                             </td>
                          </tr>
                        ))}
                        {recentLeads.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">Nenhum lead encontrado neste período.</td>
                          </tr>
                        )}
                     </tbody>
                  </table>
               </div>
          </Card>
         </div>
      </div>
      </div>
    </div>
  )
}