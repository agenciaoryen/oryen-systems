'use client'

// --- A CORREÇÃO MÁGICA ESTÁ AQUI EMBAIXO ---
export const dynamic = 'force-dynamic'
// -------------------------------------------

import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useSearchParams } from 'next/navigation'
import { Search, MessageCircle, CheckCheck, X, ExternalLink, Loader2 } from 'lucide-react'

// --- 1. DICIONÁRIO DE TRADUÇÃO ---
const TRANSLATIONS = {
  pt: {
    activePipeline: 'Pipeline Ativo',
    searchPlaceholder: 'Buscar conversa...',
    startConversation: 'Iniciar conversa...',
    readOnly: 'Somente Leitura',
    openWhatsapp: 'Abrir no WhatsApp',
    closeChat: 'Fechar conversa',
    emptyState: 'Selecione uma conversa ao lado para ver o histórico de mensagens',
    stages: {
       'todos': 'Todas',
       'contatado': 'Contatado',
       'Lead respondeu': 'Lead Respondeu',
       'qualificado': 'Qualificado',
       'reuniao': 'Reunião',
       'ganho': 'Ganho'
    }
  },
  en: {
    activePipeline: 'Active Pipeline',
    searchPlaceholder: 'Search conversation...',
    startConversation: 'Start conversation...',
    readOnly: 'Read Only',
    openWhatsapp: 'Open in WhatsApp',
    closeChat: 'Close chat',
    emptyState: 'Select a conversation to view message history',
    stages: {
       'todos': 'All',
       'contatado': 'Contacted',
       'Lead respondeu': 'Lead Responded',
       'qualificado': 'Qualified',
       'reuniao': 'Meeting',
       'ganho': 'Won'
    }
  },
  es: {
    activePipeline: 'Pipeline Activo',
    searchPlaceholder: 'Buscar conversación...',
    startConversation: 'Iniciar conversación...',
    readOnly: 'Solo Lectura',
    openWhatsapp: 'Abrir en WhatsApp',
    closeChat: 'Cerrar chat',
    emptyState: 'Seleccione una conversación para ver el historial',
    stages: {
       'todos': 'Todas',
       'contatado': 'Contactado',
       'Lead respondeu': 'Lead Respondió',
       'qualificado': 'Calificado',
       'reuniao': 'Reunión',
       'ganho': 'Ganado'
    }
  }
}

type Message = {
  id: string
  lead_id: string
  body: string
  direction: string
  emotion: string
  created_at: string
}

type LeadConversation = {
  id: string
  name: string
  phone: string | null
  stage: string
  last_message_emotion: string
  last_message_body: string
  last_message_at: string
}

// --- 2. CONTEÚDO DA PÁGINA (COMPONENT INTERNO) ---
function MessagesContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const targetLeadId = searchParams.get('lead_id')

  const [activeLead, setActiveLead] = useState<LeadConversation | null>(null)
  const [conversations, setConversations] = useState<LeadConversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [filterStage, setFilterStage] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  
  const scrollRef = useRef<HTMLDivElement>(null)

  // Configurações de Localização
  const userLang = (user?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const getEmotionEmoji = (emotion: string) => {
    switch (emotion?.toLowerCase()) {
      case 'positive': return '😊'
      case 'negative': return '😡'
      case 'neutral': return '😐'
      default: return ''
    }
  }

  const getWhatsappLink = (phone: string | null) => {
    if (!phone) return '#'
    const cleanNumber = phone.replace(/\D/g, '')
    return `https://wa.me/${cleanNumber}`
  }

  // 1. Busca Lista de Leads
  useEffect(() => {
    async function fetchConversations() {
      if (!user?.org_id) return
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone, stage, last_message_emotion, last_message_body, last_message_at')
        .eq('org_id', user.org_id)
        .neq('stage', 'captado')
        .order('last_message_at', { ascending: false, nullsFirst: false })
      
      if (!error && data) {
        setConversations(prev => {
          if (activeLead && !data.find(d => d.id === activeLead.id)) {
            // @ts-ignore
            return [activeLead, ...data]
          }
          // @ts-ignore
          return data
        })
      }
    }
    fetchConversations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.org_id]) 

  // 2. Lógica de Deep Link
  useEffect(() => {
    if (!targetLeadId || !user?.org_id) return

    const fetchSpecificLead = async () => {
      const { data: lead, error } = await supabase
        .from('leads')
        .select('id, name, phone, stage, last_message_emotion, last_message_body, last_message_at')
        .eq('id', targetLeadId)
        .single()

      if (!error && lead) {
        // @ts-ignore
        setActiveLead(lead)
        setFilterStage('todos')
        setConversations(prev => {
          const exists = prev.some(p => p.id === lead.id)
          if (exists) return prev
          // @ts-ignore
          return [lead, ...prev]
        })
      }
    }

    fetchSpecificLead()
  }, [targetLeadId, user?.org_id])

  // 3. Busca Mensagens
  useEffect(() => {
    async function fetchMessages() {
      if (!activeLead) {
        setMessages([])
        return
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', activeLead.id)
      
      if (!error && data) {
        const sorted = data.sort((a, b) => a.created_at.localeCompare(b.created_at))
        // @ts-ignore
        setMessages(sorted)
      }
    }
    fetchMessages()
  }, [activeLead])

  const allowedStages = ['todos', 'contatado', 'Lead respondeu', 'qualificado', 'reuniao', 'ganho']

  return (
    <div className="flex h-[calc(100vh-120px)] bg-[#0F0F0F] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
      
      {/* COLUNA 1: FILTROS */}
      <div className={`w-56 border-r border-white/5 bg-[#0A0A0A] p-4 flex flex-col gap-2 transition-opacity duration-300 ${activeLead ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">{t.activePipeline}</h3>
        {allowedStages.map(stage => (
          <button 
            key={stage}
            onClick={() => setFilterStage(stage)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              filterStage === stage ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            {/* @ts-ignore */}
            {t.stages[stage] || stage}
          </button>
        ))}
      </div>

      {/* COLUNA 2: LISTA DE LEADS */}
      <div className={`w-80 border-r border-white/5 flex flex-col bg-[#0F0F0F] transition-opacity duration-300 ${activeLead ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}>
        <div className="p-4 border-b border-white/5 bg-[#0A0A0A]/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations
            .filter(c => filterStage === 'todos' || c.stage === filterStage)
            .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(lead => (
            <div 
              key={lead.id}
              onClick={() => setActiveLead(lead)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-all flex items-center gap-4 relative group ${
                activeLead?.id === lead.id ? 'bg-blue-600/10' : 'hover:bg-white/5'
              }`}
            >
              {activeLead?.id === lead.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
              
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-lg font-bold text-white border border-white/10 shrink-0">
                {lead.name?.[0]?.toUpperCase() || '?'}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-bold text-white truncate">{lead.name}</h4>
                  <span className="text-xs">{getEmotionEmoji(lead.last_message_emotion)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate group-hover:text-gray-400 transition-colors">
                  {lead.last_message_body || t.startConversation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUNA 3: CHAT */}
      <div className="flex-1 flex flex-col bg-[#0b0b0b] relative">
        {activeLead ? (
          <>
            <div className="p-3 bg-[#111111] border-b border-white/5 flex items-center gap-4 shadow-sm z-20">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                {activeLead.name?.[0]}
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">{activeLead.name}</h3>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {activeLead.stage}
                </span>
              </div>
              
              <div className="ml-auto flex items-center gap-3">
                  <div className="hidden md:block text-[10px] text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 uppercase tracking-widest font-bold">
                    {t.readOnly}
                  </div>
                  {activeLead.phone && (
                    <a 
                     href={getWhatsappLink(activeLead.phone)}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="p-2 text-emerald-500 hover:text-white hover:bg-emerald-600/20 rounded-full transition-colors border border-emerald-500/20"
                     title={t.openWhatsapp}
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                  <button 
                   onClick={() => setActiveLead(null)}
                   className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                   title={t.closeChat}
                  >
                    <X size={20} />
                  </button>
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 custom-scrollbar bg-[#050505] bg-[url('https://w0.peakpx.com/wallpaper/580/650/牽引-whatsapp-chat-dark-background-light-pattern.jpg')] bg-repeat bg-[length:400px]"
            >
              <div className="fixed inset-0 bg-[#050505]/90 pointer-events-none z-0" />

              <div className="relative z-10 flex flex-col gap-1"> 
                {messages.map((msg, index) => {
                  const isOutbound = msg.direction === 'outbound' || msg.direction === 'out';
                  const msgDate = new Date(msg.created_at).toLocaleDateString(userLang);
                  const prevMsgDate = index > 0 ? new Date(messages[index - 1].created_at).toLocaleDateString(userLang) : null;
                  const showDateHeader = msgDate !== prevMsgDate;
                  const prevMsgDirection = index > 0 ? messages[index - 1].direction : null;
                  const isSequence = prevMsgDirection === msg.direction && !showDateHeader;

                  return (
                    <div key={msg.id} className={`flex flex-col ${showDateHeader ? 'mt-4' : ''}`}>
                      {showDateHeader && (
                        <div className="flex justify-center mb-4 sticky top-2 z-20">
                          <span className="bg-[#1c1c1c] text-gray-400 text-[10px] font-medium px-3 py-1 rounded-lg border border-white/5 shadow-sm">
                            {msgDate}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-0.5' : 'mt-2'}`}>
                        <div 
                          className={`max-w-[85%] sm:max-w-[70%] p-2 px-3 rounded-xl text-sm shadow-md relative group ${isOutbound ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-gray-100 rounded-tl-none'}`}
                          style={{
                             borderTopRightRadius: isOutbound && isSequence ? '0.75rem' : undefined,
                             borderTopLeftRadius: !isOutbound && isSequence ? '0.75rem' : undefined
                          }}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${isOutbound ? 'text-blue-200/70' : 'text-gray-500'}`}>
                            <span className="text-[10px] min-w-[35px] text-right">
                              {new Date(msg.created_at).toLocaleTimeString(userLang, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOutbound && <CheckCheck size={14} className="text-blue-300" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4 bg-[#0a0a0a]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                <MessageCircle size={40} className="opacity-20 text-white" />
            </div>
            <p className="text-sm font-medium opacity-50 text-center px-6">{t.emptyState}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Mantemos o Suspense para garantir, mas o dynamic = force-dynamic é o que realmente resolve o erro
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-120px)] items-center justify-center bg-[#0F0F0F] rounded-2xl border border-white/10">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}