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
      <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-3 hover:border-white/10 transition-all group">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
              <FileText size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <button 
                onClick={() => setShowPreview(true)}
                className="text-white text-sm font-medium truncate block hover:text-blue-400 transition-colors text-left w-full"
              >
                {doc.name}
              </button>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={doc.status} lang={lang} />
                <span className="text-gray-600 text-xs">
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
              className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <MoreVertical size={14} />}
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-20 py-1 min-w-[160px]">
                  <button 
                    onClick={() => { setShowPreview(true); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-sm text-left text-gray-300 hover:bg-white/5 flex items-center gap-2"
                  >
                    <Eye size={14} /> {t.view}
                  </button>
                  
                  {(doc.status === 'draft' || doc.status === 'ready') && (
                    <button 
                      onClick={handleOpenSendModal}
                      className="w-full px-3 py-2 text-sm text-left text-gray-300 hover:bg-white/5 flex items-center gap-2"
                    >
                      <Send size={14} /> {t.send}
                    </button>
                  )}
                  
                  {doc.status === 'sent' && (
                    <button 
                      onClick={() => handleUpdateStatus('signed')}
                      className="w-full px-3 py-2 text-sm text-left text-gray-300 hover:bg-white/5 flex items-center gap-2"
                    >
                      <FileSignature size={14} /> {t.markAsSigned}
                    </button>
                  )}
                  
                  {doc.file_url && (
                    <a 
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-3 py-2 text-sm text-left text-gray-300 hover:bg-white/5 flex items-center gap-2"
                    >
                      <Download size={14} /> {t.download}
                    </a>
                  )}
                  
                  <hr className="border-white/5 my-1" />
                  
                  <button 
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <h3 className="font-medium text-gray-900">{doc.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const win = window.open('', '_blank')
                    win?.document.write(doc.content || '')
                    win?.print()
                  }}
                  className="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="Imprimir"
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded hover:bg-gray-200 text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div 
              className="flex-1 overflow-auto p-4"
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
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
        <h3 className="text-white font-semibold flex items-center gap-2">
          <FileText size={18} className="text-blue-400" />
          {t.title}
          {documents.length > 0 && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400">
              {documents.length}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            {t.newDocument}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
          <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t.noDocuments}</p>
          <p className="text-gray-600 text-xs mt-1">{t.noDocumentsDesc}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors"
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