// app/dashboard/components/SendDocumentModal.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
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
  Copy,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

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
    sent: 'Enviado com sucesso!',
    cancel: 'Cancelar',
    errorGenerating: 'Erro ao gerar PDF',
    errorSending: 'Erro ao enviar',
    noPhone: 'Lead não tem telefone cadastrado',
    noEmail: 'Lead não tem email cadastrado',
    whatsappMessage: 'Olá! Segue o documento:',
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
    sent: 'Sent successfully!',
    cancel: 'Cancel',
    errorGenerating: 'Error generating PDF',
    errorSending: 'Error sending',
    noPhone: 'Lead has no phone registered',
    noEmail: 'Lead has no email registered',
    whatsappMessage: 'Hello! Here is the document:',
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
    sent: '¡Enviado con éxito!',
    cancel: 'Cancelar',
    errorGenerating: 'Error al generar PDF',
    errorSending: 'Error al enviar',
    noPhone: 'Lead no tiene teléfono registrado',
    noEmail: 'Lead no tiene email registrado',
    whatsappMessage: '¡Hola! Aquí está el documento:',
  }
}

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
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function SendDocumentModal({
  isOpen,
  onClose,
  document,
  leadData,
  onSuccess
}: SendDocumentModalProps) {
  const { user } = useAuth()
  const lang = (user?.language as Language) || 'es'
  const t = TRANSLATIONS[lang]

  // Estados
  const [pdfUrl, setPdfUrl] = useState(document.file_url || '')
  const [generating, setGenerating] = useState(false)
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email' | null>(null)
  const [sending, setSending] = useState(false)
  
  // Form de email
  const [emailTo, setEmailTo] = useState(leadData.email || '')
  const [emailSubject, setEmailSubject] = useState(document.name)
  const [emailMessage, setEmailMessage] = useState('')

  // ─── GERAR PDF ───
  const handleGeneratePdf = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar PDF')
      }

      setPdfUrl(data.url)
      toast.success(t.pdfReady)
    } catch (error: any) {
      toast.error(t.errorGenerating + ': ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  // ─── COPIAR LINK ───
  const handleCopyLink = async () => {
    if (!pdfUrl) return
    await navigator.clipboard.writeText(pdfUrl)
    toast.success(t.linkCopied)
  }

  // ─── ENVIAR WHATSAPP ───
  const handleSendWhatsApp = () => {
    if (!leadData.phone) {
      toast.error(t.noPhone)
      return
    }
    if (!pdfUrl) {
      toast.error('Gere o PDF primeiro')
      return
    }

    const phone = leadData.phone.replace(/\D/g, '')
    const message = `${t.whatsappMessage}\n\n📄 *${document.name}*\n\n${pdfUrl}`
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    
    window.open(whatsappUrl, '_blank')
    
    // Marcar como enviado
    fetch('/api/documents/mark-sent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        documentId: document.id, 
        via: 'whatsapp',
        to: leadData.phone 
      })
    }).catch(console.error)

    toast.success(t.sent)
    onSuccess?.()
    onClose()
  }

  // ─── ENVIAR EMAIL ───
  const handleSendEmail = async () => {
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
          message: emailMessage
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
      toast.error(t.errorSending + ': ' + error.message)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
          
          {/* Info do documento */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{document.name}</p>
              <p className="text-gray-500 text-xs">
                {leadData.name}
              </p>
            </div>
          </div>

          {/* Gerar/Baixar PDF */}
          <div className="space-y-2">
            {!pdfUrl ? (
              <button
                onClick={handleGeneratePdf}
                disabled={generating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={14} />
                    {t.download}
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-white/10"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Opções de envio (só aparecem se tem PDF) */}
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

              {/* Form WhatsApp */}
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
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <ExternalLink size={18} />
                      {t.send} {t.whatsapp}
                    </button>
                  )}
                </div>
              )}

              {/* Form Email */}
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
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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