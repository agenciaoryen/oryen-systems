// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { 
  Plus, FileText, Settings, Trash2, X, Save, 
  Clock, Calendar, MessageCircle, BarChart3, Loader2, Play, Square
} from 'lucide-react'

// --- DICIONÁRIO DE TRADUÇÃO ---
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
    // Form fields
    nameLabel: 'Nome do Relatório',
    namePlaceholder: 'Ex: Fechamento Diário Diretoria',
    whatsappLabel: 'WhatsApp Destinatário',
    whatsappPlaceholder: 'Ex: 5511999999999',
    frequencyLabel: 'Frequência',
    timeLabel: 'Horário de Envio',
    dayLabel: 'Dia de Envio',
    // Frequencies
    freqDaily: 'Diário',
    freqWeekly: 'Semanal',
    freqMonthly: 'Mensal',
    // Metrics
    metricsTitle: 'Métricas do Relatório',
    metricsDesc: 'Selecione os dados que deseja incluir no resumo',
    m_leads_captados: 'Leads Captados',
    m_canais_origem: 'Canais de Origem',
    m_mensagens_enviadas: 'Disparos de Mensagens',
    m_ligacoes_feitas: 'Ligações Realizadas',
    m_leads_responderam: 'Leads que Responderam',
    m_reunioes_agendadas: 'Reuniões Agendadas',
    m_compareceram_reuniao: 'Compareceram na Reunião',
    m_propostas_apresentadas: 'Propostas Apresentadas',
    m_fechamentos: 'Fechamentos (Ganho)',
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
    nameLabel: 'Report Name',
    namePlaceholder: 'Ex: Daily Board Summary',
    whatsappLabel: 'Recipient WhatsApp',
    whatsappPlaceholder: 'Ex: 1234567890',
    frequencyLabel: 'Frequency',
    timeLabel: 'Send Time',
    dayLabel: 'Send Day',
    freqDaily: 'Daily',
    freqWeekly: 'Weekly',
    freqMonthly: 'Monthly',
    metricsTitle: 'Report Metrics',
    metricsDesc: 'Select the data to include in the summary',
    m_leads_captados: 'Captured Leads',
    m_canais_origem: 'Source Channels',
    m_mensagens_enviadas: 'Messages Sent',
    m_ligacoes_feitas: 'Calls Made',
    m_leads_responderam: 'Leads Responded',
    m_reunioes_agendadas: 'Meetings Scheduled',
    m_compareceram_reuniao: 'Meetings Attended',
    m_propostas_apresentadas: 'Proposals Sent',
    m_fechamentos: 'Closed Won',
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
    nameLabel: 'Nombre del Reporte',
    namePlaceholder: 'Ej: Resumen Diario',
    whatsappLabel: 'WhatsApp Destinatario',
    whatsappPlaceholder: 'Ej: 56912345678',
    frequencyLabel: 'Frecuencia',
    timeLabel: 'Hora de Envío',
    dayLabel: 'Día de Envío',
    freqDaily: 'Diario',
    freqWeekly: 'Semanal',
    freqMonthly: 'Mensual',
    metricsTitle: 'Métricas del Reporte',
    metricsDesc: 'Selecciona los datos a incluir en el resumen',
    m_leads_captados: 'Leads Captados',
    m_canais_origem: 'Canales de Origen',
    m_mensagens_enviadas: 'Mensajes Enviados',
    m_ligacoes_feitas: 'Llamadas Realizadas',
    m_leads_responderam: 'Leads Respondieron',
    m_reunioes_agendadas: 'Reuniones Agendadas',
    m_compareceram_reuniao: 'Asistieron a Reunión',
    m_propostas_apresentadas: 'Propuestas Presentadas',
    m_fechamentos: 'Cierres (Ganados)',
  }
}

const DEFAULT_METRICS = {
  leads_captados: true,
  canais_origem: true,
  mensagens_enviadas: false,
  ligacoes_feitas: true,
  leads_responderam: true,
  reunioes_agendadas: true,
  compareceram_reuniao: false,
  propostas_apresentadas: true,
  fechamentos: true
}

export default function ReportsPage() {
  const { user } = useAuth()
  const activeOrgId = useActiveOrgId()
  
  const userLang = ((user as any)?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]

  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    recipient_whatsapp: '',
    frequency: 'daily',
    send_time: '18:00',
    send_day: 'monday',
    metrics: DEFAULT_METRICS
  })

  useEffect(() => {
    fetchReports()
  }, [activeOrgId])

  const fetchReports = async () => {
    if (!activeOrgId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('report_configs')
        .select('*')
        .eq('org_id', activeOrgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (report = null) => {
    if (report) {
      setEditingId(report.id)
      setFormData({
        name: report.name,
        recipient_whatsapp: report.recipient_whatsapp,
        frequency: report.frequency,
        send_time: report.send_time.substring(0, 5), // '18:00:00' -> '18:00'
        send_day: report.send_day || 'monday',
        metrics: report.metrics || DEFAULT_METRICS
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        recipient_whatsapp: '',
        frequency: 'daily',
        send_time: '18:00',
        send_day: 'monday',
        metrics: DEFAULT_METRICS
      })
    }
    setIsModalOpen(true)
  }

  const handleToggleMetric = (key: string) => {
    setFormData(prev => ({
      ...prev,
      metrics: { ...prev.metrics, [key]: !prev.metrics[key as keyof typeof DEFAULT_METRICS] }
    }))
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setReports(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r))
      await supabase.from('report_configs').update({ is_active: !currentStatus }).eq('id', id)
    } catch (err) {
      console.error(err)
      fetchReports() // Revert on error
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return
    try {
      setReports(prev => prev.filter(r => r.id !== id))
      await supabase.from('report_configs').delete().eq('id', id)
    } catch (err) {
      console.error(err)
      fetchReports()
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId) return
    
    setIsSaving(true)
    const payload = {
      org_id: activeOrgId,
      name: formData.name,
      recipient_whatsapp: formData.recipient_whatsapp.replace(/\D/g, ''),
      frequency: formData.frequency,
      send_time: formData.send_time,
      send_day: formData.frequency === 'daily' ? null : formData.send_day,
      metrics: formData.metrics
    }

    try {
      if (editingId) {
        await supabase.from('report_configs').update(payload).eq('id', editingId)
      } else {
        await supabase.from('report_configs').insert(payload)
      }
      await fetchReports()
      setIsModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar relatório. Verifique os dados.')
    } finally {
      setIsSaving(false)
    }
  }

  const daysOfWeek = [
    { value: 'monday', label: 'Segunda-feira' },
    { value: 'tuesday', label: 'Terça-feira' },
    { value: 'wednesday', label: 'Quarta-feira' },
    { value: 'thursday', label: 'Quinta-feira' },
    { value: 'friday', label: 'Sexta-feira' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ]

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#0A0A0A] p-6 font-sans animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-500" /> {t.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={18} /> {t.newReport}
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && reports.length === 0 && (
        <div className="bg-[#111] border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-blue-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{t.noReports}</h3>
          <p className="text-gray-500 text-sm mb-6">{t.createFirst}</p>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {t.newReport}
          </button>
        </div>
      )}

      {/* REPORTS GRID */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-[#111] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-transparent opacity-50"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg truncate max-w-[200px]" title={report.name}>
                    {report.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                    <MessageCircle size={12} /> +{report.recipient_whatsapp}
                  </div>
                </div>
                {/* Custom Toggle */}
                <button 
                  onClick={() => handleToggleActive(report.id, report.is_active)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${report.is_active ? 'bg-blue-600' : 'bg-gray-800'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${report.is_active ? 'left-[22px]' : 'left-[3px]'}`}></div>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-5 p-3 bg-[#0A0A0A] rounded-lg border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar size={14} className="text-blue-400" />
                  {report.frequency === 'daily' ? t.freqDaily : report.frequency === 'weekly' ? t.freqWeekly : t.freqMonthly}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={14} className="text-blue-400" />
                  {report.send_time.substring(0, 5)}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(report)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/5">
                  <Settings size={14} /> Editar
                </button>
                <button onClick={() => handleDelete(report.id)} className="w-10 flex items-center justify-center bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors border border-red-500/10">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CRIAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            
            <div className="flex justify-between items-center p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="text-blue-500" size={20} />
                {editingId ? t.editReport : t.newReport}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6">
              
              {/* Infos Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{t.nameLabel}</label>
                  <input 
                    required type="text" placeholder={t.namePlaceholder}
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-700"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{t.whatsappLabel}</label>
                  <input 
                    required type="text" placeholder={t.whatsappPlaceholder}
                    value={formData.recipient_whatsapp} onChange={e => setFormData({...formData, recipient_whatsapp: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{t.frequencyLabel}</label>
                  <select 
                    value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="daily">{t.freqDaily}</option>
                    <option value="weekly">{t.freqWeekly}</option>
                    <option value="monthly">{t.freqMonthly}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{t.timeLabel}</label>
                  <input 
                    required type="time"
                    value={formData.send_time} onChange={e => setFormData({...formData, send_time: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-text [color-scheme:dark]"
                  />
                </div>

                {formData.frequency === 'weekly' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{t.dayLabel}</label>
                    <select 
                      value={formData.send_day} onChange={e => setFormData({...formData, send_day: e.target.value})}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                    >
                      {daysOfWeek.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                )}
                {formData.frequency === 'monthly' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{t.dayLabel} (Dia do Mês)</label>
                    <input 
                      required type="number" min="1" max="31"
                      value={formData.send_day} onChange={e => setFormData({...formData, send_day: e.target.value})}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Métricas (Toggles) */}
              <div className="border-t border-white/5 pt-6 mb-6">
                <div className="mb-4">
                  <h3 className="text-white font-bold">{t.metricsTitle}</h3>
                  <p className="text-xs text-gray-500">{t.metricsDesc}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.keys(DEFAULT_METRICS).map((key) => {
                    const isActive = formData.metrics[key as keyof typeof DEFAULT_METRICS]
                    return (
                      <label key={key} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${isActive ? 'bg-blue-500/5 border-blue-500/30' : 'bg-[#0A0A0A] border-white/5 hover:border-white/10'}`}>
                        <span className={`text-sm font-medium ${isActive ? 'text-blue-400' : 'text-gray-400'}`}>
                          {t[`m_${key}` as keyof typeof t] || key}
                        </span>
                        <div className={`w-9 h-5 rounded-full relative transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-800'}`}>
                          <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${isActive ? 'left-[20px]' : 'left-[3px]'}`}></div>
                        </div>
                        <input 
                          type="checkbox" className="hidden" 
                          checked={isActive} onChange={() => handleToggleMetric(key)} 
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Botões Ação */}
              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  {t.cancel}
                </button>
                <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? t.saving : t.save}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}