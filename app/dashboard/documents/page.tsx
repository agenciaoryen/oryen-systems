// app/dashboard/documents/page.tsx
'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useLeadDocuments, useDocumentCategories } from '@/lib/documents'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  type LeadDocument,
  type DocumentStatus
} from '@/lib/documents/types'
import CreateDocumentModal from '@/app/dashboard/components/CreateDocumentModal'
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
  X
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

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
    download: 'Baixar',
    edit: 'Editar',
    delete: 'Excluir',
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
    download: 'Download',
    edit: 'Edit',
    delete: 'Delete',
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
    download: 'Descargar',
    edit: 'Editar',
    delete: 'Eliminar',
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

function DocumentCard({ doc, lang, t }: { doc: LeadDocument; lang: Language; t: any }) {
  const [showMenu, setShowMenu] = useState(false)

  const categoryIcon = CATEGORY_ICONS[doc.template?.category || 'other'] || <File size={16} />

  return (
    <div
      className="rounded-xl p-4 transition-all group"
      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)' }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-lg shrink-0" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            {doc.source_type === 'uploaded' ? <Upload size={18} /> : categoryIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{doc.name}</h3>
            {doc.lead && (
              <Link
                href={`/dashboard/crm/${doc.lead.id}`}
                className="text-sm flex items-center gap-1 mt-0.5 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <User size={12} />
                {doc.lead.name}
              </Link>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <StatusBadge status={doc.status} lang={lang} />

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 rounded-lg shadow-xl z-20 py-1 min-w-[140px]"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
                >
                  <button className="w-full px-3 py-2 text-sm text-left flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <Eye size={14} /> {t.view}
                  </button>
                  {doc.status === 'draft' && (
                    <button className="w-full px-3 py-2 text-sm text-left flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                      <Send size={14} /> {t.send}
                    </button>
                  )}
                  {doc.file_url && (
                    <button className="w-full px-3 py-2 text-sm text-left flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                      <Download size={14} /> {t.download}
                    </button>
                  )}
                  <hr style={{ borderColor: 'var(--color-border-subtle)' }} className="my-1" />
                  <button className="w-full px-3 py-2 text-sm text-left flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
                    <X size={14} /> {t.delete}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <Calendar size={12} />
          {t.createdAt}: {new Date(doc.created_at).toLocaleDateString()}
        </span>
        {doc.sent_at && (
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
            <Send size={12} />
            {new Date(doc.sent_at).toLocaleDateString()}
          </span>
        )}
        {doc.signed_at && (
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
            <CheckCircle2 size={12} />
            {new Date(doc.signed_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: EmptyState
// ═══════════════════════════════════════════════════════════════════════════════

function EmptyState({ t, onNewDocument, onUpload }: { t: any; onNewDocument: () => void; onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-primary-subtle)' }}>
        <FileText className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t.noDocuments}</h3>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>{t.noDocumentsDesc}</p>
      <div className="flex gap-3">
        <button
          onClick={onNewDocument}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          <Plus size={16} />
          {t.newDocument}
        </button>
        <button
          onClick={onUpload}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
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

export default function DocumentsPage() {
  const { user } = useAuth()
  const { documents, loading, error, refetch } = useLeadDocuments()

  const lang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[lang]

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

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

  // Handler para upload (TODO: implementar)
  const handleUpload = () => {
    toast.info('Upload de arquivos em breve!')
  }

  return (
    <div className="min-h-[calc(100vh-100px)] p-4 sm:p-6" style={{ background: 'var(--color-bg-surface)' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text-primary)' }}>
              <FileText style={{ color: 'var(--color-primary)' }} />
              {t.title}
            </h1>
            <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.subtitle}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
              style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}
            >
              <Upload size={16} />
              {t.upload}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-lg"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <Plus size={16} />
              {t.newDocument}
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
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={statusFilter === 'all'
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }
              }
            >
              {t.filterAll} ({documents.length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={statusFilter === 'draft'
                ? { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }
              }
            >
              {t.filterDraft} ({statusCounts.draft || 0})
            </button>
            <button
              onClick={() => setStatusFilter('sent')}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={statusFilter === 'sent'
                ? { background: 'var(--color-accent)', color: 'var(--color-text-primary)' }
                : { background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }
              }
            >
              {t.filterSent} ({statusCounts.sent || 0})
            </button>
            <button
              onClick={() => setStatusFilter('signed')}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
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
          <EmptyState t={t} onNewDocument={() => setShowCreateModal(true)} onUpload={handleUpload} />
        ) : (
          <div className="grid gap-3">
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} lang={lang} t={t} />
            ))}
          </div>
        )}
      </div>

      {/* Create Document Modal - Nota: precisa de leadId */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div
            className="rounded-2xl p-6 max-w-md w-full text-center"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}
          >
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {lang === 'pt' ? 'Criar Documento' : lang === 'es' ? 'Crear Documento' : 'Create Document'}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
              {lang === 'pt'
                ? 'Para criar um documento, acesse o perfil de um contato e clique em "Novo Documento" na seção de documentos.'
                : lang === 'es'
                ? 'Para crear un documento, acceda al perfil de un contacto y haga clic en "Nuevo Documento" en la sección de documentos.'
                : 'To create a document, go to a contact profile and click "New Document" in the documents section.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}
              >
                {lang === 'pt' ? 'Fechar' : lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
              <Link
                href="/dashboard/crm"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {lang === 'pt' ? 'Ir para CRM' : lang === 'es' ? 'Ir al CRM' : 'Go to CRM'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}