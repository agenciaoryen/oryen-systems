// app/dashboard/whatsapp/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import {
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Bot,
  X
} from 'lucide-react'

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
    confirm: 'Criar e Conectar',
    creating: 'Criando...',
    delete: 'Excluir',
    deleteConfirm: 'Tem certeza que deseja excluir esta instância?'
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
    confirm: 'Create & Connect',
    creating: 'Creating...',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this instance?'
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
    confirm: 'Crear y Conectar',
    creating: 'Creando...',
    delete: 'Eliminar',
    deleteConfirm: '¿Estás seguro de que deseas eliminar esta instancia?'
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

  // QR state
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
    } catch (err) {
      console.error('Error fetching instances:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchInstances() }, [fetchInstances])

  // ─── Create instance ───
  const handleCreate = async () => {
    if (!orgId) return
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
        setQrInstanceId(null)
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
    const colors: Record<string, string> = {
      connected: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      disconnected: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
      qr_pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      banned: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    }
    const icons: Record<string, React.ReactNode> = {
      connected: <Wifi size={12} />,
      disconnected: <WifiOff size={12} />,
      qr_pending: <QrCode size={12} />,
      banned: <AlertCircle size={12} />
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.disconnected}`}>
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
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} />
          {t.addNew}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL CRIAR INSTÂNCIA
          ═══════════════════════════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            <div className="space-y-4">
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 text-center" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t.scanQR}
              </h2>
              <button
                onClick={() => { setQrInstanceId(null); setQrCode(null) }}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            {/* QR Display */}
            <div className="relative mx-auto w-64 h-64 rounded-2xl overflow-hidden flex items-center justify-center mb-4" style={{ background: '#ffffff' }}>
              {qrLoading && !qrCode ? (
                <Loader2 size={32} className="animate-spin text-gray-400" />
              ) : qrStatus === 'connected' ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                  <span className="text-emerald-600 font-medium text-sm">Conectado!</span>
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-rose-500/10 hover:text-rose-400"
                      style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      <WifiOff size={13} />
                      {t.disconnect}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
