// app/dashboard/whatsapp/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  Plus,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Bot,
  X,
  AlertTriangle
} from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface WhatsAppInstance {
  id: string
  org_id: string
  agent_id: string | null
  instance_name: string
  phone_number: string | null
  display_name: string | null
  status: 'connected' | 'disconnected' | 'qr_pending' | 'banned'
  connected_at: string | null
  created_at: string
}

interface Agent {
  id: string
  solution_slug: string
  status: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
  pt: {
    title: 'WhatsApp',
    subtitle: 'Conecte e gerencie seus números de WhatsApp para os agentes IA.',
    addNew: 'Conectar Número',
    noInstances: 'Nenhum número conectado',
    noInstancesDesc: 'Conecte seu WhatsApp para que os agentes IA possam atender seus leads automaticamente.',
    status: { connected: 'Conectado', disconnected: 'Desconectado', qr_pending: 'Aguardando QR', banned: 'Banido' },
    scanQR: 'Escaneie o QR Code',
    scanQRDesc: 'Abra o WhatsApp no celular → Menu (⋮) → Dispositivos conectados → Conectar dispositivo',
    refreshQR: 'Atualizar QR',
    disconnect: 'Desconectar',
    connecting: 'Conectando...',
    connectedSince: 'Conectado desde',
    phone: 'Número',
    instance: 'Instância',
    cancel: 'Cancelar',
    displayName: 'Nome do chip (opcional)',
    displayNamePlaceholder: 'Ex: Atendimento Imóveis SP',
    webhookHint: 'Configure o webhook da UAZAPI em',
    webhookHintLink: 'Configurações → Integrações',
    limitReached: 'Limite do plano atingido',
    limitReachedDesc: (max: number) => `Seu plano permite no máximo ${max} número${max > 1 ? 's' : ''}. Exclua um existente ou faça upgrade.`,
    instancesCount: (count: number, max: number) => `${count}/${max === -1 ? '∞' : max} números`,
    confirm: 'Criar e Conectar',
    creating: 'Criando...',
    delete: 'Excluir',
    deleting: 'Excluindo...',
    deleteConfirm: 'Tem certeza que deseja excluir esta instância? Isso irá desconectar o WhatsApp.',
    agent: 'Agente IA',
    noAgent: 'Sem agente (inativo)',
    agentLinked: 'SDR ativo',
    setupWebhook: 'Ativar SDR',
    webhookOk: 'SDR Ativado!',
    webhookFail: 'Erro ao ativar'
  },
  en: {
    title: 'WhatsApp',
    subtitle: 'Connect and manage your WhatsApp numbers for AI agents.',
    addNew: 'Connect Number',
    noInstances: 'No numbers connected',
    noInstancesDesc: 'Connect your WhatsApp so AI agents can automatically serve your leads.',
    status: { connected: 'Connected', disconnected: 'Disconnected', qr_pending: 'Waiting QR', banned: 'Banned' },
    scanQR: 'Scan QR Code',
    scanQRDesc: 'Open WhatsApp on your phone → Menu (⋮) → Linked Devices → Link a Device',
    refreshQR: 'Refresh QR',
    disconnect: 'Disconnect',
    connecting: 'Connecting...',
    connectedSince: 'Connected since',
    phone: 'Number',
    instance: 'Instance',
    cancel: 'Cancel',
    displayName: 'Chip name (optional)',
    displayNamePlaceholder: 'Ex: RE Sales Team',
    webhookHint: 'Set up the UAZAPI webhook in',
    webhookHintLink: 'Settings → Integrations',
    limitReached: 'Plan limit reached',
    limitReachedDesc: (max: number) => `Your plan allows up to ${max} number${max > 1 ? 's' : ''}. Delete an existing one or upgrade.`,
    instancesCount: (count: number, max: number) => `${count}/${max === -1 ? '∞' : max} numbers`,
    confirm: 'Create & Connect',
    creating: 'Creating...',
    delete: 'Delete',
    deleting: 'Deleting...',
    deleteConfirm: 'Are you sure you want to delete this instance? This will disconnect WhatsApp.',
    agent: 'AI Agent',
    noAgent: 'No agent (inactive)',
    agentLinked: 'SDR active',
    setupWebhook: 'Activate SDR',
    webhookOk: 'SDR Activated!',
    webhookFail: 'Activation error'
  },
  es: {
    title: 'WhatsApp',
    subtitle: 'Conecta y gestiona tus números de WhatsApp para los agentes IA.',
    addNew: 'Conectar Número',
    noInstances: 'Ningún número conectado',
    noInstancesDesc: 'Conecta tu WhatsApp para que los agentes IA puedan atender tus leads automáticamente.',
    status: { connected: 'Conectado', disconnected: 'Desconectado', qr_pending: 'Esperando QR', banned: 'Bloqueado' },
    scanQR: 'Escanea el QR Code',
    scanQRDesc: 'Abre WhatsApp en tu celular → Menú (⋮) → Dispositivos vinculados → Vincular dispositivo',
    refreshQR: 'Actualizar QR',
    disconnect: 'Desconectar',
    connecting: 'Conectando...',
    connectedSince: 'Conectado desde',
    phone: 'Número',
    instance: 'Instancia',
    cancel: 'Cancelar',
    displayName: 'Nombre del chip (opcional)',
    displayNamePlaceholder: 'Ej: Atención Inmuebles Santiago',
    webhookHint: 'Configura el webhook de UAZAPI en',
    webhookHintLink: 'Configuración → Integraciones',
    limitReached: 'Límite del plan alcanzado',
    limitReachedDesc: (max: number) => `Tu plan permite máximo ${max} número${max > 1 ? 's' : ''}. Elimina uno existente o haz upgrade.`,
    instancesCount: (count: number, max: number) => `${count}/${max === -1 ? '∞' : max} números`,
    confirm: 'Crear y Conectar',
    creating: 'Creando...',
    delete: 'Eliminar',
    deleting: 'Eliminando...',
    deleteConfirm: '¿Estás seguro de que deseas eliminar esta instancia? Esto desconectará WhatsApp.',
    agent: 'Agente IA',
    noAgent: 'Sin agente (inactivo)',
    agentLinked: 'SDR activo',
    setupWebhook: 'Activar SDR',
    webhookOk: 'SDR Activado!',
    webhookFail: 'Error al activar'
  }
}

type Lang = keyof typeof T

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function WhatsAppPage() {
  const { user } = useAuth()
  const orgId = useActiveOrgId()
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = T[lang]

  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [createError, setCreateError] = useState('')
  const [maxInstances, setMaxInstances] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [agents, setAgents] = useState<Agent[]>([])
  const [configuringWebhook, setConfiguringWebhook] = useState<string | null>(null)
  const [webhookResult, setWebhookResult] = useState<Record<string, 'success' | 'error'>>({})

  // QR state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [qrInstanceId, setQrInstanceId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrStatus, setQrStatus] = useState<string>('')

  // ─── Fetch instances ───
  const fetchInstances = useCallback(async () => {
    if (!orgId) return
    try {
      const res = await fetch(`/api/whatsapp/instances?org_id=${orgId}`)
      const data = await res.json()
      setInstances(data.instances || [])
      if (data.limit !== undefined) setMaxInstances(data.limit)
    } catch (err) {
      console.error('Error fetching instances:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchInstances() }, [fetchInstances])

  // ─── Fetch agents ───
  useEffect(() => {
    if (!orgId) return
    supabase
      .from('agents')
      .select('id, solution_slug, status')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .then(({ data }) => setAgents(data || []))
  }, [orgId])

  // ─── Link agent to instance ───
  const handleLinkAgent = async (instanceId: string, agentId: string) => {
    try {
      const res = await fetch('/api/whatsapp/instances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instanceId, agent_id: agentId || null })
      })
      const data = await res.json()
      if (data.instance) {
        setInstances(prev => prev.map(i => i.id === instanceId ? data.instance : i))
      }
    } catch (err) {
      console.error('Error linking agent:', err)
    }
  }

  // ─── Setup webhook ───
  const handleSetupWebhook = async (instanceId: string) => {
    setConfiguringWebhook(instanceId)
    try {
      const res = await fetch('/api/whatsapp/webhook-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instanceId })
      })
      const data = await res.json()
      setWebhookResult(prev => ({ ...prev, [instanceId]: data.success ? 'success' : 'error' }))
      setTimeout(() => setWebhookResult(prev => { const n = { ...prev }; delete n[instanceId]; return n }), 3000)
    } catch (err) {
      console.error('Error setting up webhook:', err)
      setWebhookResult(prev => ({ ...prev, [instanceId]: 'error' }))
    } finally {
      setConfiguringWebhook(null)
    }
  }

  // ─── Delete instance ───
  const handleDelete = async (instanceId: string) => {
    setConfirmDeleteId(null)
    setDeletingId(instanceId)
    try {
      await fetch('/api/whatsapp/instances', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instanceId })
      })
      setInstances(prev => prev.filter(i => i.id !== instanceId))
    } catch (err) {
      console.error('Error deleting instance:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const canCreateMore = maxInstances === -1 || instances.length < maxInstances

  // ─── Create instance ───
  const handleCreate = async () => {
    if (!orgId) return
    setCreateError('')
    setCreating(true)
    try {
      const res = await fetch('/api/whatsapp/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          display_name: displayName || null
        })
      })
      const data = await res.json()
      if (data.error) {
        setCreateError(data.detail || data.error)
        return
      }
      if (data.instance) {
        setInstances(prev => [data.instance, ...prev])
        setShowCreate(false)
        setDisplayName('')
        // Auto-abrir QR
        setQrInstanceId(data.instance.id)
        fetchQR(data.instance.id)
      }
    } catch (err) {
      console.error('Error creating instance:', err)
    } finally {
      setCreating(false)
    }
  }

  // ─── Fetch QR ───
  const fetchQR = async (instanceId: string) => {
    setQrLoading(true)
    setQrCode(null)
    setQrStatus('')
    try {
      const res = await fetch(`/api/whatsapp/qr?instance_id=${instanceId}`)
      const data = await res.json()

      if (data.status === 'connected') {
        setQrStatus('connected')
        setWebhookStatus(data.webhook_configured ? 'success' : 'error')
        // Fecha o modal após 2.5s
        setTimeout(() => {
          setQrInstanceId(null)
          setWebhookStatus('idle')
        }, 2500)
        fetchInstances() // refresh list
      } else if (data.status === 'qr_ready') {
        setQrCode(data.qr_code)
        setQrStatus('qr_ready')
      } else {
        setQrStatus(data.status || 'waiting')
      }
    } catch (err) {
      console.error('Error fetching QR:', err)
      setQrStatus('error')
    } finally {
      setQrLoading(false)
    }
  }

  // ─── Auto-refresh QR (polling a cada 5s enquanto QR aberto) ───
  useEffect(() => {
    if (!qrInstanceId) return

    const interval = setInterval(() => {
      fetchQR(qrInstanceId)
    }, 5000)

    return () => clearInterval(interval)
  }, [qrInstanceId])

  // ─── Disconnect ───
  const handleDisconnect = async (instanceId: string) => {
    try {
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_id: instanceId })
      })
      fetchInstances()
    } catch (err) {
      console.error('Error disconnecting:', err)
    }
  }

  // ─── Status badge ───
  const StatusBadge = ({ status }: { status: string }) => {
    const colorStyles: Record<string, React.CSSProperties> = {
      connected: { background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid var(--color-success)' },
      disconnected: { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' },
      qr_pending: { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' },
      banned: { background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }
    }
    const icons: Record<string, React.ReactNode> = {
      connected: <Wifi size={12} />,
      disconnected: <WifiOff size={12} />,
      qr_pending: <QrCode size={12} />,
      banned: <AlertCircle size={12} />
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={colorStyles[status] || colorStyles.disconnected}>
        {icons[status] || icons.disconnected}
        {t.status[status as keyof typeof t.status] || status}
      </span>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

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
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            {t.instancesCount(instances.length, maxInstances)}
          </span>
          <button
            onClick={() => canCreateMore ? setShowCreate(true) : null}
            disabled={!canCreateMore}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
            title={!canCreateMore ? t.limitReached : ''}
          >
            <Plus size={16} />
            {t.addNew}
          </button>
        </div>
      </div>

      {/* Aviso de limite atingido */}
      {!canCreateMore && instances.length > 0 && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <AlertCircle size={16} className="shrink-0" style={{ color: 'var(--color-accent)' }} />
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{t.limitReached}</span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {t.limitReachedDesc(maxInstances)}
            </p>
          </div>
        </div>
      )}

      {/* Dica do webhook — só mostra como fallback informativo */}
      {instances.length > 0 && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Wifi size={16} className="shrink-0" style={{ color: 'var(--color-indigo)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            O webhook do SDR é configurado automaticamente ao conectar. Caso precise da URL manualmente:{' '}
            <Link href="/dashboard/settings" className="hover:underline font-medium" style={{ color: 'var(--color-indigo)' }}>
              {t.webhookHintLink}
            </Link>
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL CRIAR INSTÂNCIA
          ═══════════════════════════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'var(--color-primary)', opacity: 0.15 }}>
                  <Smartphone size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {t.addNew}
                </h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg transition-colors">
                <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            <div className="space-y-4">
              {createError && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--color-error)', background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)' }}>
                  {createError}
                </div>
              )}

              {/* Nome do chip (opcional) */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {t.displayName}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={t.displayNamePlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  {creating ? (
                    <><Loader2 size={14} className="animate-spin" /> {t.creating}</>
                  ) : (
                    <><Smartphone size={14} /> {t.confirm}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL QR CODE
          ═══════════════════════════════════════════════════════════════════════ */}
      {qrInstanceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 text-center" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t.scanQR}
              </h2>
              <button
                onClick={() => { setQrInstanceId(null); setQrCode(null) }}
                className="p-1 rounded-lg transition-colors"
              >
                <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            {/* QR Display */}
            <div className="relative mx-auto w-64 h-64 rounded-2xl overflow-hidden flex items-center justify-center mb-4" style={{ background: '#ffffff' }}>
              {qrLoading && !qrCode ? (
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />
              ) : qrStatus === 'connected' ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
                  <span className="font-medium text-sm" style={{ color: 'var(--color-success)' }}>Conectado!</span>
                  {webhookStatus === 'success' && (
                    <span className="text-xs" style={{ color: 'var(--color-success)' }}>Webhook configurado automaticamente</span>
                  )}
                  {webhookStatus === 'error' && (
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>Webhook: configure manualmente nas Integrações</span>
                  )}
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  <QrCode size={48} />
                  <span className="text-xs">{t.connecting}</span>
                </div>
              )}
            </div>

            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t.scanQRDesc}
            </p>

            <button
              onClick={() => fetchQR(qrInstanceId)}
              disabled={qrLoading}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <RefreshCw size={14} className={qrLoading ? 'animate-spin' : ''} />
              {t.refreshQR}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          LISTA DE INSTÂNCIAS
          ═══════════════════════════════════════════════════════════════════════ */}
      {instances.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          <Smartphone size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {t.noInstances}
          </h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {t.noInstancesDesc}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={16} />
            {t.addNew}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map(instance => (
            <div
              key={instance.id}
              className="rounded-2xl p-5 transition-all"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Ícone */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: instance.status === 'connected'
                        ? 'rgba(16,185,129,0.1)'
                        : 'var(--color-bg-elevated)'
                    }}
                  >
                    <Smartphone
                      size={22}
                      style={{
                        color: instance.status === 'connected'
                          ? 'rgb(16,185,129)'
                          : 'var(--color-text-secondary)'
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {instance.display_name || instance.instance_name}
                      </h3>
                      <StatusBadge status={instance.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {instance.phone_number && (
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {t.phone}: +{instance.phone_number}
                        </span>
                      )}
                      {instance.connected_at && (
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {t.connectedSince} {new Date(instance.connected_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Agent select + Actions */}
                <div className="flex items-center gap-3">
                  {/* Agent select */}
                  <div className="flex items-center gap-1.5">
                    <Bot size={13} style={{ color: instance.agent_id ? 'rgb(16,185,129)' : 'var(--color-text-secondary)' }} />
                    <CustomSelect
                      value={instance.agent_id || ''}
                      onChange={(v) => handleLinkAgent(instance.id, v)}
                      options={[
                        { value: '', label: t.noAgent },
                        ...agents.map(ag => ({
                          value: ag.id,
                          label: ag.solution_slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                        })),
                      ]}
                    />
                  </div>

                  {/* Webhook setup button */}
                  {instance.status === 'connected' && (
                    <button
                      onClick={() => handleSetupWebhook(instance.id)}
                      disabled={configuringWebhook === instance.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{
                        background: webhookResult[instance.id] === 'success' ? 'rgba(16,185,129,0.15)' : webhookResult[instance.id] === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.1)',
                        color: webhookResult[instance.id] === 'success' ? 'rgb(16,185,129)' : webhookResult[instance.id] === 'error' ? 'rgb(239,68,68)' : 'rgb(99,102,241)',
                        border: `1px solid ${webhookResult[instance.id] === 'success' ? 'rgba(16,185,129,0.3)' : webhookResult[instance.id] === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.2)'}`
                      }}
                    >
                      {configuringWebhook === instance.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : webhookResult[instance.id] === 'success' ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Wifi size={13} />
                      )}
                      {webhookResult[instance.id] === 'success' ? t.webhookOk : webhookResult[instance.id] === 'error' ? t.webhookFail : t.setupWebhook}
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                  {instance.status !== 'connected' && (
                    <button
                      onClick={() => { setQrInstanceId(instance.id); fetchQR(instance.id) }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'var(--color-primary)', color: '#fff' }}
                    >
                      <QrCode size={13} />
                      QR Code
                    </button>
                  )}
                  {instance.status === 'connected' && (
                    <button
                      onClick={() => handleDisconnect(instance.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      <WifiOff size={13} />
                      {t.disconnect}
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteId(instance.id)}
                    disabled={deletingId === instance.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {deletingId === instance.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    {deletingId === instance.id ? t.deleting : t.delete}
                  </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDeleteId && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }} onClick={() => setConfirmDeleteId(null)}>
          <div className="rounded-2xl w-full max-w-sm p-6 space-y-4" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'var(--color-error-subtle)' }}>
                <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.delete}</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.deleteConfirm}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
                style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}
              >
                {t.cancel || 'Cancelar'}
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
                style={{ background: 'var(--color-error)', color: 'var(--color-text-primary)' }}
              >
                <Trash2 size={14} />
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
