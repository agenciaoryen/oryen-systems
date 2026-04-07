// app/dashboard/whatsapp/components/EmbeddedSignup.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Embedded Signup — Conectar WhatsApp Oficial (Meta Cloud API)
//
// Carrega Facebook SDK → FB.login() com config_id → envia auth_code pro backend
// ═══════════════════════════════════════════════════════════════════════════════

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  orgId: string
  onSuccess: (instance: any) => void
  onClose: () => void
  lang?: 'pt' | 'en' | 'es'
}

const T = {
  pt: {
    title: 'Conectar WhatsApp Oficial',
    description: 'Conecte seu número via API Oficial do WhatsApp (Meta). Seu WhatsApp no celular continua funcionando normalmente.',
    benefits: [
      'API oficial da Meta — sem risco de banimento',
      'Co-existente: use o celular + automação ao mesmo tempo',
      'Templates pré-aprovados para mensagens fora da janela 24h',
    ],
    connect: 'Conectar com Facebook',
    connecting: 'Conectando...',
    success: 'WhatsApp conectado com sucesso!',
    error: 'Erro ao conectar',
    cancel: 'Cancelar',
    sdkLoading: 'Carregando Facebook SDK...',
    note: 'Você será redirecionado para autorizar o acesso ao WhatsApp Business.',
  },
  en: {
    title: 'Connect Official WhatsApp',
    description: 'Connect your number via Official WhatsApp API (Meta). Your WhatsApp on your phone continues working normally.',
    benefits: [
      'Official Meta API — no ban risk',
      'Co-existing: use phone + automation at the same time',
      'Pre-approved templates for messages outside 24h window',
    ],
    connect: 'Connect with Facebook',
    connecting: 'Connecting...',
    success: 'WhatsApp connected successfully!',
    error: 'Error connecting',
    cancel: 'Cancel',
    sdkLoading: 'Loading Facebook SDK...',
    note: 'You will be redirected to authorize WhatsApp Business access.',
  },
  es: {
    title: 'Conectar WhatsApp Oficial',
    description: 'Conecta tu número vía API Oficial de WhatsApp (Meta). Tu WhatsApp en el celular sigue funcionando normalmente.',
    benefits: [
      'API oficial de Meta — sin riesgo de baneo',
      'Co-existente: usa el celular + automatización al mismo tiempo',
      'Templates pre-aprobados para mensajes fuera de la ventana 24h',
    ],
    connect: 'Conectar con Facebook',
    connecting: 'Conectando...',
    success: 'WhatsApp conectado con éxito!',
    error: 'Error al conectar',
    cancel: 'Cancelar',
    sdkLoading: 'Cargando Facebook SDK...',
    note: 'Serás redirigido para autorizar el acceso a WhatsApp Business.',
  },
}

export default function EmbeddedSignup({ orgId, onSuccess, onClose, lang = 'pt' }: Props) {
  const t = T[lang]
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // ─── Carregar Facebook SDK ───
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).FB) {
      setSdkLoaded(true)
      return
    }

    // Configurar callback
    ;(window as any).fbAsyncInit = function () {
      ;(window as any).FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        cookie: true,
        xfbml: false,
        version: process.env.NEXT_PUBLIC_CLOUD_API_VERSION || 'v21.0',
      })
      setSdkLoaded(true)
    }

    // Carregar script
    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script')
      js.id = 'facebook-jssdk'
      js.src = 'https://connect.facebook.net/en_US/sdk.js'
      js.async = true
      js.defer = true
      document.head.appendChild(js)
    }
  }, [])

  // ─── Facebook Login → Embedded Signup ───
  const handleConnect = useCallback(() => {
    const FB = (window as any).FB
    if (!FB) {
      console.error('[EmbeddedSignup] FB SDK not loaded')
      setStatus('error')
      setErrorMessage('Facebook SDK não carregou. Recarregue a página.')
      return
    }

    const configId = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID
    console.log('[EmbeddedSignup] config_id:', configId)
    console.log('[EmbeddedSignup] app_id:', process.env.NEXT_PUBLIC_META_APP_ID)

    if (!configId) {
      setStatus('error')
      setErrorMessage('Config ID não configurado. Verifique as variáveis de ambiente.')
      return
    }

    setConnecting(true)
    setStatus('idle')
    setErrorMessage('')

    try {
      FB.login(
        async (response: any) => {
          console.log('[EmbeddedSignup] FB.login response:', JSON.stringify(response))

          if (response.authResponse?.code) {
            // Enviar auth_code pro backend
            try {
              const res = await fetch('/api/whatsapp/cloud/embedded-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  auth_code: response.authResponse.code,
                  org_id: orgId,
                }),
              })
              const data = await res.json()

              if (data.success) {
                setStatus('success')
                setTimeout(() => onSuccess(data.instance), 1500)
              } else {
                setStatus('error')
                setErrorMessage(data.details || data.error || 'Unknown error')
              }
            } catch (err: any) {
              setStatus('error')
              setErrorMessage(err.message)
            }
          } else {
            // User cancelled or error
            console.warn('[EmbeddedSignup] No auth code. Response:', response)
            setStatus('error')
            setErrorMessage(response.status === 'unknown' ? 'Login cancelado ou popup bloqueado' : 'Login cancelled')
          }
          setConnecting(false)
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            feature: 'whatsapp_embedded_signup',
            sessionInfoVersion: 3,
          },
        }
      )
    } catch (err: any) {
      console.error('[EmbeddedSignup] FB.login threw:', err)
      setStatus('error')
      setErrorMessage(`Erro ao abrir popup: ${err.message}`)
      setConnecting(false)
    }
  }, [orgId, onSuccess])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }}>
      <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(37,211,102,0.1)' }}>
            <Shield size={22} style={{ color: '#25D366' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t.title}
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t.description}
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-2 mb-5">
          {t.benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: '#25D366' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{b}</span>
            </div>
          ))}
        </div>

        {/* Status messages */}
        {status === 'success' && (
          <div className="flex items-center gap-2.5 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={16} style={{ color: 'rgb(16,185,129)' }} />
            <span className="text-sm font-medium" style={{ color: 'rgb(16,185,129)' }}>{t.success}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2.5 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)' }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-error)' }} />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>{t.error}</span>
              {errorMessage && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{errorMessage}</p>}
            </div>
          </div>
        )}

        {/* Note */}
        <p className="text-xs mb-5" style={{ color: 'var(--color-text-tertiary)' }}>
          {t.note}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConnect}
            disabled={!sdkLoaded || connecting || status === 'success'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#1877F2', color: '#fff' }}
          >
            {!sdkLoaded ? (
              <><Loader2 size={14} className="animate-spin" /> {t.sdkLoading}</>
            ) : connecting ? (
              <><Loader2 size={14} className="animate-spin" /> {t.connecting}</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                {t.connect}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
