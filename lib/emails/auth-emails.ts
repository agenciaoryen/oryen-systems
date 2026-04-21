// lib/emails/auth-emails.ts
// ═══════════════════════════════════════════════════════════════════════════════
// E-mails de autenticação em pt / en / es
// Templates visuais seguem o padrão do welcome-email (dark + gradient + ORYEN)
// ═══════════════════════════════════════════════════════════════════════════════

import { Resend } from 'resend'

export type EmailLang = 'pt' | 'en' | 'es'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not configured')
    _resend = new Resend(key)
  }
  return _resend
}

const DOMAIN = process.env.RESEND_DOMAIN || 'mail.oryen.agency'
const FROM = `Oryen <noreply@${DOMAIN}>`

// ═══════════════════════════════════════════════════════════════════════════════
// BASE STYLES + WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

function baseHtml(opts: { title: string; bodyHtml: string; ctaUrl: string; ctaLabel: string; footerNote: string }): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #C5CDD5; background-color: #0B0E13; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #0F1218 0%, #161B24 100%); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center; }
    .logo { font-family: 'Orbitron', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 6px; background: linear-gradient(180deg, #BFCAD3 0%, #7C8A96 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #BFCAD3; }
    .content { background: #12161D; border-left: 1px solid rgba(255,255,255,0.06); border-right: 1px solid rgba(255,255,255,0.06); padding: 40px 32px; }
    .content h2 { color: #E8ECF0; font-size: 22px; margin: 0 0 16px 0; font-weight: 700; }
    .content p { color: #8A95A3; font-size: 15px; margin: 0 0 16px 0; line-height: 1.7; }
    .cta-wrapper { text-align: center; margin: 32px 0 12px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #5A7AE6, #7C5AE6); color: #FFFFFF !important; padding: 14px 40px; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.02em; }
    .link-fallback { word-break: break-all; font-size: 12px; color: #5A7AE6; margin-top: 24px; }
    .footer { background: #0D1017; border: 1px solid rgba(255,255,255,0.06); border-top: none; border-radius: 0 0 16px 16px; padding: 24px 32px; text-align: center; }
    .footer p { color: #555E6A; font-size: 12px; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">ORYEN</div>
      <p style="color: #6B7685; font-size: 13px; margin: 8px 0 0 0; letter-spacing: 1px;">AI-Powered Real Estate CRM</p>
    </div>
    <div class="content">
      ${opts.bodyHtml}

      <div class="cta-wrapper">
        <a href="${opts.ctaUrl}" class="cta-btn">${opts.ctaLabel}</a>
      </div>

      <p class="link-fallback">${opts.ctaUrl}</p>

      <p style="text-align: center; color: #6B7685; font-size: 12px; margin-top: 24px;">
        ${opts.footerNote}
      </p>
    </div>
    <div class="footer">
      <p>Oryen — Intelligent Real Estate Platform</p>
    </div>
  </div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRMATION EMAIL (signup)
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIRMATION_TRANSLATIONS: Record<EmailLang, {
  subject: string
  greeting: string
  heading: string
  body: string
  cta: string
  footer: string
}> = {
  pt: {
    subject: 'Confirme seu e-mail — Oryen',
    greeting: 'Olá',
    heading: 'Confirme seu e-mail',
    body: 'Bem-vindo à Oryen! Para ativar sua conta e começar a usar a plataforma, clique no botão abaixo.',
    cta: 'Confirmar e-mail',
    footer: 'Se você não criou uma conta na Oryen, pode ignorar este e-mail com segurança.',
  },
  en: {
    subject: 'Confirm your email — Oryen',
    greeting: 'Hello',
    heading: 'Confirm your email',
    body: 'Welcome to Oryen! To activate your account and start using the platform, click the button below.',
    cta: 'Confirm email',
    footer: 'If you didn\'t create an Oryen account, you can safely ignore this email.',
  },
  es: {
    subject: 'Confirma tu correo — Oryen',
    greeting: 'Hola',
    heading: 'Confirma tu correo',
    body: '¡Bienvenido a Oryen! Para activar tu cuenta y comenzar a usar la plataforma, haz clic en el botón de abajo.',
    cta: 'Confirmar correo',
    footer: 'Si no creaste una cuenta en Oryen, puedes ignorar este correo con seguridad.',
  },
}

export async function sendConfirmationEmail(params: {
  to: string
  name: string
  confirmationUrl: string
  language: EmailLang
}) {
  const t = CONFIRMATION_TRANSLATIONS[params.language] || CONFIRMATION_TRANSLATIONS.pt
  const firstName = (params.name || '').split(' ')[0] || ''

  const bodyHtml = `
    <h2>${t.heading}</h2>
    <p>${firstName ? `${t.greeting}, <strong style="color:#C5CDD5">${firstName}</strong>!` : `${t.greeting}!`}</p>
    <p>${t.body}</p>
  `

  const html = baseHtml({
    title: t.subject,
    bodyHtml,
    ctaUrl: params.confirmationUrl,
    ctaLabel: t.cta,
    footerNote: t.footer,
  })

  return getResend().emails.send({
    from: FROM,
    to: [params.to],
    subject: t.subject,
    html,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

const RESET_TRANSLATIONS: Record<EmailLang, {
  subject: string
  heading: string
  body: string
  cta: string
  footer: string
}> = {
  pt: {
    subject: 'Redefinir sua senha — Oryen',
    heading: 'Redefinir sua senha',
    body: 'Recebemos uma solicitação para redefinir a senha da sua conta Oryen. Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.',
    cta: 'Redefinir senha',
    footer: 'Se você não solicitou esta alteração, pode ignorar este e-mail — sua senha continua a mesma.',
  },
  en: {
    subject: 'Reset your password — Oryen',
    heading: 'Reset your password',
    body: 'We received a request to reset the password for your Oryen account. Click the button below to create a new password. This link expires in 1 hour.',
    cta: 'Reset password',
    footer: 'If you didn\'t request this change, you can ignore this email — your password will remain the same.',
  },
  es: {
    subject: 'Restablecer tu contraseña — Oryen',
    heading: 'Restablecer tu contraseña',
    body: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta Oryen. Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace expira en 1 hora.',
    cta: 'Restablecer contraseña',
    footer: 'Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña seguirá siendo la misma.',
  },
}

export async function sendPasswordResetEmail(params: {
  to: string
  recoveryUrl: string
  language: EmailLang
}) {
  const t = RESET_TRANSLATIONS[params.language] || RESET_TRANSLATIONS.pt

  const bodyHtml = `
    <h2>${t.heading}</h2>
    <p>${t.body}</p>
  `

  const html = baseHtml({
    title: t.subject,
    bodyHtml,
    ctaUrl: params.recoveryUrl,
    ctaLabel: t.cta,
    footerNote: t.footer,
  })

  return getResend().emails.send({
    from: FROM,
    to: [params.to],
    subject: t.subject,
    html,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZE LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function normalizeLang(raw: unknown): EmailLang {
  const l = String(raw || 'pt').toLowerCase()
  if (l === 'en' || l === 'es') return l
  return 'pt'
}
