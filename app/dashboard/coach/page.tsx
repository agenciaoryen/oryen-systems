'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { Sparkles, Loader2 } from 'lucide-react'
import CoachBubble from './components/CoachBubble'
import CoachInput from './components/CoachInput'
import CoachWelcome from './components/CoachWelcome'

const T = {
  pt: {
    title: 'Oryen Coach',
    subtitle: 'Seu mentor pessoal de negócios',
    loading: 'Preparando seu coach...',
    error: 'Erro ao carregar. Tente novamente.',
    retry: 'Tentar novamente',
    inputPlaceholder: 'Converse com seu coach...',
    coachTyping: 'Coach está escrevendo...',
  },
  en: {
    title: 'Oryen Coach',
    subtitle: 'Your personal business mentor',
    loading: 'Preparing your coach...',
    error: 'Failed to load. Please try again.',
    retry: 'Retry',
    inputPlaceholder: 'Talk to your coach...',
    coachTyping: 'Coach is typing...',
  },
  es: {
    title: 'Oryen Coach',
    subtitle: 'Tu mentor personal de negocios',
    loading: 'Preparando tu coach...',
    error: 'Error al cargar. Inténtalo de nuevo.',
    retry: 'Reintentar',
    inputPlaceholder: 'Habla con tu coach...',
    coachTyping: 'El coach está escribiendo...',
  },
}

interface CoachMessage {
  id: string
  role: 'user' | 'coach'
  body: string
  message_type: string
  metadata?: any
  created_at: string
}

export default function CoachPage() {
  const { user } = useAuth()
  const orgId = useActiveOrgId()
  const lang = (user?.language as 'pt' | 'en' | 'es') || 'pt'
  const t = T[lang]

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState(false)
  const [hasExistingConversation, setHasExistingConversation] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Initialize: check for today's conversation
  useEffect(() => {
    if (!orgId) return
    initializeCoach()
  }, [orgId])

  const initializeCoach = async () => {
    setIsLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/coach/conversation?org_id=${orgId}&check_greeting=true&lang=${lang}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setConversationId(data.conversation_id)
      setMessages(data.messages || [])
      setHasExistingConversation(!data.is_new)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText, scrollToBottom])

  const handleSend = async (text: string) => {
    if (!orgId || isStreaming) return

    // Optimistic user message
    const userMsg: CoachMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      body: text,
      message_type: 'text',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, conversation_id: conversationId, message: text }),
      })

      if (!res.ok) throw new Error('Failed to send')

      // Read SSE stream
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6)
            if (payload === '[DONE]') continue
            try {
              const parsed = JSON.parse(payload)
              if (parsed.text) {
                fullText += parsed.text
                setStreamingText(fullText)
              }
            } catch { /* partial chunk, ignore */ }
          }
        }
      }

      // Add coach response to messages
      const coachMsg: CoachMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        body: fullText,
        message_type: messages.length === 0 ? 'greeting' : 'text',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, coachMsg])
      setStreamingText('')
    } catch (err) {
      console.error('[Coach] Send error:', err)
      // Show error as a coach message
      const errorMsg: CoachMessage = {
        id: `error-${Date.now()}`,
        role: 'coach',
        body: t.error,
        message_type: 'alert',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
      setStreamingText('')
    } finally {
      setIsStreaming(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t.loading}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-tertiary)' }}>{t.error}</p>
          <button
            onClick={initializeCoach}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {t.retry}
          </button>
        </div>
      </div>
    )
  }

  const isWelcome = messages.length <= 1 && !hasExistingConversation

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(79, 111, 255, 0.15), rgba(139, 92, 246, 0.15))' }}
          >
            <Sparkles size={20} style={{ color: '#4F6FFF' }} />
          </div>
          <div>
            <h1 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h1>
            <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-3 pb-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isWelcome && messages.length === 1 ? (
          <CoachWelcome
            greeting={messages[0]}
            onSuggestionClick={handleSend}
          />
        ) : (
          messages.map((msg) => (
            <CoachBubble key={msg.id} message={msg} />
          ))
        )}

        {/* Streaming indicator */}
        {isStreaming && streamingText && (
          <CoachBubble
            message={{
              id: 'streaming',
              role: 'coach',
              body: streamingText,
              message_type: 'text',
              created_at: new Date().toISOString(),
            }}
            isStreaming
          />
        )}
        {isStreaming && !streamingText && (
          <div className="flex items-center gap-2 px-3 py-2">
            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>{t.coachTyping}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-3">
        <CoachInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={t.inputPlaceholder}
        />
      </div>
    </div>
  )
}
