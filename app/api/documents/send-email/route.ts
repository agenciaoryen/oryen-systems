// app/api/documents/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { documentId, toEmail, toName, subject, message } = await request.json()

    if (!documentId || !toEmail) {
      return NextResponse.json(
        { error: 'documentId e toEmail são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar documento
    const { data: document, error: docError } = await supabaseAdmin
      .from('lead_documents')
      .select(`
        *,
        lead:leads(name, email),
        org:orgs(name)
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se tem PDF gerado
    if (!document.file_url) {
      return NextResponse.json(
        { error: 'Documento não tem PDF gerado. Gere o PDF primeiro.' },
        { status: 400 }
      )
    }

    // Baixar o PDF para anexar
    const pdfResponse = await fetch(document.file_url)
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: 'Erro ao baixar PDF' },
        { status: 500 }
      )
    }
    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Montar email
    const orgName = document.org?.name || 'Oryen CRM'
    const recipientName = toName || document.lead?.name || 'Cliente'
    const emailSubject = subject || `${orgName} - ${document.name}`
    const emailMessage = message || `Olá ${recipientName},\n\nSegue em anexo o documento "${document.name}".\n\nAtenciosamente,\n${orgName}`

    // Enviar email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${orgName} <documentos@${process.env.RESEND_DOMAIN || 'oryen.com.br'}>`,
      to: [toEmail],
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #eee; }
            .footer { background: #1a1a2e; color: #888; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
            .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .document-info { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${orgName}</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${recipientName}</strong>,</p>
              <p>${emailMessage.replace(/\n/g, '<br>')}</p>
              
              <div class="document-info">
                <p style="margin: 0; font-weight: bold;">📄 ${document.name}</p>
                <p style="margin: 5px 0 0; color: #666; font-size: 14px;">
                  Arquivo PDF anexado a este email
                </p>
              </div>

              <p style="color: #666; font-size: 14px;">
                Se você tiver alguma dúvida, entre em contato conosco.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">Enviado por ${orgName} via Oryen CRM</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: document.file_name || `${document.name}.pdf`,
          content: Buffer.from(pdfBuffer)
        }
      ]
    })

    if (emailError) {
      console.error('Erro ao enviar email:', emailError)
      return NextResponse.json(
        { error: 'Erro ao enviar email: ' + emailError.message },
        { status: 500 }
      )
    }

    // Atualizar documento
    await supabaseAdmin
      .from('lead_documents')
      .update({
        status: 'sent',
        sent_via: 'email',
        sent_at: new Date().toISOString(),
        sent_to: toEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    // Registrar no histórico
    await supabaseAdmin.from('lead_document_history').insert({
      document_id: documentId,
      action: 'sent',
      details: { 
        via: 'email', 
        to: toEmail,
        email_id: emailData?.id 
      }
    })

    return NextResponse.json({
      success: true,
      emailId: emailData?.id,
      sentTo: toEmail
    })

  } catch (error: any) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json(
      { error: 'Erro interno: ' + error.message },
      { status: 500 }
    )
  }
}