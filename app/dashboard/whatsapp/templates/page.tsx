// app/dashboard/whatsapp/templates/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Gerenciamento de Templates WhatsApp — Cloud API
// ═══════════════════════════════════════════════════════════════════════════════

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import {
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2,
  ArrowLeft,
  X,
  Pause,
  Ban,
} from 'lucide-react'

interface Template {
  id: string
  template_name: string
  language: string
  category: string
  body_text: string
  header_text: string | null
  footer_text: string | null
  meta_status: string
  purpose: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  APPROVED: { icon: CheckCircle2, color: 'rgb(16,185,129)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  PENDING: { icon: Clock, color: 'rgb(234,179,8)', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' },
  REJECTED: { icon: AlertCircle, color: 'rgb(239,68,68)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  DRAFT: { icon: FileText, color: 'var(--color-text-secondary)', bg: 'var(--color-bg-hover)', border: 'var(--color-border)' },
  PAUSED: { icon: Pause, color: 'rgb(234,179,8)', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' },
  DISABLED: { icon: Ban, color: 'var(--color-text-tertiary)', bg: 'var(--color-bg-hover)', border: 'var(--color-border)' },
}

const CATEGORY_LABELS: Record<string, string> = {
  UTILITY: 'Utilidade',
  MARKETING: 'Marketing',
  AUTHENTICATION: 'Autenticação',
}

const PURPOSE_LABELS: Record<string, string> = {
  follow_up: 'Follow-up',
  welcome: 'Boas-vindas',
  appointment_reminder: 'Lembrete visita',
  reengagement: 'Reengajamento',
  custom: 'Personalizado',
}

export default function TemplatesPage() {
  const { user } = useAuth()
  const orgId = useActiveOrgId()
  const searchParams = useSearchParams()
  const wabaId = searchParams.get('waba_id')

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formCategory, setFormCategory] = useState('UTILITY')
  const [formLanguage, setFormLanguage] = useState('pt_BR')
  const [formPurpose, setFormPurpose] = useState('')

  const fetchTemplates = useCallback(async (sync = false) => {
    if (!orgId) return
    if (sync) setSyncing(true)
    try {
      const url = `/api/whatsapp/cloud/templates?org_id=${orgId}${wabaId ? `&waba_id=${wabaId}` : ''}${sync ? '&sync=true' : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [orgId, wabaId])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleCreate = async () => {
    if (!orgId || !wabaId || !formName || !formBody) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/whatsapp/cloud/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          waba_id: wabaId,
          template_name: formName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          body_text: formBody,
          category: formCategory,
          language: formLanguage,
          purpose: formPurpose || null,
        })
      })
      const data = await res.json()
      if (data.error) {
        setCreateError(data.details || data.error)
      } else {
        setShowCreate(false)
        setFormName('')
        setFormBody('')
        setFormPurpose('')
        fetchTemplates()
      }
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (template: Template) => {
    if (!confirm(`Excluir template "${template.template_name}"?`)) return
    setDeletingId(template.id)
    try {
      await fetch(`/api/whatsapp/cloud/templates?id=${template.id}&waba_id=${wabaId}&template_name=${template.template_name}`, {
        method: 'DELETE'
      })
      setTemplates(prev => prev.filter(t => t.id !== template.id))
    } catch (err) {
      console.error('Error deleting template:', err)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/whatsapp"
            className="p-2 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}
          >
            <ArrowLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Templates WhatsApp
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Gerencie templates de mensagem para envios fora da janela de 24h.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTemplates(true)}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sincronizar
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={16} />
            Criar Template
          </button>
        </div>
      </div>

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Nenhum template ainda
          </h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Templates permitem enviar mensagens para leads fora da janela de 24h da Cloud API.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={16} />
            Criar Template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(template => {
            const statusCfg = STATUS_CONFIG[template.meta_status] || STATUS_CONFIG.DRAFT
            const StatusIcon = statusCfg.icon
            return (
              <div
                key={template.id}
                className="rounded-2xl p-5"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {template.template_name}
                      </h3>
                      {/* Status badge */}
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
                      >
                        <StatusIcon size={10} />
                        {template.meta_status}
                      </span>
                      {/* Category */}
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                        {CATEGORY_LABELS[template.category] || template.category}
                      </span>
                      {/* Purpose */}
                      {template.purpose && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.08)', color: 'rgb(99,102,241)', border: '1px solid rgba(99,102,241,0.2)' }}>
                          {PURPOSE_LABELS[template.purpose] || template.purpose}
                        </span>
                      )}
                    </div>

                    {/* Body text preview */}
                    <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {template.body_text}
                    </p>

                    {/* Rejection reason */}
                    {template.rejection_reason && (
                      <p className="text-xs" style={{ color: 'var(--color-error)' }}>
                        Motivo: {template.rejection_reason}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        {template.language}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        {new Date(template.updated_at || template.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(template)}
                    disabled={deletingId === template.id}
                    className="p-2 rounded-lg transition-all disabled:opacity-50"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {deletingId === template.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL CRIAR TEMPLATE
          ═══════════════════════════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="w-full max-w-lg mx-4 rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Criar Template
              </h2>
              <button onClick={() => { setShowCreate(false); setCreateError('') }} className="p-1 rounded-lg">
                <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            {createError && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--color-error)', background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)' }}>
                {createError}
              </div>
            )}

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Nome do template (snake_case)
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="ex: follow_up_imoveis"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>

              {/* Corpo */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Corpo da mensagem
                </label>
                <textarea
                  value={formBody}
                  onChange={e => setFormBody(e.target.value)}
                  placeholder={'Use {{1}}, {{2}} para parâmetros dinâmicos.\nEx: Olá {{1}}, tudo bem?'}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>

              {/* Categoria + Idioma */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="UTILITY">Utilidade (mais barato)</option>
                    <option value="MARKETING">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Idioma
                  </label>
                  <select
                    value={formLanguage}
                    onChange={e => setFormLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="pt_BR">Português (BR)</option>
                    <option value="en_US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>

              {/* Propósito */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Propósito (opcional)
                </label>
                <select
                  value={formPurpose}
                  onChange={e => setFormPurpose(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">Nenhum</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="welcome">Boas-vindas</option>
                  <option value="appointment_reminder">Lembrete de visita</option>
                  <option value="reengagement">Reengajamento</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Preview */}
              {formBody && (
                <div className="rounded-xl p-3" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>PREVIEW</span>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                    {formBody}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowCreate(false); setCreateError('') }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !formName || !formBody}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  {creating ? (
                    <><Loader2 size={14} className="animate-spin" /> Criando...</>
                  ) : (
                    <><Plus size={14} /> Criar e Submeter</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
