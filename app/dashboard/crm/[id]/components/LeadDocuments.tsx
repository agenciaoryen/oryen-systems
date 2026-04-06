// app/dashboard/crm/[id]/components/LeadDocuments.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useLeadDocuments, deleteDocument, updateDocumentStatus } from '@/lib/documents'
import { 
  DOCUMENT_STATUS_LABELS, 
  DOCUMENT_STATUS_COLORS,
  type LeadDocument,
  type DocumentStatus 
} from '@/lib/documents/types'
import CreateDocumentModal from '@/app/dashboard/components/CreateDocumentModal'
import SendDocumentModal from '@/app/dashboard/components/SendDocumentModal'
import {
  FileText,
  Plus,
  Upload,
  Calendar,
  Send,
  Eye,
  Download,
  MoreVertical,
  CheckCircle2,
  Clock,
  Trash2,
  MessageCircle,
  Mail,
  Loader2,
  X,
  FileSignature,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Documentos',
    newDocument: 'Novo',
    upload: 'Upload',
    noDocuments: 'Nenhum documento',
    noDocumentsDesc: 'Crie ou faça upload de documentos para este lead',
    view: 'Visualizar',
    send: 'Enviar',
    sendWhatsapp: 'Enviar por WhatsApp',
    sendEmail: 'Enviar por Email',
    download: 'Baixar',
    delete: 'Excluir',
    markAsSent: 'Marcar como enviado',
    markAsSigned: 'Marcar como assinado',
    confirmDelete: 'Tem certeza que deseja excluir este documento?',
    deleted: 'Documento excluído',
    statusUpdated: 'Status atualizado',
    createdAt: 'Criado em',
  },
  en: {
    title: 'Documents',
    newDocument: 'New',
    upload: 'Upload',
    noDocuments: 'No documents',
    noDocumentsDesc: 'Create or upload documents for this lead',
    view: 'View',
    send: 'Send',
    sendWhatsapp: 'Send via WhatsApp',
    sendEmail: 'Send via Email',
    download: 'Download',
    delete: 'Delete',
    markAsSent: 'Mark as sent',
    markAsSigned: 'Mark as signed',
    confirmDelete: 'Are you sure you want to delete this document?',
    deleted: 'Document deleted',
    statusUpdated: 'Status updated',
    createdAt: 'Created at',
  },
  es: {
    title: 'Documentos',
    newDocument: 'Nuevo',
    upload: 'Subir',
    noDocuments: 'Sin documentos',
    noDocumentsDesc: 'Crea o sube documentos para este lead',
    view: 'Ver',
    send: 'Enviar',
    sendWhatsapp: 'Enviar por WhatsApp',
    sendEmail: 'Enviar por Email',
    download: 'Descargar',
    delete: 'Eliminar',
    markAsSent: 'Marcar como enviado',
    markAsSigned: 'Marcar como firmado',
    confirmDelete: '¿Estás seguro de que deseas eliminar este documento?',
    deleted: 'Documento eliminado',
    statusUpdated: 'Estado actualizado',
    createdAt: 'Creado el',
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface LeadDocumentsProps {
  leadId: string
  leadData: {
    name?: string
    phone?: string
    email?: string
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: StatusBadge
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status, lang }: { status: DocumentStatus; lang: Language }) {
  const label = DOCUMENT_STATUS_LABELS[status]?.[lang] || status
  const colors = DOCUMENT_STATUS_COLORS[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {status === 'draft' && <Clock size={10} />}
      {status === 'sent' && <Send size={10} />}
      {status === 'signed' && <CheckCircle2 size={10} />}
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: DocumentItem
// ═══════════════════════════════════════════════════════════════════════════════

function DocumentItem({ 
  doc, 
  lang, 
  t,
  leadData,
  onRefresh 
}: { 
  doc: LeadDocument
  lang: Language
  t: any
  leadData: { name?: string; phone?: string; email?: string }
  onRefresh: () => void
}) {
  const { user } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)

  const handleDelete = async () => {
    if (!confirm(t.confirmDelete)) return
    
    setLoading(true)
    const { success, error } = await deleteDocument(doc.id)
    setLoading(false)
    
    if (success) {
      toast.success(t.deleted)
      onRefresh()
    } else {
      toast.error(error || 'Error')
    }
    setShowMenu(false)
  }

  const handleUpdateStatus = async (status: DocumentStatus) => {
    setLoading(true)
    const { success, error } = await updateDocumentStatus(doc.id, status, user?.id)
    setLoading(false)
    
    if (success) {
      toast.success(t.statusUpdated)
      onRefresh()
    } else {
      toast.error(error || 'Error')
    }
    setShowMenu(false)
  }

  const handleOpenSendModal = () => {
    setShowMenu(false)
    setShowSendModal(true)
  }

  return (
    <>
      <div className="border rounded-lg p-3 transition-all group" style={{ background: 'var(--color-bg-base)', borderColor: 'var(--color-border-subtle)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded shrink-0 mt-0.5" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
              <FileText size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <button 
                onClick={() => setShowPreview(true)}
                className="text-sm font-medium truncate block transition-colors text-left w-full"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {doc.name}
              </button>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={doc.status} lang={lang} />
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={loading}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <MoreVertical size={14} />}
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 border rounded-lg shadow-xl z-20 py-1 min-w-[160px]" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
                  <button 
                    onClick={() => { setShowPreview(true); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-sm text-left flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <Eye size={14} /> {t.view}
                  </button>
                  
                  {(doc.status === 'draft' || doc.status === 'ready') && (
                    <button 
                      onClick={handleOpenSendModal}
                      className="w-full px-3 py-2 text-sm text-left flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Send size={14} /> {t.send}
                    </button>
                  )}
                  
                  {doc.status === 'sent' && (
                    <button 
                      onClick={() => handleUpdateStatus('signed')}
                      className="w-full px-3 py-2 text-sm text-left flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <FileSignature size={14} /> {t.markAsSigned}
                    </button>
                  )}
                  
                  {doc.file_url && (
                    <a 
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-3 py-2 text-sm text-left flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Download size={14} /> {t.download}
                    </a>
                  )}
                  
                  <hr className="my-1" style={{ borderColor: 'var(--color-border-subtle)' }} />

                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-sm text-left flex items-center gap-2"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <Trash2 size={14} /> {t.delete}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && doc.content && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
          style={{ background: 'var(--color-bg-overlay)' }}
          onClick={() => setShowPreview(false)}
        >
          <div
            className="border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'var(--color-primary-subtle)' }}>
                  <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{doc.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Vista previa del documento</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank')
                    if (printWindow) {
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <title>${doc.name}</title>
                          <style>
                            * { box-sizing: border-box; margin: 0; padding: 0; }
                            body {
                              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                              font-size: 11pt;
                              line-height: 1.5;
                              color: #1a1a1a;
                              background: #fff;
                              padding: 20mm;
                            }
                            h1, h2, h3, h4 { color: #0f172a; margin-bottom: 0.5em; font-weight: 600; }
                            h1 { font-size: 18pt; }
                            h2 { font-size: 14pt; }
                            h3 { font-size: 12pt; }
                            p { margin-bottom: 0.75em; color: #374151; }
                            table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                            th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
                            th { background-color: #f3f4f6; font-weight: 600; color: #1f2937; }
                            tr:nth-child(even) { background-color: #f9fafb; }
                            strong, b { font-weight: 600; color: #1f2937; }
                            @media print { body { padding: 10mm; } }
                          </style>
                        </head>
                        <body>${doc.content}</body>
                        </html>
                      `)
                      printWindow.document.close()
                      printWindow.print()
                    }
                  }}
                  className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  style={{ background: 'var(--color-bg-hover)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <ExternalLink size={16} />
                  Imprimir
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded-lg border transition-colors"
                  style={{ background: 'var(--color-bg-hover)', borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Document Content */}
            <div className="flex-1 overflow-auto p-8" style={{ background: '#f3f4f6' }}>
              <div 
                className="bg-white rounded-lg shadow-lg"
                style={{
                  maxWidth: '210mm',
                  width: '100%',
                  margin: '0 auto',
                  padding: '20mm',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  fontSize: '11pt',
                  lineHeight: '1.6',
                  color: '#1a1a1a'
                }}
              >
                <style dangerouslySetInnerHTML={{ __html: `
                  .doc-preview {
                    text-align: left;
                  }
                  .doc-preview h1, .doc-preview h2 {
                    color: #0f172a;
                    margin-bottom: 0.5em;
                    font-weight: 600;
                    text-align: center;
                  }
                  .doc-preview h3, .doc-preview h4 {
                    color: #0f172a;
                    margin-bottom: 0.5em;
                    font-weight: 600;
                    text-align: left;
                  }
                  .doc-preview h1 { font-size: 18pt; }
                  .doc-preview h2 { font-size: 14pt; }
                  .doc-preview h3 { font-size: 12pt; }
                  .doc-preview p {
                    margin-bottom: 0.75em;
                    color: #374151;
                    text-align: justify;
                  }
                  .doc-preview table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1em auto;
                    font-size: 10pt;
                  }
                  .doc-preview th, .doc-preview td {
                    border: 1px solid #d1d5db;
                    padding: 10px 12px;
                    text-align: left;
                    vertical-align: top;
                  }
                  .doc-preview th {
                    background-color: #f3f4f6;
                    font-weight: 600;
                    color: #1f2937;
                  }
                  .doc-preview tr:nth-child(even) {
                    background-color: #f9fafb;
                  }
                  .doc-preview strong, .doc-preview b {
                    font-weight: 600;
                    color: #1f2937;
                  }
                  .doc-preview ul, .doc-preview ol {
                    margin: 0.5em 0 0.5em 1.5em;
                  }
                  .doc-preview li {
                    margin-bottom: 0.25em;
                  }
                `}} />
                <div 
                  className="doc-preview"
                  dangerouslySetInnerHTML={{ __html: doc.content }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      <SendDocumentModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        document={doc}
        leadData={leadData}
        onSuccess={onRefresh}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function LeadDocuments({ leadId, leadData }: LeadDocumentsProps) {
  const { user } = useAuth()
  const { documents, loading, refetch } = useLeadDocuments(leadId)
  
  const lang = (user?.language as Language) || 'es'
  const t = TRANSLATIONS[lang]

  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <FileText size={18} style={{ color: 'var(--color-primary)' }} />
          {t.title}
          {documents.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }}>
              {documents.length}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors" style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={14} />
            {t.newDocument}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noDocuments}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.noDocumentsDesc}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={14} />
            {t.newDocument}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentItem 
              key={doc.id} 
              doc={doc} 
              lang={lang} 
              t={t}
              leadData={leadData}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateDocumentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        leadId={leadId}
        leadData={leadData}
        onSuccess={refetch}
      />
    </div>
  )
}