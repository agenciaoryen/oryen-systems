'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { formatPrice, formatSource } from '@/lib/format'
import LeadDocuments from './components/LeadDocuments'
import FinancingSimulation from './components/FinancingSimulation'
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
  ExternalLink,
  Pencil,
  Timer,
  Trash2,
  Save,
  Ban,
  RotateCcw
} from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'
import { toast } from 'sonner'

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
  tipo_contato?: string
  interesse?: string
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

interface LeadTag {
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
    loading: 'Carregando dados do Contato...',
    notFoundTitle: 'Ops! Contato não encontrado.',
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
    value: 'Valor do Negócio',
    source: 'Origem',
    niche: 'Nicho',
    stage: 'Etapa',
    timelineTitle: 'Linha do Tempo',
    emptyHistory: 'Nenhum histórico registrado.',
    quickNoteTitle: 'Anotação Rápida',
    notePlaceholder: 'Escreva algo sobre este contato...',
    addNote: 'Adicionar ao Histórico',
    errorUpdate: 'Erro ao salvar alteração.',
    errorNote: 'Erro ao salvar anotação.',
    tagsTitle: 'Tags',
    addTag: 'Adicionar tag',
    noTags: 'Sem tags',
    selectStage: 'Selecionar etapa',
    createdAt: 'Criado em',
    updatedAt: 'Atualizado em',
    leadInfo: 'Informações do Contato',
    quickActions: 'Ações Rápidas',
    stageChanged: 'Etapa alterada para',
    tagAdded: 'Tag adicionada:',
    tagRemoved: 'Tag removida:',
    noName: 'Sem nome',
    editName: 'Editar nome',
    namePlaceholder: 'Nome do contato',
    noTagsAvailable: 'Nenhuma tag disponível',
    createTagsInSettings: 'Criar tags em Configurações',
    contactType: 'Tipo de Contato',
    contactTypePlaceholder: 'Selecione...',
    interest: 'Interesse',
    interestPlaceholder: 'Selecione...',
    typeBuyer: 'Comprador',
    typeSeller: 'Vendedor',
    typeTenant: 'Locatário',
    typeLandlord: 'Proprietário',
    intPurchase: 'Compra',
    intRental: 'Locação',
    intBoth: 'Compra e Locação',
    attendantPause: 'Pausa do atendente',
    agentReturnsIn: 'Agente retorna em',
    reactivateAI: 'Reativar IA',
    deleteEventConfirm: 'Tem certeza que deseja excluir este registro?',
    deleteEventSuccess: 'Registro excluído com sucesso',
    editEventSuccess: 'Registro editado com sucesso',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    markAsLost: 'Marcar como perdido',
    reopenLead: 'Reabrir lead',
    lostModalTitle: 'Marcar lead como perdido',
    lostModalDesc: 'Leads perdidos não contam na quota do plano e podem ser reabertos a qualquer momento.',
    lostReasonLabel: 'Motivo (opcional)',
    lostReasonPlaceholder: 'Ex: sem orçamento, comprou outro imóvel, sem retorno...',
    confirmLost: 'Confirmar perda',
    leadMarkedLost: 'Lead marcado como perdido',
    leadReopened: 'Lead reaberto',
    noLostStage: 'Configure um estágio "Perdido" em Configurações primeiro',
    lostReasonPrefix: 'Motivo da perda:',
  },
  en: {
    back: 'Back',
    loading: 'Loading Contact data...',
    notFoundTitle: 'Oops! Contact not found.',
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
    value: 'Deal Value',
    source: 'Source',
    niche: 'Niche',
    stage: 'Stage',
    timelineTitle: 'Timeline',
    emptyHistory: 'No history recorded.',
    quickNoteTitle: 'Quick Note',
    notePlaceholder: 'Write something about this contact...',
    addNote: 'Add to History',
    errorUpdate: 'Error saving changes.',
    errorNote: 'Error saving note.',
    tagsTitle: 'Tags',
    addTag: 'Add tag',
    noTags: 'No tags',
    selectStage: 'Select stage',
    createdAt: 'Created at',
    updatedAt: 'Updated at',
    leadInfo: 'Contact Information',
    quickActions: 'Quick Actions',
    stageChanged: 'Stage changed to',
    tagAdded: 'Tag added:',
    tagRemoved: 'Tag removed:',
    noName: 'No name',
    editName: 'Edit name',
    namePlaceholder: 'Contact name',
    noTagsAvailable: 'No tags available',
    createTagsInSettings: 'Create tags in Settings',
    contactType: 'Contact Type',
    contactTypePlaceholder: 'Select...',
    interest: 'Interest',
    interestPlaceholder: 'Select...',
    typeBuyer: 'Buyer',
    typeSeller: 'Seller',
    typeTenant: 'Tenant',
    typeLandlord: 'Landlord',
    intPurchase: 'Purchase',
    intRental: 'Rental',
    intBoth: 'Purchase & Rental',
    attendantPause: 'Attendant pause',
    agentReturnsIn: 'Agent returns in',
    reactivateAI: 'Reactivate AI',
    deleteEventConfirm: 'Are you sure you want to delete this record?',
    deleteEventSuccess: 'Record deleted successfully',
    editEventSuccess: 'Record edited successfully',
    confirm: 'Confirm',
    cancel: 'Cancel',
    markAsLost: 'Mark as lost',
    reopenLead: 'Reopen lead',
    lostModalTitle: 'Mark lead as lost',
    lostModalDesc: "Lost leads don't count against your plan quota and can be reopened anytime.",
    lostReasonLabel: 'Reason (optional)',
    lostReasonPlaceholder: 'E.g. no budget, bought another property, no response...',
    confirmLost: 'Confirm loss',
    leadMarkedLost: 'Lead marked as lost',
    leadReopened: 'Lead reopened',
    noLostStage: 'Configure a "Lost" stage in Settings first',
    lostReasonPrefix: 'Loss reason:',
  },
  es: {
    back: 'Volver',
    loading: 'Cargando datos del Contacto...',
    notFoundTitle: '¡Ops! Contacto no encontrado.',
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
    value: 'Valor del Negocio',
    source: 'Origen',
    niche: 'Nicho',
    stage: 'Etapa',
    timelineTitle: 'Línea de Tiempo',
    emptyHistory: 'Ningún historial registrado.',
    quickNoteTitle: 'Nota Rápida',
    notePlaceholder: 'Escribe algo sobre este contacto...',
    addNote: 'Añadir al Historial',
    errorUpdate: 'Error al guardar cambios.',
    errorNote: 'Error al guardar nota.',
    tagsTitle: 'Tags',
    addTag: 'Añadir tag',
    noTags: 'Sin tags',
    selectStage: 'Seleccionar etapa',
    createdAt: 'Creado el',
    updatedAt: 'Actualizado el',
    leadInfo: 'Información del Contacto',
    quickActions: 'Acciones Rápidas',
    stageChanged: 'Etapa cambiada a',
    tagAdded: 'Tag añadida:',
    tagRemoved: 'Tag eliminada:',
    noName: 'Sin nombre',
    editName: 'Editar nombre',
    namePlaceholder: 'Nombre del contacto',
    noTagsAvailable: 'Ninguna tag disponible',
    createTagsInSettings: 'Crear tags en Configuración',
    contactType: 'Tipo de Contacto',
    contactTypePlaceholder: 'Seleccionar...',
    interest: 'Interés',
    interestPlaceholder: 'Seleccionar...',
    typeBuyer: 'Comprador',
    typeSeller: 'Vendedor',
    typeTenant: 'Arrendatario',
    typeLandlord: 'Propietario',
    intPurchase: 'Compra',
    intRental: 'Alquiler',
    intBoth: 'Compra y Alquiler',
    attendantPause: 'Pausa del atendente',
    agentReturnsIn: 'Agente regresa en',
    reactivateAI: 'Reactivar IA',
    deleteEventConfirm: '¿Estás seguro de que deseas eliminar este registro?',
    deleteEventSuccess: 'Registro eliminado con éxito',
    editEventSuccess: 'Registro editado con éxito',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    markAsLost: 'Marcar como perdido',
    reopenLead: 'Reabrir lead',
    lostModalTitle: 'Marcar lead como perdido',
    lostModalDesc: 'Los leads perdidos no cuentan para la cuota del plan y pueden reabrirse en cualquier momento.',
    lostReasonLabel: 'Motivo (opcional)',
    lostReasonPlaceholder: 'Ej: sin presupuesto, compró otro inmueble, sin respuesta...',
    confirmLost: 'Confirmar pérdida',
    leadMarkedLost: 'Lead marcado como perdido',
    leadReopened: 'Lead reabierto',
    noLostStage: 'Configura una etapa "Perdido" en Configuración primero',
    lostReasonPrefix: 'Motivo de la pérdida:',
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

const TAG_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blue:   { bg: 'var(--tag-blue-bg)',   text: 'var(--tag-blue-text)',   border: 'var(--tag-blue-border)',   dot: '#5A7AE6' },
  green:  { bg: 'var(--tag-green-bg)',  text: 'var(--tag-green-text)',  border: 'var(--tag-green-border)',  dot: '#34B368' },
  red:    { bg: 'var(--tag-red-bg)',    text: 'var(--tag-red-text)',    border: 'var(--tag-red-border)',    dot: '#D95454' },
  yellow: { bg: 'var(--tag-yellow-bg)', text: 'var(--tag-yellow-text)', border: 'var(--tag-yellow-border)', dot: '#DDA032' },
  purple: { bg: 'var(--tag-purple-bg)', text: 'var(--tag-purple-text)', border: 'var(--tag-purple-border)', dot: '#9568D0' },
  pink:   { bg: 'var(--tag-pink-bg)',   text: 'var(--tag-pink-text)',   border: 'var(--tag-pink-border)',   dot: '#D06090' },
  indigo: { bg: 'var(--tag-indigo-bg)', text: 'var(--tag-indigo-text)', border: 'var(--tag-indigo-border)', dot: '#6E6BD6' },
  cyan:   { bg: 'var(--tag-cyan-bg)',   text: 'var(--tag-cyan-text)',   border: 'var(--tag-cyan-border)',   dot: '#4AAAD6' },
  orange: { bg: 'var(--tag-orange-bg)', text: 'var(--tag-orange-text)', border: 'var(--tag-orange-border)', dot: '#D98A30' },
  gray:   { bg: 'var(--tag-gray-bg)',   text: 'var(--tag-gray-text)',   border: 'var(--tag-gray-border)',   dot: '#6B7280' },
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
  const { user, activeOrg } = useAuth()
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
  const [allTags, setAllTags] = useState<LeadTag[]>([])
  const [leadTags, setLeadTags] = useState<LeadTag[]>([])

  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const [savingStage, setSavingStage] = useState(false)

  // Estado da pausa temporária (STOP do atendente)
  const [stopRemaining, setStopRemaining] = useState(0)

  // Estados de edição de nome
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')

  // Estados de edição/exclusão de eventos da timeline
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingEventContent, setEditingEventContent] = useState('')
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null)
  const [editCompany, setEditCompany] = useState('')

  // Estados do modal "Marcar como perdido"
  const [showLostModal, setShowLostModal] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [savingLost, setSavingLost] = useState(false)

  // ─── CARREGAR DADOS ───
  const fetchData = useCallback(async () => {
    if (!leadId || !orgId) return

    try {
      setLoading(true)
      setErrorMessage(null)

      const [leadRes, eventsRes, stagesRes, tagsRes, leadTagsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).single(),
        supabase.from('lead_events').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
        supabase.from('pipeline_stages').select('*').eq('org_id', orgId).eq('is_active', true).order('position'),
        supabase.from('tags').select('*').eq('org_id', orgId).order('name'),
        supabase.from('lead_tags').select('tag_id').eq('lead_id', leadId)
      ])

      if (leadRes.error) throw leadRes.error
      if (!leadRes.data) {
        setErrorMessage(t.notFoundDesc)
        return
      }

      if (leadRes.data.org_id !== orgId) {
        setErrorMessage(t.notFoundDesc)
        return
      }

      setLead(leadRes.data)
      setEditName(leadRes.data.name || '')
      setEditCompany(leadRes.data.nome_empresa || '')
      setEvents(eventsRes.data || [])
      setPipelineStages(stagesRes.data || [])
      setAllTags(tagsRes.data || [])

      const leadTagIds = (leadTagsRes.data || []).map(lt => lt.tag_id)
      const leadTagsData = (tagsRes.data || []).filter(tag => leadTagIds.includes(tag.id))
      setLeadTags(leadTagsData)

    } catch (err: unknown) {
      console.error('Erro ao carregar dados:', err)
      const error = err as { message?: string }
      setErrorMessage(error.message || t.errorUpdate)
    } finally {
      setLoading(false)
    }
  }, [leadId, orgId, t.notFoundDesc, t.errorUpdate])

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

  // ─── STOP TTL (pausa temporária do atendente) ───
  useEffect(() => {
    if (!lead?.phone || !orgId) return
    let interval: ReturnType<typeof setInterval> | null = null

    const fetchStopTTL = async () => {
      try {
        const res = await fetch(`/api/sdr/stop-status?org_id=${orgId}&phone=${lead.phone}`)
        const data = await res.json()
        if (data.active && data.remaining_seconds > 0) {
          setStopRemaining(data.remaining_seconds)
          // Countdown local a cada segundo
          interval = setInterval(() => {
            setStopRemaining(prev => {
              if (prev <= 1) {
                if (interval) clearInterval(interval)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        } else {
          setStopRemaining(0)
        }
      } catch {
        setStopRemaining(0)
      }
    }

    fetchStopTTL()
    // Re-check a cada 60s para sincronizar (caso atendente mande outra msg e renove o timer)
    const sync = setInterval(fetchStopTTL, 60000)

    return () => {
      if (interval) clearInterval(interval)
      clearInterval(sync)
    }
  }, [lead?.phone, orgId])

  // ─── LIMPAR STOP (reativar IA imediatamente) ───
  const handleClearStop = async () => {
    if (!lead?.phone || !orgId) return
    try {
      await fetch('/api/sdr/stop-clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, phone: lead.phone })
      })
      setStopRemaining(0)
    } catch (err) {
      console.error('Erro ao limpar STOP:', err)
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

  // ─── SALVAR NOME/EMPRESA ───
  const handleSaveName = async () => {
    if (!leadId || !lead) return

    const newName = editName.trim() || null
    const newCompany = editCompany.trim() || null

    setLead(prev => prev ? { ...prev, name: newName || '', nome_empresa: newCompany || undefined } : null)
    setIsEditingName(false)

    const { error } = await supabase
      .from('leads')
      .update({ 
        name: newName, 
        nome_empresa: newCompany, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', leadId)

    if (error) {
      console.error('Erro ao atualizar nome:', error)
      setLead(prev => prev ? { ...prev, name: lead.name, nome_empresa: lead.nome_empresa } : null)
      setEditName(lead.name || '')
      setEditCompany(lead.nome_empresa || '')
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

  // ─── MARCAR COMO PERDIDO ───
  const handleConfirmMarkAsLost = async () => {
    if (!lead || !leadId) return
    const lostStage = pipelineStages.find(s => s.is_lost)
    if (!lostStage) {
      toast.error(t.noLostStage)
      return
    }

    setSavingLost(true)
    try {
      await handleChangeStage(lostStage.name)

      // Se o usuário escreveu um motivo, adiciona como nota separada na timeline
      const reason = lostReason.trim()
      if (reason) {
        const { data: noteEvent } = await supabase
          .from('lead_events')
          .insert({
            lead_id: leadId,
            type: 'note',
            content: `${t.lostReasonPrefix} ${reason}`,
          })
          .select()
          .single()
        if (noteEvent) setEvents(prev => [noteEvent, ...prev])
      }

      toast.success(t.leadMarkedLost)
      setShowLostModal(false)
      setLostReason('')
    } catch (err) {
      console.error('Erro ao marcar como perdido:', err)
      toast.error(t.errorUpdate)
    } finally {
      setSavingLost(false)
    }
  }

  const handleReopenLead = async () => {
    if (!lead || !leadId) return
    // Primeiro stage não terminal (ordem de posição)
    const firstOpenStage = pipelineStages.find(s => !s.is_lost && !s.is_won && s.is_active)
    if (!firstOpenStage) return

    setSavingLost(true)
    try {
      await handleChangeStage(firstOpenStage.name)
      toast.success(t.leadReopened)
    } finally {
      setSavingLost(false)
    }
  }

  // ─── ADICIONAR TAG ───
  const handleAddTag = async (tag: LeadTag) => {
    if (!leadId || leadTags.some(lt => lt.id === tag.id)) {
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
      setLeadTags(prev => prev.filter(lt => lt.id !== tag.id))
    }
  }

  // ─── REMOVER TAG ───
  const handleRemoveTag = async (tag: LeadTag) => {
    if (!leadId) return

    setLeadTags(prev => prev.filter(lt => lt.id !== tag.id))

    try {
      const { error } = await supabase
        .from('lead_tags')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tag.id)

      if (error) throw error

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

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from('lead_events').delete().eq('id', eventId)
    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== eventId))
      toast.success(t.deleteEventSuccess)
    }
    setConfirmDeleteEventId(null)
  }

  const handleEditEvent = async (eventId: string) => {
    if (!editingEventContent.trim()) return
    const { error } = await supabase
      .from('lead_events')
      .update({ content: editingEventContent.trim() })
      .eq('id', eventId)
    if (!error) {
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, content: editingEventContent.trim() } : e))
      setEditingEventId(null)
      setEditingEventContent('')
      toast.success(t.editEventSuccess)
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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
        <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: 'var(--color-primary)' }} />
        <p className="animate-pulse font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{t.loading}</p>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
        <div className="text-6xl mb-4" style={{ color: 'var(--color-error)' }}>⚠️</div>
        <h2 className="text-2xl font-bold mb-2">{t.notFoundTitle}</h2>
        <p className="mb-6" style={{ color: 'var(--color-text-tertiary)' }}>{errorMessage || t.notFoundDesc}</p>
        <div className="p-2 rounded text-xs font-mono mb-6" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
          {t.notFoundId} {leadId || 'N/A'}
        </div>
        <button
          onClick={() => router.push('/dashboard/crm')}
          className="px-6 py-2 rounded-lg transition-colors font-bold shadow-lg"
          style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 12px rgba(90, 122, 230, 0.25)' }}
        >
          {t.backToCrm}
        </button>
      </div>
    )
  }

  const displayName = lead.name || t.noName
  const currentStage = pipelineStages.find(s => s.name === lead.stage)
  const stageColor = currentStage ? getStageColor(currentStage.color) : getStageColor('gray')
  const availableTags = allTags.filter(tag => !leadTags.some(lt => lt.id === tag.id))
  const isLeadLost = !!currentStage?.is_lost
  const hasLostStageConfigured = pipelineStages.some(s => s.is_lost)

  return (
    <div className="min-h-[calc(100vh-100px)] p-4 md:p-6 lg:p-10 font-sans pb-24" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)' }}>

      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              router.back()
            } else {
              router.push('/dashboard/crm')
            }
          }}
          className="flex items-center gap-2 text-sm font-medium transition-colors group"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {t.back}
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {hasLostStageConfigured && (
            isLeadLost ? (
              <button
                onClick={handleReopenLead}
                disabled={savingLost || savingStage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 justify-center"
                style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
              >
                {savingLost ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                {t.reopenLead}
              </button>
            ) : (
              <button
                onClick={() => setShowLostModal(true)}
                disabled={savingLost || savingStage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 justify-center"
                style={{ background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--color-error)'
                  el.style.color = 'var(--color-error)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--color-border)'
                  el.style.color = 'var(--color-text-muted)'
                }}
              >
                <Ban size={14} />
                {t.markAsLost}
              </button>
            )
          )}

          <button
            onClick={handleToggleIA}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all shadow-lg w-full sm:w-auto justify-center"
            style={lead.conversa_finalizada
              ? { background: 'var(--color-error-subtle)', borderColor: 'var(--color-error)', color: 'var(--color-error)' }
              : { background: 'var(--color-success-subtle)', borderColor: 'var(--color-success)', color: 'var(--color-success)' }
            }
          >
            <Bot size={16} />
            <div className={`w-2 h-2 rounded-full ${lead.conversa_finalizada ? '' : 'animate-pulse'}`} style={{ background: lead.conversa_finalizada ? 'var(--color-error)' : 'var(--color-success)' }} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {lead.conversa_finalizada ? t.agentPaused : t.agentActive}
            </span>
          </button>
        </div>

        {/* Cronômetro de pausa temporária do atendente */}
        {stopRemaining > 0 && !lead.conversa_finalizada && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
              <Timer size={14} className="animate-pulse" />
              <span className="text-xs font-medium">
                {t.attendantPause} — {t.agentReturnsIn} {Math.floor(stopRemaining / 60)}:{String(stopRemaining % 60).padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={handleClearStop}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all text-xs font-bold uppercase tracking-wider"
              style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}
            >
              <Bot size={12} />
              {t.reactivateAI}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">

        {/* COLUNA PRINCIPAL */}
        <div className="xl:col-span-2 space-y-6">

          {/* CARTÃO DE PERFIL */}
          <div className="rounded-2xl p-5 md:p-8 shadow-2xl relative overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <div className="absolute top-0 left-0 w-full h-1 opacity-50" style={{ background: 'var(--gradient-brand)' }} />

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black shadow-lg" style={{ background: 'var(--gradient-brand)', color: 'var(--color-text-primary)', boxShadow: '0 4px 12px rgba(90, 122, 230, 0.25)' }}>
                {displayName[0]?.toUpperCase() || '?'}
              </div>

              <div className="flex-1 min-w-0 w-full">
                {/* Nome Editável */}
                {isEditingName ? (
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                        {t.namePlaceholder}
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        className="w-full rounded-xl p-3 text-lg outline-none transition-all"
                        style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveName}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false)
                          setEditName(lead.name || '')
                          setEditCompany(lead.nome_empresa || '')
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="flex items-start gap-2 group">
                      <h1 className="text-xl md:text-2xl font-bold break-words leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                        {displayName}
                      </h1>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0 mt-1"
                        style={{ color: 'var(--color-text-muted)' }}
                        title={t.editName}
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
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
                      <div className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                        {pipelineStages.map(stage => {
                          const color = getStageColor(stage.color)
                          const isActive = stage.name === lead.stage
                          return (
                            <button
                              key={stage.id}
                              onClick={() => handleChangeStage(stage.name)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-all`}
                              style={{ background: isActive ? 'var(--color-bg-hover)' : undefined }}
                            >
                              <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                              <span className={`flex-1 text-left ${color.text}`}>{stage.label}</span>
                              {isActive && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {lead.email && (
                    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                      <Mail size={12} />
                      <span className="truncate max-w-[120px] sm:max-w-[180px]">{lead.email}</span>
                    </div>
                  )}

                  {lead.phone && (
                    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                      <Phone size={12} />
                      {lead.phone}
                    </div>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button
                    onClick={openChat}
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg text-sm"
                    style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 12px rgba(90, 122, 230, 0.25)' }}
                  >
                    <MessageSquare size={16} />
                    {t.openChat}
                  </button>
                  <button
                    onClick={openWhatsApp}
                    disabled={!lead.phone}
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg text-sm disabled:opacity-50"
                    style={{ background: 'var(--color-success)', color: '#fff' }}
                  >
                    <ExternalLink size={16} />
                    {t.whatsapp}
                  </button>
                </div>
              </div>
            </div>

            {/* TAGS */}
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.tagsTitle}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {leadTags.map(tag => {
                  const tagColor = getTagColor(tag.color)
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium group"
                      style={{ background: tagColor.bg, color: tagColor.text, border: `1px solid ${tagColor.border}` }}
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border-dashed transition-all"
                    style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    <Plus size={12} />
                    {t.addTag}
                  </button>

                  {isTagDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[200px] overflow-y-auto" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                      {availableTags.length > 0 ? (
                        availableTags.map(tag => {
                          const tagColor = getTagColor(tag.color)
                          return (
                            <button
                              key={tag.id}
                              onClick={() => handleAddTag(tag)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-all"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <span className="w-2 h-2 rounded-full" style={{ background: tagColor.dot }} />
                              <span style={{ color: tagColor.text }}>{tag.name}</span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="px-3 py-4 text-center">
                          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{t.noTagsAvailable}</p>
                          <a
                            href="/dashboard/settings"
                            className="text-xs underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {t.createTagsInSettings}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {leadTags.length === 0 && (
                  <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>{t.noTags}</span>
                )}
              </div>
            </div>

            {/* CAMPOS DE EDIÇÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              {/* Tipo de Contato */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                  <Tag size={10} /> {t.contactType}
                </label>
                <CustomSelect
                  value={lead.tipo_contato || ''}
                  onChange={(v) => handleUpdateField('tipo_contato', v)}
                  options={[
                    { value: '', label: t.contactTypePlaceholder },
                    { value: 'comprador', label: t.typeBuyer },
                    { value: 'vendedor', label: t.typeSeller },
                    { value: 'locatario', label: t.typeTenant },
                    { value: 'proprietario', label: t.typeLandlord },
                  ]}
                />
              </div>

              {/* Interesse */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1" style={{ color: 'var(--color-indigo)' }}>
                  <Globe size={10} /> {t.interest}
                </label>
                <CustomSelect
                  value={lead.interesse || ''}
                  onChange={(v) => handleUpdateField('interesse', v)}
                  options={[
                    { value: '', label: t.interestPlaceholder },
                    { value: 'compra', label: t.intPurchase },
                    { value: 'locacao', label: t.intRental },
                    { value: 'ambos', label: t.intBoth },
                  ]}
                />
              </div>

              {/* Cidade */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <MapPin size={10} /> {t.city}
                </label>
                <input
                  defaultValue={lead.city || ''}
                  onBlur={(e) => handleUpdateField('city', e.target.value)}
                  className="w-full rounded-xl p-3 text-sm outline-none transition-all"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
                  placeholder={t.city}
                />
              </div>

              {/* Instagram */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <Instagram size={10} /> {t.instagram}
                </label>
                <input
                  defaultValue={lead.instagram || ''}
                  onBlur={(e) => handleUpdateField('instagram', e.target.value)}
                  className="w-full rounded-xl p-3 text-sm outline-none transition-all"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
                  placeholder="@instagram"
                />
              </div>

              {/* Site */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <Globe size={10} /> {t.website}
                </label>
                <input
                  defaultValue={lead.url_site || ''}
                  onBlur={(e) => handleUpdateField('url_site', e.target.value)}
                  className="w-full rounded-xl p-3 text-sm outline-none transition-all"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
                  placeholder="https://..."
                />
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                  <DollarSign size={10} /> {t.value} ({userCurrency})
                </label>
                <input
                  type="number"
                  defaultValue={lead.total_em_vendas || 0}
                  onBlur={(e) => handleUpdateField('total_em_vendas', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl p-3 text-sm outline-none font-bold transition-all"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-success)' }}
                />
              </div>
            </div>

            {/* INFO EXTRA */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 text-xs" style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
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
                  {t.source}: <span style={{ color: 'var(--color-text-tertiary)' }}>{formatSource(lead.source, userLang)}</span>
                </div>
              )}
              {lead.nicho && (
                <div className="flex items-center gap-1.5">
                  {t.niche}: <span style={{ color: 'var(--color-primary)' }}>{lead.nicho}</span>
                </div>
              )}
            </div>
          </div>

          {/* TIMELINE */}
          <div className="rounded-2xl p-5 md:p-8 shadow-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <MessageSquare size={18} />
              {t.timelineTitle}
            </h3>

            <div className="space-y-4">
              {events.length === 0 && (
                <div className="text-center py-10 opacity-50">
                  <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>{t.emptyHistory}</p>
                </div>
              )}

              {events.map((event) => (
                <div key={event.id} className="flex gap-4 group/event">
                  <div className="min-w-[2px] relative group-last/event:bg-transparent" style={{ background: 'var(--color-border-subtle)' }}>
                    <div className="absolute top-1 -left-[5px] w-3 h-3 rounded-full" style={{
                      background: event.type === 'stage_change' ? 'var(--color-indigo)' :
                        event.type === 'tag_added' ? 'var(--color-success)' :
                        event.type === 'tag_removed' ? 'var(--color-error)' :
                        'var(--color-primary)',
                      boxShadow: '0 0 0 4px var(--color-bg-base)'
                    }} />
                  </div>
                  <div className="pb-6 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-mono font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        {formatDateTime(event.created_at, userLang, userTimezone)}
                      </p>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover/event:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingEventId(event.id)
                            setEditingEventContent(event.content)
                          }}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
                          style={{ color: 'var(--color-text-secondary)' }}
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteEventId(event.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]"
                          style={{ color: 'var(--color-text-secondary)' }}
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {editingEventId === event.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingEventContent}
                          onChange={(e) => setEditingEventContent(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditEvent(event.id); if (e.key === 'Escape') setEditingEventId(null) }}
                          autoFocus
                          className="flex-1 p-3 rounded-xl text-sm outline-none"
                          style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-primary)', color: 'var(--color-text-secondary)' }}
                        />
                        <button
                          onClick={() => handleEditEvent(event.id)}
                          className="p-3 rounded-xl transition-all"
                          style={{ background: 'var(--color-primary)', color: '#fff' }}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingEventId(null)}
                          className="p-3 rounded-xl transition-all"
                          style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl text-sm shadow-sm leading-relaxed" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}>
                        {event.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA LATERAL */}
        <div className="space-y-6">
          <div className="rounded-2xl p-5 md:p-6 shadow-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
              {t.quickNoteTitle}
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-32 lg:h-40 rounded-xl p-4 text-sm outline-none resize-none transition-all"
              style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
              placeholder={t.notePlaceholder}
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote || !note.trim()}
              className="w-full mt-4 font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg disabled:opacity-50 disabled:shadow-none"
              style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 12px rgba(90, 122, 230, 0.25)' }}
            >
              {savingNote ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t.addNote
              )}
            </button>
          </div>

          {/* Valor do Negócio */}
          <div className="rounded-2xl p-5 md:p-6 shadow-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>{t.value}</h3>
            <p className="text-3xl font-black" style={{ color: 'var(--color-success)' }}>
              {formatPrice(lead.total_em_vendas, userCurrency, userLang)}
            </p>
          </div>

          {/* Simulação de Financiamento - Apenas para imobiliárias */}
          {activeOrg?.niche === 'real_estate' && (
            <div className="rounded-2xl p-5 md:p-6 shadow-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
              <FinancingSimulation
                leadId={lead.id}
                totalEmVendas={lead.total_em_vendas}
                city={lead.city}
                userId={user?.id}
                lang={(user as any)?.language || 'pt'}
              />
            </div>
          )}

          {/* Documentos do Lead - Apenas para nichos específicos */}
          {activeOrg?.niche === 'real_estate' && (
            <div className="rounded-2xl p-5 md:p-6 shadow-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
              <LeadDocuments 
                leadId={lead.id} 
                leadData={{
                  name: lead.name,
                  phone: lead.phone,
                  email: lead.email
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal confirmação de exclusão de evento */}
      {confirmDeleteEventId && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }} onClick={() => setConfirmDeleteEventId(null)}>
          <div className="rounded-2xl w-full max-w-sm p-6 space-y-4" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'var(--color-error-subtle)' }}>
                <Trash2 size={20} style={{ color: 'var(--color-error)' }} />
              </div>
              <p className="text-sm pt-2" style={{ color: 'var(--color-text-secondary)' }}>{t.deleteEventConfirm}</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteEventId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
                style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleDeleteEvent(confirmDeleteEventId)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
                style={{ background: 'var(--color-error)', color: '#fff' }}
              >
                <Trash2 size={14} />
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal: Marcar como perdido */}
      {showLostModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !savingLost && setShowLostModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)' }}
              >
                <Ban size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {t.lostModalTitle}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {t.lostModalDesc}
                </p>
              </div>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {t.lostReasonLabel}
            </label>
            <textarea
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              placeholder={t.lostReasonPlaceholder}
              disabled={savingLost}
              className="w-full h-24 rounded-xl p-3 text-sm outline-none resize-none transition-all mb-4"
              style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setShowLostModal(false); setLostReason('') }}
                disabled={savingLost}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmMarkAsLost}
                disabled={savingLost}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--color-error)', color: '#fff' }}
              >
                {savingLost ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                {t.confirmLost}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}