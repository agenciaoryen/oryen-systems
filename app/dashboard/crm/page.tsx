'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { formatPrice, formatSource } from '@/lib/format'
import { usePlan } from '@/lib/usePlan'
import UpgradeModal from '@/app/dashboard/components/UpgradeModal'
import {
  Search,
  Plus,
  X,
  GripVertical,
  List,
  LayoutGrid,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  Tag,
  Loader2,
  ChevronDown,
  Filter,
  RefreshCw,
  Bot,
  Maximize2,
  Minimize2,
  Users,
  TrendingUp,
  Pause,
  Play,
  Smartphone,
  Upload
} from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface Lead {
  id: string
  name: string
  nome_empresa?: string
  email: string
  phone?: string
  stage?: string
  source?: string
  nicho?: string
  created_at: string
  updated_at?: string
  total_em_vendas?: number
  org_id?: string
  tags?: Tag[]
  conversa_finalizada?: boolean // true = IA pausada, false = IA ativa
  score?: number
  score_label?: 'hot' | 'warm' | 'cold' | 'lost'
  assigned_to?: string
  assigned_to_name?: string
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

interface LeadTag {
  lead_id: string
  tag_id: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Pipeline de Negócios',
    synced: 'Sincronizado em tempo real',
    newLead: 'Novo Contato',
    searchPlaceholder: 'Buscar por nome, email ou celular...',
    days7: '7 dias',
    days30: '30 dias',
    days90: '3 meses',
    daysAll: 'Tudo',
    listView: 'Lista',
    pipelineView: 'Kanban',
    loading: 'Carregando dados...',
    leadsFound: 'contatos encontrados',
    companyLead: 'Contato',
    value: 'Valor',
    stage: 'Etapa',
    source: 'Origem',
    niche: 'Nicho',
    contact: 'Contato',
    entryDate: 'Entrada',
    noLeadsStage: 'Sem contatos nesta etapa',
    noLeadsFound: 'Nenhum contato encontrado',
    noLeadsHint: 'Tente ajustar os filtros ou busca',
    modalTitle: 'Novo Contato',
    nameLabel: 'Nome do Contato*',
    namePlaceholder: 'Ex: João da Silva',
    companyLabel: 'Nome da Empresa',
    companyPlaceholder: 'Ex: Empresa LTDA',
    emailLabel: 'Email',
    phoneLabel: 'Celular / WhatsApp',
    tagsLabel: 'Tags',
    cancel: 'Cancelar',
    save: 'Criar Contato',
    saving: 'Salvando...',
    priority: 'Prioridade',
    stale: 'dias parado',
    contactLabel: 'Contato:',
    pauseAi: 'Pausar IA',
    activateAi: 'Ativar IA',
    filterByTags: 'Filtrar por tags',
    allTags: 'Todas as tags',
    clearFilters: 'Limpar filtros',
    refresh: 'Atualizar',
    managePipeline: 'Gerenciar pipeline',
    errorLoading: 'Erro ao carregar dados',
    errorSaving: 'Erro ao salvar',
    leads: 'Contatos',
    // Footer
    totalLeads: 'Total de Contatos',
    totalValue: 'Valor Total',
    aiActive: 'IA Ativa',
    aiPaused: 'IA Pausada',
    fullscreen: 'Tela cheia',
    exitFullscreen: 'Sair da tela cheia',
    filterAi: 'Filtrar por IA',
    allLeads: 'Todos',
    aiActiveOnly: 'IA Ativa',
    aiPausedOnly: 'IA Pausada',
    aiStatus: 'Status IA',
    importCsv: 'Importar CSV',
    filterAssigned: 'Responsável',
    allBrokers: 'Todos',
    tableAssigned: 'Responsável',
    unassigned: 'Não atribuído',
  },
  en: {
    title: 'Business Pipeline',
    synced: 'Synced in real-time',
    newLead: 'New Contact',
    searchPlaceholder: 'Search by name, email or phone...',
    days7: '7 days',
    days30: '30 days',
    days90: '3 months',
    daysAll: 'All time',
    listView: 'List',
    pipelineView: 'Kanban',
    loading: 'Loading data...',
    leadsFound: 'contacts found',
    companyLead: 'Contact',
    value: 'Value',
    stage: 'Stage',
    source: 'Source',
    niche: 'Niche',
    contact: 'Contact',
    entryDate: 'Entry Date',
    noLeadsStage: 'No contacts in this stage',
    noLeadsFound: 'No contacts found',
    noLeadsHint: 'Try adjusting filters or search',
    modalTitle: 'New Contact',
    nameLabel: 'Contact Name*',
    namePlaceholder: 'Ex: John Doe',
    companyLabel: 'Company Name',
    companyPlaceholder: 'Ex: Company LLC',
    emailLabel: 'Email',
    phoneLabel: 'Phone / WhatsApp',
    tagsLabel: 'Tags',
    cancel: 'Cancel',
    save: 'Create Contact',
    saving: 'Saving...',
    priority: 'Priority',
    stale: 'days stale',
    contactLabel: 'Contact:',
    pauseAi: 'Pause AI',
    activateAi: 'Activate AI',
    filterByTags: 'Filter by tags',
    allTags: 'All tags',
    clearFilters: 'Clear filters',
    refresh: 'Refresh',
    managePipeline: 'Manage pipeline',
    errorLoading: 'Error loading data',
    errorSaving: 'Error saving',
    leads: 'Contacts',
    // Footer
    totalLeads: 'Total Contacts',
    totalValue: 'Total Value',
    aiActive: 'AI Active',
    aiPaused: 'AI Paused',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    filterAi: 'Filter by AI',
    allLeads: 'All',
    aiActiveOnly: 'AI Active',
    aiPausedOnly: 'AI Paused',
    aiStatus: 'AI Status',
    importCsv: 'Import CSV',
    filterAssigned: 'Assigned To',
    allBrokers: 'All',
    tableAssigned: 'Assigned To',
    unassigned: 'Unassigned',
  },
  es: {
    title: 'Pipeline de Negocios',
    synced: 'Sincronizado en tiempo real',
    newLead: 'Nuevo Contacto',
    searchPlaceholder: 'Buscar por nombre, email o teléfono...',
    days7: '7 días',
    days30: '30 días',
    days90: '3 meses',
    daysAll: 'Todo',
    listView: 'Lista',
    pipelineView: 'Kanban',
    loading: 'Cargando datos...',
    leadsFound: 'contactos encontrados',
    companyLead: 'Contacto',
    value: 'Valor',
    stage: 'Etapa',
    source: 'Origen',
    niche: 'Nicho',
    contact: 'Contacto',
    entryDate: 'Fecha Entrada',
    noLeadsStage: 'Sin contactos en esta etapa',
    noLeadsFound: 'No se encontraron contactos',
    noLeadsHint: 'Intenta ajustar los filtros',
    modalTitle: 'Nuevo Contacto',
    nameLabel: 'Nombre del Contacto*',
    namePlaceholder: 'Ej: Juan Pérez',
    companyLabel: 'Nombre de la Empresa',
    companyPlaceholder: 'Ej: Empresa S.A.',
    emailLabel: 'Email',
    phoneLabel: 'Celular / WhatsApp',
    tagsLabel: 'Tags',
    cancel: 'Cancelar',
    save: 'Crear Contacto',
    saving: 'Guardando...',
    priority: 'Prioridad',
    stale: 'días sin actualización',
    contactLabel: 'Contacto:',
    pauseAi: 'Pausar IA',
    activateAi: 'Activar IA',
    filterByTags: 'Filtrar por tags',
    allTags: 'Todas las tags',
    clearFilters: 'Limpiar filtros',
    refresh: 'Actualizar',
    managePipeline: 'Gestionar pipeline',
    errorLoading: 'Error al cargar datos',
    errorSaving: 'Error al guardar',
    leads: 'Contactos',
    // Footer
    totalLeads: 'Total de Contactos',
    totalValue: 'Valor Total',
    aiActive: 'IA Activa',
    aiPaused: 'IA Pausada',
    fullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    filterAi: 'Filtrar por IA',
    allLeads: 'Todos',
    aiActiveOnly: 'IA Activa',
    aiPausedOnly: 'IA Pausada',
    aiStatus: 'Estado IA',
    importCsv: 'Importar CSV',
    filterAssigned: 'Responsable',
    allBrokers: 'Todos',
    tableAssigned: 'Responsable',
    unassigned: 'Sin asignar',
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// CORES DOS ESTÁGIOS
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
  pink: { text: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/60', dot: 'bg-pink-500' },
  yellow: { text: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/60', dot: 'bg-yellow-500' },
  green: { text: 'text-green-300', bg: 'bg-green-500/10', border: 'border-green-500/60', dot: 'bg-green-500' },
  red: { text: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/60', dot: 'bg-red-500' },
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

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

const getStageColor = (color: string) => STAGE_COLORS[color] || STAGE_COLORS.gray
const getTagColor = (color: string) => TAG_COLORS[color] || TAG_COLORS.gray

const SCORE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  hot:  { label: 'HOT',  bg: 'rgba(239,68,68,0.12)',  color: 'rgb(239,68,68)',  border: 'rgba(239,68,68,0.25)' },
  warm: { label: 'WARM', bg: 'rgba(234,179,8,0.12)',   color: 'rgb(202,138,4)',  border: 'rgba(234,179,8,0.25)' },
  cold: { label: 'COLD', bg: 'rgba(107,114,128,0.12)', color: 'rgb(107,114,128)', border: 'rgba(107,114,128,0.25)' },
  lost: { label: 'LOST', bg: 'rgba(107,114,128,0.08)', color: 'rgb(107,114,128)', border: 'rgba(107,114,128,0.15)' },
}

const STAGE_HEX: Record<string, string> = {
  gray: '#6B7280', blue: '#5A7AE6', orange: '#D98A30', purple: '#9568D0',
  indigo: '#6E6BD6', emerald: '#34B368', rose: '#D4506A', pink: '#D06090',
  yellow: '#D4A420', green: '#34B368', red: '#D95454',
}

const getStageHex = (color: string) => STAGE_HEX[color] || STAGE_HEX.gray

const getInitials = (name: string) => {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

const getDaysSinceUpdate = (updatedAt?: string) => {
  if (!updatedAt) return 0
  const now = new Date()
  const updated = new Date(updatedAt)
  const diffTime = Math.abs(now.getTime() - updated.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const formatDate = (dateString: string, lang: string, timezone: string) => {
  try {
    return new Date(dateString).toLocaleDateString(lang, {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return '--/--/----'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: AI Status Badge
// ═══════════════════════════════════════════════════════════════════════════════

function AiStatusBadge({ isActive, size = 'sm' }: { isActive: boolean; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const iconSize = size === 'sm' ? 10 : 12
  
  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center`}
      style={{
        background: isActive ? 'var(--color-success)' : 'var(--color-accent)',
        boxShadow: isActive ? '0 0 8px rgba(52, 179, 104, 0.6)' : '0 0 8px rgba(221, 160, 50, 0.6)',
      }}
      title={isActive ? 'IA Ativa' : 'IA Pausada'}
    >
      <Bot size={iconSize} className="text-white" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function CrmPage() {
  const router = useRouter()
  const { user } = useAuth()
  const orgId = useActiveOrgId()
  const { canUseAiAgents } = usePlan()

  // Configurações do usuário
  const userLang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]
  const userCurrency = user?.currency || 'BRL'
  const userTimezone = user?.timezone || 'America/Sao_Paulo'

  // Estados principais
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [leadTags, setLeadTags] = useState<LeadTag[]>([])

  // Config do card do lead (campos visíveis)
  const DEFAULT_CARD_FIELDS = ['total_em_vendas', 'phone', 'email', 'tags', 'source', 'created_at']
  const [cardFields, setCardFields] = useState<string[]>(DEFAULT_CARD_FIELDS)
  const [cardShowStale, setCardShowStale] = useState(true)
  const [cardShowAiStatus, setCardShowAiStatus] = useState(true)

  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline')
  const [daysFilter, setDaysFilter] = useState('30')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [aiFilter, setAiFilter] = useState<'all' | 'active' | 'paused'>('all')
  const [filterAssigned, setFilterAssigned] = useState<string>('all')
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string }[]>([])

  // Estados de Drag & Drop
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; current: number; limit: number }>({ open: false, current: 0, limit: 0 })
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    nome_empresa: '',
    email: '',
    phone: '',
    selectedTags: [] as string[]
  })

  // ─── FULLSCREEN ───
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ─── CARREGAR DADOS ───
  const loadData = useCallback(async () => {
    if (!orgId) return

    setLoading(true)

    try {
      // Calcular data de filtro
      let filterDate: string | null = null
      if (daysFilter !== 'all') {
        const date = new Date()
        date.setDate(date.getDate() - parseInt(daysFilter))
        filterDate = date.toISOString()
      }

      // Buscar tudo em paralelo
      const [stagesRes, tagsRes, leadTagsRes, orgConfigRes] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('*')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('position'),
        supabase
          .from('tags')
          .select('*')
          .eq('org_id', orgId)
          .order('name'),
        supabase
          .from('lead_tags')
          .select('lead_id, tag_id'),
        supabase
          .from('orgs')
          .select('lead_card_config')
          .eq('id', orgId)
          .single()
      ])

      // Buscar leads — sem paginação infinita, query direta com filtro de data
      let query = supabase
        .from('leads')
        .select('*, conversa_finalizada, score, score_label')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(500)

      if (filterDate) {
        query = query.or(`created_at.gte.${filterDate},updated_at.gte.${filterDate}`)
      }

      const { data: allLeads, error: leadsErr } = await query
      if (leadsErr) throw leadsErr

      // Fetch assigned user names
      const leadsWithNames = allLeads || []
      const assignedIds = [...new Set(leadsWithNames.filter(l => l.assigned_to).map(l => l.assigned_to))]
      if (assignedIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, full_name').in('id', assignedIds)
        const userMap = new Map(users?.map(u => [u.id, u.full_name]) || [])
        leadsWithNames.forEach(l => { if (l.assigned_to) l.assigned_to_name = userMap.get(l.assigned_to) || undefined })
      }

      // Fetch team members for the org (for Responsavel filter)
      const { data: members } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('org_id', orgId)
        .order('full_name')
      setTeamMembers(members || [])

      setPipelineStages(stagesRes.data || [])
      setTags(tagsRes.data || [])
      setLeadTags(leadTagsRes.data || [])
      setLeads(leadsWithNames)

      // Carregar config do card do lead
      const config = orgConfigRes.data?.lead_card_config as any
      if (config) {
        if (config.fields) setCardFields(config.fields)
        if (config.show_stale_indicator !== undefined) setCardShowStale(config.show_stale_indicator)
        if (config.show_ai_status !== undefined) setCardShowAiStatus(config.show_ai_status)
      }

    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, daysFilter])

  // Carregar quando orgId mudar
  useEffect(() => {
    if (orgId) {
      loadData()
    }
  }, [orgId, loadData])

  // ─── FILTRAR LEADS ───
  const filteredLeads = leads.filter(lead => {
    // Filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        lead.name?.toLowerCase().includes(query) ||
        lead.nome_empresa?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query)
      )
      if (!matchesSearch) return false
    }

    // Filtro de tags
    if (selectedTags.length > 0) {
      const leadTagIds = leadTags
        .filter(lt => lt.lead_id === lead.id)
        .map(lt => lt.tag_id)
      const hasSelectedTag = selectedTags.some(tagId => leadTagIds.includes(tagId))
      if (!hasSelectedTag) return false
    }

    // Filtro de IA
    if (aiFilter !== 'all') {
      const isAiActive = lead.conversa_finalizada === false
      if (aiFilter === 'active' && !isAiActive) return false
      if (aiFilter === 'paused' && isAiActive) return false
    }

    // Filtro de Responsável
    if (filterAssigned !== 'all') {
      if (filterAssigned === 'unassigned') {
        if (lead.assigned_to) return false
      } else {
        if (lead.assigned_to !== filterAssigned) return false
      }
    }

    return true
  })

  // ─── ESTATÍSTICAS ───
  const stats = {
    totalLeads: filteredLeads.length,
    totalValue: filteredLeads.reduce((sum, lead) => sum + (lead.total_em_vendas || 0), 0),
    aiActive: leads.filter(l => l.conversa_finalizada === false).length,
    aiPaused: leads.filter(l => l.conversa_finalizada === true).length
  }

  // ─── AGRUPAR LEADS POR ESTÁGIO ───
  const getGroupedLeads = () => {
    const groups: Record<string, Lead[]> = {}
    const sums: Record<string, number> = {}

    pipelineStages.forEach(stage => {
      groups[stage.name] = []
      sums[stage.name] = 0
    })

    filteredLeads.forEach(lead => {
      const stageName = lead.stage || pipelineStages[0]?.name || 'captado'
      if (groups[stageName]) {
        groups[stageName].push(lead)
        sums[stageName] += (lead.total_em_vendas || 0)
      } else if (pipelineStages.length > 0) {
        // Se o estágio do lead não existe, coloca no primeiro
        groups[pipelineStages[0].name].push(lead)
        sums[pipelineStages[0].name] += (lead.total_em_vendas || 0)
      }
    })

    return { groups, sums }
  }

  const { groups: pipelineData, sums: pipelineSums } = getGroupedLeads()

  // ─── DRAG & DROP ───
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedLeadId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    if (!draggedLeadId) return

    const leadToMove = leads.find(l => l.id === draggedLeadId)
    if (!leadToMove || leadToMove.stage === targetStage) {
      setDraggedLeadId(null)
      return
    }

    const originalStage = leadToMove.stage || 'captado'
    const originalLeads = [...leads]

    // Atualização otimista
    setLeads(prev => prev.map(lead =>
      lead.id === draggedLeadId
        ? { ...lead, stage: targetStage, updated_at: new Date().toISOString() }
        : lead
    ))

    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: targetStage, updated_at: new Date().toISOString() })
        .eq('id', draggedLeadId)

      if (error) throw error

      // Registrar evento
      await supabase.from('lead_events').insert({
        lead_id: draggedLeadId,
        type: 'stage_change',
        content: `Alterou etapa de ${originalStage} para ${targetStage}`
      })

    } catch (err) {
      console.error('Erro ao mover lead:', err)
      setLeads(originalLeads)
    } finally {
      setDraggedLeadId(null)
    }
  }

  // ─── CRIAR LEAD ───
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!orgId || !newLeadData.name.trim()) return

    setIsSaving(true)

    try {
      // Verificar limite de leads do plano
      const limitRes = await fetch(`/api/plan-limit?org_id=${orgId}&resource=leads`)
      const limitData = await limitRes.json()
      if (!limitData.allowed) {
        setUpgradeModal({ open: true, current: limitData.current, limit: limitData.limit })
        setIsSaving(false)
        return
      }

      const { data, error } = await supabase
        .from('leads')
        .insert({
          org_id: orgId,
          name: newLeadData.name,
          nome_empresa: newLeadData.nome_empresa || null,
          email: newLeadData.email || null,
          phone: newLeadData.phone || null,
          stage: pipelineStages[0]?.name || 'captado',
        })
        .select()
        .single()

      if (error) throw error

      // Adicionar tags ao lead
      if (data && newLeadData.selectedTags.length > 0) {
        const tagInserts = newLeadData.selectedTags.map(tagId => ({
          lead_id: data.id,
          tag_id: tagId
        }))
        await supabase.from('lead_tags').insert(tagInserts)
        setLeadTags(prev => [...prev, ...tagInserts])
      }

      if (data) {
        setLeads(prev => [data, ...prev])
        setNewLeadData({ name: '', nome_empresa: '', email: '', phone: '', selectedTags: [] })
        setIsModalOpen(false)
      }

    } catch (error: unknown) {
      console.error('Erro ao criar lead:', error)
      const err = error as { code?: string; message?: string }
      if (err.code === '23505') {
        alert('Este e-mail ou telefone já está cadastrado.')
      } else {
        alert(err.message || t.errorSaving)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ─── NAVEGAÇÃO ───
  const handleOpenLead = (leadId: string) => {
    router.push(`/dashboard/crm/${leadId}`)
  }

  // ─── TOGGLE IA NO CARD ───
  const handleToggleAi = async (e: React.MouseEvent, leadId: string, currentValue: boolean) => {
    e.stopPropagation() // não abre o lead
    const newValue = !currentValue
    // Atualizar otimisticamente
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, conversa_finalizada: newValue } : l))
    const { error } = await supabase
      .from('leads')
      .update({ conversa_finalizada: newValue })
      .eq('id', leadId)
    if (error) {
      // Rollback
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, conversa_finalizada: currentValue } : l))
    }
  }

  // ─── OBTER TAGS DO LEAD ───
  const getLeadTags = (leadId: string): Tag[] => {
    const tagIds = leadTags.filter(lt => lt.lead_id === leadId).map(lt => lt.tag_id)
    return tags.filter(tag => tagIds.includes(tag.id))
  }

  // ─── RENDER ───
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4.5rem)] text-gray-200 font-sans" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>

      {/* HEADER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-4 md:px-6 py-4 shrink-0 gap-4" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-base)' }}>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            {t.title}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }}>
              {filteredLeads.length}
            </span>
          </h1>
          <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-success)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--color-success)' }} />
            </span>
            {t.synced}
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto flex-wrap">
          {/* Botão Import CSV */}
          <button
            onClick={() => router.push('/dashboard/crm/import')}
            className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <Upload size={16} />
            <span className="hidden sm:inline">{t.importCsv}</span>
          </button>

          {/* Botão Novo Lead */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 12px rgba(90, 122, 230, 0.25)' }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{t.newLead}</span>
          </button>

          {/* Busca */}
          <div className="relative flex-1 min-w-[140px] md:min-w-[200px] order-last lg:order-none w-full lg:w-auto mt-2 lg:mt-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm rounded-lg pl-9 pr-8 py-2 outline-none transition-all"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(90, 122, 230, 0.1)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro de Tags */}
          <div className="relative">
            <button
              onClick={() => setIsTagFilterOpen(!isTagFilterOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
              style={selectedTags.length > 0
                ? { background: 'var(--color-primary-subtle)', border: '1px solid rgba(90, 122, 230, 0.3)', color: 'var(--color-primary)' }
                : { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }
              }
            >
              <Filter size={14} />
              <span className="hidden sm:inline">{t.filterByTags}</span>
              {selectedTags.length > 0 && (
                <span className="text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                  {selectedTags.length}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${isTagFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTagFilterOpen && (
              <div className="fixed inset-x-4 bottom-4 sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:right-0 sm:mt-2 sm:w-56 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                <div className="p-2 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{t.filterByTags}</span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-[10px]"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {t.clearFilters}
                    </button>
                  )}
                </div>
                <div className="max-h-[60vh] sm:max-h-[200px] overflow-y-auto p-2 space-y-1">
                  {tags.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>Nenhuma tag criada</p>
                  ) : (
                    tags.map(tag => {
                      const isSelected = selectedTags.includes(tag.id)
                      const color = getTagColor(tag.color)
                      return (
                        <button
                          key={tag.id}
                          onClick={() => {
                            setSelectedTags(prev =>
                              isSelected
                                ? prev.filter(id => id !== tag.id)
                                : [...prev, tag.id]
                            )
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all"
                          style={{ background: isSelected ? 'var(--color-bg-hover)' : 'transparent' }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: color.dot }} />
                          <span className="truncate flex-1 text-left" style={{ color: 'var(--color-text-secondary)' }}>{tag.name}</span>
                          {isSelected && (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-primary)' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Dias */}
          <div className="w-32">
            <CustomSelect
              value={daysFilter}
              onChange={(v) => setDaysFilter(v)}
              options={[
                { value: '7', label: t.days7 },
                { value: '30', label: t.days30 },
                { value: '90', label: t.days90 },
                { value: 'all', label: t.daysAll },
              ]}
            />
          </div>

          {/* Filtro de Responsável */}
          {teamMembers.length > 0 && (
            <div className="w-40">
              <CustomSelect
                value={filterAssigned}
                onChange={(v) => setFilterAssigned(v)}
                options={[
                  { value: 'all', label: t.allBrokers },
                  { value: 'unassigned', label: t.unassigned },
                  ...teamMembers.map(m => ({ value: m.id, label: m.full_name }))
                ]}
              />
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            title={t.refresh}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Toggle View */}
          <div className="flex rounded-lg p-1" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list' ? 'shadow-sm' : ''
              }`}
              style={viewMode === 'list' ? { background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-tertiary)' }}
              title={t.listView}
            >
              <List size={14} />
              <span className="hidden md:inline">{t.listView}</span>
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'pipeline' ? 'shadow-sm' : ''
              }`}
              style={viewMode === 'pipeline' ? { background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-tertiary)' }}
              title={t.pipelineView}
            >
              <LayoutGrid size={14} />
              <span className="hidden md:inline">{t.pipelineView}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-hidden relative p-3 md:p-6">
        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50" style={{ background: 'var(--color-bg-base)' }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
            <p className="mt-4 text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{t.loading}</p>
          </div>
        )}

        {/* VISÃO LISTA */}
        {!loading && viewMode === 'list' && (
          <div className="h-full overflow-hidden rounded-xl shadow-sm" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
            <div className="overflow-auto h-full">
              <table className="w-full min-w-[900px] text-left text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <thead className="uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-10" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.companyLead}</th>
                    <th className="px-4 md:px-6 py-4 font-medium text-center">{t.aiStatus}</th>
                    <th className="px-4 md:px-6 py-4 font-medium" style={{ color: 'var(--color-success)' }}>{t.value}</th>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.stage}</th>
                    <th className="px-4 md:px-6 py-4 font-medium">Tags</th>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.source}</th>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.tableAssigned}</th>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.contact}</th>
                    <th className="px-4 md:px-6 py-4 font-medium text-right">{t.entryDate}</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: '1px solid var(--color-border)' }}>
                  {filteredLeads.map((lead) => {
                    const stage = pipelineStages.find(s => s.name === lead.stage) || pipelineStages[0]
                    const stageColor = stage ? getStageColor(stage.color) : getStageColor('gray')
                    const leadDisplayName = lead.name || 'Sem Nome'
                    const daysSinceUpdate = getDaysSinceUpdate(lead.updated_at)
                    const isStale = daysSinceUpdate > 5
                    const leadTagsList = getLeadTags(lead.id)
                    const isAiActive = lead.conversa_finalizada === false

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleOpenLead(lead.id)}
                        className="group transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid var(--color-border)', background: isStale ? 'rgba(221, 160, 50, 0.03)' : 'transparent' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isStale ? 'rgba(221, 160, 50, 0.03)' : 'transparent' }}
                      >
                        <td className="px-4 md:px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                              {getInitials(leadDisplayName)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>{leadDisplayName}</span>
                                {lead.score_label && lead.score_label !== 'cold' && (() => {
                                  const sc = SCORE_CONFIG[lead.score_label] || SCORE_CONFIG.cold
                                  return (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                      {sc.label}
                                    </span>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          <div className="flex justify-center">
                            <AiStatusBadge isActive={isAiActive} size="md" />
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 font-bold font-mono whitespace-nowrap" style={{ color: 'var(--color-success)' }}>
                          {formatPrice(lead.total_em_vendas, userCurrency, userLang)}
                        </td>
                        <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stageColor.bg} ${stageColor.text} ${stageColor.border} border-opacity-30`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${stageColor.dot}`} />
                              {stage?.label || lead.stage}
                            </span>
                            {isStale && (
                              <span className="text-amber-500 flex items-center gap-1 text-[10px]" title={`${daysSinceUpdate} ${t.stale}`}>
                                <Clock size={12} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {leadTagsList.slice(0, 2).map(tag => {
                              const tagColor = getTagColor(tag.color)
                              return (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium"
                                  style={{ background: tagColor.bg, color: tagColor.text, border: `1px solid ${tagColor.border}` }}
                                >
                                  {tag.name}
                                </span>
                              )
                            })}
                            {leadTagsList.length > 2 && (
                              <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>+{leadTagsList.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 text-xs truncate max-w-[100px]" style={{ color: 'var(--color-text-muted)' }}>
                          {lead.source ? formatSource(lead.source, userLang) : '-'}
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          {lead.assigned_to_name ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(90, 122, 230, 0.2)' }}>
                                {getInitials(lead.assigned_to_name)}
                              </div>
                              <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--color-text-secondary)' }}>{lead.assigned_to_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>-</span>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-3 text-xs truncate max-w-[150px]" style={{ color: 'var(--color-text-muted)' }}>
                          {lead.email || '-'}
                        </td>
                        <td className="px-4 md:px-6 py-3 text-right font-mono text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                          {formatDate(lead.created_at, userLang, userTimezone)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredLeads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--color-text-muted)' }}>
                  <Search size={32} className="mb-4 opacity-50" />
                  <p className="text-sm font-medium">{t.noLeadsFound}</p>
                  <p className="text-xs mt-1">{t.noLeadsHint}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISÃO PIPELINE (KANBAN) */}
        {!loading && viewMode === 'pipeline' && (
          <div className="h-full w-full overflow-x-auto overflow-y-hidden pb-2 touch-pan-x">
            <div className="flex gap-3 md:gap-4 min-w-max h-full">
              {pipelineStages.map((stage) => {
                const stageColor = getStageColor(stage.color)
                const count = pipelineData[stage.name]?.length || 0
                const stageTotal = pipelineSums[stage.name] || 0

                return (
                  <div
                    key={stage.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.name)}
                    className="w-[280px] md:w-[300px] flex-shrink-0 flex flex-col h-full rounded-xl"
                    style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
                  >
                    {/* Header da Coluna */}
                    <div className="p-3 shrink-0 rounded-t-xl" style={{ borderBottom: `2px solid ${getStageHex(stage.color)}`, background: 'var(--color-bg-elevated)' }}>
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                          <span className={`w-2 h-2 rounded-full ${stageColor.dot}`} />
                          {stage.label}
                        </h3>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${stageColor.bg} ${stageColor.text}`}>
                          {count}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                          <DollarSign size={11} />
                          <span className="text-[11px] font-mono font-bold">
                            {formatPrice(stageTotal, userCurrency, userLang)}
                          </span>
                        </div>
                      </div>

                      <div className="h-1 w-full mt-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div
                          className={`h-full rounded-full ${stageColor.dot}`}
                          style={{ width: `${Math.min(count * 10, 100)}%`, opacity: 0.8, transition: 'width 0.5s ease' }}
                        />
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {pipelineData[stage.name]?.map((lead, index) => {
                        const leadDisplayName = lead.name || 'Sem Nome'
                        const daysSinceUpdate = getDaysSinceUpdate(lead.updated_at)
                        const isStale = daysSinceUpdate > 5
                        const leadTagsList = getLeadTags(lead.id)
                        const isAiActive = lead.conversa_finalizada === false

                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleOpenLead(lead.id)}
                            className={`group relative p-3 rounded-lg transition-all cursor-pointer hover:shadow-md ${
                              draggedLeadId === lead.id ? 'opacity-30 scale-95' : ''
                            }`}
                            style={{
                              background: 'var(--color-bg-surface)',
                              border: '1px solid var(--color-border)',
                              borderLeft: `3px solid ${isStale ? '#DDA032' : getStageHex(stage.color)}`,
                            }}
                          >
                            {/* Indicadores no canto superior direito */}
                            <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1">
                              {cardShowStale && isStale && (
                                <div className="rounded-full p-1 shadow-lg" style={{ background: 'var(--color-accent)', color: '#111' }} title={`${daysSinceUpdate} ${t.stale}`}>
                                  <Clock size={10} />
                                </div>
                              )}
                              {cardShowAiStatus && canUseAiAgents && (
                                <button
                                  onClick={(e) => handleToggleAi(e, lead.id, lead.conversa_finalizada ?? false)}
                                  className="w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                  style={{
                                    background: isAiActive ? 'var(--color-success)' : 'var(--color-accent)',
                                    boxShadow: isAiActive ? '0 0 8px rgba(52, 179, 104, 0.6)' : '0 0 8px rgba(221, 160, 50, 0.6)',
                                  }}
                                  title={isAiActive ? (t.pauseAi || 'Pausar IA') : (t.activateAi || 'Ativar IA')}
                                >
                                  {isAiActive ? <Pause size={10} className="text-white" /> : <Play size={10} className="text-white" />}
                                </button>
                              )}
                              {cardShowAiStatus && !canUseAiAgents && <AiStatusBadge isActive={isAiActive} />}
                            </div>

                            <div className="absolute top-2 right-6 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
                              <GripVertical size={14} />
                            </div>

                            {/* Nome e Empresa */}
                            <div className="flex items-start gap-2 mb-2 pr-6">
                              <div className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                {getInitials(leadDisplayName)}
                              </div>
                              <div className="overflow-hidden min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--color-text-primary)' }} title={leadDisplayName}>
                                    {leadDisplayName}
                                  </h4>
                                  {lead.score_label && lead.score_label !== 'cold' && (() => {
                                    const sc = SCORE_CONFIG[lead.score_label] || SCORE_CONFIG.cold
                                    return (
                                      <span className="shrink-0 px-1 py-0 rounded text-[8px] font-bold leading-tight" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                        {sc.label}
                                      </span>
                                    )
                                  })()}
                                </div>
                                {cardFields.includes('nome_empresa') && lead.nome_empresa && (
                                  <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{t.contactLabel} {lead.name}</p>
                                )}
                              </div>
                            </div>

                            {/* Valor, Telefone e Email */}
                            {(cardFields.includes('total_em_vendas') || cardFields.includes('email') || cardFields.includes('phone')) && (
                            <div className="space-y-1 mb-2">
                              {cardFields.includes('total_em_vendas') && (
                              <div className="text-[11px] font-bold flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                                {formatPrice(lead.total_em_vendas, userCurrency, userLang)}
                              </div>
                              )}
                              {cardFields.includes('phone') && lead.phone && (
                                <div className="flex items-center gap-1.5 text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                                  <Smartphone size={10} />
                                  <span className="truncate">{lead.phone}</span>
                                </div>
                              )}
                              {cardFields.includes('email') && lead.email && (
                                <div className="flex items-center gap-1.5 text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                                  <Mail size={10} />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                            </div>
                            )}

                            {/* Tags */}
                            {cardFields.includes('tags') && leadTagsList.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {leadTagsList.slice(0, 3).map(tag => {
                                  const tagColor = getTagColor(tag.color)
                                  return (
                                    <span
                                      key={tag.id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium"
                                      style={{ background: tagColor.bg, color: tagColor.text, border: `1px solid ${tagColor.border}` }}
                                    >
                                      <Tag size={8} />
                                      {tag.name}
                                    </span>
                                  )
                                })}
                                {leadTagsList.length > 3 && (
                                  <span className="text-[8px]" style={{ color: 'var(--color-text-muted)' }}>+{leadTagsList.length - 3}</span>
                                )}
                              </div>
                            )}

                            {/* Origem e Nicho */}
                            {((cardFields.includes('source') && lead.source) || (cardFields.includes('nicho') && lead.nicho)) && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {cardFields.includes('source') && lead.source && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] truncate max-w-[100px]" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                                    {formatSource(lead.source, userLang)}
                                  </span>
                                )}
                                {cardFields.includes('nicho') && lead.nicho && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] truncate max-w-[100px]" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(90, 122, 230, 0.2)' }}>
                                    {lead.nicho}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Rodapé */}
                            {cardFields.includes('created_at') && (
                            <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                              <div className="flex items-center gap-1.5 text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                <Calendar size={10} />
                                {formatDate(lead.created_at, userLang, userTimezone)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {index === 0 && count > 2 && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid rgba(217, 84, 84, 0.2)' }}>
                                    {t.priority}
                                  </span>
                                )}
                                {lead.assigned_to_name && (
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                                    style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(90, 122, 230, 0.2)' }}
                                    title={lead.assigned_to_name}
                                  >
                                    {getInitials(lead.assigned_to_name)}
                                  </div>
                                )}
                              </div>
                            </div>
                            )}
                          </div>
                        )
                      })}

                      {count === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-40 min-h-[120px] border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
                          <span className="text-xs font-medium italic" style={{ color: 'var(--color-text-muted)' }}>{t.noLeadsStage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER - ESTILO TRELLO */}
      <footer className="shrink-0 px-4 md:px-6 py-2.5 pr-24 md:pr-28" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Estatísticas */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Total de Leads */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'var(--color-primary-subtle)' }}>
                <Users size={14} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.totalLeads}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{stats.totalLeads}</p>
              </div>
            </div>

            {/* Valor Total */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'var(--color-success-subtle)' }}>
                <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.totalValue}</p>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--color-success)' }}>
                  {formatPrice(stats.totalValue, userCurrency, userLang)}
                </p>
              </div>
            </div>

            {/* Separador */}
            <div className="hidden md:block w-px h-8" style={{ background: 'var(--color-border)' }} />

            {/* IA Ativa */}
            <div className="hidden md:flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'var(--color-success-subtle)' }}>
                <Play size={14} style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.aiActive}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>{stats.aiActive}</p>
              </div>
            </div>

            {/* IA Pausada */}
            <div className="hidden md:flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'var(--color-accent-subtle)' }}>
                <Pause size={14} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{t.aiPaused}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>{stats.aiPaused}</p>
              </div>
            </div>
          </div>

          {/* Ações do Footer */}
          <div className="flex items-center gap-2">
            {/* Filtro de IA */}
            <div className="flex rounded-lg p-0.5" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setAiFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  aiFilter === 'all'
                    ? 'shadow-sm'
                    : ''
                }`}
                style={aiFilter === 'all' ? { background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-tertiary)' }}
              >
                {t.allLeads}
              </button>
              <button
                onClick={() => setAiFilter('active')}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1"
                style={aiFilter === 'active'
                  ? { background: 'var(--color-success-subtle)', color: 'var(--color-success)' }
                  : { color: 'var(--color-text-muted)' }
                }
              >
                <Play size={10} />
                <span className="hidden sm:inline">{t.aiActiveOnly}</span>
              </button>
              <button
                onClick={() => setAiFilter('paused')}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1"
                style={aiFilter === 'paused'
                  ? { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }
                  : { color: 'var(--color-text-muted)' }
                }
              >
                <Pause size={10} />
                <span className="hidden sm:inline">{t.aiPausedOnly}</span>
              </button>
            </div>

            {/* Tela Cheia */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              title={isFullscreen ? t.exitFullscreen : t.fullscreen}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              title={t.refresh}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL CRIAR LEAD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex justify-between items-center p-4" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.modalTitle}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="transition-colors p-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.nameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={t.namePlaceholder}
                  className="w-full text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  style={{ background: 'var(--color-bg-input, var(--color-bg-elevated))', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  value={newLeadData.name}
                  onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.emailLabel}</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    className="w-full text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  style={{ background: 'var(--color-bg-input, var(--color-bg-elevated))', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    value={newLeadData.email}
                    onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.phoneLabel}</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    className="w-full text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  style={{ background: 'var(--color-bg-input, var(--color-bg-elevated))', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    value={newLeadData.phone}
                    onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Seleção de Tags */}
              {tags.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-tertiary)' }}>{t.tagsLabel}</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => {
                      const isSelected = newLeadData.selectedTags.includes(tag.id)
                      const tagColor = getTagColor(tag.color)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setNewLeadData(prev => ({
                              ...prev,
                              selectedTags: isSelected
                                ? prev.selectedTags.filter(id => id !== tag.id)
                                : [...prev.selectedTags, tag.id]
                            }))
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                          style={isSelected
                            ? { background: tagColor.bg, color: tagColor.text, border: `1px solid ${tagColor.border}` }
                            : { background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }
                          }
                        >
                          <Tag size={10} />
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newLeadData.name.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg shadow transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {isSaving ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Click outside para fechar filtro de tags */}
      {isTagFilterOpen && (
        <div
          className="fixed inset-0 z-40 sm:bg-transparent bg-black/40"
          onClick={() => setIsTagFilterOpen(false)}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, current: 0, limit: 0 })}
        resource="leads"
        current={upgradeModal.current}
        limit={upgradeModal.limit}
      />
    </div>
  )
}