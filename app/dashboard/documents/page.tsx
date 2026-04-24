// app/dashboard/documents/page.tsx
'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { formatLeadName, formatLeadInitial } from '@/lib/format/leadName'
import { useLeadDocuments, useDocumentCategories, deleteDocument } from '@/lib/documents'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  type LeadDocument,
  type DocumentStatus
} from '@/lib/documents/types'
import CreateDocumentModal from '@/app/dashboard/components/CreateDocumentModal'
import SendDocumentModal from '@/app/dashboard/components/SendDocumentModal'
import UploadDocumentModal from '@/app/dashboard/components/UploadDocumentModal'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Send,
  Eye,
  Download,
  MoreVertical,
  CheckCircle2,
  Clock,
  FileSignature,
  Upload,
  Building2,
  Home,
  CalendarCheck,
  File,
  Loader2,
  X,
  Trash2,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Documentos',
    subtitle: 'Gerencie todos os documentos dos seus contatos',
    newDocument: 'Novo Documento',
    upload: 'Upload',
    search: 'Buscar documentos...',
    filterAll: 'Todos',
    filterDraft: 'Rascunhos',
    filterSent: 'Enviados',
    filterSigned: 'Assinados',
    noDocuments: 'Nenhum documento encontrado',
    noDocumentsDesc: 'Crie seu primeiro documento ou faça upload de um arquivo',
    createdAt: 'Criado em',
    sentAt: 'Enviado em',
    signedAt: 'Assinado em',
    lead: 'Contato',
    category: 'Categoria',
    actions: 'Ações',
    view: 'Visualizar',
    send: 'Enviar',
    print: 'Imprimir',
    download: 'Baixar',
    edit: 'Editar',
    delete: 'Excluir',
    confirmDelete: 'Tem certeza que deseja excluir este documento?',
    deleted: 'Documento excluído',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
  },
  en: {
    title: 'Documents',
    subtitle: 'Manage all your contact documents',
    newDocument: 'New Document',
    upload: 'Upload',
    search: 'Search documents...',
    filterAll: 'All',
    filterDraft: 'Drafts',
    filterSent: 'Sent',
    filterSigned: 'Signed',
    noDocuments: 'No documents found',
    noDocumentsDesc: 'Create your first document or upload a file',
    createdAt: 'Created at',
    sentAt: 'Sent at',
    signedAt: 'Signed at',
    lead: 'Contact',
    category: 'Category',
    actions: 'Actions',
    view: 'View',
    send: 'Send',
    print: 'Print',
    download: 'Download',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this document?',
    deleted: 'Document deleted',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
  es: {
    title: 'Documentos',
    subtitle: 'Gestiona todos los documentos de tus contactos',
    newDocument: 'Nuevo Documento',
    upload: 'Subir',
    search: 'Buscar documentos...',
    filterAll: 'Todos',
    filterDraft: 'Borradores',
    filterSent: 'Enviados',
    filterSigned: 'Firmados',
    noDocuments: 'No se encontraron documentos',
    noDocumentsDesc: 'Crea tu primer documento o sube un archivo',
    createdAt: 'Creado el',
    sentAt: 'Enviado el',
    signedAt: 'Firmado el',
    lead: 'Contacto',
    category: 'Categoría',
    actions: 'Acciones',
    view: 'Ver',
    send: 'Enviar',
    print: 'Imprimir',
    download: 'Descargar',
    edit: 'Editar',
    delete: 'Eliminar',
    confirmDelete: '¿Estás seguro de que deseas eliminar este documento?',
    deleted: 'Documento eliminado',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// ÍCONES POR CATEGORIA
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  visit_order: <CalendarCheck size={16} />,
  rental_authorization: <Home size={16} />,
  sale_authorization: <Building2 size={16} />,
  commercial_proposal: <FileSignature size={16} />,
  other: <File size={16} />,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: StatusBadge
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status, lang }: { status: DocumentStatus; lang: Language }) {
  const label = DOCUMENT_STATUS_LABELS[status]?.[lang] || status
  const colors = DOCUMENT_STATUS_COLORS[status] || DOCUMENT_STATUS_COLORS.draft

  const icons: Record<DocumentStatus, React.ReactNode> = {
    draft: <Clock size={12} />,
    ready: <FileText size={12} />,
    sent: <Send size={12} />,
    viewed: <Eye size={12} />,
    signed: <CheckCircle2 size={12} />,
    archived: <File size={12} />,
    canceled: <X size={12} />,
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colors}`}>
      {icons[status]}
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: DocumentCard
// ═══════════════════════════════════════════════════════════════════════════════

function DocumentCard({ doc, lang, t, onRefresh, orgNiche }: { doc: LeadDocument; lang: Language; t: any; onRefresh: () => void; orgNiche?: string | null }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const categoryIcon = CATEGORY_ICONS[doc.template?.category || 'other'] || <File size={16} />

  const handleView = () => {
    setShowMenu(false)
    if (doc.content) {
      setShowPreview(true)
    } else if (doc.file_url) {
      window.open(doc.file_url, '_blank')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { success } = await deleteDocument(doc.id)
    if (success) {
      toast.success(t.deleted)
      onRefresh()
    }
    setDeleting(false)
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleView}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleView() } }}
        className="rounded-xl p-3 sm:p-4 transition-all cursor-pointer"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)'; e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Icon */}
          <div className="p-2 sm:p-2.5 rounded-lg shrink-0" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            {doc.source_type === 'uploaded' ? <Upload size={16} /> : categoryIcon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{doc.name}</h3>
              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Ver button - sempre visivel */}
                <button
                  onClick={handleView}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
                  title={t.view}
                >
                  <Eye size={14} />
                  <span className="hidden sm:inline">{t.view}</span>
                </button>
                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}
                    title={t.actions}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div
                        className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-20 py-1 min-w-[160px]"
                        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
                      >
                        {(doc.status === 'draft' || doc.status === 'ready') && doc.lead && (
                          <button onClick={() => { setShowMenu(false); setShowSendModal(true) }} className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--color-bg-hover)]" style={{ color: 'var(--color-text-secondary)' }}>
                            <Send size={14} /> {t.send}
                          </button>
                        )}
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" onClick={() => setShowMenu(false)} className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--color-bg-hover)]" style={{ color: 'var(--color-text-secondary)' }}>
                            <Download size={14} /> {t.download}
                          </a>
                        )}
                        {(((doc.status === 'draft' || doc.status === 'ready') && doc.lead) || doc.file_url) && (
                          <hr style={{ borderColor: 'var(--color-border-subtle)' }} className="my-1" />
                        )}
                        <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }} className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--color-bg-hover)]" style={{ color: 'var(--color-error)' }}>
                          <Trash2 size={14} /> {t.delete}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Lead + Status */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {doc.lead && (
                <Link
                  href={`/dashboard/crm/${doc.lead.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <User size={11} />
                  <span className="truncate max-w-[120px] sm:max-w-none">{formatLeadName(doc.lead, orgNiche, { lang })}</span>
                </Link>
              )}
              <StatusBadge status={doc.status} lang={lang} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2.5 pt-2.5 ml-10 sm:ml-[52px]" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <span className="text-[11px] sm:text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <Calendar size={11} />
            {new Date(doc.created_at).toLocaleDateString()}
          </span>
          {doc.sent_at && (
            <span className="text-[11px] sm:text-xs flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
              <Send size={11} />
              {new Date(doc.sent_at).toLocaleDateString()}
            </span>
          )}
          {doc.signed_at && (
            <span className="text-[11px] sm:text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
              <CheckCircle2 size={11} />
              {new Date(doc.signed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && doc.content && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-6 sm:p-10" style={{ background: 'var(--color-bg-overlay)' }} onClick={() => setShowPreview(false)}>
          <div className="w-full max-w-4xl flex flex-col shadow-2xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', maxHeight: '85vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)', padding: '20px 32px' }}>
              <div className="flex items-center gap-3 min-w-0" style={{ marginRight: '16px' }}>
                <div className="shrink-0" style={{ background: 'var(--color-primary-subtle)', padding: '10px', borderRadius: '12px' }}>
                  <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h3 className="font-semibold text-sm sm:text-base truncate" style={{ color: 'var(--color-text-primary)' }}>{doc.name}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(doc.status === 'draft' || doc.status === 'ready') && doc.lead && (
                  <button
                    onClick={() => { setShowPreview(false); setShowSendModal(true) }}
                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                    style={{ background: 'var(--color-primary)', color: '#fff', padding: '8px 16px', borderRadius: '10px' }}
                  >
                    <Send size={16} />
                    {t.send}
                  </button>
                )}
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
                  className="flex items-center gap-2 text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', padding: '8px 16px', borderRadius: '10px' }}
                >
                  <ExternalLink size={16} />
                  {t.print}
                </button>
                <button onClick={() => setShowPreview(false)} className="shrink-0 transition-colors" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', padding: '10px', borderRadius: '12px' }}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-8" style={{ background: '#f3f4f6' }}>
              <div className="bg-white rounded-lg shadow-lg" style={{ maxWidth: '210mm', width: '100%', margin: '0 auto', padding: '20mm', fontSize: '11pt', lineHeight: '1.6', color: '#1a1a1a' }}>
                <div dangerouslySetInnerHTML={{ __html: doc.content }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="rounded-2xl w-full max-w-sm p-6 space-y-4" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'var(--color-error-subtle)' }}>
                <Trash2 size={20} style={{ color: 'var(--color-error)' }} />
              </div>
              <p className="text-sm pt-2" style={{ color: 'var(--color-text-secondary)' }}>{t.confirmDelete}</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)' }}>
                {t.cancel}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50" style={{ background: 'var(--color-error)', color: '#fff' }}>
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {doc.lead && (
        <SendDocumentModal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          document={doc}
          leadData={{ name: doc.lead.name, phone: doc.lead.phone, email: doc.lead.email }}
          onSuccess={onRefresh}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: EmptyState
// ═══════════════════════════════════════════════════════════════════════════════

function EmptyState({ t, onNewDocument, onUpload }: { t: any; onNewDocument: () => void; onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-primary-subtle)' }}>
        <FileText className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: 'var(--color-primary)' }} />
      </div>
      <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t.noDocuments}</h3>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noDocumentsDesc}</p>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
          onClick={onNewDocument}
          className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          <Plus size={16} />
          {t.newDocument}
        </button>
        <button
          onClick={onUpload}
          className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}
        >
          <Upload size={16} />
          {t.upload}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES DO SELETOR DE LEAD
// ═══════════════════════════════════════════════════════════════════════════════

const LEAD_SELECTOR_T = {
  pt: {
    selectLead: 'Selecione o contato',
    searchLead: 'Buscar contato...',
    noLeads: 'Nenhum contato encontrado',
    cancel: 'Cancelar',
  },
  en: {
    selectLead: 'Select contact',
    searchLead: 'Search contact...',
    noLeads: 'No contacts found',
    cancel: 'Cancel',
  },
  es: {
    selectLead: 'Seleccionar contacto',
    searchLead: 'Buscar contacto...',
    noLeads: 'No se encontraron contactos',
    cancel: 'Cancelar',
  }
}

export default function DocumentsPage() {
  const { user, activeOrg, activeOrgId } = useAuth()
  const { documents, loading, error, refetch } = useLeadDocuments()

  const lang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[lang]
  const lt = LEAD_SELECTOR_T[lang]

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')
  const [showLeadSelector, setShowLeadSelector] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<'create' | 'upload'>('create')
  const [selectedLead, setSelectedLead] = useState<{ id: string; name: string; phone?: string; email?: string } | null>(null)
  const [leadSearch, setLeadSearch] = useState('')
  const [leads, setLeads] = useState<{ id: string; name: string; nome_empresa?: string; phone?: string; email?: string }[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)

  // Buscar leads quando abrir o seletor
  const openLeadSelector = async (action: 'create' | 'upload' = 'create') => {
    setPendingAction(action)
    setShowLeadSelector(true)
    setLeadSearch('')
    setLeadsLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('id, name, nome_empresa, phone, email')
      .eq('org_id', activeOrgId)
      .order('updated_at', { ascending: false })
      .limit(50)
    setLeads(data || [])
    setLeadsLoading(false)
  }

  // Filtrar leads por busca
  const filteredLeads = useMemo(() => {
    if (!leadSearch) return leads
    const s = leadSearch.toLowerCase()
    return leads.filter(l =>
      l.name?.toLowerCase().includes(s) ||
      l.phone?.includes(s) ||
      l.email?.toLowerCase().includes(s)
    )
  }, [leads, leadSearch])

  const handleSelectLead = (lead: typeof leads[0]) => {
    setSelectedLead(lead)
    setShowLeadSelector(false)
    if (pendingAction === 'upload') {
      setShowUploadModal(true)
    } else {
      setShowCreateModal(true)
    }
  }

  // Filtrar documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Filtro de busca
      if (search) {
        const searchLower = search.toLowerCase()
        const matchName = doc.name.toLowerCase().includes(searchLower)
        const matchLead = doc.lead?.name?.toLowerCase().includes(searchLower)
        if (!matchName && !matchLead) return false
      }

      // Filtro de status
      if (statusFilter !== 'all' && doc.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [documents, search, statusFilter])

  // Contadores por status
  const statusCounts = useMemo(() => {
    return documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [documents])

  // Handler para upload — abre o seletor de lead em modo upload
  const handleUpload = () => {
    openLeadSelector('upload')
  }

  return (
    <div className="min-h-[calc(100vh-100px)]" style={{ background: 'var(--color-bg-surface)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-6 pb-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
              <FileText style={{ color: 'var(--color-primary)' }} />
              {t.title}
            </h1>
            <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleUpload}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
              style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}
            >
              <Upload size={16} />
              <span className="hidden sm:inline">{t.upload}</span>
            </button>
            <button
              onClick={() => openLeadSelector('create')}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-lg"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t.newDocument}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl focus:outline-none transition-colors"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
            />
          </div>

          {/* Status Filter */}
          <div className="grid grid-cols-4 sm:flex gap-1.5 sm:gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className="px-2 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-medium text-center transition-colors"
              style={statusFilter === 'all'
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }
              }
            >
              {t.filterAll} ({documents.length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className="px-2 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-medium text-center transition-colors"
              style={statusFilter === 'draft'
                ? { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }
              }
            >
              {t.filterDraft} ({statusCounts.draft || 0})
            </button>
            <button
              onClick={() => setStatusFilter('sent')}
              className="px-2 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-medium text-center transition-colors"
              style={statusFilter === 'sent'
                ? { background: 'var(--color-accent)', color: 'var(--color-text-primary)' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }
              }
            >
              {t.filterSent} ({statusCounts.sent || 0})
            </button>
            <button
              onClick={() => setStatusFilter('signed')}
              className="px-2 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-medium text-center transition-colors"
              style={statusFilter === 'signed'
                ? { background: 'var(--color-success)', color: 'var(--color-text-primary)' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }
              }
            >
              {t.filterSigned} ({statusCounts.signed || 0})
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState t={t} onNewDocument={() => openLeadSelector('create')} onUpload={handleUpload} />
        ) : (
          <div className="grid gap-3">
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} lang={lang} t={t} onRefresh={refetch} orgNiche={(activeOrg as any)?.niche} />
            ))}
          </div>
        )}
      </div>

      {/* Lead Selector Modal */}
      {showLeadSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }} onClick={() => setShowLeadSelector(false)}>
          <div
            className="rounded-2xl max-w-md w-full overflow-hidden"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 pb-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <User size={20} style={{ color: 'var(--color-primary)' }} />
                  {lt.selectLead}
                </h3>
                <button onClick={() => setShowLeadSelector(false)} className="p-1 rounded-lg">
                  <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder={lt.searchLead}
                  value={leadSearch}
                  onChange={e => setLeadSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto px-5 pb-5">
              {leadsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
              ) : filteredLeads.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>{lt.noLeads}</p>
              ) : (
                <div className="space-y-1">
                  {filteredLeads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:opacity-90"
                      style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)' }}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                        {formatLeadInitial(lead, (activeOrg as any)?.niche)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {formatLeadName(lead, (activeOrg as any)?.niche, { lang })}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {lead.phone || lead.email || '—'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Document Modal */}
      {showCreateModal && selectedLead && (
        <CreateDocumentModal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setSelectedLead(null) }}
          leadId={selectedLead.id}
          leadData={{ name: selectedLead.name, phone: selectedLead.phone, email: selectedLead.email }}
          onSuccess={() => { refetch(); setSelectedLead(null) }}
        />
      )}

      {/* Upload Document Modal */}
      {showUploadModal && selectedLead && (
        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => { setShowUploadModal(false); setSelectedLead(null) }}
          leadId={selectedLead.id}
          leadData={{ name: selectedLead.name, phone: selectedLead.phone, email: selectedLead.email }}
          onSuccess={() => { refetch(); setSelectedLead(null) }}
        />
      )}
    </div>
  )
}