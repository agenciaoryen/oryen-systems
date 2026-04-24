// lib/email/sender.ts
// Wrapper do Resend pra envio de emails de cold outbound.
// Configura reply-to pra capturar respostas.

import { Resend } from 'resend'

interface SendEmailInput {
  to: string
  subject: string
  bodyText: string
  fromName: string       // "Letie Oryen"
  replyTo?: string       // email pra receber respostas
}

export interface SendEmailResult {
  id: string             // resend message id
}

export async function sendColdEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const domain = process.env.RESEND_DOMAIN
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada')
  if (!domain) throw new Error('RESEND_DOMAIN não configurada')

  const resend = new Resend(apiKey)

  // Converte texto em HTML minimalista (preserva parágrafos e quebras).
  // Importante: email simples sem tracking pixel pra evitar spam score alto.
  const bodyHtml = input.bodyText
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 12px;line-height:1.55;color:#1a1a1a">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

  const fromAddress = `${input.fromName} <bdr@${domain}>`

  const res = await resend.emails.send({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    text: input.bodyText,
    html: bodyHtml,
    replyTo: input.replyTo,
    tags: [
      { name: 'source', value: 'oryen_bdr_email' },
    ],
  })

  if (res.error) {
    throw new Error(`Resend: ${res.error.message || 'erro desconhecido'}`)
  }
  if (!res.data?.id) {
    throw new Error('Resend não retornou id da mensagem')
  }

  return { id: res.data.id }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
