// app/dashboard/components/SendDocumentModal.tsx
'use client'

import { useState, useRef } from 'react'
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
  const { user, activeOrgId } = useAuth()
  const lang = (user?.language as Language) || 'es'
  const t = TRANSLATIONS[lang]
  const contentRef = useRef<HTMLDivElement>(null)

  // Estados
  const [pdfUrl, setPdfUrl] = useState(document.file_url || '')
  const [generating, setGenerating] = useState(false)
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email' | null>(null)
  const [sending, setSending] = useState(false)
  
  // Form de email
  const [emailTo, setEmailTo] = useState(leadData.email || '')
  const [emailSubject, setEmailSubject] = useState(document.name)
  const [emailMessage, setEmailMessage] = useState('')

  // ─── GERAR PDF NO CLIENTE ───
  const handleGeneratePdf = async () => {
    if (!document.content) {
      toast.error('Documento não tem conteúdo')
      return
    }

    setGenerating(true)
    try {
      // Importar html2pdf dinamicamente
      const html2pdf = (await import('html2pdf.js')).default

      // Criar elemento temporário com o conteúdo
      const tempDiv = window.document.createElement('div')
      tempDiv.innerHTML = `
        <div style="
          width: 190mm;
          max-width: 190mm;
          padding: 0;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.4;
          color: #000;
          background: #fff;
          box-sizing: border-box;
        ">
          <style>
            * { box-sizing: border-box; }
            table { width: 100% !important; max-width: 100% !important; border-collapse: collapse; }
            td, th { padding: 8px; word-wrap: break-word; }
            img { max-width: 100% !important; height: auto !important; }
            p, div, span { max-width: 100% !important; word-wrap: break-word; }
          </style>
          ${document.content}
        </div>
      `
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '0'
      window.document.body.appendChild(tempDiv)

      // Configurações do PDF - A4 com margens adequadas
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number], // top, left, bottom, right em mm
        filename: `${document.name}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          width: 794, // A4 width em pixels (210mm * 3.78)
          windowWidth: 794
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        }
      }

      // Gerar PDF como Blob
      const pdfBlob = await html2pdf().set(opt).from(tempDiv).outputPdf('blob')
      
      // Remover elemento temporário
      window.document.body.removeChild(tempDiv)

      // Nome do arquivo para o storage
      const timestamp = Date.now()
      const safeName = document.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
      const fileName = `${activeOrgId}/${document.lead_id}/${safeName}-${timestamp}.pdf`

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

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
      toast.error(t.errorGenerating + ': ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  // ─── COPIAR LINK ───
  const handleCopyLink = async () => {
    if (!pdfUrl) return
    // Usar URL amigável
    const friendlyUrl = `${window.location.origin}/api/documents/download?id=${document.id}`
    await navigator.clipboard.writeText(friendlyUrl)
    toast.success(t.linkCopied)
  }

  // ─── ENVIAR WHATSAPP VIA UAZAPI ───
  const handleSendWhatsApp = async () => {
    if (!leadData.phone) {
      toast.error(t.noPhone)
      return
    }
    if (!pdfUrl) {
      toast.error('Gere o PDF primeiro')
      return
    }

    setSending(true)
    try {
      // Buscar lead_id e conversation_id do lead
      const { data: leadInfo, error: leadError } = await supabase
        .from('leads')
        .select('id, conversations(id)')
        .eq('id', document.lead_id)
        .single()

      if (leadError || !leadInfo) {
        throw new Error('Lead não encontrado')
      }

      const conversationId = (leadInfo.conversations as any)?.[0]?.id

      if (!conversationId) {
        // Se não tem conversa, abre no WhatsApp Web (fallback)
        const phone = leadData.phone.replace(/\D/g, '')
        const friendlyUrl = `${window.location.origin}/api/documents/download?id=${document.id}`
        const message = `${t.whatsappMessage}\n\n📄 *${document.name}*\n\n${friendlyUrl}`
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank')
      } else {
        // Enviar via UazAPI com o documento
        const webhookUrl = 'https://webhook2.letierren8n.com/webhook/message_agent_human'
        
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: activeOrgId,
            lead_id: document.lead_id,
            conversation_id: conversationId,
            user_id: user?.id,
            message: `📄 ${document.name}`,
            message_type: 'document',
            media_url: pdfUrl,
            media_mime_type: 'application/pdf',
            file_name: `${document.name}.pdf`
          }),
        })

        if (!res.ok) {
          throw new Error('Falha ao enviar via WhatsApp')
        }

        // Registrar mensagem no banco
        await supabase.rpc('fn_insert_message', {
          p_org_id: activeOrgId,
          p_lead_id: document.lead_id,
          p_channel: 'whatsapp',
          p_direction: 'outbound',
          p_body: `📄 ${document.name}`,
          p_sender_type: 'agent_human',
          p_sender_name: user?.name || user?.email?.split('@')[0] || 'Atendente',
          p_message_type: 'document',
          p_media_url: pdfUrl,
          p_media_mime_type: 'application/pdf',
          p_timestamp: new Date().toISOString(),
        })
      }

      // Atualizar documento como enviado
      await supabase
        .from('lead_documents')
        .update({
          status: 'sent',
          sent_via: 'whatsapp',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id)

      toast.success(t.sent)
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error)
      toast.error(t.errorSending + ': ' + error.message)
    } finally {
      setSending(false)
    }
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
          message: emailMessage,
          pdfUrl: pdfUrl
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
                      disabled={sending}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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