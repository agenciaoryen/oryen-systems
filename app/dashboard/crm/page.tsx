'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { formatPrice } from '@/lib/format'

// --- DICIONÁRIO DE TRADUÇÃO ---
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
    listView: 'Visualização em Lista',
    pipelineView: 'Visualização em Kanban',
    loading: 'Carregando dados...',
    leadsFound: 'leads encontrados...',
    companyLead: 'Empresa / Lead',
    value: 'Valor',
    stage: 'Etapa Atual',
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
    cancel: 'Cancelar',
    save: 'Criar Lead',
    saving: 'Salvando...',
    priority: 'Prioridade',
    stale: 'dias sem atualização',
    contactLabelTable: 'Contato:',
    // TRADUÇÃO DAS ETAPAS DO PIPELINE
    stages: {
      'captado': 'Captado',
      'contatado': 'Contatado',
      'Lead respondeu': 'Lead Respondeu',
      'qualificado': 'Qualificado',
      'reuniao': 'Reunião',
      'ganho': 'Ganho',
      'perdido': 'Perdido'
    } as Record<string, string>
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
    listView: 'List View',
    pipelineView: 'Kanban View',
    loading: 'Loading data...',
    leadsFound: 'leads found...',
    companyLead: 'Company / Lead',
    value: 'Value',
    stage: 'Current Stage',
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
    cancel: 'Cancel',
    save: 'Create Lead',
    saving: 'Saving...',
    priority: 'Priority',
    stale: 'days without update',
    contactLabelTable: 'Contact:',
    // TRADUÇÃO DAS ETAPAS DO PIPELINE
    stages: {
      'captado': 'Captured',
      'contatado': 'Contacted',
      'Lead respondeu': 'Lead Responded',
      'qualificado': 'Qualified',
      'reuniao': 'Meeting',
      'ganho': 'Won',
      'perdido': 'Lost'
    } as Record<string, string>
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
    listView: 'Vista de Lista',
    pipelineView: 'Vista Kanban',
    loading: 'Cargando datos...',
    leadsFound: 'leads encontrados...',
    companyLead: 'Empresa / Lead',
    value: 'Valor',
    stage: 'Etapa Actual',
    source: 'Origen',
    niche: 'Nicho',
    contact: 'Contacto',
    entryDate: 'Fecha Entrada',
    noLeadsStage: 'Sin leads en esta etapa',
    noLeadsFound: 'No se encontraron leads',
    noLeadsHint: 'Intenta ajustar los filtros o la búsqueda',
    modalTitle: 'Nuevo Lead',
    nameLabel: 'Nombre del Contacto*',
    namePlaceholder: 'Ej: Juan Pérez',
    companyLabel: 'Nombre de la Empresa',
    companyPlaceholder: 'Ej: Empresa S.A.',
    emailLabel: 'Email',
    phoneLabel: 'Celular / WhatsApp',
    cancel: 'Cancelar',
    save: 'Crear Lead',
    saving: 'Guardando...',
    priority: 'Prioridad',
    stale: 'días sin actualización',
    contactLabelTable: 'Contacto:',
    // TRADUÇÃO DAS ETAPAS DO PIPELINE
    stages: {
      'captado': 'Captado',
      'contatado': 'Contactado',
      'Lead respondeu': 'Lead Respondió',
      'qualificado': 'Calificado',
      'reuniao': 'Reunión',
      'ganho': 'Ganado',
      'perdido': 'Perdido'
    } as Record<string, string>
  }
}

// --- ÍCONES ---
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
)
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
)
const GripIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
)
const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
)
const KanbanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
)
const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
)
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
)
const TagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
)
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
)
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
)

const STAGE_STYLES: Record<string, { color: string, border: string, badge_text: string, badge_bg: string, dot: string }> = {
  'captado':         { color: 'text-gray-300',   border: 'border-gray-600',   badge_text: 'text-gray-300',   badge_bg: 'bg-gray-500/10',   dot: 'bg-gray-500' },
  'contatado':       { color: 'text-blue-300',    border: 'border-blue-500/60',   badge_text: 'text-blue-300',   badge_bg: 'bg-blue-500/10',   dot: 'bg-blue-500' },
  'Lead respondeu': { color: 'text-amber-300',  border: 'border-amber-500/60',  badge_text: 'text-amber-300',  badge_bg: 'bg-amber-500/10',  dot: 'bg-amber-500' },
  'qualificado':    { color: 'text-cyan-300',     border: 'border-cyan-500/60',   badge_text: 'text-cyan-300',   badge_bg: 'bg-cyan-500/10',   dot: 'bg-cyan-500' },
  'reuniao':        { color: 'text-purple-300',  border: 'border-purple-500/60', badge_text: 'text-purple-300', badge_bg: 'bg-purple-500/10', dot: 'bg-purple-500' },
  'ganho':          { color: 'text-emerald-300',  border: 'border-emerald-500/60',badge_text: 'text-emerald-300',badge_bg: 'bg-emerald-500/10',dot: 'bg-emerald-500' },
  'perdido':        { color: 'text-rose-300',     border: 'border-rose-500/60',   badge_text: 'text-rose-300',   badge_bg: 'bg-rose-500/10',   dot: 'bg-rose-500' },
  'default':        { color: 'text-gray-300',     border: 'border-gray-700',      badge_text: 'text-gray-400',   badge_bg: 'bg-gray-700/20',   dot: 'bg-gray-600' }
}

type Lead = {
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
}

export default function CrmPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline')
  
  const [daysFilter, setDaysFilter] = useState('7')
  const [searchQuery, setSearchQuery] = useState('')
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)

  // Configurações de Localização
  const userLang = (user?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]
  const userCurrency = user?.currency || 'BRL'
  const userTimezone = user?.timezone || 'America/Sao_Paulo'

  // --- ESTADOS DO MODAL DE NOVO LEAD ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    nome_empresa: '',
    email: '',
    phone: ''
  })

  // Formatação de Data com Timezone correto
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(userLang, { 
      timeZone: userTimezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getDaysSinceUpdate = (updatedAt?: string) => {
    if (!updatedAt) return 0
    const now = new Date()
    const updated = new Date(updatedAt)
    const diffTime = Math.abs(now.getTime() - updated.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  useEffect(() => {
    async function fetchAllLeadsRecursively() {
      if (!user?.org_id) return
      
      try {
        setLoading(true)
        setLoadingProgress(0)
        
        let allLeads: Lead[] = []
        let hasMore = true
        let page = 0
        const pageSize = 1000 

        let filterDate: string | null = null
        if (daysFilter !== 'all') {
            const date = new Date()
            date.setDate(date.getDate() - parseInt(daysFilter))
            filterDate = date.toISOString()
        }

        while (hasMore) {
          const from = page * pageSize
          const to = (page + 1) * pageSize - 1

          let query = supabase
            .from('leads')
            .select('*')
            .eq('org_id', user.org_id)
            .order('created_at', { ascending: false })
            .range(from, to)

          if (filterDate) {
            query = query.gte('created_at', filterDate)
          }

          const { data, error } = await query
          
          if (error) throw error
          
          if (data) {
            allLeads = [...allLeads, ...data]
            setLoadingProgress(prev => prev + data.length)

            if (data.length < pageSize) {
              hasMore = false
            } else {
              page++ 
            }
          } else {
            hasMore = false
          }
        }
        
        setLeads(allLeads)

      } catch (err) {
        console.error('Erro ao carregar leads:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchAllLeadsRecursively()
    }
  }, [user, daysFilter])

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      lead.name?.toLowerCase().includes(query) ||
      lead.nome_empresa?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query)
    )
  })

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
    if (!leadToMove || leadToMove.stage === targetStage) return

    const originalStage = leadToMove.stage
    const originalLeads = [...leads]
    
    setLeads(prev => prev.map(lead => 
      lead.id === draggedLeadId ? { ...lead, stage: targetStage, updated_at: new Date().toISOString() } : lead
    ))

    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ stage: targetStage, updated_at: new Date().toISOString() })
        .eq('id', draggedLeadId)

      if (updateError) throw updateError

      await supabase.from('lead_events').insert({
        lead_id: draggedLeadId,
        type: 'stage_change',
        content: `Alterou etapa de ${originalStage} para ${targetStage}`
      })

    } catch (err) {
      console.error("Erro:", err)
      setLeads(originalLeads)
      alert("Erro ao sincronizar. Tente novamente.")
    } finally {
      setDraggedLeadId(null)
    }
  }

  const handleOpenLead = (leadId: string) => {
    router.push(`/dashboard/crm/${leadId}`)
  }
  
  const handleCreateNewLeadClick = () => {
    setIsModalOpen(true)
  }

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.org_id) {
        console.error("Erro: org_id do usuário não encontrado.")
        alert("Erro de identificação da organização. Tente recarregar a página.")
        return
    }

    if (!newLeadData.name) {
        alert("O nome é obrigatório")
        return
    }

    setIsSaving(true)

    try {
        const payload = {
            org_id: user.org_id,
            name: newLeadData.name,
            nome_empresa: newLeadData.nome_empresa || null, 
            email: newLeadData.email || null,
            phone: newLeadData.phone || null,
            stage: 'captado', 
        }

        const { data, error } = await supabase
            .from('leads')
            .insert(payload)
            .select()
            .single()

        if (error) throw error

        if (data) {
            setLeads(prev => (prev ? [data, ...prev] : [data]))
            setNewLeadData({ name: '', nome_empresa: '', email: '', phone: '' })
            setIsModalOpen(false)
        }

    } catch (error: any) {
        console.error("Erro ao criar lead:", error.message || error)
        if (error.code === '23505') {
            alert("Erro: Este e-mail ou telefone já está cadastrado.")
        } else if (error.code === '42501') {
            alert("Erro de permissão: Você não tem acesso para criar leads.")
        } else {
            alert(`Erro ao criar lead: ${error.message || "Verifique os dados."}`)
        }
    } finally {
        setIsSaving(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }

  const getStyle = (stage: string) => {
    return STAGE_STYLES[stage] || STAGE_STYLES['default']
  }

  const getGroupedLeads = () => {
    const groups: Record<string, Lead[]> = {}
    const sums: Record<string, number> = {}
    
    // NOTA: Estes são os IDs do banco. Não traduzir estas chaves, apenas a exibição se necessário.
    const pipelineStages = [
      'captado', 
      'contatado', 
      'Lead respondeu', 
      'qualificado', 
      'reuniao', 
      'ganho', 
      'perdido'
    ]

    pipelineStages.forEach(stage => {
      groups[stage] = []
      sums[stage] = 0
    })

    filteredLeads.forEach(lead => {
      const currentStage = lead.stage && pipelineStages.includes(lead.stage) 
        ? lead.stage 
        : 'captado'
      
      if (groups[currentStage]) {
        groups[currentStage].push(lead)
        sums[currentStage] += (lead.total_em_vendas || 0)
      }
    })
    return { groups, sums, pipelineStages }
  }

  const { groups: pipelineData, sums: pipelineSums, pipelineStages } = getGroupedLeads()

  return (
    <div className="flex flex-col h-[calc(100vh-20px)] bg-gray-950 text-gray-200 font-sans selection:bg-blue-500/30">
      
      <header className="flex flex-col md:flex-row justify-between items-center px-6 py-5 border-b border-gray-900 bg-gray-950 shrink-0 gap-4 relative z-30 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
            {t.title}
            <span className="text-xs font-normal text-gray-500 border border-gray-800 px-2 py-0.5 rounded-full bg-gray-900">
              {filteredLeads.length} Leads
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            {t.synced}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          
          {/* BOTÃO NOVO LEAD COM AÇÃO DE MODAL */}
          <button 
            onClick={handleCreateNewLeadClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg hover:shadow-blue-500/20 whitespace-nowrap"
          >
            <PlusIcon />
            {t.newLead}
          </button>

          {/* Barra de Busca */}
          <div className="relative flex-1 md:min-w-[240px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-gray-800 placeholder:text-gray-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <XIcon />
              </button>
            )}
          </div>

          <div className="relative group">
            <select 
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="appearance-none bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg pl-3 pr-8 py-2 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-gray-800 cursor-pointer min-w-[140px]"
            >
              <option value="7">{t.days7}</option>
              <option value="30">{t.days30}</option>
              <option value="90">{t.days90}</option>
              <option value="all">{t.daysAll}</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800 shrink-0">
            <button 
                onClick={() => setViewMode('list')} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${viewMode === 'list' ? 'bg-gray-800 text-white shadow-sm ring-1 ring-white/10' : 'text-gray-500 hover:text-gray-300'}`}
                title={t.listView}
            >
                <ListIcon />
            </button>
            <button 
                onClick={() => setViewMode('pipeline')} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${viewMode === 'pipeline' ? 'bg-gray-800 text-white shadow-sm ring-1 ring-white/10' : 'text-gray-500 hover:text-gray-300'}`}
                title={t.pipelineView}
            >
                <KanbanIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative p-6">
        
        {loading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 z-50 backdrop-blur-sm">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-gray-400 font-medium">{t.loading}</p>
                {loadingProgress > 0 && (
                   <span className="text-xs text-gray-500 mt-2">{loadingProgress} {t.leadsFound}</span>
                )}
             </div>
        )}

        {/* --- VISÃO LISTA --- */}
        {!loading && viewMode === 'list' && (
          <div className="h-full overflow-hidden rounded-xl border border-gray-900 bg-gray-900/50 shadow-2xl relative">
            <div 
              className="overflow-auto h-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-track]:bg-transparent"
            >
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-gray-900 text-gray-400 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-10 border-b border-gray-800 backdrop-blur-md bg-opacity-90">
                  <tr>
                    <th className="px-6 py-4 font-medium">{t.companyLead}</th>
                    <th className="px-6 py-4 font-medium text-emerald-500">{t.value}</th>
                    <th className="px-6 py-4 font-medium">{t.stage}</th>
                    <th className="px-6 py-4 font-medium">{t.source}</th>
                    <th className="px-6 py-4 font-medium">{t.niche}</th>
                    <th className="px-6 py-4 font-medium">{t.contact}</th>
                    <th className="px-6 py-4 font-medium text-right">{t.entryDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredLeads.map((lead) => {
                    const style = getStyle(lead.stage || 'captado')
                    const leadDisplayName = lead.nome_empresa || lead.name || 'Sem Nome'
                    const daysSinceUpdate = getDaysSinceUpdate(lead.updated_at)
                    const isStale = daysSinceUpdate > 5

                    return (
                      <tr 
                        key={lead.id} 
                        onClick={() => handleOpenLead(lead.id)}
                        className={`group hover:bg-gray-800/40 transition-colors duration-150 cursor-pointer ${isStale ? 'bg-amber-500/5' : ''}`}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-700">
                              {getInitials(leadDisplayName)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-200 group-hover:text-white transition-colors">{leadDisplayName}</span>
                              {lead.nome_empresa && <span className="text-[10px] text-gray-500">{t.contactLabelTable} {lead.name}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-emerald-400 font-mono">
                          {formatPrice(lead.total_em_vendas, userCurrency, userLang)}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.badge_bg} ${style.badge_text} ${style.border} border-opacity-30`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${style.dot}`}></span>
                              {/* TRADUÇÃO DO BADGE NA LISTA */}
                              {t.stages[lead.stage || 'captado'] || lead.stage}
                            </span>
                            {isStale && (
                              <span className="text-amber-500 flex items-center gap-1 text-[10px]" title={`${daysSinceUpdate} ${t.stale}`}>
                                <ClockIcon />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-500">
                          {lead.source || '-'}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-500">
                          {lead.nicho || '-'}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-500">
                          {lead.email}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-xs text-gray-500">
                            {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VISÃO PIPELINE (KANBAN) --- */}
        {!loading && viewMode === 'pipeline' && (
          <div className="h-full w-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-track]:bg-transparent">
            
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '16px', paddingBottom: '8px', minWidth: 'max-content' }}>
              {pipelineStages.map((stageName) => {
                 const style = getStyle(stageName)
                 const count = pipelineData[stageName]?.length || 0
                 const stageTotal = pipelineSums[stageName] || 0

                 return (
                  <div 
                    key={stageName}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stageName)}
                    className="w-[320px] flex-shrink-0 flex flex-col h-[calc(100vh-140px)] rounded-xl bg-gray-900/30 border border-gray-800/50"
                  >
                    {/* Cabeçalho da Coluna com Valor Total */}
                    <div className="p-3 border-b border-gray-800/50 flex-shrink-0 backdrop-blur-sm rounded-t-xl bg-gray-900/80 sticky top-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className={`font-bold text-sm uppercase tracking-tight flex items-center gap-2 ${style.color}`}>
                           <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                           {/* TRADUÇÃO DO TÍTULO DA COLUNA */}
                           {t.stages[stageName] || stageName}
                        </h3>
                        <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-700">
                          {count}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 text-emerald-400/80">
                        <DollarIcon />
                        <span className="text-[11px] font-mono font-bold">
                           {formatPrice(stageTotal, userCurrency, userLang)}
                        </span>
                      </div>

                      <div className={`h-0.5 w-full mt-2 rounded-full bg-gray-800 overflow-hidden`}>
                          <div className={`h-full ${style.dot} opacity-50`} style={{ width: `${Math.min(count * 10, 100)}%` }}></div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-track]:bg-transparent">
                      {pipelineData[stageName]?.map((lead, index) => {
                        const leadDisplayName = lead.nome_empresa || lead.name || 'Sem Nome'
                        const daysSinceUpdate = getDaysSinceUpdate(lead.updated_at)
                        const isStale = daysSinceUpdate > 5

                        return (
                          <div 
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleOpenLead(lead.id)}
                            className={`
                              group relative bg-gray-900 p-4 rounded-lg border 
                              hover:border-gray-600 hover:shadow-xl transition-all duration-200 cursor-grab active:cursor-grabbing
                              ${draggedLeadId === lead.id ? 'opacity-30 scale-95 border-dashed border-blue-500' : isStale ? 'border-amber-500/40' : 'border-gray-800'}
                            `}
                          >
                            {isStale && (
                              <div className="absolute -top-1 -right-1 bg-amber-500 text-gray-900 rounded-full p-1 shadow-lg" title={`${daysSinceUpdate} ${t.stale}`}>
                                <ClockIcon />
                              </div>
                            )}

                            <div className="absolute top-2 right-2 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripIcon />
                            </div>

                            <div className="flex items-start gap-3 mb-3 pr-4">
                               <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                 {getInitials(leadDisplayName)}
                               </div>
                               <div className="overflow-hidden">
                                 <h4 className="font-semibold text-gray-200 text-sm leading-tight truncate w-full" title={leadDisplayName}>
                                   {leadDisplayName}
                                 </h4>
                                 {lead.nome_empresa && <p className="text-[10px] text-gray-500 truncate">{t.contactLabelTable} {lead.name}</p>}
                               </div>
                            </div>
                            
                            {/* Valor e Email no Card */}
                            <div className="space-y-1.5 mb-3">
                               <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                 <span>{formatPrice(lead.total_em_vendas, userCurrency, userLang)}</span>
                               </div>
                               {lead.email && (
                                 <div className="flex items-center gap-2 text-[10px] text-gray-500 truncate">
                                   <MailIcon />
                                   <span className="truncate">{lead.email}</span>
                                 </div>
                               )}
                            </div>

                            {/* Origem e Nicho */}
                            {(lead.source || lead.nicho) && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {lead.source && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-800/50 text-gray-400 rounded text-[9px] border border-gray-700/50">
                                    <TagIcon />
                                    {lead.source}
                                  </span>
                                )}
                                {lead.nicho && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] border border-blue-500/20">
                                    {lead.nicho}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                               <div className="flex items-center gap-1.5 text-[9px] font-medium text-gray-500">
                                 <CalendarIcon />
                                 {formatDate(lead.created_at)}
                               </div>
                               {index === 0 && count > 2 && (
                                 <span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">{t.priority}</span>
                               )}
                            </div>
                          </div>
                        )
                      })}
                      
                      {count === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 min-h-[150px] border-2 border-dashed border-gray-800 rounded-lg m-1">
                           <span className="text-xs text-gray-500 font-medium italic">{t.noLeadsStage}</span>
                        </div>
                      )}
                    </div>
                  </div>
              )})}
            </div>
          </div>
        )}

        {/* Mensagem de lista vazia */}
        {!loading && filteredLeads.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <SearchIcon />
            <p className="mt-4 text-sm font-medium">{t.noLeadsFound}</p>
            <p className="text-xs mt-1">{t.noLeadsHint}</p>
          </div>
        )}
      </main>

      {/* --- MODAL PARA CRIAR NOVO LEAD --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900/50">
              <h2 className="text-lg font-semibold text-white">{t.modalTitle}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <XIcon />
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
                  onChange={(e) => setNewLeadData({...newLeadData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t.companyLabel}</label>
                <input 
                  type="text" 
                  placeholder={t.companyPlaceholder}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                  value={newLeadData.nome_empresa}
                  onChange={(e) => setNewLeadData({...newLeadData, nome_empresa: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t.emailLabel}</label>
                  <input 
                    type="email" 
                    placeholder="joao@email.com"
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    value={newLeadData.email}
                    onChange={(e) => setNewLeadData({...newLeadData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t.phoneLabel}</label>
                  <input 
                    type="text" 
                    placeholder="(00) 00000-0000"
                    className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    value={newLeadData.phone}
                    onChange={(e) => setNewLeadData({...newLeadData, phone: e.target.value})}
                  />
                </div>
              </div>

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
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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