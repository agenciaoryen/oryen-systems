'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { formatPrice } from '@/lib/format'
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
  Settings
} from 'lucide-react'

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
    title: 'Pipeline de Vendas',
    synced: 'Sincronizado em tempo real',
    newLead: 'Novo Lead',
    searchPlaceholder: 'Buscar por nome, email ou celular...',
    days7: '7 dias',
    days30: '30 dias',
    days90: '3 meses',
    daysAll: 'Tudo',
    listView: 'Lista',
    pipelineView: 'Kanban',
    loading: 'Carregando dados...',
    leadsFound: 'leads encontrados',
    companyLead: 'Empresa / Lead',
    value: 'Valor',
    stage: 'Etapa',
    source: 'Origem',
    niche: 'Nicho',
    contact: 'Contato',
    entryDate: 'Entrada',
    noLeadsStage: 'Sem leads nesta etapa',
    noLeadsFound: 'Nenhum lead encontrado',
    noLeadsHint: 'Tente ajustar os filtros ou busca',
    modalTitle: 'Novo Lead',
    nameLabel: 'Nome do Contato*',
    namePlaceholder: 'Ex: João da Silva',
    companyLabel: 'Nome da Empresa',
    companyPlaceholder: 'Ex: Empresa LTDA',
    emailLabel: 'Email',
    phoneLabel: 'Celular / WhatsApp',
    tagsLabel: 'Tags',
    cancel: 'Cancelar',
    save: 'Criar Lead',
    saving: 'Salvando...',
    priority: 'Prioridade',
    stale: 'dias parado',
    contactLabel: 'Contato:',
    filterByTags: 'Filtrar por tags',
    allTags: 'Todas as tags',
    clearFilters: 'Limpar filtros',
    refresh: 'Atualizar',
    managePipeline: 'Gerenciar funil',
    errorLoading: 'Erro ao carregar dados',
    errorSaving: 'Erro ao salvar',
    leads: 'Leads'
  },
  en: {
    title: 'Sales Pipeline',
    synced: 'Synced in real-time',
    newLead: 'New Lead',
    searchPlaceholder: 'Search by name, email or phone...',
    days7: '7 days',
    days30: '30 days',
    days90: '3 months',
    daysAll: 'All time',
    listView: 'List',
    pipelineView: 'Kanban',
    loading: 'Loading data...',
    leadsFound: 'leads found',
    companyLead: 'Company / Lead',
    value: 'Value',
    stage: 'Stage',
    source: 'Source',
    niche: 'Niche',
    contact: 'Contact',
    entryDate: 'Entry Date',
    noLeadsStage: 'No leads in this stage',
    noLeadsFound: 'No leads found',
    noLeadsHint: 'Try adjusting filters or search',
    modalTitle: 'New Lead',
    nameLabel: 'Contact Name*',
    namePlaceholder: 'Ex: John Doe',
    companyLabel: 'Company Name',
    companyPlaceholder: 'Ex: Company LLC',
    emailLabel: 'Email',
    phoneLabel: 'Phone / WhatsApp',
    tagsLabel: 'Tags',
    cancel: 'Cancel',
    save: 'Create Lead',
    saving: 'Saving...',
    priority: 'Priority',
    stale: 'days stale',
    contactLabel: 'Contact:',
    filterByTags: 'Filter by tags',
    allTags: 'All tags',
    clearFilters: 'Clear filters',
    refresh: 'Refresh',
    managePipeline: 'Manage pipeline',
    errorLoading: 'Error loading data',
    errorSaving: 'Error saving',
    leads: 'Leads'
  },
  es: {
    title: 'Pipeline de Ventas',
    synced: 'Sincronizado en tiempo real',
    newLead: 'Nuevo Lead',
    searchPlaceholder: 'Buscar por nombre, email o teléfono...',
    days7: '7 días',
    days30: '30 días',
    days90: '3 meses',
    daysAll: 'Todo',
    listView: 'Lista',
    pipelineView: 'Kanban',
    loading: 'Cargando datos...',
    leadsFound: 'leads encontrados',
    companyLead: 'Empresa / Lead',
    value: 'Valor',
    stage: 'Etapa',
    source: 'Origen',
    niche: 'Nicho',
    contact: 'Contacto',
    entryDate: 'Fecha Entrada',
    noLeadsStage: 'Sin leads en esta etapa',
    noLeadsFound: 'No se encontraron leads',
    noLeadsHint: 'Intenta ajustar los filtros',
    modalTitle: 'Nuevo Lead',
    nameLabel: 'Nombre del Contacto*',
    namePlaceholder: 'Ej: Juan Pérez',
    companyLabel: 'Nombre de la Empresa',
    companyPlaceholder: 'Ej: Empresa S.A.',
    emailLabel: 'Email',
    phoneLabel: 'Celular / WhatsApp',
    tagsLabel: 'Tags',
    cancel: 'Cancelar',
    save: 'Crear Lead',
    saving: 'Guardando...',
    priority: 'Prioridad',
    stale: 'días sin actualización',
    contactLabel: 'Contacto:',
    filterByTags: 'Filtrar por tags',
    allTags: 'Todas las tags',
    clearFilters: 'Limpiar filtros',
    refresh: 'Actualizar',
    managePipeline: 'Gestionar pipeline',
    errorLoading: 'Error al cargar datos',
    errorSaving: 'Error al guardar',
    leads: 'Leads'
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

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

const getStageColor = (color: string) => STAGE_COLORS[color] || STAGE_COLORS.gray
const getTagColor = (color: string) => TAG_COLORS[color] || TAG_COLORS.gray

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
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function CrmPage() {
  const router = useRouter()
  const { user } = useAuth()
  const orgId = useActiveOrgId()

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

  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline')
  const [daysFilter, setDaysFilter] = useState('30')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false)

  // Estados de Drag & Drop
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    nome_empresa: '',
    email: '',
    phone: '',
    selectedTags: [] as string[]
  })

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
      const [stagesRes, tagsRes, leadTagsRes] = await Promise.all([
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
          .select('lead_id, tag_id')
      ])

      // Buscar leads com paginação
      let allLeads: Lead[] = []
      let hasMore = true
      let page = 0
      const pageSize = 1000

      while (hasMore) {
        const from = page * pageSize
        const to = (page + 1) * pageSize - 1

        let query = supabase
          .from('leads')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .range(from, to)

        if (filterDate) {
          query = query.or(`created_at.gte.${filterDate},updated_at.gte.${filterDate}`)
        }

        const { data, error } = await query

        if (error) throw error

        if (data && data.length > 0) {
          allLeads = [...allLeads, ...data]
          hasMore = data.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      setPipelineStages(stagesRes.data || [])
      setTags(tagsRes.data || [])
      setLeadTags(leadTagsRes.data || [])
      setLeads(allLeads)

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

    return true
  })

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

  // ─── OBTER TAGS DO LEAD ───
  const getLeadTags = (leadId: string): Tag[] => {
    const tagIds = leadTags.filter(lt => lt.lead_id === leadId).map(lt => lt.tag_id)
    return tags.filter(tag => tagIds.includes(tag.id))
  }

  // ─── RENDER ───
  return (
    <div className="flex flex-col h-[calc(100vh-20px)] bg-gray-950 text-gray-200 font-sans">

      {/* HEADER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-4 md:px-6 py-4 border-b border-gray-900 bg-gray-950 shrink-0 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
            {t.title}
            <span className="text-xs font-normal text-gray-500 border border-gray-800 px-2 py-0.5 rounded-full bg-gray-900">
              {filteredLeads.length} {t.leads}
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            {t.synced}
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto flex-wrap">
          {/* Botão Novo Lead */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg hover:shadow-blue-500/20 whitespace-nowrap"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{t.newLead}</span>
          </button>

          {/* Busca */}
          <div className="relative flex-1 min-w-[140px] md:min-w-[200px] order-last lg:order-none w-full lg:w-auto mt-2 lg:mt-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg pl-9 pr-8 py-2 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-gray-800 placeholder:text-gray-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro de Tags */}
          <div className="relative">
            <button
              onClick={() => setIsTagFilterOpen(!isTagFilterOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                selectedTags.length > 0
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
              }`}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">{t.filterByTags}</span>
              {selectedTags.length > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {selectedTags.length}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${isTagFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTagFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-800 flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-400">{t.filterByTags}</span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-[10px] text-blue-400 hover:text-blue-300"
                    >
                      {t.clearFilters}
                    </button>
                  )}
                </div>
                <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                  {tags.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Nenhuma tag criada</p>
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
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${
                            isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${color.bg.replace('/20', '')}`} />
                          <span className="text-gray-300 truncate flex-1 text-left">{tag.name}</span>
                          {isSelected && (
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="relative">
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="appearance-none bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg pl-3 pr-8 py-2 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all hover:bg-gray-800 cursor-pointer"
            >
              <option value="7">{t.days7}</option>
              <option value="30">{t.days30}</option>
              <option value="90">{t.days90}</option>
              <option value="all">{t.daysAll}</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            title={t.refresh}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Toggle View */}
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-gray-800 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title={t.listView}
            >
              <List size={14} />
              <span className="hidden md:inline">{t.listView}</span>
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'pipeline'
                  ? 'bg-gray-800 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 z-50 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="mt-4 text-sm text-gray-400 font-medium">{t.loading}</p>
          </div>
        )}

        {/* VISÃO LISTA */}
        {!loading && viewMode === 'list' && (
          <div className="h-full overflow-hidden rounded-xl border border-gray-900 bg-gray-900/50 shadow-2xl">
            <div className="overflow-auto h-full">
              <table className="w-full min-w-[900px] text-left text-sm text-gray-400">
                <thead className="bg-gray-900 text-gray-400 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-10 border-b border-gray-800">
                  <tr>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.companyLead}</th>
                    <th className="px-4 md:px-6 py-4 font-medium text-emerald-500">{t.value}</th>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.stage}</th>
                    <th className="px-4 md:px-6 py-4 font-medium">Tags</th>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.source}</th>
                    <th className="px-4 md:px-6 py-4 font-medium">{t.contact}</th>
                    <th className="px-4 md:px-6 py-4 font-medium text-right">{t.entryDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredLeads.map((lead) => {
                    const stage = pipelineStages.find(s => s.name === lead.stage) || pipelineStages[0]
                    const stageColor = stage ? getStageColor(stage.color) : getStageColor('gray')
                    const leadDisplayName = lead.nome_empresa || lead.name || 'Sem Nome'
                    const daysSinceUpdate = getDaysSinceUpdate(lead.updated_at)
                    const isStale = daysSinceUpdate > 5
                    const leadTagsList = getLeadTags(lead.id)

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleOpenLead(lead.id)}
                        className={`group hover:bg-gray-800/40 transition-colors cursor-pointer ${isStale ? 'bg-amber-500/5' : ''}`}
                      >
                        <td className="px-4 md:px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 shrink-0 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-700">
                              {getInitials(leadDisplayName)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-gray-200 group-hover:text-white truncate">{leadDisplayName}</span>
                              {lead.nome_empresa && <span className="text-[10px] text-gray-500 truncate">{t.contactLabel} {lead.name}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 font-bold text-emerald-400 font-mono whitespace-nowrap">
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
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${tagColor.bg} ${tagColor.text} ${tagColor.border}`}
                                >
                                  {tag.name}
                                </span>
                              )
                            })}
                            {leadTagsList.length > 2 && (
                              <span className="text-[9px] text-gray-500">+{leadTagsList.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 text-xs text-gray-500 truncate max-w-[100px]">
                          {lead.source || '-'}
                        </td>
                        <td className="px-4 md:px-6 py-3 text-xs text-gray-500 truncate max-w-[150px]">
                          {lead.email || '-'}
                        </td>
                        <td className="px-4 md:px-6 py-3 text-right font-mono text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(lead.created_at, userLang, userTimezone)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredLeads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
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
                    className="w-[280px] md:w-[300px] flex-shrink-0 flex flex-col h-full rounded-xl bg-gray-900/30 border border-gray-800/50"
                  >
                    {/* Header da Coluna */}
                    <div className="p-3 border-b border-gray-800/50 shrink-0 bg-gray-900/80 rounded-t-xl">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className={`font-bold text-sm uppercase tracking-tight flex items-center gap-2 ${stageColor.text}`}>
                          <span className={`w-2 h-2 rounded-full ${stageColor.dot}`} />
                          {stage.label}
                        </h3>
                        <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-700">
                          {count}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 text-emerald-400/80">
                        <DollarSign size={12} />
                        <span className="text-[11px] font-mono font-bold">
                          {formatPrice(stageTotal, userCurrency, userLang)}
                        </span>
                      </div>

                      <div className="h-0.5 w-full mt-2 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full ${stageColor.dot} opacity-50`}
                          style={{ width: `${Math.min(count * 10, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {pipelineData[stage.name]?.map((lead, index) => {
                        const leadDisplayName = lead.nome_empresa || lead.name || 'Sem Nome'
                        const daysSinceUpdate = getDaysSinceUpdate(lead.updated_at)
                        const isStale = daysSinceUpdate > 5
                        const leadTagsList = getLeadTags(lead.id)

                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleOpenLead(lead.id)}
                            className={`
                              group relative bg-gray-900 p-3 rounded-lg border
                              hover:border-gray-600 hover:shadow-xl transition-all cursor-pointer
                              ${draggedLeadId === lead.id ? 'opacity-30 scale-95 border-dashed border-blue-500' : isStale ? 'border-amber-500/40' : 'border-gray-800'}
                            `}
                          >
                            {isStale && (
                              <div className="absolute -top-1 -right-1 bg-amber-500 text-gray-900 rounded-full p-1 shadow-lg" title={`${daysSinceUpdate} ${t.stale}`}>
                                <Clock size={10} />
                              </div>
                            )}

                            <div className="absolute top-2 right-2 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                              <GripVertical size={14} />
                            </div>

                            {/* Nome e Empresa */}
                            <div className="flex items-start gap-2 mb-2 pr-4">
                              <div className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-400">
                                {getInitials(leadDisplayName)}
                              </div>
                              <div className="overflow-hidden min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-200 text-sm leading-tight truncate" title={leadDisplayName}>
                                  {leadDisplayName}
                                </h4>
                                {lead.nome_empresa && (
                                  <p className="text-[10px] text-gray-500 truncate">{t.contactLabel} {lead.name}</p>
                                )}
                              </div>
                            </div>

                            {/* Valor e Email */}
                            <div className="space-y-1 mb-2">
                              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                {formatPrice(lead.total_em_vendas, userCurrency, userLang)}
                              </div>
                              {lead.email && (
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 truncate">
                                  <Mail size={10} />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                            </div>

                            {/* Tags */}
                            {leadTagsList.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {leadTagsList.slice(0, 3).map(tag => {
                                  const tagColor = getTagColor(tag.color)
                                  return (
                                    <span
                                      key={tag.id}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium border ${tagColor.bg} ${tagColor.text} ${tagColor.border}`}
                                    >
                                      <Tag size={8} />
                                      {tag.name}
                                    </span>
                                  )
                                })}
                                {leadTagsList.length > 3 && (
                                  <span className="text-[8px] text-gray-500">+{leadTagsList.length - 3}</span>
                                )}
                              </div>
                            )}

                            {/* Origem e Nicho */}
                            {(lead.source || lead.nicho) && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {lead.source && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-800/50 text-gray-400 rounded text-[8px] border border-gray-700/50 truncate max-w-[100px]">
                                    {lead.source}
                                  </span>
                                )}
                                {lead.nicho && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[8px] border border-blue-500/20 truncate max-w-[100px]">
                                    {lead.nicho}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Rodapé */}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                              <div className="flex items-center gap-1.5 text-[9px] font-medium text-gray-500">
                                <Calendar size={10} />
                                {formatDate(lead.created_at, userLang, userTimezone)}
                              </div>
                              {index === 0 && count > 2 && (
                                <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">
                                  {t.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {count === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 min-h-[120px] border-2 border-dashed border-gray-800 rounded-lg">
                          <span className="text-xs text-gray-500 font-medium italic">{t.noLeadsStage}</span>
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

      {/* MODAL CRIAR LEAD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900/50">
              <h2 className="text-lg font-semibold text-white">{t.modalTitle}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t.nameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={t.namePlaceholder}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  value={newLeadData.name}
                  onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t.companyLabel}</label>
                <input
                  type="text"
                  placeholder={t.companyPlaceholder}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  value={newLeadData.nome_empresa}
                  onChange={(e) => setNewLeadData({ ...newLeadData, nome_empresa: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t.emailLabel}</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    value={newLeadData.email}
                    onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t.phoneLabel}</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    value={newLeadData.phone}
                    onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Seleção de Tags */}
              {tags.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">{t.tagsLabel}</label>
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
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? `${tagColor.bg} ${tagColor.text} ${tagColor.border}`
                              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                          }`}
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
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newLeadData.name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="fixed inset-0 z-40"
          onClick={() => setIsTagFilterOpen(false)}
        />
      )}
    </div>
  )
}