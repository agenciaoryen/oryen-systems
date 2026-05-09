'use client'

import { Sparkles } from 'lucide-react'

interface CoachMessage {
  id: string
  role: 'user' | 'coach'
  body: string
  message_type: string
  metadata?: any
  created_at: string
}

interface Props {
  message: CoachMessage
  isStreaming?: boolean
}

function renderMarkdown(text: string): React.ReactNode {
  // Simple markdown: **bold**, *italic*, - lists, 1. numbered lists
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />)
      continue
    }

    // Bold and italic inline
    const formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')

    const isBullet = /^[-•]\s/.test(line)
    const isNumbered = /^\d+[.)]\s/.test(line)

    elements.push(
      <div
        key={i}
        className={`text-[13px] leading-relaxed ${isBullet || isNumbered ? 'pl-3' : ''}`}
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    )
  }

  return elements
}

export default function CoachBubble({ message, isStreaming }: Props) {
  const isCoach = message.role === 'coach'
  const isGreeting = message.message_type === 'greeting'
  const isAlert = message.message_type === 'alert'

  if (isCoach) {
    return (
      <div className={`flex items-start gap-2 ${isStreaming ? 'opacity-90' : ''}`}>
        {/* Coach avatar */}
        <div
          className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, rgba(79, 111, 255, 0.15), rgba(139, 92, 246, 0.15))' }}
        >
          <Sparkles size={14} style={{ color: '#4F6FFF' }} />
        </div>

        {/* Bubble */}
        <div className="flex-1 min-w-0">
          <div
            className={`rounded-2xl rounded-tl-sm px-4 py-2.5 ${
              isGreeting ? 'border-l-2' : ''
            } ${isAlert ? 'border-l-2' : ''}`}
            style={{
              background: 'var(--color-bg-hover)',
              color: 'var(--color-text-primary)',
              borderLeft: isGreeting
                ? '2px solid #4F6FFF'
                : isAlert
                ? '2px solid #ef4444'
                : 'none',
              border: isGreeting || isAlert ? undefined : '1px solid var(--color-border)',
            }}
          >
            {renderMarkdown(message.body)}
            {isStreaming && (
              <span
                className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm"
                style={{ background: 'var(--color-primary)' }}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  // User message
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5"
        style={{
          background: 'var(--color-primary)',
          color: '#fff',
        }}
      >
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.body}</p>
      </div>
    </div>
  )
}
