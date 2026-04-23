// lib/integrations/token-manager.ts
// Gerencia o ciclo de vida dos tokens OAuth:
//   - busca a integração no banco
//   - desencripta
//   - se access_token expirou → usa refresh_token, salva o novo, retorna
// Nunca retorna tokens pro cliente. Uso estrito em routes/server-side.

import { supabaseAdmin } from '@/lib/api-auth'
import { decryptString, encryptString } from './crypto'
import { refreshAccessToken } from './google-calendar'

export interface IntegrationRecord {
  id: string
  org_id: string
  user_id: string
  provider: string
  status: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  scopes: string[] | null
  provider_account_email: string | null
  provider_account_name: string | null
  metadata: Record<string, any>
  last_sync_at: string | null
  last_sync_error: string | null
}

export interface ActiveToken {
  integrationId: string
  accessToken: string
  email: string | null
  expiresAt: Date
}

/**
 * Busca a integração Google Calendar do usuário.
 * Retorna null se não existe ou está desconectada.
 */
export async function getGoogleCalendarIntegration(userId: string): Promise<IntegrationRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    console.error('[token-manager] erro ao buscar integração:', error.message)
    return null
  }
  return data || null
}

/**
 * Retorna um access_token válido pra usar com a Google API.
 * Refresh automático se o atual expirou (ou falta menos de 60s).
 * Salva o novo access_token no banco quando renova.
 */
export async function getValidAccessToken(userId: string): Promise<ActiveToken | null> {
  const integration = await getGoogleCalendarIntegration(userId)
  if (!integration || !integration.access_token) return null

  const accessToken = decryptString(integration.access_token)
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : new Date(0)
  const nowPlusBuffer = new Date(Date.now() + 60 * 1000) // 60s de folga

  // Ainda válido
  if (expiresAt > nowPlusBuffer) {
    return {
      integrationId: integration.id,
      accessToken,
      email: integration.provider_account_email,
      expiresAt,
    }
  }

  // Expirou — refresh
  if (!integration.refresh_token) {
    await markIntegrationError(integration.id, 'access_token expirou e refresh_token ausente')
    return null
  }

  try {
    const refreshToken = decryptString(integration.refresh_token)
    const tokens = await refreshAccessToken(refreshToken)
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await supabaseAdmin
      .from('integrations')
      .update({
        access_token: encryptString(tokens.access_token),
        token_expires_at: newExpiresAt.toISOString(),
        // Se o Google mandou um refresh_token novo (raro), atualiza
        ...(tokens.refresh_token ? { refresh_token: encryptString(tokens.refresh_token) } : {}),
        last_sync_error: null,
      })
      .eq('id', integration.id)

    return {
      integrationId: integration.id,
      accessToken: tokens.access_token,
      email: integration.provider_account_email,
      expiresAt: newExpiresAt,
    }
  } catch (err: any) {
    await markIntegrationError(integration.id, `refresh falhou: ${err.message}`)
    return null
  }
}

/**
 * Marca a integração com erro — não deleta o registro, apenas sinaliza.
 * Útil pra UI mostrar "Reconectar" pro usuário.
 */
export async function markIntegrationError(integrationId: string, message: string): Promise<void> {
  await supabaseAdmin
    .from('integrations')
    .update({ status: 'error', last_sync_error: message })
    .eq('id', integrationId)
}
