// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  Lock, Settings, PlayCircle, PauseCircle, AlertTriangle, 
  CheckCircle2, Target, Headphones, Rocket, Zap, X, Save,
  Activity, DollarSign, AlertCircle, Loader2 // <--- Adicione o Loader2 aqui!
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
// Importando os locales para data
import { ptBR, enUS, es } from 'date-fns/locale'

// --- 1. TRADUÇÃO DE INTERFACE (TEXTOS FIXOS) ---
const UI_TRANSLATIONS = {
  pt: {
    pageTitle: 'Agentes & Soluções',
    pageDesc: 'Gerencie sua força de trabalho digital ativa ou ative novas soluções.',
    modalTitle: 'Configurar Agente',
    modalDesc: 'Ajuste os parâmetros de inteligência.',
    nicheLabel: 'Nicho Alvo',
    nichePlaceholder: 'Ex: Clínicas Odontológicas',
    citiesLabel: 'Cidades',
    citiesPlaceholder: 'Ex: São Paulo, Rio de Janeiro',
    noConfig: 'Sem configurações rápidas disponíveis.',
    save: 'Salvar Alterações',
    saving: 'Salvando...',
    maintenance: 'Manutenção',
    paused: 'Pausado',
    active: 'Ativo',
    lastRun: 'Última Exec.',
    neverRan: 'Nunca rodou',
    totalCost: 'Custo Total',
    configure: 'Configurar',
    pauseAgent: 'Pausar Agente',
    activateAgent: 'Ativar Agente',
    viewLogs: 'Ver Logs Completos',
    locations: 'locais',
    hire: 'Contratar',
    alerts: {
      maintenance: 'Este agente está em manutenção e não pode ser ativado no momento.',
      errorSave: 'Erro ao salvar.',
      errorStatus: 'Erro ao alterar status.',
      confirmHire: 'Deseja ativar o {agent} na sua conta?',
      errorHire: 'Erro ao contratar agente.'
    }
  },
  en: {
    pageTitle: 'Agents & Solutions',
    pageDesc: 'Manage your active digital workforce or activate new solutions.',
    modalTitle: 'Configure Agent',
    modalDesc: 'Adjust intelligence parameters.',
    nicheLabel: 'Target Niche',
    nichePlaceholder: 'Ex: Dental Clinics',
    citiesLabel: 'Cities',
    citiesPlaceholder: 'Ex: New York, London',
    noConfig: 'No quick settings available.',
    save: 'Save Changes',
    saving: 'Saving...',
    maintenance: 'Maintenance',
    paused: 'Paused',
    active: 'Active',
    lastRun: 'Last Run',
    neverRan: 'Never ran',
    totalCost: 'Total Cost',
    configure: 'Configure',
    pauseAgent: 'Pause Agent',
    activateAgent: 'Activate Agent',
    viewLogs: 'View Full Logs',
    locations: 'locations',
    hire: 'Hire',
    alerts: {
      maintenance: 'This agent is under maintenance and cannot be activated right now.',
      errorSave: 'Error saving.',
      errorStatus: 'Error changing status.',
      confirmHire: 'Do you want to activate {agent} on your account?',
      errorHire: 'Error hiring agent.'
    }
  },
  es: {
    pageTitle: 'Agentes y Soluciones',
    pageDesc: 'Gestione su fuerza laboral digital activa o active nuevas soluciones.',
    modalTitle: 'Configurar Agente',
    modalDesc: 'Ajuste los parámetros de inteligencia.',
    nicheLabel: 'Nicho Objetivo',
    nichePlaceholder: 'Ej: Clínicas Dentales',
    citiesLabel: 'Ciudades',
    citiesPlaceholder: 'Ej: Madrid, Barcelona',
    noConfig: 'No hay configuraciones rápidas disponibles.',
    save: 'Guardar Cambios',
    saving: 'Guardando...',
    maintenance: 'Mantenimiento',
    paused: 'Pausado',
    active: 'Activo',
    lastRun: 'Última Ejec.',
    neverRan: 'Nunca se ejecutó',
    totalCost: 'Costo Total',
    configure: 'Configurar',
    pauseAgent: 'Pausar Agente',
    activateAgent: 'Activar Agente',
    viewLogs: 'Ver Logs Completos',
    locations: 'ubicaciones',
    hire: 'Contratar',
    alerts: {
      maintenance: 'Este agente está en mantenimiento y no se puede activar en este momento.',
      errorSave: 'Error al guardar.',
      errorStatus: 'Error al cambiar estado.',
      confirmHire: '¿Desea activar {agent} en su cuenta?',
      errorHire: 'Error al contratar agente.'
    }
  }
}

// --- 2. TRADUÇÃO DE CONTEÚDO (AGENTES) ---
const SOLUTIONS_TRANSLATIONS: Record<string, any> = {
  'captacao': {
    pt: {
      name: 'Hunter Prospecção',
      description: 'Agente focado em encontrar e qualificar novos leads frios.',
      features: ['Busca ativa', 'Enriquecimento de dados', 'Primeiro contato']
    },
    en: {
      name: 'Hunter Prospecting',
      description: 'Agent focused on finding and qualifying new cold leads.',
      features: ['Active search', 'Data enrichment', 'First contact']
    },
    es: {
      name: 'Hunter Prospección',
      description: 'Agente enfocado en encontrar y calificar nuevos leads fríos.',
      features: ['Búsqueda activa', 'Enriquecimiento de datos', 'Primer contacto']
    }
  },
  'atendimento': {
    pt: {
      name: 'SAC Inteligente',
      description: 'Responde dúvidas frequentes e tria clientes 24/7.',
      features: ['Respostas instantâneas', 'Base de conhecimento', 'Escalonamento humano']
    },
    en: {
      name: 'Smart Support',
      description: 'Answers FAQs and triages customers 24/7.',
      features: ['Instant replies', 'Knowledge base', 'Human escalation']
    },
    es: {
      name: 'Soporte Inteligente',
      description: 'Responde preguntas frecuentes y clasifica clientes 24/7.',
      features: ['Respuestas instantáneas', 'Base de conocimiento', 'Escalada humana']
    }
  },
  'onboarding': {
    pt: {
      name: 'Agente de Onboarding',
      description: 'Guia novos clientes passo a passo na plataforma.',
      features: ['Boas-vindas', 'Tour guiado', 'Setup inicial']
    },
    en: {
      name: 'Onboarding Agent',
      description: 'Guides new customers step-by-step through the platform.',
      features: ['Welcome message', 'Guided tour', 'Initial setup']
    },
    es: {
      name: 'Agente de Onboarding',
      description: 'Guía a nuevos clientes paso a paso en la plataforma.',
      features: ['Bienvenida', 'Tour guiado', 'Configuración inicial']
    }
  }
}

// --- ÍCONES ---
const ICON_MAP: Record<string, any> = {
  'Target': Target,
  'Headphones': Headphones,
  'Rocket': Rocket,
  'Zap': Zap
}

// --- TIPOS ---
type AgentSolution = {
  slug: string
  name: string
  description: string
  icon: string
  price_display: string
  features: string[]
}

type MyAgent = {
  id: string
  kind: string
  status: 'active' | 'paused' | 'maintenance'
  cfg: any
  last_run_status?: string
  last_run_at?: string
  total_cost?: number
  total_runs?: number
}

// --- MODAL CONFIG ---
const ConfigModal = ({ isOpen, onClose, agent, onSave, saving, t }: any) => {
  const [config, setConfig] = useState(agent?.cfg || {})

  useEffect(() => {
    if (agent) setConfig(agent.cfg || {})
  }, [agent])

  if (!isOpen || !agent) return null
  const isCaptacao = agent.kind === 'captacao' || agent.kind === 'hunter_prospecting'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-white"><X size={20}/></button>
        <h3 className="text-lg font-bold text-white mb-1">{t.modalTitle}</h3>
        <p className="text-xs text-gray-500 mb-6">{t.modalDesc}</p>
        <div className="space-y-4">
          {isCaptacao ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">{t.nicheLabel}</label>
                <input 
                  value={config.niche || ''}
                  onChange={e => setConfig({...config, niche: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none"
                  placeholder={t.nichePlaceholder}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">{t.citiesLabel}</label>
                <textarea 
                  value={config.cities || ''}
                  onChange={e => setConfig({...config, cities: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none h-24 resize-none"
                  placeholder={t.citiesPlaceholder}
                />
              </div>
            </>
          ) : (
            <div className="p-4 bg-gray-900/50 rounded-lg text-gray-500 text-sm text-center border border-white/5">
              {t.noConfig}
            </div>
          )}
        </div>
        <div className="mt-6">
          <button onClick={() => onSave(agent.id, config)} disabled={saving} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- PÁGINA PRINCIPAL ---
export default function AgentsMarketplacePage() {
  const { user, org } = useAuth()
  const router = useRouter()
  const [solutions, setSolutions] = useState<AgentSolution[]>([])
  const [myAgents, setMyAgents] = useState<MyAgent[]>([])
  const [loading, setLoading] = useState(true)

  // Controle UI
  const [selectedAgent, setSelectedAgent] = useState<MyAgent | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Configurações de Localização (Com TypeScript Type Bypassing)
  const userLang = ((user as any)?.language as keyof typeof UI_TRANSLATIONS) || 'pt'
  const t = UI_TRANSLATIONS[userLang]
  
  // Mapeamento para o date-fns
  const dateLocales: Record<string, any> = { pt: ptBR, en: enUS, es: es }
  const currentLocale = dateLocales[userLang] || enUS

  useEffect(() => {
    if (org?.id) fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id])

  async function fetchData() {
    try {
      setLoading(true)
      
      const { data: catalogData } = await supabase.from('agent_solutions').select('*')
      
      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, kind, status, cfg')
        .eq('org_id', org?.id)

      if (agentsData && agentsData.length > 0) {
        const enrichedAgents = await Promise.all(agentsData.map(async (agent) => {
          const { data: lastRun } = await supabase
            .from('agent_runs')
            .select('status, started_at')
            .eq('agent_id', agent.id)
            .order('started_at', { ascending: false })
            .limit(1)
            .single()

          const { data: allRuns } = await supabase
            .from('agent_runs')
            .select('cost_usd')
            .eq('agent_id', agent.id)
          
          const totalCost = allRuns?.reduce((acc, curr) => acc + (Number(curr.cost_usd) || 0), 0) || 0
          const totalRunsCount = allRuns?.length || 0

          return {
            ...agent,
            last_run_status: lastRun?.status,
            last_run_at: lastRun?.started_at,
            total_cost: totalCost,
            total_runs: totalRunsCount
          } as MyAgent
        }))

        setMyAgents(enrichedAgents)
      } else {
        setMyAgents([])
      }
      
      if (catalogData) setSolutions(catalogData)

    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  // Helper para pegar o conteúdo traduzido do agente
  const getAgentContent = (solution: AgentSolution) => {
    const translations = SOLUTIONS_TRANSLATIONS[solution.slug]
    // Se existir tradução para o idioma, usa. Senão, usa do banco.
    if (translations && translations[userLang]) {
      return {
        name: translations[userLang].name,
        description: translations[userLang].description,
        features: translations[userLang].features
      }
    }
    // Fallback para o banco de dados
    return {
      name: solution.name,
      description: solution.description,
      features: solution.features || []
    }
  }

  const handleUpdateConfig = async (agentId: string, newConfig: any) => {
    setIsSaving(true)
    try {
      const { error } = await supabase.from('agents').update({ cfg: newConfig }).eq('id', agentId)
      if (error) throw error
      setMyAgents(prev => prev.map(a => a.id === agentId ? { ...a, cfg: newConfig } : a))
      setSelectedAgent(null)
    } catch (err) {
      alert(t.alerts.errorSave)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async (agent: MyAgent) => {
    if (agent.status === 'maintenance') {
      alert(t.alerts.maintenance)
      return
    }

    const newStatus = agent.status === 'active' ? 'paused' : 'active'
    // Atualiza otimista a UI
    setMyAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a))

    try {
      const { error } = await supabase.from('agents').update({ status: newStatus }).eq('id', agent.id)
      if (error) throw error
    } catch (err) {
      // Reverte se der erro
      alert(t.alerts.errorStatus)
      setMyAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: agent.status } : a))
    }
  }

  const handleHireAgent = async (solutionSlug: string, agentName: string) => {
    const confirmMsg = t.alerts.confirmHire.replace('{agent}', agentName)
    const confirm = window.confirm(confirmMsg)
    if (!confirm || !org?.id) return

    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          org_id: org.id,
          kind: solutionSlug,
          status: 'active',
          cfg: {}
        })
        .select()
        .single()

      if (error) throw error
      if (data) await fetchData()

    } catch (err) {
      console.error(err)
      alert(t.alerts.errorHire)
    }
  }

  if (loading) return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">{t.pageTitle}</h1>
        <p className="text-gray-400 mt-2">{t.pageDesc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {solutions.map(solution => {
          const myAgent = myAgents.find(a => a.kind === solution.slug)
          const IconComponent = ICON_MAP[solution.icon] || Zap
          
          // CONTEÚDO TRADUZIDO (NOME, DESCRIÇÃO, FEATURES)
          const content = getAgentContent(solution)

          if (myAgent) {
            // --- CARD: AGENTE ATIVO/COMPRADO ---
            const isMaintenance = myAgent.status === 'maintenance'
            const isPaused = myAgent.status === 'paused'
            const hasError = myAgent.last_run_status === 'error' || myAgent.last_run_status === 'failed'
            
            return (
              <div key={solution.slug} className={`flex flex-col relative bg-[#0A0A0A] border rounded-2xl p-6 transition-all hover:border-blue-500/30 
                ${isMaintenance || hasError ? 'border-red-900/50 shadow-[0_0_20px_rgba(153,27,27,0.1)]' 
                : isPaused ? 'border-amber-500/20 opacity-75'
                : 'border-white/10 shadow-xl'}`}>
                
                {/* Header do Card */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isMaintenance || hasError ? 'bg-red-500/10 text-red-500' : 'bg-blue-600/20 text-blue-500'}`}>
                    <IconComponent size={24} />
                  </div>
                  
                  {/* Status Badge Principal */}
                  <div>
                    {isMaintenance ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wide">
                        <AlertTriangle size={12} /> {t.maintenance}
                      </span>
                    ) : isPaused ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wide">
                         <PauseCircle size={12} /> {t.paused}
                       </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                        <CheckCircle2 size={12} /> {t.active}
                      </span>
                    )}
                  </div>
                </div>

                {/* NOME DO AGENTE TRADUZIDO */}
                <h3 className="text-xl font-bold text-white">{content.name}</h3>
                
                {/* Dados de Performance */}
                <div className="mt-6 mb-6 grid grid-cols-2 gap-3">
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Activity size={10}/> {t.lastRun}</p>
                    <div className="flex items-center gap-2">
                        {hasError ? (
                          <AlertCircle size={14} className="text-red-500" />
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                        )}
                        <span className={`text-xs font-medium ${hasError ? 'text-red-400' : 'text-gray-300'}`}>
                          {/* DATA LOCALIZADA */}
                          {myAgent.last_run_at 
                            ? formatDistanceToNow(new Date(myAgent.last_run_at), { addSuffix: true, locale: currentLocale }) 
                            : t.neverRan}
                        </span>
                     </div>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><DollarSign size={10}/> {t.totalCost}</p>
                    <span className="text-xs font-medium text-white font-mono">
                      $ {myAgent.total_cost?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 flex gap-3">
                   {/* BOTÃO CONFIGURAR AGORA USANDO TRADUÇÃO */}
                   <button 
                     onClick={() => setSelectedAgent(myAgent)}
                     className="flex-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 py-2 rounded-lg text-sm font-bold transition-colors"
                   >
                     <Settings size={16} /> {t.configure}
                   </button>
                   
                   <button 
                      onClick={() => handleToggleStatus(myAgent)}
                      disabled={isMaintenance}
                      className={`w-10 flex items-center justify-center rounded-lg border transition-all ${
                        myAgent.status === 'active' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                          : myAgent.status === 'paused'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20'
                            : 'bg-gray-800 border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                      title={myAgent.status === 'active' ? t.pauseAgent : t.activateAgent}
                   >
                      {myAgent.status === 'active' ? <PauseCircle size={18}/> : <PlayCircle size={18}/>}
                   </button>

                   <button 
                     onClick={() => router.push(`/dashboard/agents/${myAgent.id}`)}
                     className="w-10 flex items-center justify-center rounded-lg border bg-gray-900 border-white/10 text-gray-400 hover:text-white transition-colors" 
                     title={t.viewLogs}
                   >
                      <Activity size={18}/>
                   </button>
                </div>

                {/* Tags de Config */}
                {myAgent.cfg && (myAgent.cfg.niche || myAgent.cfg.cities) && (
                   <div className="mt-4 flex flex-wrap gap-2">
                      {myAgent.cfg.niche && <span className="text-[9px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full truncate max-w-[120px]">{myAgent.cfg.niche}</span>}
                      {myAgent.cfg.cities && <span className="text-[9px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">+{myAgent.cfg.cities.split(',').length} {t.locations}</span>}
                   </div>
                )}
              </div>
            )

          } else {
            // --- CARD: BLOQUEADO (MARKETPLACE) ---
            return (
              <div key={solution.slug} className="relative bg-gray-900/20 border border-white/5 rounded-2xl p-6 overflow-hidden group hover:border-blue-500/20 transition-all">
                 
                 <div className="opacity-40 group-hover:opacity-100 transition-opacity filter grayscale group-hover:grayscale-0 duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mb-4 text-gray-400">
                      <IconComponent size={24} />
                    </div>
                    {/* NOME TRADUZIDO AQUI */}
                    <h3 className="text-xl font-bold text-white">{content.name}</h3>
                    {/* DESCRIÇÃO TRADUZIDA AQUI */}
                    <p className="text-sm text-gray-400 mt-2 min-h-[40px]">{content.description}</p>
                    
                    <ul className="mt-6 space-y-2">
                      {/* FEATURES TRADUZIDAS AQUI */}
                      {content.features?.slice(0, 3).map((feat: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-1 h-1 rounded-full bg-blue-500" /> {feat}
                        </li>
                      ))}
                    </ul>
                 </div>

                 <div className="mt-8">
                   <button 
                     onClick={() => handleHireAgent(solution.slug, content.name)}
                     className="w-full py-2.5 bg-gray-800 hover:bg-white hover:text-black border border-white/10 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                   >
                     <Lock size={14} /> 
                     {/* BOTÃO CONTRATAR TRADUZIDO */}
                     <span>{t.hire} • {solution.price_display}</span>
                   </button>
                 </div>
              </div>
            )
          }
        })}
      </div>

      <ConfigModal 
        isOpen={!!selectedAgent} 
        agent={selectedAgent} 
        onClose={() => setSelectedAgent(null)} 
        onSave={handleUpdateConfig}
        saving={isSaving}
        t={t} 
      />
    </div>
  )
}