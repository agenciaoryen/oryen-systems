'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Loader2 } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function CoachInput({ onSend, disabled, placeholder }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  const handleSend = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex items-end gap-2 p-2.5 rounded-2xl"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Converse com seu coach...'}
        rows={1}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm resize-none focus:outline-none disabled:opacity-40 py-1 px-1"
        style={{
          color: 'var(--color-text-primary)',
          maxHeight: '120px',
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="p-2 rounded-xl flex-shrink-0 transition-all duration-200 active:scale-95 disabled:opacity-30"
        style={{
          background: text.trim() && !disabled
            ? 'linear-gradient(135deg, #4F6FFF, #6E5FFF)'
            : 'var(--color-bg-hover)',
          color: text.trim() && !disabled ? '#fff' : 'var(--color-text-tertiary)',
        }}
      >
        {disabled ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
      </button>
    </div>
  )
}
