// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { 
  ArrowLeft, Activity, Clock, AlertCircle, CheckCircle2, 
  Terminal, Search, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
// Importando os locales
import { ptBR, enUS, es } from 'date-fns/locale'

// --- 1. TRADUÇÃO DE INTERFACE (TEXTOS FIXOS) ---
const UI_TRANSLATIONS = {
  pt: {
    back: 'Voltar para Agentes',
    loading: 'Carregando dados do agente...',
    fallbackName: 'Agente Inteligente',
    status: {
      active: 'Operando normalmente',
      inactive: 'Em Manutenção/Pausado'
    },
    stats: {
      totalCost: 'Custo Total (USD)',
      successRate: 'Taxa de Sucesso'
    },
    logs: {
      title: 'Histórico de Execuções',
      filter: 'Filtrar logs...',
      empty: 'Nenhuma execução registrada para este agente ainda.',
      headers: {
        status: 'Status',
        date: 'Data / Hora',
        duration: 'Duração',
        cost: 'Custo',
        output: 'Saída'
      },
      success: 'Sucesso'
    }
  },
  en: {
    back: 'Back to Agents',
    loading: 'Loading agent data...',
    fallbackName: 'Smart Agent',
    status: {
      active: 'Operating normally',
      inactive: 'Maintenance/Paused'
    },
    stats: {
      totalCost: 'Total Cost (USD)',
      successRate: 'Success Rate'
    },
    logs: {
      title: 'Execution History',
      filter: 'Filter logs...',
      empty: 'No executions recorded for this agent yet.',
      headers: {
        status: 'Status',
        date: 'Date / Time',
        duration: 'Duration',
        cost: 'Cost',
        output: 'Output'
      },
      success: 'Success'
    }
  },
  es: {
    back: 'Volver a Agentes',
    loading: 'Cargando datos del agente...',
    fallbackName: 'Agente Inteligente',
    status: {
      active: 'Operando normalmente',
      inactive: 'Mantenimiento/Pausado'
    },
    stats: {
      totalCost: 'Costo Total (USD)',
      successRate: 'Tasa de Éxito'
    },
    logs: {
      title: 'Historial de Ejecuciones',
      filter: 'Filtrar logs...',
      empty: 'Aún no hay ejecuciones registradas para este agente.',
      headers: {
        status: 'Estado',
        date: 'Fecha / Hora',
        duration: 'Duración',
        cost: 'Costo',
        output: 'Salida'
      },
      success: 'Éxito'
    }
  }
}

// --- 2. TRADUÇÃO DOS NOMES DAS SOLUÇÕES ---
const SOLUTIONS_TRANSLATIONS: Record<string, any> = {
  'captacao': {
    pt: { name: 'Hunter Prospecção' },
    en: { name: 'Hunter Prospecting' },
    es: { name: 'Hunter Prospección' }
  },
  'atendimento': {
    pt: { name: 'SAC Inteligente' },
    en: { name: 'Smart Support' },
    es: { name: 'Soporte Inteligente' }
  },
  'onboarding': {
    pt: { name: 'Agente de Onboarding' },
    en: { name: 'Onboarding Agent' },
    es: { name: 'Agente de Onboarding' }
  },
  'reativacao': {
    pt: { name: 'Reativação de Base' },
    en: { name: 'Base Reactivation' },
    es: { name: 'Reactivación de Base' }
  }
}

// Função de segurança para evitar falhas de "Invalid Date"
const parseDateSafe = (dateValue: any) => {
  try {
    if (!dateValue) return new Date()
    const d = new Date(dateValue)
    return isNaN(d.getTime()) ? new Date() : d
  } catch (e) {
    return new Date()
  }
}

export default function AgentDetailsPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  
  const agentId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : null
  
  const [agent, setAgent] = useState<any>(null)
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalRuns: 0, successRate: 0, totalCost: 0 })

  // Configurações de Localização (Bypass do TS com as any)
  const userLang = ((user as any)?.language as keyof typeof UI_TRANSLATIONS) || 'pt'
  const t = UI_TRANSLATIONS[userLang]
  const dateLocales: Record<string, any> = { pt: ptBR, en: enUS, es: es }
  const currentLocale = dateLocales[userLang] || enUS

  useEffect(() => {
    if (agentId) loadAgentData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  async function loadAgentData() {
    try {
      setLoading(true)
      
      // 1. Buscar detalhes do Agente
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select(`
          *,
          solution:agent_solutions!agents_kind_fkey (*)
        `)
        .eq('id', agentId)
        .single()

      if (agentError) throw agentError
      setAgent(agentData)

      // 2. Buscar histórico
      const { data: runsData, error: runsError } = await supabase
        .from('agent_runs') 
        .select('*')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(50)

      if (runsError) throw runsError
      
      setRuns(runsData || [])

      // 3. Estatísticas
      if (runsData && runsData.length > 0) {
        const total = runsData.length
        const success = runsData.filter(r => r.status === 'success').length
        const cost = runsData.reduce((acc, curr) => acc + (Number(curr.cost_usd) || 0), 0)
        
        setStats({
          totalRuns: total,
          successRate: total > 0 ? (success / total) * 100 : 0,
          totalCost: cost
        })
      }

    } catch (err: any) {
      console.error("ERRO:", err)
    } finally {
      setLoading(false)
    }
  }

  // Helper para cor do status
  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'success': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'error': 
      case 'failed': return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      case 'running': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      default: return 'text-gray-400 bg-gray-800 border-gray-700'
    }
  }

  // Helper para traduzir o NOME do agente
  const getAgentName = () => {
    if (!agent) return t.fallbackName
    
    const translation = SOLUTIONS_TRANSLATIONS[agent.kind]?.[userLang]
    if (translation) return translation.name
    
    return agent.solution?.name || t.fallbackName
  }

  if (loading) return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-gray-500 text-xs">{t.loading}</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER DE NAVEGAÇÃO */}
      <div>
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group w-fit"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {t.back}
        </button>

        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
              <Activity size={24} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{getAgentName()}</h1>
              
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${agent?.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-400 capitalize">
                  {agent?.status === 'active' ? t.status.active : t.status.inactive}
                </span>
                <span className="text-gray-600 hidden sm:inline">•</span>
                <span className="text-xs font-mono text-gray-500 uppercase">ID: {agent?.id?.slice(0, 8)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex w-full xl:w-auto gap-3">
            <div className="flex-1 xl:flex-none text-left xl:text-right px-4 py-3 bg-[#0A0A0A] rounded-xl border border-white/5 shadow-lg">
               <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.stats.totalCost}</p>
               <p className="text-xl font-mono text-emerald-400">${stats.totalCost.toFixed(4)}</p>
            </div>
            <div className="flex-1 xl:flex-none text-left xl:text-right px-4 py-3 bg-[#0A0A0A] rounded-xl border border-white/5 shadow-lg">
               <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t.stats.successRate}</p>
               <p className={`text-xl font-bold ${stats.successRate > 90 ? 'text-blue-400' : 'text-amber-400'}`}>
                 {stats.successRate.toFixed(0)}%
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE LOGS (CONSOLE) */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 gap-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Terminal size={18} className="text-gray-400" />
            {t.logs.title}
          </h3>
          <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 w-full sm:w-auto focus-within:border-blue-500/50 transition-colors">
             <Search size={14} className="text-gray-500" />
             <input placeholder={t.logs.filter} className="bg-transparent text-xs text-white outline-none w-full sm:w-40 placeholder-gray-600" />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
            <thead className="bg-black/40 text-[11px] uppercase tracking-wider font-bold text-gray-500 border-b border-white/5">
              <tr>
                <th className="px-6 py-4">{t.logs.headers.status}</th>
                <th className="px-6 py-4">{t.logs.headers.date}</th>
                <th className="px-6 py-4">{t.logs.headers.duration}</th>
                <th className="px-6 py-4">{t.logs.headers.cost}</th>
                <th className="px-6 py-4">{t.logs.headers.output}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold border uppercase ${getStatusColor(run.status)}`}>
                      {run.status === 'success' && <CheckCircle2 size={12} className="mr-1.5"/>}
                      {(run.status === 'error' || run.status === 'failed') && <AlertCircle size={12} className="mr-1.5"/>}
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[13px] text-gray-300">
                    {run.started_at 
                      ? format(parseDateSafe(run.started_at), "dd/MM/yyyy HH:mm:ss", { locale: currentLocale }) 
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Clock size={14} className="text-gray-500" />
                      {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[13px] text-gray-300">
                    {run.cost_usd ? `$${Number(run.cost_usd).toFixed(4)}` : '-'}
                  </td>
                  <td className="px-6 py-4 max-w-sm sm:max-w-md">
                      {run.error_msg ? (
                        <span className="text-rose-400 text-xs font-mono truncate bg-rose-950/30 px-2.5 py-1.5 rounded border border-rose-500/20 block">
                          {run.error_msg}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-[13px] italic flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"></span>
                          {t.logs.success}
                        </span>
                      )}
                  </td>
                </tr>
              ))}

              {runs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                    <Terminal size={32} className="mx-auto mb-3 opacity-20" />
                    {t.logs.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}