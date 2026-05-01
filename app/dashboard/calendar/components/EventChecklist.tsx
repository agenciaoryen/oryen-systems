// app/dashboard/calendar/components/EventChecklist.tsx
'use client'

import { useEffect, useState } from 'react'
import { Check, Plus, Trash2, Loader2 } from 'lucide-react'
import type { ChecklistItem } from '../types'

interface Props {
  eventId: string
  t: Record<string, string>
}

export default function EventChecklist({ eventId, t }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchItems = async () => {
    const res = await fetch(`/api/calendar/${eventId}/checklist`)
    const data = await res.json()
    if (data.items) setItems(data.items)
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [eventId])

  const addItem = async () => {
    if (!newText.trim()) return
    setAdding(true)
    const res = await fetch(`/api/calendar/${eventId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText.trim() })
    })
    const data = await res.json()
    if (data.item) {
      setItems(prev => [...prev, data.item])
      setNewText('')
    }
    setAdding(false)
  }

  const toggleItem = async (item: ChecklistItem) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: !i.is_completed } : i))
    await fetch(`/api/calendar/${eventId}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, is_completed: !item.is_completed })
    })
  }

  const deleteItem = async (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await fetch(`/api/calendar/${eventId}/checklist`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId })
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  if (loading) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <Plus size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--color-text-primary)' }}
            placeholder="Adicionar item..."
          />
        </div>
        <button
          onClick={addItem}
          disabled={adding || !newText.trim()}
          className="p-1.5 rounded-lg disabled:opacity-40 transition-colors"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        </button>
      </div>

      {items.length > 0 && (
        <div className="space-y-1">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg px-3 py-2 group transition-colors"
              style={{ background: 'var(--color-bg-hover)' }}
            >
              <button
                onClick={() => toggleItem(item)}
                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all ${item.is_completed ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                style={{
                  background: item.is_completed ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                  border: item.is_completed ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {item.is_completed && <Check size={10} strokeWidth={3} style={{ color: '#fff' }} />}
              </button>
              <span
                className={`text-sm flex-1 ${item.is_completed ? 'line-through' : ''}`}
                style={{
                  color: item.is_completed ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                }}
              >
                {item.text}
              </span>
              <button
                onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
