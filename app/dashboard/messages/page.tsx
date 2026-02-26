// @ts-nocheck
'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  MessageCircle,
  CheckCheck,
  X,
  ExternalLink,
  Loader2,
  Bot,
  User,
  Headset,
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
  ArrowDown,
  Circle,
  Send,
  AlertCircle
} from 'lucide-react'

/* =============================================
   CUSTOM SCROLLBAR STYLES (inject once)
   ============================================= */
const scrollbarStyles = `
  .chat-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .chat-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .chat-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
  }
  .chat-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.15);
  }
  .sidebar-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .sidebar-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .sidebar-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
  }
  .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.12);
  }
`

/* =============================================
   1. TRANSLATIONS
   ============================================= */
const TRANSLATIONS = {
  pt: {
    activePipeline: 'Pipeline Ativo',
    searchPlaceholder: 'Buscar conversa...',
    startConversation: 'Iniciar conversa...',
    openWhatsapp: 'Abrir no WhatsApp',
    closeChat: 'Fechar conversa',
    emptyState: 'Selecione uma conversa ao lado para ver o histórico de mensagens',
    noConversations: 'Nenhuma conversa encontrada',
    today: 'Hoje',
    yesterday: 'Ontem',
    agentBot: 'Agente IA',
    agentHuman: 'Atendente',
    lead: 'Lead',
    audio: 'Áudio',
    image: 'Imagem',
    video: 'Vídeo',
    document: 'Documento',
    inputPlaceholder: 'Digite uma mensagem...',
    sendError: 'Erro ao enviar. Tente novamente.',
    stages: {
      todos: 'Todas',
      contatado: 'Contatado',
      'Lead respondeu': 'Lead Respondeu',
      qualificado: 'Qualificado',
      reuniao: 'Reunião',
      ganho: 'Ganho',
    } as Record<string, string>,
  },
  en: {
    activePipeline: 'Active Pipeline',
    searchPlaceholder: 'Search conversation...',
    startConversation: 'Start conversation...',
    openWhatsapp: 'Open in WhatsApp',
    closeChat: 'Close chat',
    emptyState: 'Select a conversation to view message history',
    noConversations: 'No conversations found',
    today: 'Today',
    yesterday: 'Yesterday',
    agentBot: 'AI Agent',
    agentHuman: 'Attendant',
    lead: 'Lead',
    audio: 'Audio',
    image: 'Image',
    video: 'Video',
    document: 'Document',
    inputPlaceholder: 'Type a message...',
    sendError: 'Failed to send. Try again.',
    stages: {
      todos: 'All',
      contatado: 'Contacted',
      'Lead respondeu': 'Lead Responded',
      qualificado: 'Qualified',
      reuniao: 'Meeting',
      ganho: 'Won',
    } as Record<string, string>,
  },
  es: {
    activePipeline: 'Pipeline Activo',
    searchPlaceholder: 'Buscar conversación...',
    startConversation: 'Iniciar conversación...',
    openWhatsapp: 'Abrir en WhatsApp',
    closeChat: 'Cerrar chat',
    emptyState: 'Seleccione una conversación para ver el historial',
    noConversations: 'No se encontraron conversaciones',
    today: 'Hoy',
    yesterday: 'Ayer',
    agentBot: 'Agente IA',
    agentHuman: 'Atendente',
    lead: 'Lead',
    audio: 'Audio',
    image: 'Imagen',
    video: 'Video',
    document: 'Documento',
    inputPlaceholder: 'Escribe un mensaje...',
    sendError: 'Error al enviar. Inténtalo de nuevo.',
    stages: {
      todos: 'Todas',
      contatado: 'Contactado',
      'Lead respondeu': 'Lead Respondió',
      qualificado: 'Calificado',
      reuniao: 'Reunión',
      ganho: 'Ganado',
    } as Record<string, string>,
  },
}

type TranslationKey = keyof typeof TRANSLATIONS

/* =============================================
   2. CONSTANTS & SAFETY FUNCTIONS
   ============================================= */
const WEBHOOK_SEND_MESSAGE = 'https://webhook2.letierren8n.com/webhook/message_agent_human'

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

/* =============================================
   3. TYPES
   ============================================= */
interface Message {
  id: string
  lead_id: string
  conversation_id: string
  body: string
  direction: string
  sender_type: string
  sender_name: string | null
  message_type: string
  media_url: string | null
  media_mime_type: string | null
  emotion: string | null
  external_message_id: string | null
  created_at: string
}

interface Conversation {
  id: string
  org_id: string
  lead_id: string
  channel: string
  status: string
  assigned_to: string | null
  is_bot_active: boolean
  last_message_body: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string
  lead_name: string
  lead_nome_empresa: string
  lead_phone: string | null
  lead_stage: string
  lead_emotion: string | null
}

interface AuthUser {
  id: string
  org_id?: string
  language?: string
  name?: string
  full_name?: string
  email?: string
}

/* =============================================
   4. HELPERS
   ============================================= */
function getEmotionEmoji(emotion: string | null): string {
  switch (emotion?.toLowerCase()) {
    case 'positivo':
    case 'positive':
      return '😊'
    case 'negativo':
    case 'negative':
      return '😡'
    case 'neutro':
    case 'neutral':
      return '😐'
    default:
      return ''
  }
}

function getWhatsappLink(phone: string | null): string {
  if (!phone) return '#'
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const c = phone.replace(/\D/g, '')
  if (c.startsWith('55') && c.length >= 12) {
    return `+55 (${c.substring(2, 4)}) ${c.substring(4, 9)}-${c.substring(9)}`
  }
  if (c.startsWith('56') && c.length >= 11) {
    return `+56 ${c.substring(2, 3)} ${c.substring(3, 7)} ${c.substring(7)}`
  }
  return `+${c}`
}

function getDisplayName(conv: Conversation): string {
  const n = conv.lead_name
  if (n && n !== '' && n !== 'null') return n
  const e = conv.lead_nome_empresa
  if (e && e !== '' && e !== 'null') return e
  if (conv.lead_phone) return formatPhone(conv.lead_phone)
  return 'Sem identificação'
}

function getInitial(conv: Conversation): string {
  const name = conv.lead_name
  if (name && name !== '' && name !== 'null') return name[0].toUpperCase()
  const emp = conv.lead_nome_empresa
  if (emp && emp !== '' && emp !== 'null') return emp[0].toUpperCase()
  return '#'
}

function getSenderIcon(st: string) {
  switch (st) {
    case 'agent_bot': return <Bot size={12} />
    case 'agent_human': return <Headset size={12} />
    case 'lead': return <User size={12} />
    default: return null
  }
}

function getSenderColor(st: string): string {
  switch (st) {
    case 'agent_bot': return 'text-violet-400'
    case 'agent_human': return 'text-amber-400'
    case 'lead': return 'text-emerald-400'
    default: return 'text-gray-400'
  }
}

function formatDateLabel(dateStr: string, lang: string, t: typeof TRANSLATIONS.pt): string {
  const d = parseDateSafe(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return t.today
  if (d.toDateString() === yesterday.toDateString()) return t.yesterday
  return d.toLocaleDateString(lang, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(dateStr: string, lang: string): string {
  return parseDateSafe(dateStr).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
}

function formatLastMessageTime(dateStr: string | null, lang: string): string {
  if (!dateStr) return ''
  const d = parseDateSafe(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return lang === 'en' ? 'Yesterday' : lang === 'es' ? 'Ayer' : 'Ontem'
  if (diff < 7) return d.toLocaleDateString(lang, { weekday: 'short' })
  return d.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' })
}

/* =============================================
   5. MEDIA RENDERER
   ============================================= */
function MediaContent({ msg, t }: { msg: Message; t: typeof TRANSLATIONS.pt }) {
  if (!msg.message_type || msg.message_type === 'text') return null

  switch (msg.message_type) {
    case 'image':
      return (
        <div className="mb-1 rounded-lg overflow-hidden">
          {msg.media_url ? (
            <img
              src={msg.media_url}
              alt="image"
              className="max-w-full max-h-[300px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
              onClick={() => window.open(msg.media_url!, '_blank')}
            />
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
              <ImageIcon size={14} /> <span>{t.image}</span>
            </div>
          )}
        </div>
      )
    case 'audio':
      return (
        <div className="mb-1">
          {msg.media_url ? (
            <audio controls className="max-w-[250px] h-[36px]" preload="none">
              <source src={msg.media_url} type={msg.media_mime_type || 'audio/ogg'} />
            </audio>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
              <Mic size={14} /> <span>{t.audio}</span>
            </div>
          )}
        </div>
      )
    case 'video':
      return (
        <div className="mb-1 rounded-lg overflow-hidden">
          {msg.media_url ? (
            <video controls className="max-w-full max-h-[300px] rounded-lg" preload="none">
              <source src={msg.media_url} type={msg.media_mime_type || 'video/mp4'} />
            </video>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
              <Video size={14} /> <span>{t.video}</span>
            </div>
          )}
        </div>
      )
    case 'document':
      return (
        <div className="mb-1">
          {msg.media_url ? (
            <a
              href={msg.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
            >
              <FileText size={18} className="text-blue-400 shrink-0" />
              <span className="text-sm text-blue-300 truncate">{msg.body || t.document}</span>
              <ExternalLink size={12} className="text-gray-500 shrink-0 ml-auto" />
            </a>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
              <FileText size={14} /> <span>{t.document}</span>
            </div>
          )}
        </div>
      )
    default:
      return null
  }
}

/* =============================================
   6. MESSAGE BUBBLE
   ============================================= */
function MessageBubble({
  msg, index, messages, userLang, t,
}: {
  msg: Message; index: number; messages: Message[]; userLang: string; t: typeof TRANSLATIONS.pt
}) {
  const isOutbound = msg.direction === 'outbound'
  const msgDate = parseDateSafe(msg.created_at).toDateString()
  const prevMsgDate = index > 0 ? parseDateSafe(messages[index - 1].created_at).toDateString() : null
  const showDateHeader = msgDate !== prevMsgDate
  const prevMsg = index > 0 ? messages[index - 1] : null
  const isSameSender = prevMsg?.sender_type === msg.sender_type && !showDateHeader
  const isSequence = prevMsg?.direction === msg.direction && !showDateHeader

  const bubbleBg = () => {
    if (!isOutbound) return 'bg-[#202c33]'
    if (msg.sender_type === 'agent_bot') return 'bg-[#1a1a2e] border border-violet-500/10'
    if (msg.sender_type === 'agent_human') return 'bg-[#1a2e1a] border border-amber-500/10'
    return 'bg-[#005c4b]'
  }

  return (
    <div className={`flex flex-col ${showDateHeader ? 'mt-5' : ''}`}>
      {showDateHeader && (
        <div className="flex justify-center mb-4 sticky top-2 z-20">
          <span className="bg-[#182229]/90 backdrop-blur-sm text-[#8696a0] text-[11px] font-medium px-3 py-1 rounded-lg shadow">
            {formatDateLabel(msg.created_at, userLang, t)}
          </span>
        </div>
      )}
      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-[2px]' : 'mt-2'}`}>
        <div
          className={`max-w-[85%] sm:max-w-[65%] py-1.5 px-2.5 rounded-lg text-[13.5px] leading-[19px] shadow-sm relative
            ${bubbleBg()} text-[#e9edef]
            ${!isSequence && isOutbound ? 'rounded-tr-none' : ''}
            ${!isSequence && !isOutbound ? 'rounded-tl-none' : ''}`}
        >
          {!isSameSender && (
            <div className={`flex items-center gap-1.5 mb-0.5 ${getSenderColor(msg.sender_type)}`}>
              {getSenderIcon(msg.sender_type)}
              <span className="text-[11px] font-medium">
                {msg.sender_name ||
                  (msg.sender_type === 'agent_bot' ? t.agentBot
                    : msg.sender_type === 'agent_human' ? t.agentHuman
                    : t.lead)}
              </span>
            </div>
          )}

          <MediaContent msg={msg} t={t} />

          {msg.body && msg.message_type === 'text' && (
            <span className="whitespace-pre-wrap break-words">{msg.body}</span>
          )}
          {msg.body && msg.message_type !== 'text' && (
            <p className="whitespace-pre-wrap break-words text-xs mt-1 text-gray-300">{msg.body}</p>
          )}

          <span className="float-right ml-2 mt-1 flex items-center gap-1 relative -bottom-[3px]">
            {msg.emotion && <span className="text-[10px]">{getEmotionEmoji(msg.emotion)}</span>}
            <span className="text-[10px] text-[#ffffff99]">
              {formatTime(msg.created_at, userLang)}
            </span>
            {isOutbound && <CheckCheck size={14} className="text-[#53bdeb]/70" />}
          </span>
        </div>
      </div>
    </div>
  )
}

/* =============================================
   7. CONVERSATION LIST ITEM
   ============================================= */
function ConversationItem({
  conversation: c, isActive, onClick, userLang, t,
}: {
  conversation: Conversation; isActive: boolean; onClick: () => void; userLang: string; t: typeof TRANSLATIONS.pt
}) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-[10px] flex items-center gap-3 cursor-pointer transition-colors relative
        ${isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-[49px] h-[49px] rounded-full bg-[#6b7b8d] flex items-center justify-center text-lg font-medium text-white">
          {getInitial(c)}
        </div>
        {c.channel === 'whatsapp' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#25d366] rounded-full flex items-center justify-center border-2 border-[#111b21]">
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 border-b border-[#222d34] pb-[10px]">
        <div className="flex justify-between items-baseline mb-[2px]">
          <h4 className="text-[16px] font-normal text-[#e9edef] truncate pr-2">
            {getDisplayName(c)}
          </h4>
          <span className={`text-[11px] shrink-0 ${c.unread_count > 0 ? 'text-[#25d366]' : 'text-[#8696a0]'}`}>
            {formatLastMessageTime(c.last_message_at, userLang)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[13px] text-[#8696a0] truncate pr-2">
            {c.last_message_body || t.startConversation}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {c.lead_emotion && <span className="text-xs">{getEmotionEmoji(c.lead_emotion)}</span>}
            {c.unread_count > 0 && (
              <span className="bg-[#25d366] text-[#111b21] text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                {c.unread_count > 99 ? '99+' : c.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =============================================
   8. MESSAGE INPUT
   ============================================= */
function MessageInput({
  onSend, isSending, sendError, t,
}: {
  onSend: (text: string) => void; isSending: boolean; sendError: string | null; t: typeof TRANSLATIONS.pt
}) {
  const [text, setText] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    onSend(trimmed)
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className="bg-[#202c33] border-t border-[#222d34]">
      {sendError && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <span className="text-xs text-red-400">{sendError}</span>
        </div>
      )}
      <div className="flex items-end gap-2 px-4 py-2">
        <textarea
          ref={taRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={t.inputPlaceholder}
          disabled={isSending}
          rows={1}
          className="flex-1 bg-[#2a3942] rounded-lg px-3 py-2 text-[14px] text-[#e9edef] placeholder-[#8696a0] focus:outline-none resize-none disabled:opacity-50"
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className={`p-2 rounded-full transition-all shrink-0
            ${text.trim() && !isSending
              ? 'bg-[#00a884] hover:bg-[#06cf9c] text-white'
              : 'bg-transparent text-[#8696a0] cursor-not-allowed'}`}
        >
          {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  )
}

/* =============================================
   9. MAIN CONTENT
   ============================================= */
function MessagesContent() {
  const { user: rawUser } = useAuth()
  const user = rawUser as AuthUser | null
  const searchParams = useSearchParams()
  const targetLeadId = searchParams.get('lead_id')

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [filterStage, setFilterStage] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const userLang = (user?.language as TranslationKey) || 'pt'
  const t = TRANSLATIONS[userLang]

  // Scroll helpers
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200)
  }, [])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom(false)
  }, [messages, scrollToBottom])

  // ---- Fetch conversations ----
  const fetchConversations = useCallback(async () => {
    if (!user?.org_id) return

    const { data, error } = await supabase
      .from('conversations')
      .select('id, org_id, lead_id, channel, status, assigned_to, is_bot_active, last_message_body, last_message_at, unread_count, created_at')
      .eq('org_id', user.org_id)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error || !data) {
      console.error('Error fetching conversations:', error)
      setLoadingConversations(false)
      return
    }

    if (data.length > 0) {
      const leadIds = [...new Set(data.map((c: { lead_id: string }) => c.lead_id).filter(Boolean))]

      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, nome_empresa, phone, stage, last_message_emotion')
        .in('id', leadIds)

      const leadMap = new Map(
        (leads || []).map((l: { id: string; name: string; nome_empresa: string; phone: string; stage: string; last_message_emotion: string }) => [l.id, l])
      )

      const enriched: Conversation[] = data.map((c: Record<string, unknown>) => {
        const lead = leadMap.get(c.lead_id as string) as { name?: string; nome_empresa?: string; phone?: string; stage?: string; last_message_emotion?: string } | undefined
        return {
          ...c,
          lead_name: (lead?.name && lead.name !== '' && lead.name !== 'null') ? lead.name : '',
          lead_nome_empresa: (lead?.nome_empresa && lead.nome_empresa !== '' && lead.nome_empresa !== 'null') ? lead.nome_empresa : '',
          lead_phone: lead?.phone || null,
          lead_stage: lead?.stage || '',
          lead_emotion: lead?.last_message_emotion || null,
        } as Conversation
      })

      setConversations(enriched)
    }

    setLoadingConversations(false)
  }, [user?.org_id])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // ---- Deep link ----
  useEffect(() => {
    if (!targetLeadId || !user?.org_id || conversations.length === 0) return
    const found = conversations.find(c => c.lead_id === targetLeadId)
    if (found) { setActiveConversation(found); setFilterStage('todos') }
  }, [targetLeadId, user?.org_id, conversations])

  // ---- Fetch messages ----
  useEffect(() => {
    if (!activeConversation) { setMessages([]); return }

    let cancelled = false
    const go = async () => {
      setLoadingMessages(true)
      setSendError(null)

      const { data, error } = await supabase
        .from('messages')
        .select('id, lead_id, conversation_id, body, direction, sender_type, sender_name, message_type, media_url, media_mime_type, emotion, external_message_id, created_at')
        .eq('conversation_id', activeConversation.id)
        .order('created_at', { ascending: true })

      if (!cancelled && !error && data) setMessages(data as Message[])
      if (!cancelled) setLoadingMessages(false)

      // Mark read
      if (activeConversation.unread_count > 0) {
        await supabase.from('conversations').update({ unread_count: 0 }).eq('id', activeConversation.id)
        setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, unread_count: 0 } : c))
        setActiveConversation(prev => prev ? { ...prev, unread_count: 0 } : prev)
      }
    }
    go()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.id])

  // ---- Send message ----
  const handleSendMessage = useCallback(async (text: string) => {
    if (!activeConversation || !user) return
    setIsSending(true)
    setSendError(null)

    const senderName = user.full_name || user.name || user.email || 'Atendente'

    try {
      // 1. Webhook → n8n → WhatsApp
      const res = await fetch(WEBHOOK_SEND_MESSAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: activeConversation.org_id,
          lead_id: activeConversation.lead_id,
          conversation_id: activeConversation.id,
          user_id: user.id,
          message: text,
        }),
      })
      if (!res.ok) throw new Error('Webhook failed')

      // 2. Save to DB
      const { data: result } = await supabase.rpc('fn_insert_message', {
        p_org_id: activeConversation.org_id,
        p_lead_id: activeConversation.lead_id,
        p_channel: activeConversation.channel || 'whatsapp',
        p_direction: 'outbound',
        p_body: text,
        p_sender_type: 'agent_human',
        p_sender_name: senderName,
        p_message_type: 'text',
        p_timestamp: new Date().toISOString(),
      })

      const rpcResult = result as { message_id?: string } | null

      // 3. Optimistic UI update
      const newMsg: Message = {
        id: rpcResult?.message_id || crypto.randomUUID(),
        lead_id: activeConversation.lead_id,
        conversation_id: activeConversation.id,
        body: text,
        direction: 'outbound',
        sender_type: 'agent_human',
        sender_name: senderName,
        message_type: 'text',
        media_url: null,
        media_mime_type: null,
        emotion: null,
        external_message_id: null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, newMsg])

      // 4. Update sidebar
      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === activeConversation.id
            ? { ...c, last_message_body: text, last_message_at: newMsg.created_at }
            : c
        )
        return updated.sort((a, b) => {
          const at = parseDateSafe(a.last_message_at).getTime()
          const bt = parseDateSafe(b.last_message_at).getTime()
          return bt - at
        })
      })
    } catch {
      setSendError(t.sendError)
    } finally {
      setIsSending(false)
    }
  }, [activeConversation, user, t])

  // ---- Realtime: messages ----
  useEffect(() => {
    if (!user?.org_id) return
    const ch = supabase
      .channel('messages-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `org_id=eq.${user.org_id}` }, (payload) => {
        const m = payload.new as Message
        if (activeConversation && m.conversation_id === activeConversation.id) {
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
        }
        setConversations(prev => {
          const up = prev.map(c =>
            c.id === m.conversation_id
              ? {
                  ...c,
                  last_message_body: m.body || c.last_message_body,
                  last_message_at: m.created_at,
                  unread_count: activeConversation?.id === m.conversation_id ? c.unread_count : c.unread_count + (m.direction === 'inbound' ? 1 : 0),
                }
              : c
          )
          return up.sort((a, b) => parseDateSafe(b.last_message_at).getTime() - parseDateSafe(a.last_message_at).getTime())
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.org_id, activeConversation?.id])

  // ---- Realtime: new conversations ----
  useEffect(() => {
    if (!user?.org_id) return
    const ch = supabase
      .channel('convs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `org_id=eq.${user.org_id}` }, async (payload) => {
        const nc = payload.new as Conversation
        const { data: lead } = await supabase.from('leads').select('id, name, nome_empresa, phone, stage, last_message_emotion').eq('id', nc.lead_id).single()
        const enriched: Conversation = {
          ...nc,
          lead_name: (lead?.name && lead.name !== '' && lead.name !== 'null') ? lead.name : '',
          lead_nome_empresa: (lead?.nome_empresa && lead.nome_empresa !== '' && lead.nome_empresa !== 'null') ? lead.nome_empresa : '',
          lead_phone: lead?.phone || null,
          lead_stage: lead?.stage || '',
          lead_emotion: lead?.last_message_emotion || null,
        }
        setConversations(prev => prev.some(c => c.id === enriched.id) ? prev : [enriched, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.org_id])

  // Filters
  const allowedStages = ['todos', 'contatado', 'Lead respondeu', 'qualificado', 'reuniao', 'ganho']

  const filteredConversations = conversations
    .filter(c => filterStage === 'todos' || c.lead_stage === filterStage)
    .filter(c => getDisplayName(c).toLowerCase().includes(searchTerm.toLowerCase()))

  /* =============================================
     RENDER
     ============================================= */
  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="flex h-[calc(100vh-120px)] bg-[#111b21] rounded-2xl border border-[#222d34] overflow-hidden shadow-2xl">

        {/* COL 1: PIPELINE FILTERS */}
        <div className={`w-52 border-r border-[#222d34] bg-[#0b141a] p-4 flex flex-col gap-1 transition-opacity duration-300
          ${activeConversation ? 'opacity-40 hover:opacity-100' : ''}`}>
          <h3 className="text-[10px] font-bold text-[#8696a0] uppercase tracking-widest mb-3 px-2">
            {t.activePipeline}
          </h3>
          {allowedStages.map(stage => (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                ${filterStage === stage
                  ? 'bg-[#00a884] text-white font-medium'
                  : 'text-[#8696a0] hover:bg-[#202c33]'}`}
            >
              {t.stages[stage] || stage}
            </button>
          ))}
        </div>

        {/* COL 2: CONVERSATION LIST */}
        <div className={`w-[340px] border-r border-[#222d34] flex flex-col bg-[#111b21] transition-opacity duration-300
          ${activeConversation ? 'opacity-40 hover:opacity-100' : ''}`}>
          {/* Search */}
          <div className="p-2 bg-[#111b21]">
            <div className="relative">
              <Search className="absolute left-3 top-[9px] text-[#8696a0]" size={16} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#202c33] rounded-lg pl-10 pr-4 py-[6px] text-[14px] text-[#e9edef] placeholder-[#8696a0] focus:outline-none border-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto sidebar-scrollbar">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-[#8696a0] animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center py-12 px-4">
                <p className="text-xs text-[#8696a0] text-center">{t.noConversations}</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConversation?.id === conv.id}
                  onClick={() => setActiveConversation(conv)}
                  userLang={userLang}
                  t={t}
                />
              ))
            )}
          </div>
        </div>

        {/* COL 3: CHAT */}
        <div className="flex-1 flex flex-col bg-[#0b141a] relative">
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="px-4 py-[10px] bg-[#202c33] flex items-center gap-3 z-20">
                <div className="w-10 h-10 rounded-full bg-[#6b7b8d] flex items-center justify-center text-white font-medium text-sm">
                  {getInitial(activeConversation)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[#e9edef] font-normal text-[15px] truncate">
                    {getDisplayName(activeConversation)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#8696a0] uppercase tracking-wide flex items-center gap-1">
                      <Circle size={6} className="fill-[#25d366] text-[#25d366]" />
                      {activeConversation.lead_stage}
                    </span>
                    {activeConversation.is_bot_active && (
                      <span className="text-[11px] text-violet-400 flex items-center gap-1">
                        <Bot size={10} /> IA
                      </span>
                    )}
                    {activeConversation.lead_phone && (
                      <span className="text-[11px] text-[#8696a0]">
                        {formatPhone(activeConversation.lead_phone)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {activeConversation.lead_phone && (
                    <a
                      href={getWhatsappLink(activeConversation.lead_phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-[#aebac1] hover:text-white rounded-full hover:bg-[#374045] transition-colors"
                      title={t.openWhatsapp}
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                  <button
                    onClick={() => { setActiveConversation(null); setSendError(null) }}
                    className="p-2 text-[#aebac1] hover:text-white rounded-full hover:bg-[#374045] transition-colors"
                    title={t.closeChat}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages area */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-[5%] py-4 chat-scrollbar"
                style={{
                  backgroundColor: '#0b141a',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'103\' cy=\'53\' r=\'1\'/%3E%3Ccircle cx=\'53\' cy=\'103\' r=\'1\'/%3E%3Ccircle cx=\'153\' cy=\'153\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")',
                }}
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-[#8696a0] animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {messages.map((msg, i) => (
                      <MessageBubble key={msg.id} msg={msg} index={i} messages={messages} userLang={userLang} t={t} />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Scroll to bottom */}
              {showScrollDown && (
                <button
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-20 right-4 z-30 w-10 h-10 bg-[#202c33] rounded-full flex items-center justify-center shadow-lg hover:bg-[#2a3942] transition-colors"
                >
                  <ArrowDown size={18} className="text-[#8696a0]" />
                </button>
              )}

              {/* Input */}
              <MessageInput onSend={handleSendMessage} isSending={isSending} sendError={sendError} t={t} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35]">
              <div className="w-[320px] text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-[#364147] rounded-full flex items-center justify-center">
                  <MessageCircle size={36} className="text-[#8696a0]" />
                </div>
                <h2 className="text-[#e9edef] text-xl font-light">Oryen Conversas</h2>
                <p className="text-[14px] text-[#8696a0]">{t.emptyState}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* =============================================
   10. PAGE EXPORT
   ============================================= */
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-120px)] items-center justify-center bg-[#111b21] rounded-2xl border border-[#222d34]">
        <Loader2 className="w-8 h-8 text-[#00a884] animate-spin" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}