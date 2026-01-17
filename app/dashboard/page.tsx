'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/format'
import NoOrganizationState from '@/components/NoOrganizationState' // <--- 1. IMPORT NOVO
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts'
import { 
  TrendingUp, Users, Calendar, DollarSign, 
  Activity, ArrowUpRight, ArrowDownRight, Download, Settings, X 
} from 'lucide-react'
import { format, subDays, parseISO, startOfMonth } from 'date-fns'
import { ptBR, enUS, es } from 'date-fns/locale'

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

// Mapa de Locales para Datas
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
    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">{label}</p>
    <div className="flex items-end gap-2 mt-1">
      <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
      {trend !== undefined && (
        <span className={`text-xs flex items-center mb-1 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">{t.goalsModalTitle}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">{t.revenueGoal} ({currencyCode})</label>
            <input 
              type="number" 
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              placeholder="Ex: 50000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">{t.adsBudget} ({currencyCode})</label>
            <input 
              type="number" 
              value={ads}
              onChange={(e) => setAds(Number(e.target.value))}
              className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              placeholder="Ex: 1500"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors">{t.cancel}</button>
          <button 
            onClick={() => onSave(revenue, ads)}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50"
          >
            {loading ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- DASHBOARD PRINCIPAL ---

export default function DashboardPage() {
  const { org, user } = useAuth() // Pegamos o USER também
  const router = useRouter()
  
  // --- 2. VERIFICAÇÃO DE ORGANIZAÇÃO ---
  // Se o usuário existe, mas não tem org_id, mostramos a tela de bloqueio
  if (user && !user.org_id) {
    return <NoOrganizationState />
  }
  // --------------------------------------

  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)
  
  // Definições de Idioma e Moeda
  const userLang = (user?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]
  const dateLocale = DATE_LOCALES[userLang]
  const userCurrency = user?.currency || 'BRL'

  // Controle do Modal
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false)
  const [savingGoals, setSavingGoals] = useState(false)

  // Estados dos Dados
  const [goals, setGoals] = useState({ revenue: 0, ads: 0 })
  const [stalledLeads, setStalledLeads] = useState<any[]>([])
  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [sourceData, setSourceData] = useState<any[]>([])

  const [kpis, setKpis] = useState({
    totalFaturamento: 0,
    leadsTotal: 0,
    taxaConversao: 0,
    reunioesAgendadas: 0,
    reunioesRealizadas: 0,
    leadsQualificados: 0,
    disparos: 0,
    respostas: 0,
    metaAtingida: 0,
    custoPorLead: 0
  })

  const [chartData, setChartData] = useState<{ name: string; leads: number; vendas: number; valor: number }[]>([])
  const [sentimentData, setSentimentData] = useState<{ name: string; value: number; color: string }[]>([])
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [rawDataLeads, setRawDataLeads] = useState<any[]>([]) 

  const COLORS = {
    success: '#10B981', 
    danger: '#F43F5E',  
    text: '#9CA3AF'     
  }

  useEffect(() => {
    if (org?.id) {
      loadAdvancedData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, range])

  // --- SALVAR METAS ---
  const handleSaveGoals = async (newRevenue: number, newAds: number) => {
    if (!org) return
    setSavingGoals(true)
    const currentMonth = startOfMonth(new Date()).toISOString().split('T')[0]

    try {
      const { error } = await supabase
        .from('goals')
        .upsert({ 
          org_id: org.id, 
          month: currentMonth,
          revenue_target: newRevenue,
          ads_budget: newAds
        }, { onConflict: 'org_id, month' })

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

  async function loadAdvancedData() {
    if (!org) return
    setLoading(true)
    const startDate = subDays(new Date(), range).toISOString()

    try {
      const currentMonth = startOfMonth(new Date()).toISOString().split('T')[0]
      const { data: goalsData } = await supabase
        .from('goals')
        .select('revenue_target, ads_budget')
        .eq('org_id', org.id)
        .eq('month', currentMonth)
        .single()

      const revenueGoal = goalsData?.revenue_target || 0
      const adsBudget = goalsData?.ads_budget || 0
      setGoals({ revenue: revenueGoal, ads: adsBudget })

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, created_at, total_em_vendas, stage, agendou_reuniao, compareceu_reuniao, name, company:nome_empresa, owner, source')
        .eq('org_id', org.id)
        .gte('created_at', startDate)
        .order('created_at', { ascending: true })

      if (leadsError) throw leadsError

      const { data: messages, error: msgsError } = await supabase
        .from('messages')
        .select('direction, emotion, created_at')
        .eq('org_id', org.id)
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
          const day = format(parseISO(lead.created_at), 'dd/MM')
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
          const lastUpdate = new Date(l.created_at)
          const diffTime = Math.abs(today.getTime() - lastUpdate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays > 5 && Number(l.total_em_vendas) > 0 
        }).sort((a, b) => Number(b.total_em_vendas) - Number(a.total_em_vendas)).slice(0, 4)

        const hoursMap = new Array(24).fill(0)
        messages.filter(m => m.direction === 'inbound').forEach(m => {
          const hour = parseISO(m.created_at).getHours()
          hoursMap[hour]++
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
  }

  const handleExport = () => {
    if (!rawDataLeads || rawDataLeads.length === 0) return
    const headers = ['ID', t.tableLead, 'Empresa', t.tableDate, t.tableStatus, t.tableMeeting, t.tableValue, 'Responsável']
    const rows = rawDataLeads.map(lead => [
      lead.id, `"${lead.name || ''}"`, `"${lead.company || ''}"`, format(parseISO(lead.created_at), 'dd/MM/yyyy HH:mm'),
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

  // --- RENDER ---

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm animate-pulse">{t.loading}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 p-2 relative">
      
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

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">{t.overview}</h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <Activity size={16} className="text-emerald-500" />
            {t.performance} <span className="text-white font-medium">{org?.name}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsGoalsModalOpen(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10"
            title={t.goalsModalTitle}
          >
            <Settings size={16} /> {t.goals}
          </button>

          <div className="bg-[#111] border border-white/10 rounded-lg p-1 flex">
            {[7, 15, 30, 90].map((d) => (
              <button 
                key={d}
                onClick={() => setRange(d)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${range === d ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                {d}D
              </button>
            ))}
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95"
          >
            <Download size={16} /> {t.export}
          </button>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* KPI: RECEITA & META (DINÂMICO AGORA) */}
        <Card className="col-span-12 md:col-span-4 lg:col-span-3 p-6 relative group cursor-pointer" >
          <div onClick={() => setIsGoalsModalOpen(true)} className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
               Meta: {formatPrice(goals.revenue, userCurrency, userLang)}
            </span>
          </div>
          <p className="text-gray-400 text-sm font-medium">{t.revenue} ({range}d)</p>
          <h2 className="text-4xl font-bold text-white mt-2 tracking-tight">
            {formatPrice(kpis.totalFaturamento, userCurrency, userLang)}
          </h2>
          <div className="mt-4 w-full bg-gray-800 rounded-full overflow-hidden h-1.5">
             <div 
               className="h-full bg-blue-500 transition-all duration-1000" 
               style={{ width: `${Math.min(kpis.metaAtingida, 100)}%` }} 
             /> 
          </div>
          <p className="text-xs text-gray-500 mt-2 flex justify-between">
            <span>{t.goalProgress}</span>
            <span className="text-white">{kpis.metaAtingida.toFixed(1)}% {t.reached}</span>
          </p>
        </Card>

        {/* KPI: METRICAS RAPIDAS */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.leadsTotal} label={t.leadsCaptured} trend={5.2} />
              <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400"><Users size={18} /></div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-gray-400">
              <span title={`Baseado no investimento configurado`}>{t.costPerLead}</span>
              <span className="text-white">{formatPrice(kpis.custoPorLead, userCurrency, userLang)}</span>
            </div>
          </Card>

          <Card className="p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.reunioesAgendadas} label={t.scheduling} trend={-2.1} />
              <div className="p-2 bg-purple-900/20 rounded-lg text-purple-400 border border-purple-500/20"><Calendar size={18} /></div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-gray-400">
              <span>{t.attendanceRate}</span>
              <span className="text-white">{kpis.reunioesAgendadas > 0 ? ((kpis.reunioesRealizadas / kpis.reunioesAgendadas) * 100).toFixed(0) : 0}%</span>
            </div>
          </Card>

          <Card className="p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start">
              <StatBadge value={kpis.leadsQualificados} label={t.activePipeline} trend={15} />
              <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-400 border border-emerald-500/20"><TrendingUp size={18} /></div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-gray-400">
              <span>{t.advancedStages}</span>
              <span className="text-white">{kpis.leadsQualificados} {t.opportunities}</span>
            </div>
          </Card>
        </div>

        {/* CHART: AREA CHART */}
        <Card className="col-span-12 lg:col-span-8 p-6 min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">{t.flowTitle}</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> {t.sales} ({userCurrency})</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Leads</div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="valor" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorVendas)" name={t.sales} />
                <Area type="monotone" dataKey="leads" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" name="Leads" yAxisId={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* SENTIMENT & FUNNEL */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <Card className="p-6 flex-1">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">{t.sentimentTitle}</h3>
            <div className="h-[180px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sentimentData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderRadius: '8px', border: 'none', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-white">
                    {(sentimentData[0]?.value + sentimentData[1]?.value + sentimentData[2]?.value) > 0 
                      ? ((sentimentData[0].value / (sentimentData[0].value + sentimentData[1].value + sentimentData[2].value)) * 100).toFixed(0) 
                      : 0}%
                  </span>
                  <span className="text-xs text-gray-500">{t.positive}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm items-center">
                  <span className="flex items-center gap-2 text-gray-400"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> {t.positive}</span>
                  <span className="text-white font-mono">{sentimentData[0]?.value || 0}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                  <span className="flex items-center gap-2 text-gray-400"><div className="w-2 h-2 bg-rose-500 rounded-full"></div> {t.negative}</span>
                  <span className="text-white font-mono">{sentimentData[2]?.value || 0}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">{t.funnelTitle}</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{t.capture} ({kpis.leadsTotal})</span>
                  <span>100%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full"><div className="h-full bg-gray-500 rounded-full w-full"></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{t.qualification} ({kpis.leadsQualificados})</span>
                  <span>{kpis.leadsTotal > 0 ? ((kpis.leadsQualificados / kpis.leadsTotal)*100).toFixed(1) : 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${kpis.leadsTotal > 0 ? (kpis.leadsQualificados / kpis.leadsTotal)*100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{t.sales} ({Math.round(kpis.taxaConversao * kpis.leadsTotal / 100)})</span>
                  <span className="text-emerald-400">{kpis.taxaConversao.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full">
                  <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${kpis.taxaConversao}%` }}></div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* --- BLOCO DE INTELIGÊNCIA TÁTICA --- */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 border-l-4 border-l-amber-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-amber-500 animate-pulse" />
                  {t.attention}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{t.stalledLeads}</p>
              </div>
              <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded border border-amber-500/20">{stalledLeads.length} alertas</span>
            </div>
            <div className="space-y-3">
              {stalledLeads.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">{t.cleanState}</div>
              ) : (
                stalledLeads.map(lead => (
                  <div key={lead.id} onClick={() => router.push(`/dashboard/crm/${lead.id}`)} className="bg-white/5 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors group">
                    <div>
                      <p className="font-semibold text-gray-200 text-sm group-hover:text-amber-400 transition-colors">{lead.name}</p>
                      <p className="text-[10px] text-gray-500">{lead.stage} • {format(parseISO(lead.created_at), 'dd/MM')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-emerald-400 text-sm font-bold">
                        {formatPrice(Number(lead.total_em_vendas), userCurrency, userLang)}
                      </p>
                      <span className="text-[10px] text-rose-400 flex items-center justify-end gap-1">{t.stalled}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2"><Calendar size={14} /> {t.responseTimes}</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Area type="step" dataKey="responses" stroke="#8B5CF6" fill="url(#colorHours)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">{t.peakTimes}</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2"><TrendingUp size={14} /> {t.conversionRate}</h3>
            <div className="space-y-4 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
              {sourceData.map((source: any, idx) => (
                <div key={idx} className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 font-medium">{source.name}</span>
                    <span className={`font-bold ${Number(source.rate) > 10 ? 'text-emerald-400' : 'text-gray-500'}`}>{source.rate}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${Number(source.rate) > 10 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(source.rate * 3, 100)}%` }}></div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1 text-right">{t.sourceBase}: {source.volume} leads</p>
                </div>
              ))}
              {sourceData.length === 0 && <p className="text-gray-500 text-xs text-center mt-10">Dados insuficientes.</p>}
            </div>
          </Card>
        </div>

        {/* LISTA DE LEADS RECENTES */}
        <div className="col-span-12">
          <Card className="p-0">
             <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">{t.recentInteractions}</h3>
                <button onClick={() => router.push('/dashboard/crm')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">{t.viewAll}</button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                      <tr>
                          <th className="px-6 py-4 font-medium">{t.tableLead}</th>
                          <th className="px-6 py-4 font-medium">{t.tableStatus}</th>
                          <th className="px-6 py-4 font-medium">{t.tableDate}</th>
                          <th className="px-6 py-4 font-medium">{t.tableMeeting}</th>
                          <th className="px-6 py-4 font-medium text-right">{t.tableValue}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {recentLeads.map((lead) => (
                        <tr key={lead.id} onClick={() => router.push(`/dashboard/crm/${lead.id}`)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                           <td className="px-6 py-4">
                              <p className="font-medium text-white group-hover:text-blue-400 transition-colors">{lead.name}</p>
                              <p className="text-xs text-gray-500">{lead.company || 'Empresa não inf.'}</p>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${lead.stage === 'venda' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : lead.stage === 'qualificado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>{lead.stage}</span>
                           </td>
                           <td className="px-6 py-4 text-gray-400">
                             {/* Usamos o dateLocale para traduzir a data (Ex: 01 Jan) */}
                             {format(parseISO(lead.created_at), "dd MMM, HH:mm", { locale: dateLocale })}
                           </td>
                           <td className="px-6 py-4">{lead.agendou_reuniao ? <span className="flex items-center gap-1 text-emerald-400"><Calendar size={12}/> Sim</span> : <span className="text-gray-600">-</span>}</td>
                           <td className="px-6 py-4 text-right font-mono text-white">
                             {Number(lead.total_em_vendas) > 0 ? formatPrice(Number(lead.total_em_vendas), userCurrency, userLang) : '-'}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </Card>
        </div>

      </div>
    </div>
  )
}