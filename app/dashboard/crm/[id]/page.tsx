// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext' 

// --- DICIONÁRIO DE TRADUÇÃO ---
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
    instagram: 'Instagram',
    city: 'Cidade',
    website: 'Site/URL',
    value: 'Valor',
    timelineTitle: 'Linha do Tempo',
    emptyHistory: 'Nenhum histórico registrado.',
    quickNoteTitle: 'Anotação Rápida',
    notePlaceholder: 'Escreva algo sobre este lead...',
    addNote: 'Adicionar ao Histórico',
    errorUpdate: 'Erro ao salvar alteração.',
    errorNote: 'Erro ao salvar anotação.'
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
    instagram: 'Instagram',
    city: 'City',
    website: 'Website/URL',
    value: 'Value',
    timelineTitle: 'Timeline',
    emptyHistory: 'No history recorded.',
    quickNoteTitle: 'Quick Note',
    notePlaceholder: 'Write something about this lead...',
    addNote: 'Add to History',
    errorUpdate: 'Error saving changes.',
    errorNote: 'Error saving note.'
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
    instagram: 'Instagram',
    city: 'Ciudad',
    website: 'Sitio Web/URL',
    value: 'Valor',
    timelineTitle: 'Línea de Tiempo',
    emptyHistory: 'Ningún historial registrado.',
    quickNoteTitle: 'Nota Rápida',
    notePlaceholder: 'Escribe algo sobre este lead...',
    addNote: 'Añadir al Historial',
    errorUpdate: 'Error al guardar cambios.',
    errorNote: 'Error al guardar nota.'
  }
}

// --- ÍCONES ---
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
)
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
)
const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
)
const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
)

// --- TIPOS ---
type LeadDetails = {
  id: string
  name: string
  name_empresa?: string
  email: string
  phone?: string
  stage: string
  created_at: string
  conversa_finalizada: boolean
  instagram?: string
  city?: string
  url_site?: string
  total_em_vendas?: number
}

type LeadEvent = {
  id: string
  type: 'stage_change' | 'note' | 'contact'
  content: string
  created_at: string
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

export default function LeadProfilePage() {
  const params = useParams()
  const router = useRouter()
  // Puxando 'org' também caso seja necessário fazer checagens de permissão extras no futuro
  const { user, org } = useAuth() 
  
  // Preferências do Usuário com bypass de tipagem TS
  const userLang = ((user as any)?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]
  const userCurrency = ((user as any)?.currency as string) || 'BRL'
  const userTimezone = ((user as any)?.timezone as string) || 'America/Sao_Paulo'

  const id = params?.id ? String(params.id) : null

  const [lead, setLead] = useState<LeadDetails | null>(null)
  const [events, setEvents] = useState<LeadEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // --- BUSCA INICIAL DE DADOS ---
  useEffect(() => {
    async function fetchData() {
      if (!id) return
      
      try {
        setLoading(true)
        setErrorMessage(null)

        // 1. Busca o Lead
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', id)
          .single()

        if (leadError) throw leadError
        
        if (!leadData) {
            setErrorMessage("Lead não encontrado no banco de dados.")
            return
        }

        setLead(leadData)

        // 2. Busca os Eventos
        const { data: eventsData, error: eventsError } = await supabase
          .from('lead_events')
          .select('*')
          .eq('lead_id', id)
          .order('created_at', { ascending: false })

        if (eventsError) console.error("Erro ao buscar eventos:", eventsError)
        
        setEvents(eventsData || [])

      } catch (err: any) {
        console.error("Erro fatal no fetch:", err)
        setErrorMessage(err.message || "Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // --- AÇÕES ---

  const handleToggleIA = async () => {
    if (!lead || !id) return
    const newValue = !lead.conversa_finalizada
    const { error } = await supabase.from('leads').update({ conversa_finalizada: newValue }).eq('id', id)
    if (!error) setLead({ ...lead, conversa_finalizada: newValue })
  }

  const handleUpdateField = async (field: keyof LeadDetails, value: any) => {
    if(!id || !lead) return

    const cleanValue = (typeof value === 'string' && value.trim() === '') ? null : value

    setLead(prev => prev ? { ...prev, [field]: cleanValue } : null)

    const { error } = await supabase
        .from('leads')
        .update({ [field]: cleanValue })
        .eq('id', id)

    if (error) {
        console.error(`Erro ao atualizar ${field}:`, error)
        alert(t.errorUpdate)
    }
  }

  const handleSaveNote = async () => {
    if (!note.trim() || !id) return
    setSavingNote(true)
    
    const { data, error } = await supabase
        .from('lead_events')
        .insert({ 
            lead_id: id, 
            type: 'note', 
            content: note 
        })
        .select()
        .single()

    if (!error && data) {
      setEvents([data, ...events])
      setNote('')
    } else {
        console.error("Erro ao salvar nota:", error)
        alert(t.errorNote)
    }
    setSavingNote(false)
  }

  const openWhatsApp = () => {
    if (!lead?.phone) return
    const num = lead.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${num}`, '_blank')
  }

  // --- RENDERIZAÇÃO ---

  // Estado de Carregamento
  if (loading) {
      return (
        <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-[#0A0A0A] text-white">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="animate-pulse text-gray-400 font-medium">{t.loading}</p>
        </div>
      )
  }

  // Estado de Erro / Não Encontrado
  if (!lead) {
      return (
        <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-[#0A0A0A] text-white p-6 text-center animate-in fade-in duration-300">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">{t.notFoundTitle}</h2>
            <p className="text-gray-400 mb-6">{errorMessage || t.notFoundDesc}</p>
            <div className="bg-gray-900 p-2 rounded text-xs font-mono text-gray-500 mb-6 border border-gray-800">
                {t.notFoundId} {id || 'Nenhum'}
            </div>
            <button onClick={() => router.push('/dashboard/crm')} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg transition-colors font-bold shadow-lg shadow-blue-600/20">
                {t.backToCrm}
            </button>
        </div>
      )
  }

  const displayName = lead.name_empresa || lead.name || "Sem nome"

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#0A0A0A] text-gray-200 p-4 md:p-10 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* CABEÇALHO SUPERIOR */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-white transition-colors group">
          <div className="group-hover:-translate-x-1 transition-transform">
            <ArrowLeftIcon />
          </div> 
          {t.back}
        </button>
        
        <button 
          onClick={handleToggleIA}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all shadow-lg w-full sm:w-auto justify-center ${
            lead.conversa_finalizada 
            ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 shadow-red-500/5' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 shadow-emerald-500/5'
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${lead.conversa_finalizada ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {lead.conversa_finalizada ? t.agentPaused : t.agentActive}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
        
        {/* COLUNA ESQUERDA (PRINCIPAL) */}
        <div className="xl:col-span-2 space-y-6 lg:space-y-8">
          
          {/* CARTÃO DE PERFIL */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
            {/* Efeito de Brilho no Topo */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-transparent opacity-50"></div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="w-24 h-24 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-3xl font-black shadow-lg shadow-blue-900/40 text-white border border-blue-500/30">
                {displayName[0]?.toUpperCase()}
              </div>
              
              <div className="flex-1 text-center md:text-left min-w-0">
                <h1 className="text-3xl lg:text-4xl font-black text-white mb-1.5 truncate" title={displayName}>{displayName}</h1>
                {lead.name_empresa && lead.name && <p className="text-gray-400 text-sm mb-3 italic truncate">{t.contact}: {lead.name}</p>}
                
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                  <span className="px-3 py-1 bg-gray-900 rounded-lg text-xs text-blue-400 font-mono border border-white/5 font-semibold">
                    {lead.stage}
                  </span>
                  <div className="flex items-center gap-2 text-gray-400 text-sm bg-gray-900/50 px-3 py-1 rounded-lg border border-white/5">
                    <MailIcon /> <span className="truncate max-w-[150px] sm:max-w-none">{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm bg-gray-900/50 px-3 py-1 rounded-lg border border-white/5">
                    <PhoneIcon /> {lead.phone}
                  </div>
                </div>
              </div>

              <button 
                onClick={openWhatsApp} 
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 shrink-0"
              >
                {t.whatsapp}
              </button>
            </div>

            {/* CAMPOS DE EDIÇÃO RÁPIDA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/5">
                <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">{t.instagram}</label>
                    <input 
                        defaultValue={lead.instagram || ''}
                        onBlur={(e) => handleUpdateField('instagram', e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-700"
                        placeholder="@instagram"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">{t.city}</label>
                    <input 
                        defaultValue={lead.city || ''}
                        onBlur={(e) => handleUpdateField('city', e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-700"
                        placeholder={t.city}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">{t.website}</label>
                    <input 
                        defaultValue={lead.url_site || ''}
                        onBlur={(e) => handleUpdateField('url_site', e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-700"
                        placeholder="https://..."
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider ml-1 flex items-center gap-1">
                      {t.value} ({userCurrency})
                    </label>
                    <input 
                        type="number"
                        defaultValue={lead.total_em_vendas || 0}
                        onBlur={(e) => handleUpdateField('total_em_vendas', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0A0A0A] border border-emerald-900/50 rounded-xl p-3 text-sm text-emerald-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 font-bold transition-all"
                    />
                </div>
            </div>
          </div>

          {/* TIMELINE DE EVENTOS */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 lg:p-8 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
               <MessageIcon /> {t.timelineTitle}
             </h3>
             <div className="space-y-6">
                {events.length === 0 && (
                  <div className="text-center py-10 opacity-50">
                    <p className="text-gray-500 text-sm italic">{t.emptyHistory}</p>
                  </div>
                )}
                
                {events.map((event) => (
                    <div key={event.id} className="flex gap-4 group">
                        <div className="min-w-[2px] bg-white/10 relative group-last:bg-transparent">
                            <div className="absolute top-1 -left-[5px] w-3 h-3 rounded-full bg-blue-500 ring-4 ring-[#111]"></div>
                        </div>
                        <div className="pb-8 flex-1">
                            <p className="text-[10px] text-gray-500 font-mono mb-2 font-medium">
                                {/* Formatação Segura e Localizada */}
                                {parseDateSafe(event.created_at).toLocaleString(userLang, { 
                                  timeZone: userTimezone,
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric',
                                  hour: '2-digit', 
                                  minute:'2-digit' 
                                })}
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

        {/* COLUNA DIREITA (AÇÕES RÁPIDAS) */}
        <div className="space-y-6">
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 lg:p-8 sticky top-6 shadow-xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {t.quickNoteTitle}
                </h3>
                <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full h-32 lg:h-40 bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-sm text-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all placeholder-gray-600 custom-scrollbar"
                    placeholder={t.notePlaceholder}
                />
                <button 
                    onClick={handleSaveNote} 
                    disabled={savingNote || !note.trim()} 
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center shadow-lg shadow-blue-600/20 disabled:shadow-none"
                >
                    {savingNote ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : t.addNote}
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}