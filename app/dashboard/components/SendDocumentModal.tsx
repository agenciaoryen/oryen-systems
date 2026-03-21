// app/dashboard/components/SendDocumentModal.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import type { LeadDocument } from '@/lib/documents/types'
import {
  X,
  Send,
  Mail,
  MessageCircle,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy
} from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const WEBHOOK_SEND_MESSAGE = 'https://webhook2.letierren8n.com/webhook/message_agent_human'

const TRANSLATIONS = {
  pt: {
    title: 'Enviar Documento',
    generatePdf: 'Gerar PDF',
    generating: 'Gerando PDF...',
    pdfReady: 'PDF Pronto!',
    download: 'Baixar PDF',
    copyLink: 'Copiar Link',
    linkCopied: 'Link copiado!',
    sendVia: 'Enviar via',
    whatsapp: 'WhatsApp',
    email: 'Email',
    emailTo: 'Enviar para',
    emailPlaceholder: 'email@exemplo.com',
    subject: 'Assunto',
    message: 'Mensagem (opcional)',
    messagePlaceholder: 'Olá, segue o documento...',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: 'Documento enviado! Redirecionando...',
    cancel: 'Cancelar',
    errorGenerating: 'Erro ao gerar PDF',
    errorSending: 'Erro ao enviar',
    noPhone: 'Lead não tem telefone cadastrado',
    noEmail: 'Lead não tem email cadastrado',
    noConversation: 'Lead não tem conversa ativa. Inicie uma conversa primeiro.',
  },
  en: {
    title: 'Send Document',
    generatePdf: 'Generate PDF',
    generating: 'Generating PDF...',
    pdfReady: 'PDF Ready!',
    download: 'Download PDF',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!',
    sendVia: 'Send via',
    whatsapp: 'WhatsApp',
    email: 'Email',
    emailTo: 'Send to',
    emailPlaceholder: 'email@example.com',
    subject: 'Subject',
    message: 'Message (optional)',
    messagePlaceholder: 'Hello, here is the document...',
    send: 'Send',
    sending: 'Sending...',
    sent: 'Document sent! Redirecting...',
    cancel: 'Cancel',
    errorGenerating: 'Error generating PDF',
    errorSending: 'Error sending',
    noPhone: 'Lead has no phone registered',
    noEmail: 'Lead has no email registered',
    noConversation: 'Lead has no active conversation. Start a conversation first.',
  },
  es: {
    title: 'Enviar Documento',
    generatePdf: 'Generar PDF',
    generating: 'Generando PDF...',
    pdfReady: '¡PDF Listo!',
    download: 'Descargar PDF',
    copyLink: 'Copiar Link',
    linkCopied: '¡Link copiado!',
    sendVia: 'Enviar por',
    whatsapp: 'WhatsApp',
    email: 'Email',
    emailTo: 'Enviar a',
    emailPlaceholder: 'email@ejemplo.com',
    subject: 'Asunto',
    message: 'Mensaje (opcional)',
    messagePlaceholder: 'Hola, aquí está el documento...',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: '¡Documento enviado! Redirigiendo...',
    cancel: 'Cancelar',
    errorGenerating: 'Error al generar PDF',
    errorSending: 'Error al enviar',
    noPhone: 'Lead no tiene teléfono registrado',
    noEmail: 'Lead no tiene email registrado',
    noConversation: 'Lead no tiene conversación activa. Inicie una conversación primero.',
  }
} as const

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface SendDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  document: LeadDocument
  leadData: {
    name?: string
    phone?: string
    email?: string
  }
  onSuccess?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function SendDocumentModal({
  isOpen,
  onClose,
  document,
  leadData,
  onSuccess
}: SendDocumentModalProps) {
  const router = useRouter()
  const { user, activeOrgId } = useAuth()
  const lang = (user?.language as Language) || 'es'
  const t = TRANSLATIONS[lang]

  // State
  const [pdfUrl, setPdfUrl] = useState(document.file_url || '')
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [generating, setGenerating] = useState(false)
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email' | null>(null)
  const [sending, setSending] = useState(false)
  
  // Email form
  const [emailTo, setEmailTo] = useState(leadData.email || '')
  const [emailSubject, setEmailSubject] = useState(document.name)
  const [emailMessage, setEmailMessage] = useState('')

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATE PDF
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGeneratePdf = useCallback(async () => {
    if (!document.content) {
      toast.error('Documento não tem conteúdo')
      return
    }

    setGenerating(true)
    
    try {
      const html2pdf = (await import('html2pdf.js')).default

      // Criar container com estilos inline para garantir renderização
      const containerId = 'pdf-container-' + Date.now()
      const container = window.document.createElement('div')
      container.id = containerId
      container.innerHTML = `
        <div style="
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          margin: 0 auto;
          background-color: #ffffff;
          color: #1a1a1a;
          font-family: Helvetica, Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          box-sizing: border-box;
          text-align: left;
        ">
          <style>
            #${containerId} * {
              box-sizing: border-box;
            }
            #${containerId} h1, #${containerId} h2, #${containerId} h3, #${containerId} h4 {
              color: #0f172a;
              margin: 0 0 0.5em 0;
              font-weight: 600;
              text-align: center;
            }
            #${containerId} h1 { font-size: 18pt; }
            #${containerId} h2 { font-size: 14pt; }
            #${containerId} h3 { font-size: 12pt; text-align: left; }
            #${containerId} h4 { font-size: 11pt; text-align: left; }
            #${containerId} p {
              margin: 0 0 0.75em 0;
              color: #374151;
              text-align: justify;
            }
            #${containerId} table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em auto;
              font-size: 10pt;
            }
            #${containerId} th, #${containerId} td {
              border: 1px solid #9ca3af;
              padding: 10px 12px;
              text-align: left;
              vertical-align: top;
              color: #1f2937;
            }
            #${containerId} th {
              background-color: #e5e7eb;
              font-weight: 600;
            }
            #${containerId} strong, #${containerId} b {
              font-weight: 600;
              color: #1f2937;
            }
            #${containerId} ul, #${containerId} ol {
              margin: 0.5em 0 0.5em 1.5em;
              padding: 0;
            }
            #${containerId} li {
              margin-bottom: 0.25em;
            }
          </style>
          ${document.content}
        </div>
      `
      
      // Importante: posicionar visível mas fora da viewport
      container.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 210mm;
        background: white;
        z-index: -9999;
        opacity: 0;
        pointer-events: none;
      `
      window.document.body.appendChild(container)

      // Aguardar renderização completa
      await new Promise(resolve => setTimeout(resolve, 300))

      const options = {
        margin: [0, 0, 0, 0] as [number, number, number, number],
        filename: `${document.name}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.95 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const
        }
      }

      // Gerar blob - pegar o primeiro filho que tem o conteúdo
      const contentElement = container.firstElementChild as HTMLElement
      
      const blob = await html2pdf()
        .set(options)
        .from(contentElement)
        .outputPdf('blob') as Blob
      
      // Limpar
      window.document.body.removeChild(container)

      if (!blob || blob.size === 0) {
        throw new Error('PDF gerado está vazio')
      }

      setPdfBlob(blob)

      // Upload para Storage
      const timestamp = Date.now()
      const safeName = document.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
      
      const filePath = `${activeOrgId}/${document.lead_id}/${safeName}-${timestamp}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl
      setPdfUrl(publicUrl)

      // Atualizar documento no banco
      await supabase
        .from('lead_documents')
        .update({
          file_url: publicUrl,
          file_type: 'application/pdf',
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id)

      toast.success(t.pdfReady)
      
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error)
      toast.error(`${t.errorGenerating}: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }, [document, activeOrgId, t])

  // ─────────────────────────────────────────────────────────────────────────────
  // DOWNLOAD PDF
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (pdfBlob) {
      // Download do blob local (mais confiável)
      const url = URL.createObjectURL(pdfBlob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${document.name}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } else if (pdfUrl) {
      // Fallback para URL remota
      window.open(pdfUrl, '_blank')
    }
  }, [pdfBlob, pdfUrl, document.name])

  // ─────────────────────────────────────────────────────────────────────────────
  // COPY LINK
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCopyLink = useCallback(async () => {
    if (!pdfUrl) return
    
    try {
      await navigator.clipboard.writeText(pdfUrl)
      toast.success(t.linkCopied)
    } catch {
      toast.error('Erro ao copiar')
    }
  }, [pdfUrl, t])

  // ─────────────────────────────────────────────────────────────────────────────
  // SEND WHATSAPP VIA UAZAPI
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendWhatsApp = useCallback(async () => {
    if (!leadData.phone) {
      toast.error(t.noPhone)
      return
    }
    
    if (!pdfUrl) {
      toast.error('Gere o PDF primeiro')
      return
    }

    setSending(true)
    
    // Toast de progresso
    const toastId = toast.loading('Enviando documento...')
    
    try {
      // Buscar conversation_id do lead
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, org_id')
        .eq('lead_id', document.lead_id)
        .order('last_message_at', { ascending: false })
        .limit(1)

      if (convError) throw convError

      const conversation = conversations?.[0]

      if (!conversation) {
        toast.dismiss(toastId)
        toast.error(t.noConversation)
        setSending(false)
        return
      }

      // Enviar via webhook UazAPI
      const webhookPayload = {
        org_id: activeOrgId,
        lead_id: document.lead_id,
        conversation_id: conversation.id,
        user_id: user?.id,
        message: `📄 ${document.name}`,
        message_type: 'document',
        media_url: pdfUrl,
        media_mime_type: 'application/pdf',
        file_name: `${document.name}.pdf`
      }

      toast.loading('Conectando ao WhatsApp...', { id: toastId })

      const response = await fetch(WEBHOOK_SEND_MESSAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      })

      // Verificar resposta do webhook
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Falha na conexão: ${errorText}`)
      }

      // Tentar parsear resposta para verificar sucesso
      let webhookResult: any = null
      try {
        webhookResult = await response.json()
      } catch {
        // Se não for JSON, considerar sucesso pela resposta HTTP OK
      }

      // Verificar se o n8n retornou erro
      if (webhookResult?.error || webhookResult?.success === false) {
        throw new Error(webhookResult?.message || 'Falha ao enviar pelo WhatsApp')
      }

      toast.loading('Confirmando envio...', { id: toastId })

      // Registrar mensagem no banco
      const senderName = user?.name || user?.email?.split('@')[0] || 'Atendente'
      
      const { error: msgError } = await supabase.rpc('fn_insert_message', {
        p_org_id: activeOrgId,
        p_lead_id: document.lead_id,
        p_channel: 'whatsapp',
        p_direction: 'outbound',
        p_body: `📄 ${document.name}`,
        p_sender_type: 'agent_human',
        p_sender_name: senderName,
        p_message_type: 'document',
        p_media_url: pdfUrl,
        p_media_mime_type: 'application/pdf',
        p_timestamp: new Date().toISOString()
      })

      if (msgError) {
        console.error('Erro ao registrar mensagem:', msgError)
        // Não bloquear o fluxo, só logar
      }

      // Atualizar documento como enviado
      const { error: updateError } = await supabase
        .from('lead_documents')
        .update({
          status: 'sent',
          sent_via: 'whatsapp',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id)

      if (updateError) {
        console.error('Erro ao atualizar status:', updateError)
      }

      // Sucesso confirmado
      toast.success('✅ Documento enviado com sucesso!', { id: toastId })
      
      onSuccess?.()
      onClose()
      
      // Redirecionar para o módulo de conversas
      router.push(`/dashboard/messages?conversation=${conversation.id}`)

    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error)
      toast.error(`❌ ${t.errorSending}: ${error.message}`, { id: toastId })
    } finally {
      setSending(false)
    }
  }, [document, leadData, pdfUrl, activeOrgId, user, t, router, onSuccess, onClose])

  // ─────────────────────────────────────────────────────────────────────────────
  // SEND EMAIL
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendEmail = useCallback(async () => {
    if (!emailTo) {
      toast.error(t.noEmail)
      return
    }
    
    if (!pdfUrl) {
      toast.error('Gere o PDF primeiro')
      return
    }

    setSending(true)
    
    try {
      const response = await fetch('/api/documents/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          toEmail: emailTo,
          toName: leadData.name,
          subject: emailSubject,
          message: emailMessage,
          pdfUrl
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar')
      }

      toast.success(t.sent)
      onSuccess?.()
      onClose()
      
    } catch (error: any) {
      toast.error(`${t.errorSending}: ${error.message}`)
    } finally {
      setSending(false)
    }
  }, [document, leadData, emailTo, emailSubject, emailMessage, pdfUrl, t, onSuccess, onClose])

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Send className="text-blue-400" size={20} />
            {t.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Document info */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{document.name}</p>
              <p className="text-gray-500 text-xs">{leadData.name}</p>
            </div>
          </div>

          {/* Generate / Download PDF */}
          <div className="space-y-2">
            {!pdfUrl ? (
              <button
                onClick={handleGeneratePdf}
                disabled={generating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t.generating}
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    {t.generatePdf}
                  </>
                )}
              </button>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 text-emerald-400 mb-3">
                  <CheckCircle2 size={18} />
                  <span className="font-medium">{t.pdfReady}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={14} />
                    {t.download}
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-white/10"
                    title={t.copyLink}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Send options */}
          {pdfUrl && (
            <>
              <div className="pt-2">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
                  {t.sendVia}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSendMethod('whatsapp')}
                    className={`py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all border ${
                      sendMethod === 'whatsapp'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <MessageCircle size={18} />
                    {t.whatsapp}
                  </button>
                  <button
                    onClick={() => setSendMethod('email')}
                    className={`py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all border ${
                      sendMethod === 'email'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Mail size={18} />
                    {t.email}
                  </button>
                </div>
              </div>

              {/* WhatsApp send */}
              {sendMethod === 'whatsapp' && (
                <div className="pt-2 space-y-3">
                  {!leadData.phone ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2 text-amber-400">
                      <AlertCircle size={16} />
                      <span className="text-sm">{t.noPhone}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendWhatsApp}
                      disabled={sending}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          {t.sending}
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          {t.send} {t.whatsapp}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Email form */}
              {sendMethod === 'email' && (
                <div className="pt-2 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      {t.emailTo}
                    </label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      {t.subject}
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      {t.message}
                    </label>
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder={t.messagePlaceholder}
                      rows={3}
                      className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSendEmail}
                    disabled={sending || !emailTo}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {t.sending}
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        {t.send}
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}