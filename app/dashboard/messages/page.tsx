'use client'

// --- FORCE DYNAMIC RENDERING ---
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  MessageCircle,
  CheckCheck,
  Check,
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
  Circle
} from 'lucide-react'

// =============================================
// 1. TRADUÇÕES
// =============================================
const TRANSLATIONS = {
  pt: {
    activePipeline: 'Pipeline Ativo',
    searchPlaceholder: 'Buscar conversa...',
    startConversation: 'Iniciar conversa...',
    readOnly: 'Somente Leitura',
    openWhatsapp: 'Abrir no WhatsApp',
    closeChat: 'Fechar conversa',
    emptyState: 'Selecione uma conversa ao lado para ver o histórico de mensagens',
    noConversations: 'Nenhuma conversa encontrada',
    loading: 'Carregando...',
    today: 'Hoje',
    yesterday: 'Ontem',
    agentBot: 'Agente IA',
    agentHuman: 'Atendente',
    lead: 'Lead',
    audio: 'Áudio',
    image: 'Imagem',
    video: 'Vídeo',
    document: 'Documento',
    unreadMessages: 'mensagens não lidas',
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
    noConversations: 'No conversations found',
    loading: 'Loading...',
    today: 'Today',
    yesterday: 'Yesterday',
    agentBot: 'AI Agent',
    agentHuman: 'Attendant',
    lead: 'Lead',
    audio: 'Audio',
    image: 'Image',
    video: 'Video',
    document: 'Document',
    unreadMessages: 'unread messages',
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
    noConversations: 'No se encontraron conversaciones',
    loading: 'Cargando...',
    today: 'Hoy',
    yesterday: 'Ayer',
    agentBot: 'Agente IA',
    agentHuman: 'Atendente',
    lead: 'Lead',
    audio: 'Audio',
    image: 'Imagen',
    video: 'Video',
    document: 'Documento',
    unreadMessages: 'mensajes no leídos',
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

// =============================================
// 2. TYPES
// =============================================
type Message = {
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

type Conversation = {
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
  // Joined from leads table
  lead_name?: string
  lead_phone?: string
  lead_stage?: string
  lead_emotion?: string
}

// =============================================
// 3. HELPERS
// =============================================
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
  const cleanNumber = phone.replace(/\D/g, '')
  return `https://wa.me/${cleanNumber}`
}

function getSenderIcon(senderType: string) {
  switch (senderType) {
    case 'agent_bot':
      return <Bot size={12} />
    case 'agent_human':
      return <Headset size={12} />
    case 'lead':
      return <User size={12} />
    default:
      return null
  }
}

function getSenderColor(senderType: string): string {
  switch (senderType) {
    case 'agent_bot':
      return 'text-violet-400'
    case 'agent_human':
      return 'text-amber-400'
    case 'lead':
      return 'text-emerald-400'
    default:
      return 'text-gray-400'
  }
}

function formatDateLabel(dateStr: string, lang: string, t: typeof TRANSLATIONS.pt): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return t.today
  if (date.toDateString() === yesterday.toDateString()) return t.yesterday
  return date.toLocaleDateString(lang, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(dateStr: string, lang: string): string {
  return new Date(dateStr).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
}

function formatLastMessageTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getMediaPreview(msg: { message_type: string; body: string | null }, t: typeof TRANSLATIONS.pt): string {
  switch (msg.message_type) {
    case 'audio':
      return `🎵 ${t.audio}`
    case 'image':
      return `📷 ${t.image}`
    case 'video':
      return `🎥 ${t.video}`
    case 'document':
      return `📄 ${t.document}`
    default:
      return msg.body || ''
  }
}

// =============================================
// 4. MEDIA RENDERER COMPONENT
// =============================================
function MediaContent({ msg, t }: { msg: Message; t: typeof TRANSLATIONS.pt }) {
  if (msg.message_type === 'text' || !msg.message_type) return null

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
              <ImageIcon size={14} />
              <span>{t.image}</span>
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
              <Mic size={14} />
              <span>{t.audio}</span>
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
              <Video size={14} />
              <span>{t.video}</span>
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
              <span className="text-sm text-blue-300 truncate">
                {msg.body || t.document}
              </span>
              <ExternalLink size={12} className="text-gray-500 shrink-0 ml-auto" />
            </a>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
              <FileText size={14} />
              <span>{t.document}</span>
            </div>
          )}
        </div>
      )
    default:
      return null
  }
}

// =============================================
// 5. MESSAGE BUBBLE COMPONENT
// =============================================
function MessageBubble({
  msg,
  index,
  messages,
  userLang,
  t
}: {
  msg: Message
  index: number
  messages: Message[]
  userLang: string
  t: typeof TRANSLATIONS.pt
}) {
  const isOutbound = msg.direction === 'outbound'
  const msgDate = new Date(msg.created_at).toDateString()
  const prevMsgDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null
  const showDateHeader = msgDate !== prevMsgDate

  const prevMsg = index > 0 ? messages[index - 1] : null
  const isSameSender = prevMsg?.sender_type === msg.sender_type && !showDateHeader
  const isSequence = prevMsg?.direction === msg.direction && !showDateHeader

  // Determine bubble color based on sender_type
  const getBubbleStyle = () => {
    if (msg.sender_type === 'agent_bot') return 'bg-[#1a1a2e] border border-violet-500/10'
    if (msg.sender_type === 'agent_human') return 'bg-[#1a2e1a] border border-amber-500/10'
    return 'bg-[#202c33]'
  }

  return (
    <div className={`flex flex-col ${showDateHeader ? 'mt-4' : ''}`}>
      {/* Date separator */}
      {showDateHeader && (
        <div className="flex justify-center mb-4 sticky top-2 z-20">
          <span className="bg-[#1c1c1c]/90 backdrop-blur-sm text-gray-400 text-[10px] font-medium px-4 py-1.5 rounded-lg border border-white/5 shadow-lg">
            {formatDateLabel(msg.created_at, userLang, t)}
          </span>
        </div>
      )}

      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-0.5' : 'mt-3'}`}>
        <div
          className={`max-w-[85%] sm:max-w-[70%] p-2 px-3 rounded-xl text-sm shadow-md relative group
            ${isOutbound
              ? `${getBubbleStyle()} text-white ${!isSequence ? 'rounded-tr-none' : ''}`
              : `bg-[#202c33] text-gray-100 ${!isSequence ? 'rounded-tl-none' : ''}`
            }`}
        >
          {/* Sender label — show when sender changes */}
          {!isSameSender && (
            <div className={`flex items-center gap-1.5 mb-1 ${getSenderColor(msg.sender_type)}`}>
              {getSenderIcon(msg.sender_type)}
              <span className="text-[11px] font-semibold">
                {msg.sender_name ||
                  (msg.sender_type === 'agent_bot'
                    ? t.agentBot
                    : msg.sender_type === 'agent_human'
                    ? t.agentHuman
                    : t.lead)}
              </span>
            </div>
          )}

          {/* Media content */}
          <MediaContent msg={msg} t={t} />

          {/* Text body */}
          {msg.body && msg.message_type === 'text' && (
            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
          )}

          {/* Caption for media with text */}
          {msg.body && msg.message_type !== 'text' && (
            <p className="leading-relaxed whitespace-pre-wrap break-words text-xs mt-1 text-gray-300">{msg.body}</p>
          )}

          {/* Timestamp + status */}
          <div className={`flex items-center justify-end gap-1.5 mt-1 ${isOutbound ? 'text-gray-400/70' : 'text-gray-500/70'}`}>
            {msg.emotion && (
              <span className="text-[10px] mr-1">{getEmotionEmoji(msg.emotion)}</span>
            )}
            <span className="text-[10px] min-w-[35px] text-right">
              {formatTime(msg.created_at, userLang)}
            </span>
            {isOutbound && <CheckCheck size={14} className="text-blue-300/60" />}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// 6. CONVERSATION LIST ITEM
// =============================================
function ConversationItem({
  conversation,
  isActive,
  onClick,
  t
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  t: typeof TRANSLATIONS.pt
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 px-4 border-b border-white/5 cursor-pointer transition-all flex items-center gap-3 relative group
        ${isActive ? 'bg-blue-600/10' : 'hover:bg-white/[0.03]'}`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-r" />}

      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-700/50 to-gray-900 flex items-center justify-center text-base font-bold text-white border border-white/10">
          {conversation.lead_name?.[0]?.toUpperCase() || '?'}
        </div>
        {/* Channel indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0F0F0F]">
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className="text-[13px] font-semibold text-white truncate pr-2">
            {conversation.lead_name || 'Sem nome'}
          </h4>
          <span className="text-[10px] text-gray-500 shrink-0">
            {formatLastMessageTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500 truncate pr-2 group-hover:text-gray-400 transition-colors">
            {conversation.last_message_body || t.startConversation}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.lead_emotion && (
              <span className="text-xs">{getEmotionEmoji(conversation.lead_emotion)}</span>
            )}
            {conversation.unread_count > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// 7. MAIN CONTENT COMPONENT
// =============================================
function MessagesContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const targetLeadId = searchParams.get('lead_id')

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [filterStage, setFilterStage] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const userLang = (user?.language as keyof typeof TRANSLATIONS) || 'pt'
  const t = TRANSLATIONS[userLang]

  // ---- Scroll helpers ----
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    setShowScrollDown(distanceFromBottom > 200)
  }, [])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false)
    }
  }, [messages, scrollToBottom])

  // ---- Fetch conversations from new table ----
  const fetchConversations = useCallback(async () => {
    if (!user?.org_id) return

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        org_id,
        lead_id,
        channel,
        status,
        assigned_to,
        is_bot_active,
        last_message_body,
        last_message_at,
        unread_count,
        created_at
      `)
      .eq('org_id', user.org_id)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      setLoadingConversations(false)
      return
    }

    if (data && data.length > 0) {
      // Get lead info for all conversations
      const leadIds = [...new Set(data.map(c => c.lead_id).filter(Boolean))]

      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, phone, stage, last_message_emotion')
        .in('id', leadIds)

      const leadMap = new Map(leads?.map(l => [l.id, l]) || [])

      const enriched: Conversation[] = data.map(c => {
        const lead = leadMap.get(c.lead_id)
        return {
          ...c,
          lead_name: lead?.name || 'Sem nome',
          lead_phone: lead?.phone || null,
          lead_stage: lead?.stage || '',
          lead_emotion: lead?.last_message_emotion || null
        }
      })

      setConversations(enriched)
    }

    setLoadingConversations(false)
  }, [user?.org_id])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ---- Deep link: open specific lead conversation ----
  useEffect(() => {
    if (!targetLeadId || !user?.org_id || conversations.length === 0) return

    const found = conversations.find(c => c.lead_id === targetLeadId)
    if (found) {
      setActiveConversation(found)
      setFilterStage('todos')
    }
  }, [targetLeadId, user?.org_id, conversations])

  // ---- Fetch messages for active conversation ----
  useEffect(() => {
    async function fetchMessages() {
      if (!activeConversation) {
        setMessages([])
        return
      }

      setLoadingMessages(true)

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          lead_id,
          conversation_id,
          body,
          direction,
          sender_type,
          sender_name,
          message_type,
          media_url,
          media_mime_type,
          emotion,
          external_message_id,
          created_at
        `)
        .eq('conversation_id', activeConversation.id)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data as Message[])
      }

      setLoadingMessages(false)

      // Mark as read: reset unread_count
      if (activeConversation.unread_count > 0) {
        await supabase
          .from('conversations')
          .update({ unread_count: 0 })
          .eq('id', activeConversation.id)

        // Update local state
        setConversations(prev =>
          prev.map(c =>
            c.id === activeConversation.id ? { ...c, unread_count: 0 } : c
          )
        )
        setActiveConversation(prev =>
          prev ? { ...prev, unread_count: 0 } : prev
        )
      }
    }

    fetchMessages()
  }, [activeConversation?.id])

  // ---- Realtime subscription for new messages ----
  useEffect(() => {
    if (!user?.org_id) return

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${user.org_id}`
        },
        (payload) => {
          const newMsg = payload.new as Message

          // If it belongs to the active conversation, add to messages
          if (activeConversation && newMsg.conversation_id === activeConversation.id) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }

          // Update conversation list
          setConversations(prev => {
            const updated = prev.map(c => {
              if (c.id === newMsg.conversation_id) {
                return {
                  ...c,
                  last_message_body: newMsg.body || c.last_message_body,
                  last_message_at: newMsg.created_at,
                  unread_count:
                    activeConversation?.id === newMsg.conversation_id
                      ? c.unread_count
                      : c.unread_count + (newMsg.direction === 'inbound' ? 1 : 0)
                }
              }
              return c
            })

            // Sort by last_message_at descending
            return updated.sort((a, b) => {
              const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
              const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
              return bTime - aTime
            })
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.org_id, activeConversation?.id])

  // ---- Realtime subscription for new conversations ----
  useEffect(() => {
    if (!user?.org_id) return

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `org_id=eq.${user.org_id}`
        },
        async (payload) => {
          const newConv = payload.new as Conversation

          // Fetch lead info
          const { data: lead } = await supabase
            .from('leads')
            .select('id, name, phone, stage, last_message_emotion')
            .eq('id', newConv.lead_id)
            .single()

          const enriched: Conversation = {
            ...newConv,
            lead_name: lead?.name || 'Sem nome',
            lead_phone: lead?.phone || null,
            lead_stage: lead?.stage || '',
            lead_emotion: lead?.last_message_emotion || null
          }

          setConversations(prev => {
            if (prev.some(c => c.id === enriched.id)) return prev
            return [enriched, ...prev]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.org_id])

  // ---- Filters ----
  const allowedStages = ['todos', 'contatado', 'Lead respondeu', 'qualificado', 'reuniao', 'ganho']

  const filteredConversations = conversations
    .filter(c => filterStage === 'todos' || c.lead_stage === filterStage)
    .filter(c => c.lead_name?.toLowerCase().includes(searchTerm.toLowerCase()))

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="flex h-[calc(100vh-120px)] bg-[#0F0F0F] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">

      {/* ========== COLUMN 1: FILTERS ========== */}
      <div className={`w-56 border-r border-white/5 bg-[#0A0A0A] p-4 flex flex-col gap-1.5 transition-opacity duration-300
        ${activeConversation ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
      >
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">
          {t.activePipeline}
        </h3>
        {allowedStages.map(stage => (
          <button
            key={stage}
            onClick={() => setFilterStage(stage)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200
              ${filterStage === stage
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-gray-400 hover:bg-white/5'
              }`}
          >
            {t.stages[stage as keyof typeof t.stages] || stage}
          </button>
        ))}
      </div>

      {/* ========== COLUMN 2: CONVERSATION LIST ========== */}
      <div className={`w-80 border-r border-white/5 flex flex-col bg-[#0F0F0F] transition-opacity duration-300
        ${activeConversation ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
      >
        {/* Search */}
        <div className="p-3 border-b border-white/5 bg-[#0A0A0A]/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center py-12 px-4">
              <p className="text-xs text-gray-600 text-center">{t.noConversations}</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversation?.id === conv.id}
                onClick={() => setActiveConversation(conv)}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      {/* ========== COLUMN 3: CHAT ========== */}
      <div className="flex-1 flex flex-col bg-[#0b0b0b] relative">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="p-3 bg-[#111111] border-b border-white/5 flex items-center gap-3 shadow-sm z-20">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                {activeConversation.lead_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-bold text-sm truncate">{activeConversation.lead_name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                    <Circle size={6} className="fill-emerald-500 text-emerald-500" />
                    {activeConversation.lead_stage}
                  </span>
                  {activeConversation.is_bot_active && (
                    <span className="text-[10px] text-violet-400 flex items-center gap-1">
                      <Bot size={10} />
                      IA
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:block text-[10px] text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 uppercase tracking-widest font-bold">
                  {t.readOnly}
                </div>
                {activeConversation.lead_phone && (
                  <a
                    href={getWhatsappLink(activeConversation.lead_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-emerald-500 hover:text-white hover:bg-emerald-600/20 rounded-full transition-colors border border-emerald-500/20"
                    title={t.openWhatsapp}
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
                <button
                  onClick={() => setActiveConversation(null)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                  title={t.closeChat}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat messages area */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#050505]"
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.015) 0%, transparent 70%)'
              }}
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col">
                  {messages.map((msg, index) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      index={index}
                      messages={messages}
                      userLang={userLang}
                      t={t}
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Scroll to bottom button */}
            {showScrollDown && (
              <button
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-6 right-6 z-30 w-10 h-10 bg-[#1c1c1c] border border-white/10 rounded-full flex items-center justify-center shadow-lg hover:bg-[#252525] transition-colors"
              >
                <ArrowDown size={18} className="text-gray-400" />
              </button>
            )}
          </>
        ) : (
          /* Empty state */
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

// =============================================
// 8. PAGE EXPORT
// =============================================
export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-120px)] items-center justify-center bg-[#0F0F0F] rounded-2xl border border-white/10">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  )
}