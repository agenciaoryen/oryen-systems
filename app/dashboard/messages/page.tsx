// @ts-nocheck
'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { useSearchParams, useRouter } from 'next/navigation'
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
  AlertCircle,
  RefreshCw,
  UserCircle,
  Info,
  Mail,
  Phone as PhoneIcon,
  MapPin,
  Calendar,
  Tag,
  Globe,
  ChevronRight,
} from 'lucide-react'

/* =============================================
   CUSTOM SCROLLBAR STYLES
   ============================================= */
const scrollbarStyles = `
  .chat-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .chat-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .chat-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }
  .chat-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-border);
  }
  .sidebar-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .sidebar-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .sidebar-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }
  .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-border);
  }
`

/* =============================================
   TRANSLATIONS
   ============================================= */
const TRANSLATIONS = {
  pt: {
    activePipeline: 'Pipeline Ativo',
    searchPlaceholder: 'Buscar por nome ou telefone...',
    channelAll: 'Todos',
    channelLabel_whatsapp: 'WhatsApp',
    channelLabel_email: 'Email',
    channelLabel_instagram: 'Instagram',
    channelLabel_linkedin: 'LinkedIn',
    startConversation: 'Iniciar conversa...',
    openWhatsapp: 'Abrir no WhatsApp',
    openLeadProfile: 'Ver perfil do contato',
    closeChat: 'Fechar conversa',
    emptyState: 'Selecione uma conversa ao lado para ver o histórico de mensagens',
    noConversations: 'Nenhuma conversa encontrada',
    today: 'Hoje',
    yesterday: 'Ontem',
    agentBot: 'Agente IA',
    agentHuman: 'Atendente',
    lead: 'Contato',
    audio: 'Áudio',
    image: 'Imagem',
    video: 'Vídeo',
    document: 'Documento',
    inputPlaceholder: 'Digite uma mensagem...',
    sendError: 'Erro ao enviar. Tente novamente.',
    sendErrorDisconnected: 'WhatsApp desconectado. Conecte uma instancia em Configuracoes > WhatsApp.',
    sendErrorUazapi: 'Falha ao enviar pelo WhatsApp. Verifique se a instancia esta ativa.',
    refresh: 'Atualizar',
    allStages: 'Todas',
    leadInfo: 'Dados do Lead',
    noConversationForLead: 'Nenhuma conversa anterior com este contato.',
    startNewChat: 'Iniciar Conversa',
    leadPhone: 'Telefone',
    leadEmail: 'E-mail',
    leadSource: 'Origem',
    leadInterest: 'Interesse',
    leadContactType: 'Tipo de contato',
    leadCity: 'Cidade',
    leadCreatedAt: 'Criado em',
    leadStage: 'Etapa',
  },
  en: {
    activePipeline: 'Active Pipeline',
    searchPlaceholder: 'Search by name or phone...',
    channelAll: 'All',
    channelLabel_whatsapp: 'WhatsApp',
    channelLabel_email: 'Email',
    channelLabel_instagram: 'Instagram',
    channelLabel_linkedin: 'LinkedIn',
    startConversation: 'Start conversation...',
    openWhatsapp: 'Open in WhatsApp',
    openLeadProfile: 'View contact profile',
    closeChat: 'Close chat',
    emptyState: 'Select a conversation to view message history',
    noConversations: 'No conversations found',
    today: 'Today',
    yesterday: 'Yesterday',
    agentBot: 'AI Agent',
    agentHuman: 'Attendant',
    lead: 'Contact',
    audio: 'Audio',
    image: 'Image',
    video: 'Video',
    document: 'Document',
    inputPlaceholder: 'Type a message...',
    sendError: 'Failed to send. Try again.',
    sendErrorDisconnected: 'WhatsApp disconnected. Connect an instance in Settings > WhatsApp.',
    sendErrorUazapi: 'Failed to send via WhatsApp. Check if the instance is active.',
    refresh: 'Refresh',
    allStages: 'All',
    leadInfo: 'Lead Info',
    noConversationForLead: 'No previous conversation with this contact.',
    startNewChat: 'Start Chat',
    leadPhone: 'Phone',
    leadEmail: 'Email',
    leadSource: 'Source',
    leadInterest: 'Interest',
    leadContactType: 'Contact type',
    leadCity: 'City',
    leadCreatedAt: 'Created',
    leadStage: 'Stage',
  },
  es: {
    activePipeline: 'Pipeline Activo',
    searchPlaceholder: 'Buscar por nombre o teléfono...',
    channelAll: 'Todos',
    channelLabel_whatsapp: 'WhatsApp',
    channelLabel_email: 'Email',
    channelLabel_instagram: 'Instagram',
    channelLabel_linkedin: 'LinkedIn',
    startConversation: 'Iniciar conversación...',
    openWhatsapp: 'Abrir en WhatsApp',
    openLeadProfile: 'Ver perfil del contacto',
    closeChat: 'Cerrar chat',
    emptyState: 'Seleccione una conversación para ver el historial',
    noConversations: 'No se encontraron conversaciones',
    today: 'Hoy',
    yesterday: 'Ayer',
    agentBot: 'Agente IA',
    agentHuman: 'Atendente',
    lead: 'Contacto',
    audio: 'Audio',
    image: 'Imagen',
    video: 'Video',
    document: 'Documento',
    inputPlaceholder: 'Escribe un mensaje...',
    sendError: 'Error al enviar. Inténtalo de nuevo.',
    sendErrorDisconnected: 'WhatsApp desconectado. Conecta una instancia en Configuraciones > WhatsApp.',
    sendErrorUazapi: 'Fallo al enviar por WhatsApp. Verifica si la instancia esta activa.',
    refresh: 'Actualizar',
    allStages: 'Todas',
    leadInfo: 'Datos del Lead',
    noConversationForLead: 'Sin conversación previa con este contacto.',
    startNewChat: 'Iniciar Chat',
    leadPhone: 'Teléfono',
    leadEmail: 'Email',
    leadSource: 'Origen',
    leadInterest: 'Interés',
    leadContactType: 'Tipo de contacto',
    leadCity: 'Ciudad',
    leadCreatedAt: 'Creado',
    leadStage: 'Etapa',
  },
}

type Language = keyof typeof TRANSLATIONS
type TranslationType = typeof TRANSLATIONS['pt']

/* =============================================
   TYPES
   ============================================= */
interface PipelineStage {
  id: string
  org_id: string
  name: string
  label: string
  color: string
  position: number
  is_active: boolean
}

interface Message {
  id: string
  lead_id: string
  conversation_id: string
  body: string
  direction: 'inbound' | 'outbound'
  sender_type: 'agent_bot' | 'agent_human' | 'lead'
  sender_name: string | null
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document'
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

interface Lead {
  id: string
  name: string | null
  nome_empresa: string | null
  phone: string | null
  stage: string | null
  last_message_emotion: string | null
}

/* =============================================
   CONSTANTS & SAFETY FUNCTIONS
   ============================================= */
const SEND_MESSAGE_API = '/api/messages/send'

const parseDateSafe = (dateValue: unknown): Date => {
  try {
    if (!dateValue) return new Date()
    const d = new Date(String(dateValue))
    return isNaN(d.getTime()) ? new Date() : d
  } catch {
    return new Date()
  }
}

/* =============================================
   HELPERS
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
  if (conv.lead_name && conv.lead_name !== 'null') return conv.lead_name
  if (conv.lead_phone) return formatPhone(conv.lead_phone)
  return 'Sem identificação'
}

function getInitial(conv: Conversation): string {
  if (conv.lead_name && conv.lead_name !== 'null') return conv.lead_name[0].toUpperCase()
  return '#'
}

function getSenderIcon(senderType: string) {
  switch (senderType) {
    case 'agent_bot': return <Bot size={12} />
    case 'agent_human': return <Headset size={12} />
    case 'lead': return <User size={12} />
    default: return null
  }
}

function getSenderColor(senderType: string): React.CSSProperties {
  switch (senderType) {
    case 'agent_bot': return { color: 'rgb(167,139,250)' }
    case 'agent_human': return { color: 'var(--color-accent)' }
    case 'lead': return { color: 'var(--color-success)' }
    default: return { color: 'var(--color-text-tertiary)' }
  }
}

function formatDateLabel(dateStr: string, lang: string, t: TranslationType): string {
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
   MEDIA RENDERER
   ============================================= */
function MediaContent({ msg, t }: { msg: Message; t: TranslationType }) {
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
            <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
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
            <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
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
            <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
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
              className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
              style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}
            >
              <FileText size={18} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
              <span className="text-sm truncate" style={{ color: 'var(--color-primary)' }}>{msg.body || t.document}</span>
              <ExternalLink size={12} className="shrink-0 ml-auto" style={{ color: 'var(--color-text-muted)' }} />
            </a>
          ) : (
            <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-tertiary)' }}>
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
   MESSAGE BUBBLE
   ============================================= */
function MessageBubble({
  msg, index, messages, userLang, t,
}: {
  msg: Message
  index: number
  messages: Message[]
  userLang: string
  t: TranslationType
}) {
  const isOutbound = msg.direction === 'outbound'
  const msgDate = parseDateSafe(msg.created_at).toDateString()
  const prevMsgDate = index > 0 ? parseDateSafe(messages[index - 1].created_at).toDateString() : null
  const showDateHeader = msgDate !== prevMsgDate
  const prevMsg = index > 0 ? messages[index - 1] : null
  const isSameSender = prevMsg?.sender_type === msg.sender_type && !showDateHeader
  const isSequence = prevMsg?.direction === msg.direction && !showDateHeader

  const getBubbleStyle = (): React.CSSProperties => {
    if (!isOutbound) return { backgroundColor: 'var(--color-bg-elevated)' }
    if (msg.sender_type === 'agent_bot') return { backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(139,92,246,0.1)' }
    if (msg.sender_type === 'agent_human') return { backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(245,158,11,0.1)' }
    return { backgroundColor: 'rgba(75,107,251,0.12)' }
  }

  return (
    <div className={`flex flex-col ${showDateHeader ? 'mt-5' : ''}`}>
      {showDateHeader && (
        <div className="flex justify-center mb-4 sticky top-2 z-20">
          <span className="backdrop-blur-sm text-[11px] font-medium px-3 py-1 rounded-lg shadow" style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
            {formatDateLabel(msg.created_at, userLang, t)}
          </span>
        </div>
      )}
      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-[2px]' : 'mt-2'}`}>
        <div
          className={`max-w-[85%] sm:max-w-[65%] py-1.5 px-2.5 rounded-lg text-[13.5px] leading-[19px] shadow-sm relative
            ${!isSequence && isOutbound ? 'rounded-tr-none' : ''}
            ${!isSequence && !isOutbound ? 'rounded-tl-none' : ''}`}
          style={{ color: 'var(--color-text-primary)', ...getBubbleStyle() }}
        >
          {!isSameSender && (
            <div className="flex items-center gap-1.5 mb-0.5" style={getSenderColor(msg.sender_type)}>
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
          {msg.body && msg.message_type === 'audio' && (
            <div className="flex items-start gap-2">
              <Mic size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
              <p className="whitespace-pre-wrap break-words text-sm">
                {msg.body.replace('[Áudio transcrito]: ', '').replace('[Audio enviado]', 'Audio enviado')}
              </p>
            </div>
          )}
          {msg.body && msg.message_type !== 'text' && msg.message_type !== 'audio' && (
            <p className="whitespace-pre-wrap break-words text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{msg.body}</p>
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
   CONVERSATION LIST ITEM
   ============================================= */
function ConversationItem({
  conversation: c, isActive, onClick, userLang, t,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  userLang: string
  t: TranslationType
}) {
  return (
    <div
      onClick={onClick}
      className="px-3 py-[10px] flex items-center gap-3 cursor-pointer transition-colors relative"
      style={{ backgroundColor: isActive ? 'var(--color-bg-elevated)' : undefined }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-surface)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '' }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-[49px] h-[49px] rounded-full flex items-center justify-center text-lg font-medium" style={{ backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }}>
          {getInitial(c)}
        </div>
        {c.channel === 'whatsapp' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: '#25D366', borderColor: 'var(--color-bg-base)' }}>
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
          </div>
        )}
        {c.channel === 'email' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: '#4F46E5', borderColor: 'var(--color-bg-base)' }}>
            <Mail size={9} className="text-white" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-[10px]" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex justify-between items-baseline mb-[2px]">
          <h4 className="text-[16px] font-normal truncate pr-2" style={{ color: 'var(--color-text-primary)' }}>
            {getDisplayName(c)}
          </h4>
          <span className="text-[11px] shrink-0" style={{ color: c.unread_count > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
            {formatLastMessageTime(c.last_message_at, userLang)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[13px] truncate pr-2" style={{ color: 'var(--color-text-secondary)' }}>
            {c.last_message_body || t.startConversation}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {c.lead_emotion && <span className="text-xs">{getEmotionEmoji(c.lead_emotion)}</span>}
            {c.unread_count > 0 && (
              <span className="text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-bg-base)' }}>
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
   CHANNEL CHIP (filtro de canais na sidebar)
   ============================================= */
function ChannelChip({
  channel, label, active, onClick,
}: {
  channel?: string
  label: string
  active: boolean
  onClick: () => void
}) {
  // Ícone colorido pra cada canal — facilita identificação visual
  const channelDot = (ch?: string) => {
    if (!ch) return null
    const colors: Record<string, string> = {
      whatsapp: '#25D366',
      email: '#4F46E5',
      instagram: '#E4405F',
      linkedin: '#0A66C2',
    }
    const color = colors[ch] || 'var(--color-text-muted)'
    return <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
  }

  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
      style={active
        ? { background: 'var(--color-primary)', color: '#fff' }
        : { background: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
      }
    >
      {channelDot(channel)}
      {label}
    </button>
  )
}

/* =============================================
   MESSAGE INPUT
   ============================================= */
function MessageInput({
  onSend, onSendAudio, isSending, sendError, t,
}: {
  onSend: (text: string) => void
  onSendAudio: (blob: Blob) => void
  isSending: boolean
  sendError: string | null
  t: TranslationType
}) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        stream.getTracks().forEach(t => t.stop())
        if (blob.size > 0) onSendAudio(blob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      console.error('Erro ao acessar microfone:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop())
    }
    chunksRef.current = []
    setIsRecording(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const formatRecordingTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ backgroundColor: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)' }}>
      {sendError && (
        <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'var(--color-error-subtle)', borderBottom: '1px solid var(--color-error)' }}>
          <AlertCircle size={14} className="shrink-0" style={{ color: 'var(--color-error)' }} />
          <span className="text-xs" style={{ color: 'var(--color-error)' }}>{sendError}</span>
        </div>
      )}
      <div className="flex items-end gap-2 px-4 py-2">
        {isRecording ? (
          <>
            {/* Cancel */}
            <button
              onClick={cancelRecording}
              className="p-2 rounded-full transition-all shrink-0"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={20} />
            </button>
            {/* Recording indicator */}
            <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--color-error)' }} />
              <span className="text-sm font-mono" style={{ color: 'var(--color-error)' }}>{formatRecordingTime(recordingTime)}</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Gravando...</span>
            </div>
            {/* Send audio */}
            <button
              onClick={stopRecording}
              className="p-2 rounded-full transition-all shrink-0"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              <Send size={20} />
            </button>
          </>
        ) : (
          <>
            {/* Mic button */}
            <button
              onClick={startRecording}
              disabled={isSending}
              className="p-2 rounded-full transition-all shrink-0"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Gravar audio"
            >
              <Mic size={20} />
            </button>
            {/* Text input */}
            <textarea
              ref={taRef}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={t.inputPlaceholder}
              disabled={isSending}
              rows={1}
              className="flex-1 rounded-lg px-3 py-2 text-[14px] focus:outline-none resize-none disabled:opacity-50"
              style={{ maxHeight: '120px', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}
            />
            {/* Send text */}
            <button
              onClick={handleSend}
              disabled={!text.trim() || isSending}
              className="p-2 rounded-full transition-all shrink-0"
              style={text.trim() && !isSending
                ? { backgroundColor: 'var(--color-primary)', color: 'white' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-secondary)', cursor: 'not-allowed' }}
            >
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* =============================================
   MAIN CONTENT
   ============================================= */
function MessagesContent() {
  const router = useRouter()
  const { user } = useAuth()
  const orgId = useActiveOrgId()
  const searchParams = useSearchParams()
  const targetLeadId = searchParams.get('lead_id')

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [filterStage, setFilterStage] = useState('todos')
  const [filterChannel, setFilterChannel] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showLeadInfo, setShowLeadInfo] = useState(false)
  const [leadDetails, setLeadDetails] = useState<any>(null)
  const [loadingLeadDetails, setLoadingLeadDetails] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeConversationRef = useRef<Conversation | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationRef.current = activeConversation
  }, [activeConversation])

  const userLang = ((user as any)?.language as Language) || 'pt'
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

  // ---- Fetch pipeline stages ----
  const fetchPipelineStages = useCallback(async () => {
    if (!orgId) return

    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('position')

    if (!error && data) {
      setPipelineStages(data)
    }
  }, [orgId])

  // ---- Fetch conversations ----
  const fetchConversations = useCallback(async () => {
    if (!orgId) return

    setLoadingConversations(true)

    const { data, error } = await supabase
      .from('conversations')
      .select('id, org_id, lead_id, channel, status, assigned_to, is_bot_active, last_message_body, last_message_at, unread_count, created_at')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error || !data) {
      console.error('Error fetching conversations:', error)
      setLoadingConversations(false)
      return
    }

    if (data.length > 0) {
      const leadIds = [...new Set(data.map((c) => c.lead_id).filter(Boolean))]

      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, nome_empresa, phone, stage, last_message_emotion')
        .in('id', leadIds)

      const leadMap = new Map<string, Lead>(
        (leads || []).map((l: Lead) => [l.id, l])
      )

      const enriched: Conversation[] = data.map((c) => {
        const lead = leadMap.get(c.lead_id)
        return {
          ...c,
          lead_name: lead?.name && lead.name !== 'null' ? lead.name : '',
          lead_nome_empresa: lead?.nome_empresa && lead.nome_empresa !== 'null' ? lead.nome_empresa : '',
          lead_phone: lead?.phone || null,
          lead_stage: lead?.stage || '',
          lead_emotion: lead?.last_message_emotion || null,
        } as Conversation
      })

      setConversations(enriched)
    } else {
      setConversations([])
    }

    setLoadingConversations(false)
  }, [orgId])

  // Re-fetch quando orgId mudar
  useEffect(() => { 
    if (orgId) {
      setActiveConversation(null)
      setMessages([])
      setFilterStage('todos')
      fetchPipelineStages()
      fetchConversations() 
    }
  }, [orgId, fetchConversations, fetchPipelineStages])

  // ---- Deep link ----
  useEffect(() => {
    if (!targetLeadId || !orgId) return

    // Wait for conversations to load
    if (loadingConversations) return

    const found = conversations.find(c => c.lead_id === targetLeadId)
    if (found) {
      setActiveConversation(found)
      setFilterStage('todos')
      return
    }

    // No conversation found — create one for this lead
    const createConv = async () => {
      // Fetch lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('id, name, nome_empresa, phone, stage, last_message_emotion')
        .eq('id', targetLeadId)
        .single()

      if (!lead) return

      // Check if conversation already exists (may have been created by webhook)
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('org_id', orgId)
        .eq('lead_id', targetLeadId)
        .single()

      if (existingConv) {
        const enriched: Conversation = {
          ...existingConv,
          lead_name: lead.name || '',
          lead_nome_empresa: lead.nome_empresa || '',
          lead_phone: lead.phone || null,
          lead_stage: lead.stage || 'new',
          lead_emotion: lead.last_message_emotion || null,
        }
        setConversations(prev => [enriched, ...prev])
        setActiveConversation(enriched)
        setFilterStage('todos')
        return
      }

      // Create new conversation
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          org_id: orgId,
          lead_id: targetLeadId,
          channel: 'whatsapp',
          status: 'active',
          is_bot_active: false,
          unread_count: 0,
        })
        .select('*')
        .single()

      if (newConv) {
        const enriched: Conversation = {
          ...newConv,
          lead_name: lead.name || '',
          lead_nome_empresa: lead.nome_empresa || '',
          lead_phone: lead.phone || null,
          lead_stage: lead.stage || 'new',
          lead_emotion: lead.last_message_emotion || null,
        }
        setConversations(prev => [enriched, ...prev])
        setActiveConversation(enriched)
        setFilterStage('todos')
      }
    }

    createConv()
  }, [targetLeadId, orgId, loadingConversations, conversations])

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
  }, [activeConversation?.id])

  // ---- Send message ----
  const handleSendMessage = useCallback(async (text: string) => {
    if (!activeConversation || !user) return
    setIsSending(true)
    setSendError(null)

    const senderName = (user as any)?.email?.split('@')[0] || 'Atendente'

    try {
      // Enviar via UAZAPI (API interna que envia + seta STOP)
      const res = await fetch(SEND_MESSAGE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: activeConversation.org_id,
          lead_id: activeConversation.lead_id,
          phone: activeConversation.lead_phone,
          message: text,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 404) throw new Error('whatsapp_disconnected')
        if (res.status === 502) throw new Error('whatsapp_send_error')
        throw new Error(errData.error || 'send_failed')
      }

      // Salvar no módulo de conversas (dashboard)
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
    } catch (err: any) {
      if (err.message === 'whatsapp_disconnected') {
        setSendError(t.sendErrorDisconnected)
      } else if (err.message === 'whatsapp_send_error') {
        setSendError(t.sendErrorUazapi)
      } else {
        setSendError(t.sendError)
      }
    } finally {
      setIsSending(false)
    }
  }, [activeConversation, user, t])

  // ---- Send audio ----
  const handleSendAudio = useCallback(async (blob: Blob) => {
    if (!activeConversation || !user) return
    setIsSending(true)
    setSendError(null)

    const senderName = (user as any)?.email?.split('@')[0] || 'Atendente'

    try {
      const formData = new FormData()
      formData.append('org_id', activeConversation.org_id)
      formData.append('lead_id', activeConversation.lead_id)
      formData.append('phone', activeConversation.lead_phone || '')
      formData.append('audio', blob, 'audio.webm')

      const res = await fetch('/api/messages/send-audio', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        if (res.status === 404) throw new Error('whatsapp_disconnected')
        if (res.status === 502) throw new Error('whatsapp_send_error')
        throw new Error('send_failed')
      }

      // Salvar no módulo de conversas
      const { data: result } = await supabase.rpc('fn_insert_message', {
        p_org_id: activeConversation.org_id,
        p_lead_id: activeConversation.lead_id,
        p_channel: activeConversation.channel || 'whatsapp',
        p_direction: 'outbound',
        p_body: '[Audio enviado]',
        p_sender_type: 'agent_human',
        p_sender_name: senderName,
        p_message_type: 'audio',
        p_timestamp: new Date().toISOString(),
      })

      const rpcResult = result as { message_id?: string } | null

      const newMsg: Message = {
        id: rpcResult?.message_id || crypto.randomUUID(),
        lead_id: activeConversation.lead_id,
        conversation_id: activeConversation.id,
        body: '[Audio enviado]',
        direction: 'outbound',
        sender_type: 'agent_human',
        sender_name: senderName,
        message_type: 'audio',
        media_url: null,
        media_mime_type: 'audio/webm',
        emotion: null,
        external_message_id: null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, newMsg])
    } catch (err: any) {
      if (err.message === 'whatsapp_disconnected') {
        setSendError(t.sendErrorDisconnected)
      } else if (err.message === 'whatsapp_send_error') {
        setSendError(t.sendErrorUazapi)
      } else {
        setSendError(t.sendError)
      }
    } finally {
      setIsSending(false)
    }
  }, [activeConversation, user, t])

  // ---- Realtime: messages ----
  useEffect(() => {
    if (!orgId) return
    const ch = supabase
      .channel('messages-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message
        const currentConv = activeConversationRef.current
        if (currentConv && m.conversation_id === currentConv.id) {
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
        }
        setConversations(prev => {
          // Only update conversations that exist in our list (already filtered by org)
          const exists = prev.some(c => c.id === m.conversation_id)
          if (!exists) return prev
          const up = prev.map(c =>
            c.id === m.conversation_id
              ? {
                  ...c,
                  last_message_body: m.body || c.last_message_body,
                  last_message_at: m.created_at,
                  unread_count: currentConv?.id === m.conversation_id ? c.unread_count : c.unread_count + (m.direction === 'inbound' ? 1 : 0),
                }
              : c
          )
          return up.sort((a, b) => parseDateSafe(b.last_message_at).getTime() - parseDateSafe(a.last_message_at).getTime())
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId])

  // ---- Realtime: new conversations ----
  useEffect(() => {
    if (!orgId) return
    const ch = supabase
      .channel('convs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` }, async (payload) => {
        const nc = payload.new as Conversation
        const { data: lead } = await supabase.from('leads').select('id, name, nome_empresa, phone, stage, last_message_emotion').eq('id', nc.lead_id).single()
        const enriched: Conversation = {
          ...nc,
          lead_name: lead?.name && lead.name !== 'null' ? lead.name : '',
          lead_nome_empresa: lead?.nome_empresa && lead.nome_empresa !== 'null' ? lead.nome_empresa : '',
          lead_phone: lead?.phone || null,
          lead_stage: lead?.stage || '',
          lead_emotion: lead?.last_message_emotion || null,
        }
        setConversations(prev => prev.some(c => c.id === enriched.id) ? prev : [enriched, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId])

  // ---- Navigate to lead profile ----
  const handleOpenLeadProfile = useCallback(() => {
    if (activeConversation?.lead_id) {
      router.push(`/dashboard/crm/${activeConversation.lead_id}`)
    }
  }, [activeConversation?.lead_id, router])

  // ---- Toggle lead info panel ----
  const toggleLeadInfo = useCallback(async () => {
    if (showLeadInfo) {
      setShowLeadInfo(false)
      return
    }
    if (!activeConversation?.lead_id) return

    setShowLeadInfo(true)
    setLoadingLeadDetails(true)
    try {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('id', activeConversation.lead_id)
        .single()
      setLeadDetails(data)
    } catch {
      setLeadDetails(null)
    } finally {
      setLoadingLeadDetails(false)
    }
  }, [showLeadInfo, activeConversation?.lead_id])

  // Close lead info when conversation changes
  useEffect(() => {
    setShowLeadInfo(false)
    setLeadDetails(null)
  }, [activeConversation?.id])

  // ---- Filters ----
  // Canais distintos — pra renderizar os chips dinamicamente (futuros: instagram, linkedin, etc)
  const availableChannels = Array.from(new Set(conversations.map(c => c.channel).filter(Boolean)))

  // Busca por nome OU número de telefone
  const filteredConversations = conversations
    .filter(c => {
      if (filterChannel === 'all') return true
      return c.channel === filterChannel
    })
    .filter(c => {
      if (filterStage === 'todos') return true
      return c.lead_stage === filterStage
    })
    .filter(c => {
      if (!searchTerm.trim()) return true
      const query = searchTerm.toLowerCase()
      const name = getDisplayName(c).toLowerCase()
      const phone = (c.lead_phone || '').replace(/\D/g, '')
      const searchDigits = searchTerm.replace(/\D/g, '')
      
      // Busca por nome
      if (name.includes(query)) return true
      
      // Busca por telefone (só números)
      if (searchDigits && phone.includes(searchDigits)) return true
      
      return false
    })

  /* =============================================
     RENDER
     ============================================= */
  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>

        {/* COL 1: PIPELINE FILTERS (DINÂMICO) */}
        <div className={`hidden lg:flex w-52 p-4 flex-col gap-1 transition-opacity duration-300
          ${activeConversation ? 'opacity-40 hover:opacity-100' : ''}`} style={{ borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest px-2" style={{ color: 'var(--color-text-secondary)' }}>
              {t.activePipeline}
            </h3>
            <button
              onClick={() => { fetchPipelineStages(); fetchConversations() }}
              className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }}
              title={t.refresh}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          
          {/* Botão "Todas" */}
          <button
            onClick={() => setFilterStage('todos')}
            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
            style={filterStage === 'todos'
              ? { backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 500 }
              : { color: 'var(--color-text-secondary)' }}
          >
            {t.allStages}
          </button>

          {/* Stages dinâmicos do banco */}
          {pipelineStages.map(stage => (
            <button
              key={stage.id}
              onClick={() => setFilterStage(stage.name)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
              style={filterStage === stage.name
                ? { backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 500 }
                : { color: 'var(--color-text-secondary)' }}
            >
              {stage.label}
            </button>
          ))}
        </div>

        {/* COL 2: CONVERSATION LIST */}
        <div className={`w-full sm:w-[340px] flex flex-col transition-opacity duration-300
          ${activeConversation ? 'hidden sm:flex sm:opacity-40 sm:hover:opacity-100' : ''}`} style={{ borderRight: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
          {/* Channel filter chips — só aparece se houver mais de 1 canal */}
          {availableChannels.length > 1 && (
            <div className="px-2 pt-2 flex items-center gap-1 overflow-x-auto sidebar-scrollbar">
              <ChannelChip
                label={t.channelAll}
                active={filterChannel === 'all'}
                onClick={() => setFilterChannel('all')}
              />
              {availableChannels.map(ch => (
                <ChannelChip
                  key={ch}
                  channel={ch}
                  label={(t as any)[`channelLabel_${ch}`] || ch.charAt(0).toUpperCase() + ch.slice(1)}
                  active={filterChannel === ch}
                  onClick={() => setFilterChannel(ch)}
                />
              ))}
            </div>
          )}

          {/* Search */}
          <div className="p-2" style={{ backgroundColor: 'var(--color-bg-base)' }}>
            <div className="relative">
              <Search className="absolute left-3 top-[9px]" size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg pl-10 pr-4 py-[6px] text-[14px] focus:outline-none border-none"
                style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto sidebar-scrollbar">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center py-12 px-4">
                <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>{t.noConversations}</p>
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
        <div className={`flex-1 flex flex-col relative ${!activeConversation ? 'hidden sm:flex' : ''}`} style={{ backgroundColor: 'var(--color-bg-base)' }}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="px-4 py-[10px] flex items-center gap-3 z-20" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                {/* Botão voltar no mobile */}
                <button
                  onClick={() => setActiveConversation(null)}
                  className="sm:hidden p-2 -ml-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <X size={20} />
                </button>
                
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm" style={{ backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }}>
                  {getInitial(activeConversation)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-normal text-[15px] truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {getDisplayName(activeConversation)}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                      <Circle size={6} style={{ fill: 'var(--color-primary)', color: 'var(--color-primary)' }} />
                      {pipelineStages.find(s => s.name === activeConversation.lead_stage)?.label || activeConversation.lead_stage}
                    </span>
                    {activeConversation.is_bot_active && (
                      <span className="text-[11px] flex items-center gap-1" style={{ color: 'rgb(167,139,250)' }}>
                        <Bot size={10} /> IA
                      </span>
                    )}
                    {activeConversation.lead_phone && (
                      <span className="text-[11px] hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatPhone(activeConversation.lead_phone)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Botão para ver dados do lead (painel flutuante) */}
                  <button
                    onClick={toggleLeadInfo}
                    className="p-2 rounded-full transition-colors"
                    style={showLeadInfo ? { color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' } : { color: 'var(--color-text-secondary)' }}
                    title={t.leadInfo}
                  >
                    <Info size={18} />
                  </button>
                  {/* Botão para ir ao perfil do lead */}
                  <button
                    onClick={handleOpenLeadProfile}
                    className="p-2 rounded-full transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                    title={t.openLeadProfile}
                  >
                    <UserCircle size={18} />
                  </button>
                  {activeConversation.lead_phone && (
                    <a
                      href={getWhatsappLink(activeConversation.lead_phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                      title={t.openWhatsapp}
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                  <button
                    onClick={() => { setActiveConversation(null); setSendError(null) }}
                    className="hidden sm:block p-2 rounded-full transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                    title={t.closeChat}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Lead Info floating panel */}
              {showLeadInfo && (
                <div
                  className="absolute top-[52px] right-3 z-30 w-72 rounded-xl shadow-2xl border overflow-hidden"
                  style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
                >
                  <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                      {t.leadInfo}
                    </span>
                    <button onClick={() => setShowLeadInfo(false)} className="p-1 rounded hover:bg-white/10 transition-colors">
                      <X size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                  </div>
                  {loadingLeadDetails ? (
                    <div className="p-6 flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
                    </div>
                  ) : leadDetails ? (
                    <div className="p-3 space-y-2.5 max-h-[400px] overflow-y-auto sidebar-scrollbar">
                      {/* Nome */}
                      <div className="text-center pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center font-bold text-lg mb-1" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-primary)' }}>
                          {leadDetails.name?.[0]?.toUpperCase() || '#'}
                        </div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{leadDetails.name || '—'}</p>
                        {leadDetails.nome_empresa && (
                          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{leadDetails.nome_empresa}</p>
                        )}
                      </div>

                      {/* Dados */}
                      {leadDetails.phone && (
                        <div className="flex items-center gap-2">
                          <PhoneIcon size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{formatPhone(leadDetails.phone)}</span>
                        </div>
                      )}
                      {leadDetails.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{leadDetails.email}</span>
                        </div>
                      )}
                      {leadDetails.city && (
                        <div className="flex items-center gap-2">
                          <MapPin size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{leadDetails.city}</span>
                        </div>
                      )}
                      {leadDetails.source && (
                        <div className="flex items-center gap-2">
                          <Globe size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{leadDetails.source}</span>
                        </div>
                      )}
                      {leadDetails.interesse && (
                        <div className="flex items-center gap-2">
                          <Tag size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {leadDetails.interesse === 'compra' ? 'Compra' : leadDetails.interesse === 'locacao' ? 'Locação' : leadDetails.interesse === 'ambos' ? 'Compra/Locação' : leadDetails.interesse}
                          </span>
                        </div>
                      )}
                      {leadDetails.tipo_contato && (
                        <div className="flex items-center gap-2">
                          <User size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {leadDetails.tipo_contato === 'comprador' ? 'Comprador' : leadDetails.tipo_contato === 'locatario' ? 'Locatário' : leadDetails.tipo_contato === 'vendedor' ? 'Vendedor' : leadDetails.tipo_contato === 'proprietario' ? 'Proprietário' : leadDetails.tipo_contato}
                          </span>
                        </div>
                      )}
                      {leadDetails.stage && (
                        <div className="flex items-center gap-2">
                          <Circle size={12} style={{ fill: 'var(--color-primary)', color: 'var(--color-primary)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {pipelineStages.find(s => s.name === leadDetails.stage)?.label || leadDetails.stage}
                          </span>
                        </div>
                      )}
                      {leadDetails.created_at && (
                        <div className="flex items-center gap-2">
                          <Calendar size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {new Date(leadDetails.created_at).toLocaleDateString(userLang === 'en' ? 'en-US' : userLang === 'es' ? 'es-ES' : 'pt-BR')}
                          </span>
                        </div>
                      )}

                      {/* Link para perfil completo */}
                      <button
                        onClick={handleOpenLeadProfile}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-80"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                      >
                        Ver perfil completo <ChevronRight size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Lead não encontrado</p>
                    </div>
                  )}
                </div>
              )}

              {/* Messages area */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-[5%] py-4 chat-scrollbar"
                style={{
                  backgroundColor: 'var(--color-bg-base)',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'103\' cy=\'53\' r=\'1\'/%3E%3Ccircle cx=\'53\' cy=\'103\' r=\'1\'/%3E%3Ccircle cx=\'153\' cy=\'153\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")',
                }}
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
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
                  className="absolute bottom-20 right-4 z-30 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors"
                  style={{ backgroundColor: 'var(--color-bg-surface)' }}
                >
                  <ArrowDown size={18} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              )}

              {/* Input — em conversas de email mostra aviso informativo (envio sai pelo BDR) */}
              {activeConversation.channel === 'email' ? (
                <div className="shrink-0 p-4" style={{ backgroundColor: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)' }}>
                  <div className="rounded-xl p-3 flex items-start gap-3" style={{ background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.25)' }}>
                    <Mail size={18} className="shrink-0 mt-0.5" style={{ color: '#4F46E5' }} />
                    <div className="flex-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      <p className="font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                        {userLang === 'en' ? 'Email conversation (read-only here)' : userLang === 'es' ? 'Conversación por email (solo lectura aquí)' : 'Conversa por email (só leitura aqui)'}
                      </p>
                      <p className="text-xs">
                        {userLang === 'en' ? 'Emails are sent via the BDR Email agent. To send a new email to this lead, add it to an email campaign.' : userLang === 'es' ? 'Los emails se envían por el agente BDR Email. Para enviar nuevo email, agrega el lead a una campaña.' : 'Emails são enviados pelo agente BDR Email. Pra mandar um email novo, adiciona o lead a uma campanha.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <MessageInput onSend={handleSendMessage} onSendAudio={handleSendAudio} isSending={isSending} sendError={sendError} t={t} />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
              <div className="w-[320px] text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                  <MessageCircle size={36} style={{ color: 'var(--color-text-secondary)' }} />
                </div>
                <h2 className="text-xl font-light" style={{ color: 'var(--color-text-primary)' }}>Oryen Conversas</h2>
                <p className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>{t.emptyState}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* =============================================
   PAGE EXPORT
   ============================================= */
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-120px)] items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}