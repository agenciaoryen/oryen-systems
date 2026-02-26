'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { formatPrice } from '@/lib/format'
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  Instagram,
  MapPin,
  Globe,
  DollarSign,
  Tag,
  Plus,
  X,
  ChevronDown,
  Loader2,
  Bot,
  Clock,
  Check,
  ExternalLink
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface LeadDetails {
  id: string
  name: string
  nome_empresa?: string
  email: string
  phone?: string
  stage: string
  created_at: string
  updated_at?: string
  conversa_finalizada: boolean
  instagram?: string
  city?: string
  url_site?: string
  total_em_vendas?: number
  source?: string
  nicho?: string
  org_id: string
}

interface LeadEvent {
  id: string
  lead_id: string
  type: 'stage_change' | 'note' | 'contact' | 'tag_added' | 'tag_removed'
  content: string
  created_at: string
}

interface PipelineStage {
  id: string
  org_id: string
  name: string
  label: string
  color: string
  position: number
  is_active: boolean
  is_won: boolean
  is_lost: boolean
}

interface Tag {
  id: string
  org_id: string
  name: string
  color: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    back: 'Voltar',
    loading: 'Carregando dados do Lead...',
    notFoundTitle: 'Ops! Lead não encontrado.',
    notFoundDesc: 'Verifique se o ID na URL está correto ou se você tem permissão.',
    notFoundId: 'ID procurado:',
    backToCrm: 'Voltar para o CRM',
    agentActive: 'Agente IA: Ativo',
    agentPaused: 'Agente IA: Pausado',
    contact: 'Contato',
    whatsapp: 'WhatsApp',
    openChat: 'Abrir Conversa',
    instagram: 'Instagram',
    city: 'Cidade',
    website: 'Site/URL',
    value: 'Valor',
    source: 'Origem',
    niche: 'Nicho',
    stage: 'Etapa',
    timelineTitle: 'Linha do Tempo',
    emptyHistory: 'Nenhum histórico registrado.',
    quickNoteTitle: 'Anotação Rápida',
    notePlaceholder: 'Escreva algo sobre este lead...',
    addNote: 'Adicionar ao Histórico',
    errorUpdate: 'Erro ao salvar alteração.',
    errorNote: 'Erro ao salvar anotação.',
    tagsTitle: 'Tags',
    addTag: 'Adicionar tag',
    noTags: 'Sem tags',
    selectStage: 'Selecionar etapa',
    createdAt: 'Criado em',
    updatedAt: 'Atualizado em',
    leadInfo: 'Informações do Lead',
    quickActions: 'Ações Rápidas',
    stageChanged: 'Etapa alterada para',
    tagAdded: 'Tag adicionada:',
    tagRemoved: 'Tag removida:'
  },
  en: {
    back: 'Back',
    loading: 'Loading Lead data...',
    notFoundTitle: 'Oops! Lead not found.',
    notFoundDesc: 'Check if the URL ID is correct or if you have permission.',
    notFoundId: 'Searched ID:',
    backToCrm: 'Back to CRM',
    agentActive: 'AI Agent: Active',
    agentPaused: 'AI Agent: Paused',
    contact: 'Contact',
    whatsapp: 'WhatsApp',
    openChat: 'Open Chat',
    instagram: 'Instagram',
    city: 'City',
    website: 'Website/URL',
    value: 'Value',
    source: 'Source',
    niche: 'Niche',
    stage: 'Stage',
    timelineTitle: 'Timeline',
    emptyHistory: 'No history recorded.',
    quickNoteTitle: 'Quick Note',
    notePlaceholder: 'Write something about this lead...',
    addNote: 'Add to History',
    errorUpdate: 'Error saving changes.',
    errorNote: 'Error saving note.',
    tagsTitle: 'Tags',
    addTag: 'Add tag',
    noTags: 'No tags',
    selectStage: 'Select stage',
    createdAt: 'Created at',
    updatedAt: 'Updated at',
    leadInfo: 'Lead Information',
    quickActions: 'Quick Actions',
    stageChanged: 'Stage changed to',
    tagAdded: 'Tag added:',
    tagRemoved: 'Tag removed:'
  },
  es: {
    back: 'Volver',
    loading: 'Cargando datos del Lead...',
    notFoundTitle: '¡Ops! Lead no encontrado.',
    notFoundDesc: 'Verifica si el ID en la URL es correcto o si tienes permiso.',
    notFoundId: 'ID buscado:',
    backToCrm: 'Volver al CRM',
    agentActive: 'Agente IA: Activo',
    agentPaused: 'Agente IA: Pausado',
    contact: 'Contacto',
    whatsapp: 'WhatsApp',
    openChat: 'Abrir Chat',
    instagram: 'Instagram',
    city: 'Ciudad',
    website: 'Sitio Web/URL',
    value: 'Valor',
    source: 'Origen',
    niche: 'Nicho',
    stage: 'Etapa',
    timelineTitle: 'Línea de Tiempo',
    emptyHistory: 'Ningún historial registrado.',
    quickNoteTitle: 'Nota Rápida',
    notePlaceholder: 'Escribe algo sobre este lead...',
    addNote: 'Añadir al Historial',
    errorUpdate: 'Error al guardar cambios.',
    errorNote: 'Error al guardar nota.',
    tagsTitle: 'Tags',
    addTag: 'Añadir tag',
    noTags: 'Sin tags',
    selectStage: 'Seleccionar etapa',
    createdAt: 'Creado el',
    updatedAt: 'Actualizado el',
    leadInfo: 'Información del Lead',
    quickActions: 'Acciones Rápidas',
    stageChanged: 'Etapa cambiada a',
    tagAdded: 'Tag añadida:',
    tagRemoved: 'Tag eliminada:'
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// CORES
// ═══════════════════════════════════════════════════════════════════════════════

const STAGE_COLORS: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  gray: { text: 'text-gray-300', bg: 'bg-gray-500/10', border: 'border-gray-600', dot: 'bg-gray-500' },
  blue: { text: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/60', dot: 'bg-blue-500' },
  amber: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/60', dot: 'bg-amber-500' },
  cyan: { text: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/60', dot: 'bg-cyan-500' },
  purple: { text: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/60', dot: 'bg-purple-500' },
  indigo: { text: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/60', dot: 'bg-indigo-500' },
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/60', dot: 'bg-emerald-500' },
  rose: { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/60', dot: 'bg-rose-500' },
}

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  green: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
  red: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
  gray: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' },
}

const getStageColor = (color: string) => STAGE_COLORS[color] || STAGE_COLORS.gray
const getTagColor = (color: string) => TAG_COLORS[color] || TAG_COLORS.gray

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

const parseDateSafe = (dateValue: unknown): Date => {
  try {
    if (!dateValue) return new Date()
    const d = new Date(String(dateValue))
    return isNaN(d.getTime()) ? new Date() : d
  } catch {
    return new Date()
  }
}

const formatDateTime = (dateString: string, lang: string, timezone: string) => {
  try {
    return parseDateSafe(dateString).toLocaleString(lang, {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '--/--/---- --:--'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function LeadProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const orgId = useActiveOrgId()

  // Configurações do usuário
  const userLang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]
  const userCurrency = user?.currency || 'BRL'
  const userTimezone = user?.timezone || 'America/Sao_Paulo'

  const leadId = params?.id ? String(params.id) : null

  // Estados principais
  const [lead, setLead] = useState<LeadDetails | null>(null)
  const [events, setEvents] = useState<LeadEvent[]>([])
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [leadTags, setLeadTags] = useState<Tag[]>([])

  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const [savingStage, setSavingStage] = useState(false)

  // ─── CARREGAR DADOS ───
  const fetchData = useCallback(async () => {
    if (!leadId || !orgId) return

    try {
      setLoading(true)
      setErrorMessage(null)

      // Buscar tudo em paralelo
      const [leadRes, eventsRes, stagesRes, tagsRes, leadTagsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).single(),
        supabase.from('lead_events').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
        supabase.from('pipeline_stages').select('*').eq('org_id', orgId).eq('is_active', true).order('position'),
        supabase.from('tags').select('*').eq('org_id', orgId).order('name'),
        supabase.from('lead_tags').select('tag_id').eq('lead_id', leadId)
      ])

      if (leadRes.error) throw leadRes.error
      if (!leadRes.data) {
        setErrorMessage('Lead não encontrado no banco de dados.')
        return
      }

      // Verificar se o lead pertence à org atual
      if (leadRes.data.org_id !== orgId) {
        setErrorMessage('Você não tem permissão para ver este lead.')
        return
      }

      setLead(leadRes.data)
      setEvents(eventsRes.data || [])
      setPipelineStages(stagesRes.data || [])
      setAllTags(tagsRes.data || [])

      // Mapear tags do lead
      const leadTagIds = (leadTagsRes.data || []).map(lt => lt.tag_id)
      const leadTagsData = (tagsRes.data || []).filter(tag => leadTagIds.includes(tag.id))
      setLeadTags(leadTagsData)

    } catch (err: unknown) {
      console.error('Erro ao carregar dados:', err)
      const error = err as { message?: string }
      setErrorMessage(error.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [leadId, orgId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── TOGGLE IA ───
  const handleToggleIA = async () => {
    if (!lead || !leadId) return
    const newValue = !lead.conversa_finalizada
    
    setLead(prev => prev ? { ...prev, conversa_finalizada: newValue } : null)
    
    const { error } = await supabase
      .from('leads')
      .update({ conversa_finalizada: newValue })
      .eq('id', leadId)

    if (error) {
      setLead(prev => prev ? { ...prev, conversa_finalizada: !newValue } : null)
      console.error('Erro ao atualizar IA:', error)
    }
  }

  // ─── ATUALIZAR CAMPO ───
  const handleUpdateField = async (field: keyof LeadDetails, value: unknown) => {
    if (!leadId || !lead) return

    const cleanValue = (typeof value === 'string' && value.trim() === '') ? null : value
    const originalValue = lead[field]

    setLead(prev => prev ? { ...prev, [field]: cleanValue } : null)

    const { error } = await supabase
      .from('leads')
      .update({ [field]: cleanValue, updated_at: new Date().toISOString() })
      .eq('id', leadId)

    if (error) {
      console.error(`Erro ao atualizar ${field}:`, error)
      setLead(prev => prev ? { ...prev, [field]: originalValue } : null)
      alert(t.errorUpdate)
    }
  }

  // ─── MUDAR ESTÁGIO ───
  const handleChangeStage = async (newStage: string) => {
    if (!lead || !leadId || lead.stage === newStage) {
      setIsStageDropdownOpen(false)
      return
    }

    setSavingStage(true)
    const oldStage = lead.stage
    const stageLabel = pipelineStages.find(s => s.name === newStage)?.label || newStage

    setLead(prev => prev ? { ...prev, stage: newStage } : null)
    setIsStageDropdownOpen(false)

    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', leadId)

      if (error) throw error

      // Registrar evento
      const { data: eventData } = await supabase
        .from('lead_events')
        .insert({
          lead_id: leadId,
          type: 'stage_change',
          content: `${t.stageChanged} ${stageLabel}`
        })
        .select()
        .single()

      if (eventData) {
        setEvents(prev => [eventData, ...prev])
      }

    } catch (error) {
      console.error('Erro ao mudar estágio:', error)
      setLead(prev => prev ? { ...prev, stage: oldStage } : null)
      alert(t.errorUpdate)
    } finally {
      setSavingStage(false)
    }
  }

  // ─── ADICIONAR TAG ───
  const handleAddTag = async (tag: Tag) => {
    if (!leadId || leadTags.some(t => t.id === tag.id)) {
      setIsTagDropdownOpen(false)
      return
    }

    setLeadTags(prev => [...prev, tag])
    setIsTagDropdownOpen(false)

    try {
      const { error } = await supabase
        .from('lead_tags')
        .insert({ lead_id: leadId, tag_id: tag.id })

      if (error) throw error

      // Registrar evento
      const { data: eventData } = await supabase
        .from('lead_events')
        .insert({
          lead_id: leadId,
          type: 'tag_added',
          content: `${t.tagAdded} ${tag.name}`
        })
        .select()
        .single()

      if (eventData) {
        setEvents(prev => [eventData, ...prev])
      }

    } catch (error) {
      console.error('Erro ao adicionar tag:', error)
      setLeadTags(prev => prev.filter(t => t.id !== tag.id))
    }
  }

  // ─── REMOVER TAG ───
  const handleRemoveTag = async (tag: Tag) => {
    if (!leadId) return

    setLeadTags(prev => prev.filter(t => t.id !== tag.id))

    try {
      const { error } = await supabase
        .from('lead_tags')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tag.id)

      if (error) throw error

      // Registrar evento
      const { data: eventData } = await supabase
        .from('lead_events')
        .insert({
          lead_id: leadId,
          type: 'tag_removed',
          content: `${t.tagRemoved} ${tag.name}`
        })
        .select()
        .single()

      if (eventData) {
        setEvents(prev => [eventData, ...prev])
      }

    } catch (error) {
      console.error('Erro ao remover tag:', error)
      setLeadTags(prev => [...prev, tag])
    }
  }

  // ─── SALVAR NOTA ───
  const handleSaveNote = async () => {
    if (!note.trim() || !leadId) return

    setSavingNote(true)

    try {
      const { data, error } = await supabase
        .from('lead_events')
        .insert({
          lead_id: leadId,
          type: 'note',
          content: note
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setEvents(prev => [data, ...prev])
        setNote('')
      }

    } catch (error) {
      console.error('Erro ao salvar nota:', error)
      alert(t.errorNote)
    } finally {
      setSavingNote(false)
    }
  }

  // ─── ABRIR WHATSAPP ───
  const openWhatsApp = () => {
    if (!lead?.phone) return
    const num = lead.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${num}`, '_blank')
  }

  // ─── ABRIR CONVERSA ───
  const openChat = () => {
    if (!leadId) return
    router.push(`/dashboard/messages?lead_id=${leadId}`)
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════════

  // Loading
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-[#0A0A0A] text-white">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="animate-pulse text-gray-400 font-medium">{t.loading}</p>
      </div>
    )
  }

  // Não encontrado
  if (!lead) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-[#0A0A0A] text-white p-6 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">{t.notFoundTitle}</h2>
        <p className="text-gray-400 mb-6">{errorMessage || t.notFoundDesc}</p>
        <div className="bg-gray-900 p-2 rounded text-xs font-mono text-gray-500 mb-6 border border-gray-800">
          {t.notFoundId} {leadId || 'Nenhum'}
        </div>
        <button
          onClick={() => router.push('/dashboard/crm')}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg transition-colors font-bold shadow-lg shadow-blue-600/20"
        >
          {t.backToCrm}
        </button>
      </div>
    )
  }

  const displayName = lead.nome_empresa || lead.name || 'Sem nome'
  const currentStage = pipelineStages.find(s => s.name === lead.stage)
  const stageColor = currentStage ? getStageColor(currentStage.color) : getStageColor('gray')
  const availableTags = allTags.filter(tag => !leadTags.some(lt => lt.id === tag.id))

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#0A0A0A] text-gray-200 p-4 md:p-6 lg:p-10 font-sans pb-24">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {t.back}
        </button>

        <button
          onClick={handleToggleIA}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all shadow-lg w-full sm:w-auto justify-center ${
            lead.conversa_finalizada
              ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          <Bot size={16} />
          <div className={`w-2 h-2 rounded-full ${lead.conversa_finalizada ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {lead.conversa_finalizada ? t.agentPaused : t.agentActive}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">

        {/* COLUNA PRINCIPAL */}
        <div className="xl:col-span-2 space-y-6">

          {/* CARTÃO DE PERFIL */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-transparent opacity-50" />

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl md:text-3xl font-black shadow-lg shadow-blue-900/40 text-white border border-blue-500/30">
                {displayName[0]?.toUpperCase()}
              </div>

              <div className="flex-1 text-center md:text-left min-w-0">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-1 truncate" title={displayName}>
                  {displayName}
                </h1>
                {lead.nome_empresa && lead.name && (
                  <p className="text-gray-400 text-sm mb-3 italic truncate">{t.contact}: {lead.name}</p>
                )}

                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                  {/* Seletor de Estágio */}
                  <div className="relative">
                    <button
                      onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
                      disabled={savingStage}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${stageColor.bg} ${stageColor.text} ${stageColor.border}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${stageColor.dot}`} />
                      {currentStage?.label || lead.stage}
                      {savingStage ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ChevronDown size={12} className={`transition-transform ${isStageDropdownOpen ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {isStageDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {pipelineStages.map(stage => {
                          const color = getStageColor(stage.color)
                          const isActive = stage.name === lead.stage
                          return (
                            <button
                              key={stage.id}
                              onClick={() => handleChangeStage(stage.name)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-all ${
                                isActive ? 'bg-white/10' : 'hover:bg-white/5'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                              <span className={`flex-1 text-left ${color.text}`}>{stage.label}</span>
                              {isActive && <Check size={14} className="text-blue-400" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {lead.email && (
                    <div className="flex items-center gap-2 text-gray-400 text-xs bg-gray-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                      <Mail size={12} />
                      <span className="truncate max-w-[120px] sm:max-w-[180px]">{lead.email}</span>
                    </div>
                  )}

                  {lead.phone && (
                    <div className="flex items-center gap-2 text-gray-400 text-xs bg-gray-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                      <Phone size={12} />
                      {lead.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button
                  onClick={openChat}
                  className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg text-sm"
                >
                  <MessageSquare size={16} />
                  {t.openChat}
                </button>
                <button
                  onClick={openWhatsApp}
                  disabled={!lead.phone}
                  className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-4 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg text-sm"
                >
                  <ExternalLink size={16} />
                  {t.whatsapp}
                </button>
              </div>
            </div>

            {/* TAGS */}
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-gray-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.tagsTitle}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {leadTags.map(tag => {
                  const tagColor = getTagColor(tag.color)
                  return (
                    <span
                      key={tag.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${tagColor.bg} ${tagColor.text} ${tagColor.border} group`}
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )
                })}

                {/* Botão Adicionar Tag */}
                <div className="relative">
                  <button
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all"
                  >
                    <Plus size={12} />
                    {t.addTag}
                  </button>

                  {isTagDropdownOpen && availableTags.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[200px] overflow-y-auto">
                      {availableTags.map(tag => {
                        const tagColor = getTagColor(tag.color)
                        return (
                          <button
                            key={tag.id}
                            onClick={() => handleAddTag(tag)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-all"
                          >
                            <span className={`w-2 h-2 rounded-full ${tagColor.bg.replace('/20', '')}`} />
                            <span className={tagColor.text}>{tag.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {leadTags.length === 0 && (
                  <span className="text-xs text-gray-600 italic">{t.noTags}</span>
                )}
              </div>
            </div>

            {/* CAMPOS DE EDIÇÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1 flex items-center gap-1">
                  <Instagram size={10} /> {t.instagram}
                </label>
                <input
                  defaultValue={lead.instagram || ''}
                  onBlur={(e) => handleUpdateField('instagram', e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-blue-500 transition-all placeholder-gray-700"
                  placeholder="@instagram"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1 flex items-center gap-1">
                  <MapPin size={10} /> {t.city}
                </label>
                <input
                  defaultValue={lead.city || ''}
                  onBlur={(e) => handleUpdateField('city', e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-blue-500 transition-all placeholder-gray-700"
                  placeholder={t.city}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1 flex items-center gap-1">
                  <Globe size={10} /> {t.website}
                </label>
                <input
                  defaultValue={lead.url_site || ''}
                  onBlur={(e) => handleUpdateField('url_site', e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-blue-500 transition-all placeholder-gray-700"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider ml-1 flex items-center gap-1">
                  <DollarSign size={10} /> {t.value} ({userCurrency})
                </label>
                <input
                  type="number"
                  defaultValue={lead.total_em_vendas || 0}
                  onBlur={(e) => handleUpdateField('total_em_vendas', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0A0A0A] border border-emerald-900/50 rounded-xl p-3 text-sm text-emerald-400 outline-none focus:border-emerald-500 font-bold transition-all"
                />
              </div>
            </div>

            {/* INFO EXTRA */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-white/5 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock size={12} />
                {t.createdAt}: {formatDateTime(lead.created_at, userLang, userTimezone)}
              </div>
              {lead.updated_at && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {t.updatedAt}: {formatDateTime(lead.updated_at, userLang, userTimezone)}
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-1.5">
                  {t.source}: <span className="text-gray-400">{lead.source}</span>
                </div>
              )}
              {lead.nicho && (
                <div className="flex items-center gap-1.5">
                  {t.niche}: <span className="text-blue-400">{lead.nicho}</span>
                </div>
              )}
            </div>
          </div>

          {/* TIMELINE */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 md:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <MessageSquare size={18} />
              {t.timelineTitle}
            </h3>

            <div className="space-y-4">
              {events.length === 0 && (
                <div className="text-center py-10 opacity-50">
                  <p className="text-gray-500 text-sm italic">{t.emptyHistory}</p>
                </div>
              )}

              {events.map((event) => (
                <div key={event.id} className="flex gap-4 group">
                  <div className="min-w-[2px] bg-white/10 relative group-last:bg-transparent">
                    <div className={`absolute top-1 -left-[5px] w-3 h-3 rounded-full ring-4 ring-[#111] ${
                      event.type === 'stage_change' ? 'bg-purple-500' :
                      event.type === 'tag_added' ? 'bg-green-500' :
                      event.type === 'tag_removed' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`} />
                  </div>
                  <div className="pb-6 flex-1">
                    <p className="text-[10px] text-gray-500 font-mono mb-2 font-medium">
                      {formatDateTime(event.created_at, userLang, userTimezone)}
                    </p>
                    <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl text-sm text-gray-300 shadow-sm leading-relaxed">
                      {event.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA LATERAL */}
        <div className="space-y-6">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 md:p-6 sticky top-6 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {t.quickNoteTitle}
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-32 lg:h-40 bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-sm text-gray-300 outline-none focus:border-blue-500 resize-none transition-all placeholder-gray-600"
              placeholder={t.notePlaceholder}
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote || !note.trim()}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20 disabled:shadow-none"
            >
              {savingNote ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t.addNote
              )}
            </button>
          </div>

          {/* Valor do Lead */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 md:p-6 shadow-xl">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">{t.value}</h3>
            <p className="text-3xl font-black text-emerald-400">
              {formatPrice(lead.total_em_vendas, userCurrency, userLang)}
            </p>
          </div>
        </div>
      </div>

      {/* Click outside para fechar dropdowns */}
      {(isStageDropdownOpen || isTagDropdownOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsStageDropdownOpen(false)
            setIsTagDropdownOpen(false)
          }}
        />
      )}
    </div>
  )
}