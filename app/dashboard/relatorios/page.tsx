// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { usePlan } from '@/lib/usePlan'
import { FeatureLock, UpgradeBanner } from '@/app/dashboard/components/FeatureLock'
import {
  Plus, FileText, Settings, Trash2, X, Save,
  Clock, Calendar, MessageCircle, BarChart3, Loader2, Info,
  CheckCircle2, XCircle, Send, DollarSign, Globe, Target, RefreshCw, Zap
} from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Relatórios Automatizados',
    subtitle: 'Configure o envio de métricas via WhatsApp',
    newReport: 'Novo Relatório',
    editReport: 'Editar Relatório',
    noReports: 'Nenhum relatório configurado.',
    createFirst: 'Crie seu primeiro relatório automatizado',
    save: 'Salvar Relatório',
    saving: 'Salvando...',
    cancel: 'Cancelar',
    deleteConfirm: 'Tem certeza que deseja excluir este relatório?',
    active: 'Ativo',
    inactive: 'Inativo',
    nextSend: 'Próximo envio',
    metricsSelected: 'métricas selecionadas',
    // Form fields
    nameLabel: 'Nome do Relatório',
    namePlaceholder: 'Ex: Fechamento Diário Diretoria',
    whatsappLabel: 'WhatsApp Destinatário',
    whatsappPlaceholder: 'Ex: 5511999999999',
    whatsappHint: 'Apenas números, inclua código do país (55) e DDD',
    frequencyLabel: 'Frequência',
    timeLabel: 'Horário de Envio',
    dayLabel: 'Dia de Envio',
    dayOfMonth: 'Dia do Mês',
    // Frequencies
    freqDaily: 'Diário',
    freqWeekly: 'Semanal',
    freqMonthly: 'Mensal',
    // Days of week
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
    // Metrics
    metricsTitle: 'Métricas Operacionais',
    metricsDesc: 'Selecione os dados de esforço e tração',
    pipelineTitle: 'Métricas do Pipeline',
    pipelineDesc: 'Selecione as etapas que deseja rastrear',
    m_leads_captados: 'Contatos Recebidos',
    m_canais_origem: 'Canais de Origem',
    m_mensagens_enviadas: 'Disparos de Mensagens',
    m_ligacoes_feitas: 'Ligações Realizadas',
    m_leads_responderam: 'Contatos que Responderam',
    // Financial
    financialTitle: 'Métricas Financeiras',
    financialDesc: 'Receitas, despesas e indicadores de negócio',
    m_receita: 'Receita Total',
    m_despesas: 'Despesas Totais',
    m_lucro: 'Lucro Líquido',
    m_comissoes: 'Comissões Pendentes',
    m_negocios: 'Negócios Fechados',
    m_ticket_medio: 'Ticket Médio',
    // Site
    siteTitle: 'Métricas do Site',
    siteDesc: 'Tráfego e conversão do site público',
    m_views: 'Visualizações',
    m_site_leads: 'Leads do Site',
    m_conversion: 'Taxa de Conversão',
    // Goals
    goalsTitle: 'Meta Principal',
    goalsDesc: 'Progresso da meta ativa',
    m_meta_principal: 'Incluir Meta Principal',
    // Follow-up
    followupTitle: 'Follow-up',
    followupDesc: 'Status do reengajamento automático',
    m_followup_status: 'Status de Follow-up',
    // Send now
    sendNow: 'Enviar Agora',
    sending: 'Enviando...',
    sentSuccess: 'Relatório enviado!',
    sentError: 'Erro ao enviar',
    // Next send
    today: 'Hoje',
    tomorrow: 'Amanhã'
  },
  en: {
    title: 'Automated Reports',
    subtitle: 'Configure metrics delivery via WhatsApp',
    newReport: 'New Report',
    editReport: 'Edit Report',
    noReports: 'No reports configured.',
    createFirst: 'Create your first automated report',
    save: 'Save Report',
    saving: 'Saving...',
    cancel: 'Cancel',
    deleteConfirm: 'Are you sure you want to delete this report?',
    active: 'Active',
    inactive: 'Inactive',
    nextSend: 'Next send',
    metricsSelected: 'metrics selected',
    nameLabel: 'Report Name',
    namePlaceholder: 'Ex: Daily Board Summary',
    whatsappLabel: 'Recipient WhatsApp',
    whatsappPlaceholder: 'Ex: 1234567890',
    whatsappHint: 'Numbers only, with country code',
    frequencyLabel: 'Frequency',
    timeLabel: 'Send Time',
    dayLabel: 'Send Day',
    dayOfMonth: 'Day of Month',
    freqDaily: 'Daily',
    freqWeekly: 'Weekly',
    freqMonthly: 'Monthly',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    metricsTitle: 'Operational Metrics',
    metricsDesc: 'Select effort and traction data',
    pipelineTitle: 'Pipeline Metrics',
    pipelineDesc: 'Select the stages you want to track',
    m_leads_captados: 'Contacts Received',
    m_canais_origem: 'Source Channels',
    m_mensagens_enviadas: 'Messages Sent',
    m_ligacoes_feitas: 'Calls Made',
    m_leads_responderam: 'Contacts Responded',
    financialTitle: 'Financial Metrics',
    financialDesc: 'Revenue, expenses and business indicators',
    m_receita: 'Total Revenue',
    m_despesas: 'Total Expenses',
    m_lucro: 'Net Profit',
    m_comissoes: 'Pending Commissions',
    m_negocios: 'Deals Closed',
    m_ticket_medio: 'Average Ticket',
    siteTitle: 'Site Metrics',
    siteDesc: 'Public site traffic and conversion',
    m_views: 'Page Views',
    m_site_leads: 'Site Leads',
    m_conversion: 'Conversion Rate',
    goalsTitle: 'Main Goal',
    goalsDesc: 'Active goal progress',
    m_meta_principal: 'Include Main Goal',
    followupTitle: 'Follow-up',
    followupDesc: 'Automatic re-engagement status',
    m_followup_status: 'Follow-up Status',
    sendNow: 'Send Now',
    sending: 'Sending...',
    sentSuccess: 'Report sent!',
    sentError: 'Failed to send',
    today: 'Today',
    tomorrow: 'Tomorrow'
  },
  es: {
    title: 'Reportes Automatizados',
    subtitle: 'Configura el envío de métricas por WhatsApp',
    newReport: 'Nuevo Reporte',
    editReport: 'Editar Reporte',
    noReports: 'No hay reportes configurados.',
    createFirst: 'Crea tu primer reporte automatizado',
    save: 'Guardar Reporte',
    saving: 'Guardando...',
    cancel: 'Cancelar',
    deleteConfirm: '¿Estás seguro de que deseas eliminar este reporte?',
    active: 'Activo',
    inactive: 'Inactivo',
    nextSend: 'Próximo envío',
    metricsSelected: 'métricas seleccionadas',
    nameLabel: 'Nombre del Reporte',
    namePlaceholder: 'Ej: Resumen Diario',
    whatsappLabel: 'WhatsApp Destinatario',
    whatsappPlaceholder: 'Ej: 56912345678',
    whatsappHint: 'Solo números, con código de país',
    frequencyLabel: 'Frecuencia',
    timeLabel: 'Hora de Envío',
    dayLabel: 'Día de Envío',
    dayOfMonth: 'Día del Mes',
    freqDaily: 'Diario',
    freqWeekly: 'Semanal',
    freqMonthly: 'Mensual',
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
    metricsTitle: 'Métricas Operativas',
    metricsDesc: 'Selecciona los datos de esfuerzo y tracción',
    pipelineTitle: 'Métricas del Pipeline',
    pipelineDesc: 'Selecciona las etapas que deseas rastrear',
    m_leads_captados: 'Contactos Recibidos',
    m_canais_origem: 'Canales de Origen',
    m_mensagens_enviadas: 'Mensajes Enviados',
    m_ligacoes_feitas: 'Llamadas Realizadas',
    m_leads_responderam: 'Contactos Respondieron',
    financialTitle: 'Métricas Financieras',
    financialDesc: 'Ingresos, gastos e indicadores de negocio',
    m_receita: 'Ingreso Total',
    m_despesas: 'Gastos Totales',
    m_lucro: 'Ganancia Neta',
    m_comissoes: 'Comisiones Pendientes',
    m_negocios: 'Negocios Cerrados',
    m_ticket_medio: 'Ticket Promedio',
    siteTitle: 'Métricas del Sitio',
    siteDesc: 'Tráfico y conversión del sitio público',
    m_views: 'Visualizaciones',
    m_site_leads: 'Leads del Sitio',
    m_conversion: 'Tasa de Conversión',
    goalsTitle: 'Meta Principal',
    goalsDesc: 'Progreso de la meta activa',
    m_meta_principal: 'Incluir Meta Principal',
    followupTitle: 'Follow-up',
    followupDesc: 'Estado del reenganche automático',
    m_followup_status: 'Estado de Follow-up',
    sendNow: 'Enviar Ahora',
    sending: 'Enviando...',
    sentSuccess: '¡Reporte enviado!',
    sentError: 'Error al enviar',
    today: 'Hoy',
    tomorrow: 'Mañana'
  }
}

type Language = keyof typeof TRANSLATIONS

const DEFAULT_BASE_METRICS = {
  leads_captados: true,
  canais_origem: true,
  mensagens_enviadas: false,
  ligacoes_feitas: true,
  leads_responderam: true
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getNextSendDate(report: any, t: any): string {
  const now = new Date()
  const [hours, minutes] = (report.send_time || '18:00').substring(0, 5).split(':').map(Number)

  if (report.frequency === 'daily') {
    const today = new Date()
    today.setHours(hours, minutes, 0, 0)

    if (now < today) {
      return `${t.today}, ${report.send_time.substring(0, 5)}`
    } else {
      return `${t.tomorrow}, ${report.send_time.substring(0, 5)}`
    }
  }

  if (report.frequency === 'weekly') {
    const daysMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    }
    const targetDay = daysMap[report.send_day] ?? 1
    const currentDay = now.getDay()
    let daysUntil = targetDay - currentDay
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0) {
      const todayTime = new Date()
      todayTime.setHours(hours, minutes, 0, 0)
      if (now >= todayTime) daysUntil = 7
    }

    const nextDate = new Date()
    nextDate.setDate(now.getDate() + daysUntil)
    return `${nextDate.toLocaleDateString()}, ${report.send_time.substring(0, 5)}`
  }

  if (report.frequency === 'monthly') {
    const targetDay = parseInt(report.send_day) || 1
    let nextDate = new Date(now.getFullYear(), now.getMonth(), targetDay, hours, minutes)

    if (now >= nextDate) {
      nextDate = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, hours, minutes)
    }

    return `${nextDate.toLocaleDateString()}, ${report.send_time.substring(0, 5)}`
  }

  return '-'
}

function countSelectedMetrics(report: any): number {
  const baseCount = Object.values(report.metrics?.base || {}).filter(Boolean).length
  const pipelineCount = (report.metrics?.pipeline || []).length
  const financialCount = Object.values(report.metrics?.financial || {}).filter(Boolean).length
  const siteCount = Object.values(report.metrics?.site || {}).filter(Boolean).length
  const goalsCount = Object.values(report.metrics?.goals || {}).filter(Boolean).length
  const followupCount = Object.values(report.metrics?.followup || {}).filter(Boolean).length
  return baseCount + pipelineCount + financialCount + siteCount + goalsCount + followupCount
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function ReportsPage() {
  const { user } = useAuth()
  const activeOrgId = useActiveOrgId()
  const { canUseReports, isBasic } = usePlan()

  const userLang = ((user as any)?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]

  const [reports, setReports] = useState<any[]>([])
  const [pipelineStages, setPipelineStages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Send Now state
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<{ id: string; ok: boolean } | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    recipient_whatsapp: '',
    frequency: 'daily',
    send_time: '18:00',
    send_day: 'monday',
    metrics: DEFAULT_BASE_METRICS,
    pipeline_stages: [] as string[],
    financial: { receita: false, despesas: false, lucro: false, comissoes: false, negocios: false, ticket_medio: false } as Record<string, boolean>,
    site: { views: false, leads: false, conversion: false } as Record<string, boolean>,
    goals: { meta_principal: false } as Record<string, boolean>,
    followup: { status: false } as Record<string, boolean>,
  })

  // Dias da semana traduzidos
  const daysOfWeek = [
    { value: 'monday', label: t.monday },
    { value: 'tuesday', label: t.tuesday },
    { value: 'wednesday', label: t.wednesday },
    { value: 'thursday', label: t.thursday },
    { value: 'friday', label: t.friday },
    { value: 'saturday', label: t.saturday },
    { value: 'sunday', label: t.sunday }
  ]

  useEffect(() => {
    fetchData()
  }, [activeOrgId])

  const fetchData = async () => {
    if (!activeOrgId) return
    setLoading(true)
    try {
      const [reportsRes, stagesRes] = await Promise.all([
        supabase.from('report_configs').select('*').eq('org_id', activeOrgId).order('created_at', { ascending: false }),
        supabase.from('pipeline_stages').select('id, name, label').eq('org_id', activeOrgId).eq('is_active', true).order('position')
      ])

      if (reportsRes.error) throw reportsRes.error
      if (stagesRes.error) throw stagesRes.error

      setReports(reportsRes.data || [])
      setPipelineStages(stagesRes.data || [])
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (report: any = null) => {
    if (report) {
      setEditingId(report.id)
      setFormData({
        name: report.name,
        recipient_whatsapp: report.recipient_whatsapp,
        frequency: report.frequency,
        send_time: report.send_time.substring(0, 5),
        send_day: report.send_day || 'monday',
        metrics: report.metrics?.base || DEFAULT_BASE_METRICS,
        pipeline_stages: report.metrics?.pipeline || [],
        financial: report.metrics?.financial || { receita: false, despesas: false, lucro: false, comissoes: false, negocios: false, ticket_medio: false },
        site: report.metrics?.site || { views: false, leads: false, conversion: false },
        goals: report.metrics?.goals || { meta_principal: false },
        followup: report.metrics?.followup || { status: false },
      })
    } else {
      setEditingId(null)
      const allStageIds = pipelineStages.map(s => s.id)
      setFormData({
        name: '',
        recipient_whatsapp: '',
        frequency: 'daily',
        send_time: '18:00',
        send_day: 'monday',
        metrics: DEFAULT_BASE_METRICS,
        pipeline_stages: allStageIds,
        financial: { receita: false, despesas: false, lucro: false, comissoes: false, negocios: false, ticket_medio: false },
        site: { views: false, leads: false, conversion: false },
        goals: { meta_principal: false },
        followup: { status: false },
      })
    }
    setIsModalOpen(true)
  }

  const handleToggleBaseMetric = (key: string) => {
    setFormData(prev => ({
      ...prev,
      metrics: { ...prev.metrics, [key]: !prev.metrics[key as keyof typeof DEFAULT_BASE_METRICS] }
    }))
  }

  const handleTogglePipelineStage = (stageId: string) => {
    setFormData(prev => {
      const isSelected = prev.pipeline_stages.includes(stageId)
      return {
        ...prev,
        pipeline_stages: isSelected
          ? prev.pipeline_stages.filter(id => id !== stageId)
          : [...prev.pipeline_stages, stageId]
      }
    })
  }

  const handleToggleCategory = (category: 'financial' | 'site' | 'goals' | 'followup', key: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: { ...prev[category], [key]: !prev[category][key] }
    }))
  }

  const handleSendNow = async (reportId: string) => {
    if (!activeOrgId || sendingId) return
    setSendingId(reportId)
    setSendResult(null)
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, orgId: activeOrgId })
      })
      const data = await res.json()
      setSendResult({ id: reportId, ok: res.ok })
      setTimeout(() => setSendResult(null), 3000)
    } catch {
      setSendResult({ id: reportId, ok: false })
      setTimeout(() => setSendResult(null), 3000)
    } finally {
      setSendingId(null)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setReports(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r))
      await supabase.from('report_configs').update({ is_active: !currentStatus }).eq('id', id)
    } catch (err) {
      console.error(err)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return
    try {
      setReports(prev => prev.filter(r => r.id !== id))
      await supabase.from('report_configs').delete().eq('id', id)
    } catch (err) {
      console.error(err)
      fetchData()
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId) return

    setIsSaving(true)

    const combinedMetrics = {
      base: formData.metrics,
      pipeline: formData.pipeline_stages,
      financial: formData.financial,
      site: formData.site,
      goals: formData.goals,
      followup: formData.followup,
    }

    const payload = {
      org_id: activeOrgId,
      name: formData.name,
      recipient_whatsapp: formData.recipient_whatsapp.replace(/\D/g, ''),
      frequency: formData.frequency,
      send_time: formData.send_time,
      send_day: formData.frequency === 'daily' ? null : formData.send_day,
      metrics: combinedMetrics
    }

    try {
      if (editingId) {
        await supabase.from('report_configs').update(payload).eq('id', editingId)
      } else {
        await supabase.from('report_configs').insert(payload)
      }
      await fetchData()
      setIsModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar relatório. Verifique os dados.')
    } finally {
      setIsSaving(false)
    }
  }

  // Contador de métricas selecionadas no form
  const selectedMetricsCount = Object.values(formData.metrics).filter(Boolean).length
    + formData.pipeline_stages.length
    + Object.values(formData.financial).filter(Boolean).length
    + Object.values(formData.site).filter(Boolean).length
    + Object.values(formData.goals).filter(Boolean).length
    + Object.values(formData.followup).filter(Boolean).length

  // Se não tem acesso a Reports, mostra tela de upgrade
  if (!canUseReports) {
    return (
      <div className="min-h-[calc(100vh-100px)] p-4 sm:p-6 font-sans animate-in fade-in duration-300" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <BarChart3 className="shrink-0" size={24} style={{ color: 'var(--color-primary)' }} />
              <span>{t.title}</span>
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
          </div>

          {/* FeatureLock Replace */}
          <FeatureLock
            feature="hasReports"
            variant="replace"
            lang={userLang}
            title={t.title}
            description={userLang === 'pt'
              ? 'Envie métricas automaticamente via WhatsApp para sua equipe.'
              : userLang === 'es'
              ? 'Envía métricas automáticamente vía WhatsApp a tu equipo.'
              : 'Automatically send metrics via WhatsApp to your team.'
            }
          >
            <div />
          </FeatureLock>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-100px)] p-4 sm:p-6 font-sans animate-in fade-in duration-300 overflow-x-hidden" style={{ background: 'var(--color-bg-surface)' }}>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 max-w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <BarChart3 className="shrink-0" size={24} style={{ color: 'var(--color-primary)' }} />
            <span className="truncate">{t.title}</span>
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shrink-0"
          style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 6px -1px rgba(59,130,246,0.2)' }}
        >
          <Plus size={18} /> {t.newReport}
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && reports.length === 0 && (
        <div className="rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-primary-subtle)' }}>
            <FileText size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t.noReports}</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>{t.createFirst}</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            {t.newReport}
          </button>
        </div>
      )}

      {/* REPORTS GRID */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl p-4 sm:p-5 transition-all group relative overflow-hidden flex flex-col"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
            >
              {/* Gradient top bar */}
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: report.is_active ? 'var(--gradient-brand)' : 'var(--color-border)' }} />

              {/* Header */}
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base sm:text-lg truncate" style={{ color: 'var(--color-text-primary)' }} title={report.name}>
                    {report.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    <MessageCircle size={12} className="shrink-0" />
                    <span className="truncate">+{report.recipient_whatsapp}</span>
                  </div>
                </div>

                {/* Status Badge + Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={
                    report.is_active
                      ? { background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }
                      : { background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
                  }>
                    {report.is_active ? t.active : t.inactive}
                  </span>
                  <button
                    onClick={() => handleToggleActive(report.id, report.is_active)}
                    className="w-10 h-5 rounded-full relative transition-colors"
                    style={{ background: report.is_active ? 'var(--color-primary)' : 'var(--color-bg-elevated)' }}
                    aria-label="Toggle active"
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ${report.is_active ? 'left-[22px]' : 'left-[3px]'}`} />
                  </button>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
                  <Calendar size={14} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {report.frequency === 'daily' ? t.freqDaily : report.frequency === 'weekly' ? t.freqWeekly : t.freqMonthly}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
                  <Clock size={14} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{report.send_time.substring(0, 5)}</span>
                </div>
              </div>

              {/* Next Send & Metrics Count */}
              <div className="flex items-center justify-between text-[10px] mb-4 px-1" style={{ color: 'var(--color-text-muted)' }}>
                <span className="flex items-center gap-1">
                  <Send size={10} style={{ color: 'var(--color-text-muted)' }} />
                  {t.nextSend}: <span style={{ color: 'var(--color-text-tertiary)' }}>{getNextSendDate(report, t)}</span>
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {countSelectedMetrics(report)} {t.metricsSelected}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => handleSendNow(report.id)}
                  disabled={sendingId === report.id}
                  className="py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{
                    background: sendResult?.id === report.id
                      ? (sendResult.ok ? 'var(--color-success-subtle)' : 'var(--color-error-subtle)')
                      : 'var(--color-primary-subtle)',
                    color: sendResult?.id === report.id
                      ? (sendResult.ok ? 'var(--color-success)' : 'var(--color-error)')
                      : 'var(--color-primary)',
                    border: `1px solid ${sendResult?.id === report.id
                      ? (sendResult.ok ? 'var(--color-success)' : 'var(--color-error)')
                      : 'var(--color-primary)'}`
                  }}
                >
                  {sendingId === report.id ? <Loader2 size={14} className="animate-spin" /> : sendResult?.id === report.id ? (sendResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />) : <Zap size={14} />}
                  {sendingId === report.id ? t.sending : sendResult?.id === report.id ? (sendResult.ok ? t.sentSuccess : t.sentError) : t.sendNow}
                </button>
                <button
                  onClick={() => handleOpenModal(report)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}
                >
                  <Settings size={14} /> {userLang === 'en' ? 'Edit' : userLang === 'es' ? 'Editar' : 'Editar'}
                </button>
                <button
                  onClick={() => handleDelete(report.id)}
                  className="w-10 flex items-center justify-center rounded-lg transition-colors"
                  style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error-subtle)' }}
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CRIAR/EDITAR */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto"
          style={{ background: 'var(--color-bg-overlay)' }}
          onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
        >
          <div className="rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col my-4 max-h-[calc(100vh-2rem)] overflow-hidden" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>

            {/* Header Fixo */}
            <div className="flex justify-between items-center p-4 sm:p-5 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <BarChart3 className="shrink-0" size={20} style={{ color: 'var(--color-primary)' }} />
                <span className="truncate">{editingId ? t.editReport : t.newReport}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="transition-colors p-1 rounded-lg"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo com Scroll */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6">
              <form id="report-form" onSubmit={handleSave} className="space-y-6 max-w-full">

                {/* Infos Básicas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-full">
                  {/* Nome - Full Width */}
                  <div className="space-y-1.5 sm:col-span-2 min-w-0">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.nameLabel}</label>
                    <input
                      required
                      type="text"
                      placeholder={t.namePlaceholder}
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full rounded-xl p-3 text-sm outline-none transition-all"
                      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    />
                  </div>

                  {/* WhatsApp - Full Width */}
                  <div className="space-y-1.5 sm:col-span-2 min-w-0">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.whatsappLabel}</label>
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={15}
                      placeholder={t.whatsappPlaceholder}
                      value={formData.recipient_whatsapp}
                      onChange={e => setFormData({...formData, recipient_whatsapp: e.target.value.replace(/\D/g, '')})}
                      className="w-full rounded-xl p-3 text-sm outline-none transition-all font-mono"
                      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    />
                    <div className="flex items-center gap-1.5 mt-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      <Info size={11} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                      <span>{t.whatsappHint}</span>
                    </div>
                  </div>

                  {/* Frequência */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.frequencyLabel}</label>
                    <CustomSelect
                      value={formData.frequency}
                      onChange={(v) => setFormData({...formData, frequency: v})}
                      options={[
                        { value: 'daily', label: t.freqDaily },
                        { value: 'weekly', label: t.freqWeekly },
                        { value: 'monthly', label: t.freqMonthly },
                      ]}
                    />
                  </div>

                  {/* Horário */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.timeLabel}</label>
                    <input
                      required
                      type="time"
                      value={formData.send_time}
                      onChange={e => setFormData({...formData, send_time: e.target.value})}
                      className="w-full max-w-full rounded-xl p-3 text-sm outline-none transition-all cursor-text [color-scheme:dark] [-webkit-appearance:none] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    />
                  </div>

                  {/* Dia da Semana (Weekly) */}
                  {formData.frequency === 'weekly' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.dayLabel}</label>
                      <CustomSelect
                        value={formData.send_day}
                        onChange={(v) => setFormData({...formData, send_day: v})}
                        options={daysOfWeek.map(d => ({ value: d.value, label: d.label }))}
                      />
                    </div>
                  )}

                  {/* Dia do Mês (Monthly) */}
                  {formData.frequency === 'monthly' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{t.dayOfMonth}</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="31"
                        value={formData.send_day}
                        onChange={e => setFormData({...formData, send_day: e.target.value})}
                        className="w-full rounded-xl p-3 text-sm outline-none transition-all"
                        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                      />
                    </div>
                  )}
                </div>

                {/* Métricas Operacionais */}
                <div className="pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <div className="mb-4">
                    <h3 className="font-bold text-sm sm:text-base" style={{ color: 'var(--color-text-primary)' }}>{t.metricsTitle}</h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.metricsDesc}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {Object.keys(DEFAULT_BASE_METRICS).map((key) => {
                      const isActive = formData.metrics[key as keyof typeof DEFAULT_BASE_METRICS]
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => handleToggleBaseMetric(key)}
                          role="switch"
                          aria-checked={isActive}
                          className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer select-none w-full text-left"
                          style={
                            isActive
                              ? { background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)' }
                              : { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }
                          }
                        >
                          <span className="text-sm font-medium truncate pr-2" style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                            {t[`m_${key}` as keyof typeof t] || key}
                          </span>
                          <div className="shrink-0 w-9 h-5 rounded-full relative transition-colors" style={{ background: isActive ? 'var(--color-primary)' : 'var(--color-bg-elevated)' }}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ${isActive ? 'left-[20px]' : 'left-[3px]'}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Métricas do Funil */}
                {pipelineStages.length > 0 && (
                  <div className="pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                    <div className="mb-4">
                      <h3 className="font-bold text-sm sm:text-base" style={{ color: 'var(--color-text-primary)' }}>{t.pipelineTitle}</h3>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.pipelineDesc}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {pipelineStages.map((stage) => {
                        const isActive = formData.pipeline_stages.includes(stage.id)
                        return (
                          <button
                            type="button"
                            key={stage.id}
                            onClick={() => handleTogglePipelineStage(stage.id)}
                            role="switch"
                            aria-checked={isActive}
                            className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer select-none w-full text-left"
                            style={
                              isActive
                                ? { background: 'var(--color-indigo-subtle)', border: '1px solid var(--color-indigo)' }
                                : { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }
                            }
                          >
                            <span className="text-sm font-medium truncate pr-2" style={{ color: isActive ? 'var(--color-indigo)' : 'var(--color-text-tertiary)' }}>
                              {stage.label}
                            </span>
                            <div className="shrink-0 w-9 h-5 rounded-full relative transition-colors" style={{ background: isActive ? 'var(--color-indigo)' : 'var(--color-bg-elevated)' }}>
                              <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ${isActive ? 'left-[20px]' : 'left-[3px]'}`} />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Métricas Financeiras */}
                <div className="pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <div className="mb-4">
                    <h3 className="font-bold text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                      <DollarSign size={16} style={{ color: 'var(--color-success)' }} /> {t.financialTitle}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.financialDesc}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {Object.keys(formData.financial).map((key) => {
                      const isActive = formData.financial[key]
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => handleToggleCategory('financial', key)}
                          role="switch"
                          aria-checked={isActive}
                          className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer select-none w-full text-left"
                          style={isActive
                            ? { background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)' }
                            : { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }
                          }>
                          <span className="text-sm font-medium truncate pr-2" style={{ color: isActive ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>
                            {t[`m_${key}` as keyof typeof t] || key}
                          </span>
                          <div className="shrink-0 w-9 h-5 rounded-full relative transition-colors" style={{ background: isActive ? 'var(--color-success)' : 'var(--color-bg-elevated)' }}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ${isActive ? 'left-[20px]' : 'left-[3px]'}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Métricas do Site */}
                <div className="pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <div className="mb-4">
                    <h3 className="font-bold text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                      <Globe size={16} style={{ color: 'var(--color-info)' }} /> {t.siteTitle}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.siteDesc}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {Object.keys(formData.site).map((key) => {
                      const isActive = formData.site[key]
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => handleToggleCategory('site', key)}
                          role="switch"
                          aria-checked={isActive}
                          className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer select-none w-full text-left"
                          style={isActive
                            ? { background: 'var(--color-info-subtle)', border: '1px solid var(--color-info)' }
                            : { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }
                          }>
                          <span className="text-sm font-medium truncate pr-2" style={{ color: isActive ? 'var(--color-info)' : 'var(--color-text-tertiary)' }}>
                            {t[`m_${key === 'leads' ? 'site_leads' : key}` as keyof typeof t] || key}
                          </span>
                          <div className="shrink-0 w-9 h-5 rounded-full relative transition-colors" style={{ background: isActive ? 'var(--color-info)' : 'var(--color-bg-elevated)' }}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ${isActive ? 'left-[20px]' : 'left-[3px]'}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Meta Principal + Follow-up (lado a lado) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  {/* Meta */}
                  <div>
                    <div className="mb-4">
                      <h3 className="font-bold text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <Target size={16} style={{ color: 'var(--color-warning)' }} /> {t.goalsTitle}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.goalsDesc}</p>
                    </div>
                    {Object.keys(formData.goals).map((key) => {
                      const isActive = formData.goals[key]
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => handleToggleCategory('goals', key)}
                          role="switch"
                          aria-checked={isActive}
                          className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer select-none w-full text-left"
                          style={isActive
                            ? { background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning)' }
                            : { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }
                          }>
                          <span className="text-sm font-medium truncate pr-2" style={{ color: isActive ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }}>
                            {t[`m_${key}` as keyof typeof t] || key}
                          </span>
                          <div className="shrink-0 w-9 h-5 rounded-full relative transition-colors" style={{ background: isActive ? 'var(--color-warning)' : 'var(--color-bg-elevated)' }}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ${isActive ? 'left-[20px]' : 'left-[3px]'}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Follow-up */}
                  <div>
                    <div className="mb-4">
                      <h3 className="font-bold text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <RefreshCw size={16} style={{ color: 'var(--color-primary)' }} /> {t.followupTitle}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.followupDesc}</p>
                    </div>
                    {Object.keys(formData.followup).map((key) => {
                      const isActive = formData.followup[key]
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => handleToggleCategory('followup', key)}
                          role="switch"
                          aria-checked={isActive}
                          className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer select-none w-full text-left"
                          style={isActive
                            ? { background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)' }
                            : { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }
                          }>
                          <span className="text-sm font-medium truncate pr-2" style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                            {t[`m_${key === 'status' ? 'followup_status' : key}` as keyof typeof t] || key}
                          </span>
                          <div className="shrink-0 w-9 h-5 rounded-full relative transition-colors" style={{ background: isActive ? 'var(--color-primary)' : 'var(--color-bg-elevated)' }}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ${isActive ? 'left-[20px]' : 'left-[3px]'}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

              </form>
            </div>

            {/* Footer Fixo */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 sm:p-5 shrink-0 rounded-b-2xl" style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-elevated)' }}>
              {/* Contador de métricas */}
              <div className="text-xs order-2 sm:order-1" style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{selectedMetricsCount}</span> {t.metricsSelected}
              </div>

              {/* Botões */}
              <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium transition-colors rounded-lg"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {t.cancel}
                </button>
                <button
                  form="report-form"
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 6px -1px rgba(59,130,246,0.2)' }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? t.saving : t.save}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
