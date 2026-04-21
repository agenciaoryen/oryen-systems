import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { email, name, orgName } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    const userName = name || 'there'
    const organization = orgName || 'Oryen'
    const domain = process.env.RESEND_DOMAIN || 'mail.oryen.agency'
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oryen-systems.vercel.app'

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `Oryen <noreply@${domain}>`,
      to: [email],
      subject: `Bem-vindo a ${organization} -- Oryen`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #C5CDD5; background-color: #0B0E13; }
            .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { background: linear-gradient(135deg, #0F1218 0%, #161B24 100%); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center; }
            .logo { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 32px; font-weight: 900; letter-spacing: 10px; color: #BFCAD3; margin: 0; padding: 0; }
            .content { background: #12161D; border-left: 1px solid rgba(255,255,255,0.06); border-right: 1px solid rgba(255,255,255,0.06); padding: 40px 32px; }
            .content h2 { color: #E8ECF0; font-size: 22px; margin: 0 0 16px 0; font-weight: 700; }
            .content p { color: #8A95A3; font-size: 15px; margin: 0 0 16px 0; line-height: 1.7; }
            .features { margin: 28px 0; }
            .feature-item { display: flex; align-items: flex-start; margin-bottom: 16px; }
            .feature-dot { width: 8px; height: 8px; min-width: 8px; border-radius: 50%; background: linear-gradient(135deg, #5A7AE6, #7C5AE6); margin-top: 7px; margin-right: 14px; }
            .feature-text { color: #A0AAB5; font-size: 14px; line-height: 1.6; }
            .feature-text strong { color: #C5CDD5; }
            .cta-wrapper { text-align: center; margin: 36px 0 12px 0; }
            .cta-btn { display: inline-block; background: linear-gradient(135deg, #5A7AE6, #7C5AE6); color: #FFFFFF !important; padding: 14px 40px; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.02em; }
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
              <h2>Bem-vindo, ${userName}!</h2>
              <p>Sua conta na <strong style="color: #C5CDD5;">${organization}</strong> foi criada com sucesso. Estamos felizes em ter voce conosco.</p>
              <p>Com a Oryen, voce tem acesso a uma plataforma completa para transformar sua operacao imobiliaria:</p>

              <div class="features">
                <div class="feature-item">
                  <div class="feature-dot"></div>
                  <div class="feature-text"><strong>CRM Inteligente</strong> -- Gerencie leads, imoveis e negocios em um so lugar, com pipeline visual e automacoes.</div>
                </div>
                <div class="feature-item">
                  <div class="feature-dot"></div>
                  <div class="feature-text"><strong>Agentes de IA</strong> -- SDR automatizado que qualifica e engaja seus leads 24/7, sem esforco manual.</div>
                </div>
                <div class="feature-item">
                  <div class="feature-dot"></div>
                  <div class="feature-text"><strong>WhatsApp Integrado</strong> -- Atenda clientes direto pelo WhatsApp com respostas inteligentes e fluxos automatizados.</div>
                </div>
              </div>

              <div class="cta-wrapper">
                <a href="${dashboardUrl}/dashboard" class="cta-btn">Acessar o Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>Oryen -- Intelligent Real Estate Platform</p>
              <p style="margin-top: 4px;">Este email foi enviado para ${email}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Error sending welcome email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send welcome email: ' + emailError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emailId: emailData?.id,
    })
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { error: 'Internal error: ' + error.message },
      { status: 500 }
    )
  }
}
