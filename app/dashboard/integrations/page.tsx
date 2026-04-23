// app/dashboard/integrations/page.tsx
// Página principal do módulo de Integrações.
// Lista os providers disponíveis e permite conectar/desconectar.
// Fase 1 traz só Google Calendar — fica extensível pra Outlook, Apple, etc.
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import {
  Plug,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

type Lang = 'pt' | 'en' | 'es'

const T = {
  pt: {
    title: 'Integrações',
    subtitle: 'Conecte serviços externos pra deixar tudo em sincronia.',
    googleCalendarTitle: 'Google Calendar',
    googleCalendarDesc: 'Sincronize sua agenda — eventos criados pela Oryen aparecem no seu Google Agenda, e vice-versa. O agente SDR respeita os compromissos do seu calendário ao agendar visitas.',
    syncRangeNote: 'Sincronizamos os próximos 60 dias da sua agenda primária.',
    connect: 'Conectar',
    connecting: 'Abrindo Google...',
    disconnect: 'Desconectar',
    disconnecting: 'Desconectando...',
    connectedAs: 'Conectado como',
    lastSync: 'Última sincronização',
    never: 'nunca',
    neverSyncedHint: 'Será sincronizado na próxima vez que você abrir a Agenda.',
    errorBadge: 'Erro',
    connectedBadge: 'Conectado',
    disconnectConfirmTitle: 'Desconectar Google Calendar?',
    disconnectConfirmDesc: 'Os eventos que vieram do Google serão removidos da Oryen. Eventos criados aqui serão mantidos (mas param de sincronizar com o Google).',
    cancelBtn: 'Cancelar',
    confirmDisconnect: 'Sim, desconectar',
    toastConnected: 'Google Calendar conectado!',
    toastDisconnected: 'Google Calendar desconectado',
    toastConnectError: 'Erro ao conectar',
    toastDisconnectError: 'Erro ao desconectar',
    comingSoon: 'Em breve',
    outlookTitle: 'Outlook Calendar',
    outlookDesc: 'Sincronização com Microsoft Outlook — em breve.',
    appleTitle: 'Apple Calendar',
    appleDesc: 'Sincronização com iCloud Calendar — em breve.',
  },
  en: {
    title: 'Integrations',
    subtitle: 'Connect external services to keep everything in sync.',
    googleCalendarTitle: 'Google Calendar',
    googleCalendarDesc: 'Sync your calendar — events created in Oryen show up in Google Calendar, and vice versa. The SDR agent respects your calendar when scheduling.',
    syncRangeNote: 'We sync the next 60 days of your primary calendar.',
    connect: 'Connect',
    connecting: 'Opening Google...',
    disconnect: 'Disconnect',
    disconnecting: 'Disconnecting...',
    connectedAs: 'Connected as',
    lastSync: 'Last sync',
    never: 'never',
    neverSyncedHint: 'Will sync next time you open the Calendar.',
    errorBadge: 'Error',
    connectedBadge: 'Connected',
    disconnectConfirmTitle: 'Disconnect Google Calendar?',
    disconnectConfirmDesc: 'Events imported from Google will be removed from Oryen. Events created here will be kept (but stop syncing with Google).',
    cancelBtn: 'Cancel',
    confirmDisconnect: 'Yes, disconnect',
    toastConnected: 'Google Calendar connected!',
    toastDisconnected: 'Google Calendar disconnected',
    toastConnectError: 'Error connecting',
    toastDisconnectError: 'Error disconnecting',
    comingSoon: 'Coming soon',
    outlookTitle: 'Outlook Calendar',
    outlookDesc: 'Microsoft Outlook sync — coming soon.',
    appleTitle: 'Apple Calendar',
    appleDesc: 'iCloud Calendar sync — coming soon.',
  },
  es: {
    title: 'Integraciones',
    subtitle: 'Conecta servicios externos para mantener todo sincronizado.',
    googleCalendarTitle: 'Google Calendar',
    googleCalendarDesc: 'Sincroniza tu agenda — los eventos creados en Oryen aparecen en Google Calendar, y viceversa. El agente SDR respeta tu calendario al agendar.',
    syncRangeNote: 'Sincronizamos los próximos 60 días de tu calendario principal.',
    connect: 'Conectar',
    connecting: 'Abriendo Google...',
    disconnect: 'Desconectar',
    disconnecting: 'Desconectando...',
    connectedAs: 'Conectado como',
    lastSync: 'Última sincronización',
    never: 'nunca',
    neverSyncedHint: 'Se sincronizará la próxima vez que abras el Calendario.',
    errorBadge: 'Error',
    connectedBadge: 'Conectado',
    disconnectConfirmTitle: '¿Desconectar Google Calendar?',
    disconnectConfirmDesc: 'Los eventos importados de Google serán eliminados de Oryen. Los eventos creados aquí se mantendrán (pero dejarán de sincronizarse con Google).',
    cancelBtn: 'Cancelar',
    confirmDisconnect: 'Sí, desconectar',
    toastConnected: '¡Google Calendar conectado!',
    toastDisconnected: 'Google Calendar desconectado',
    toastConnectError: 'Error al conectar',
    toastDisconnectError: 'Error al desconectar',
    comingSoon: 'Próximamente',
    outlookTitle: 'Outlook Calendar',
    outlookDesc: 'Sincronización con Microsoft Outlook — próximamente.',
    appleTitle: 'Apple Calendar',
    appleDesc: 'Sincronización con iCloud Calendar — próximamente.',
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface IntegrationRow {
  id: string
  provider: string
  status: 'active' | 'error' | 'disconnected'
  provider_account_email: string | null
  provider_account_name: string | null
  last_sync_at: string | null
  last_sync_error: string | null
  created_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export default function IntegrationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = T[lang]

  const [integrations, setIntegrations] = useState<IntegrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null) // provider em operação
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const googleIntegration = integrations.find(i => i.provider === 'google_calendar')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/status')
      const data = await res.json()
      setIntegrations(data.integrations || [])
    } catch (err) {
      console.error('erro ao carregar integrações:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Trata o retorno do callback OAuth (query strings)
  useEffect(() => {
    const connected = searchParams.get('gcal_connected')
    const error = searchParams.get('gcal_error')
    if (connected) {
      toast.success(t.toastConnected)
      // Limpa os query params
      router.replace('/dashboard/integrations')
      refresh()
    } else if (error) {
      const msg = error === 'access_denied'
        ? 'Você cancelou a autorização.'
        : `${t.toastConnectError}: ${error}`
      toast.error(msg)
      router.replace('/dashboard/integrations')
    }
  }, [searchParams, router, refresh, t])

  const handleConnect = () => {
    setBusy('google_calendar')
    // Redireciona pra route server que monta state e manda pro Google
    window.location.href = '/api/integrations/google-calendar/connect'
  }

  const handleDisconnect = async () => {
    setBusy('google_calendar')
    try {
      const res = await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('disconnect failed')
      toast.success(t.toastDisconnected)
      setConfirmDisconnect(false)
      await refresh()
    } catch (err: any) {
      toast.error(t.toastDisconnectError)
    } finally {
      setBusy(null)
    }
  }

  const formatLastSync = (iso: string | null): string => {
    if (!iso) return t.never
    const d = new Date(iso)
    return d.toLocaleString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-[calc(100vh-100px)]" style={{ background: 'var(--color-bg-surface)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
            <Plug style={{ color: 'var(--color-primary)' }} />
            {t.title}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.subtitle}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">

            {/* ═══ Google Calendar ═══ */}
            <IntegrationCard
              icon={<GoogleCalendarIcon />}
              title={t.googleCalendarTitle}
              description={t.googleCalendarDesc}
              extraNote={t.syncRangeNote}
              connected={!!googleIntegration}
              statusError={googleIntegration?.status === 'error'}
              connectedEmail={googleIntegration?.provider_account_email || null}
              lastSync={googleIntegration?.last_sync_at || null}
              lastSyncLabel={t.lastSync}
              connectedBadge={t.connectedBadge}
              errorBadge={t.errorBadge}
              connectedAs={t.connectedAs}
              neverLabel={t.never}
              neverHint={t.neverSyncedHint}
              formatLastSync={formatLastSync}
              primaryAction={{
                label: googleIntegration ? t.disconnect : t.connect,
                onClick: googleIntegration ? () => setConfirmDisconnect(true) : handleConnect,
                loading: busy === 'google_calendar',
                loadingLabel: googleIntegration ? t.disconnecting : t.connecting,
                variant: googleIntegration ? 'danger' : 'primary',
              }}
            />

            {/* ═══ Outlook (em breve) ═══ */}
            <IntegrationCard
              icon={<OutlookIcon />}
              title={t.outlookTitle}
              description={t.outlookDesc}
              connected={false}
              disabled
              comingSoonLabel={t.comingSoon}
              primaryAction={{ label: t.comingSoon, onClick: () => {}, variant: 'disabled' }}
              connectedBadge=""
              errorBadge=""
              connectedAs=""
              lastSyncLabel=""
              neverLabel=""
              neverHint=""
              formatLastSync={() => ''}
            />

            {/* ═══ Apple (em breve) ═══ */}
            <IntegrationCard
              icon={<AppleIcon />}
              title={t.appleTitle}
              description={t.appleDesc}
              connected={false}
              disabled
              comingSoonLabel={t.comingSoon}
              primaryAction={{ label: t.comingSoon, onClick: () => {}, variant: 'disabled' }}
              connectedBadge=""
              errorBadge=""
              connectedAs=""
              lastSyncLabel=""
              neverLabel=""
              neverHint=""
              formatLastSync={() => ''}
            />

          </div>
        )}
      </div>

      {/* Confirm disconnect modal */}
      {confirmDisconnect && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: 'var(--color-bg-overlay)' }}
          onClick={() => setConfirmDisconnect(false)}
        >
          <div
            className="rounded-2xl w-full max-w-sm p-6 space-y-4"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'var(--color-error-subtle)' }}>
                <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
              </div>
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {t.disconnectConfirmTitle}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {t.disconnectConfirmDesc}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDisconnect(false)}
                disabled={busy !== null}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}
              >
                {t.cancelBtn}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={busy !== null}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                style={{ background: 'var(--color-error)', color: '#fff' }}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                {t.confirmDisconnect}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Card de integração
// ═══════════════════════════════════════════════════════════════════════════════

interface CardProps {
  icon: React.ReactNode
  title: string
  description: string
  extraNote?: string
  connected: boolean
  statusError?: boolean
  connectedEmail?: string | null
  lastSync?: string | null
  disabled?: boolean
  comingSoonLabel?: string
  connectedBadge: string
  errorBadge: string
  connectedAs: string
  lastSyncLabel: string
  neverLabel: string
  neverHint: string
  formatLastSync: (iso: string | null) => string
  primaryAction: {
    label: string
    onClick: () => void
    loading?: boolean
    loadingLabel?: string
    variant: 'primary' | 'danger' | 'disabled'
  }
}

function IntegrationCard(props: CardProps) {
  const {
    icon, title, description, extraNote, connected, statusError, connectedEmail, lastSync,
    disabled, comingSoonLabel, connectedBadge, errorBadge, connectedAs, lastSyncLabel,
    neverLabel, neverHint, formatLastSync, primaryAction,
  } = props

  const btnStyle = primaryAction.variant === 'primary'
    ? { background: 'var(--color-primary)', color: '#fff' }
    : primaryAction.variant === 'danger'
      ? { background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid rgba(217, 84, 84, 0.3)' }
      : { background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'not-allowed' }

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 transition-all"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h3>
            {connected && !statusError && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)' }}>
                <CheckCircle2 size={10} />
                {connectedBadge}
              </span>
            )}
            {connected && statusError && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)' }}>
                <AlertCircle size={10} />
                {errorBadge}
              </span>
            )}
            {disabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                {comingSoonLabel}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {description}
          </p>

          {extraNote && !connected && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {extraNote}
            </p>
          )}

          {connected && connectedEmail && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>
                <strong style={{ color: 'var(--color-text-secondary)' }}>{connectedAs}:</strong> {connectedEmail}
              </span>
              <span>
                <strong style={{ color: 'var(--color-text-secondary)' }}>{lastSyncLabel}:</strong>{' '}
                {lastSync ? formatLastSync(lastSync) : neverLabel}
              </span>
            </div>
          )}

          {connected && !lastSync && (
            <p className="mt-1 text-[11px] italic" style={{ color: 'var(--color-text-muted)' }}>
              {neverHint}
            </p>
          )}
        </div>

        <button
          onClick={primaryAction.onClick}
          disabled={disabled || primaryAction.loading}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-60"
          style={btnStyle}
        >
          {primaryAction.loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {primaryAction.loadingLabel}
            </>
          ) : (
            <>
              {primaryAction.variant === 'primary' && <ExternalLink size={14} />}
              {primaryAction.label}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÍCONES SVG
// ═══════════════════════════════════════════════════════════════════════════════

function GoogleCalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="9" width="36" height="33" rx="3" fill="#FFFFFF" stroke="#E1E5EA"/>
      <rect x="6" y="9" width="36" height="7" fill="#4285F4"/>
      <text x="24" y="34" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" textAnchor="middle" fill="#4285F4">31</text>
      <rect x="14" y="5" width="2.5" height="8" rx="1" fill="#80868B"/>
      <rect x="31.5" y="5" width="2.5" height="8" rx="1" fill="#80868B"/>
    </svg>
  )
}

function OutlookIcon() {
  return <Calendar size={22} style={{ color: '#0078D4' }} />
}

function AppleIcon() {
  return <Calendar size={22} style={{ color: '#FF3B30' }} />
}
