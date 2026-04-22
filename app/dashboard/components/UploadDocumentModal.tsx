// app/dashboard/components/UploadDocumentModal.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import UpgradeModal from '@/app/dashboard/components/UpgradeModal'
import { uploadDocument } from '@/lib/documents'
import {
  X,
  Upload,
  FileText,
  Loader2,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_SIZE_MB = 25
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

const ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Fazer Upload de Documento',
    subtitle: 'Envie um arquivo existente para vincular ao contato',
    dragDrop: 'Arraste o arquivo aqui ou clique para selecionar',
    acceptedFormats: 'PDF, imagens, Word, Excel, TXT — até',
    change: 'Trocar arquivo',
    nameLabel: 'Nome do documento',
    namePlaceholder: 'Ex: Contrato assinado',
    descriptionLabel: 'Descrição (opcional)',
    descriptionPlaceholder: 'Observações sobre o documento...',
    cancel: 'Cancelar',
    upload: 'Enviar',
    uploading: 'Enviando...',
    success: 'Documento enviado com sucesso!',
    error: 'Erro ao enviar documento',
    errorTooLarge: `Arquivo maior que ${MAX_SIZE_MB}MB`,
    errorUnsupported: 'Tipo de arquivo não suportado',
    errorNameRequired: 'Informe um nome para o documento',
  },
  en: {
    title: 'Upload Document',
    subtitle: 'Send an existing file to link to the contact',
    dragDrop: 'Drag the file here or click to select',
    acceptedFormats: 'PDF, images, Word, Excel, TXT — up to',
    change: 'Change file',
    nameLabel: 'Document name',
    namePlaceholder: 'E.g., Signed contract',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'Notes about the document...',
    cancel: 'Cancel',
    upload: 'Upload',
    uploading: 'Uploading...',
    success: 'Document uploaded successfully!',
    error: 'Error uploading document',
    errorTooLarge: `File larger than ${MAX_SIZE_MB}MB`,
    errorUnsupported: 'File type not supported',
    errorNameRequired: 'Enter a name for the document',
  },
  es: {
    title: 'Subir Documento',
    subtitle: 'Envía un archivo existente para vincularlo al contacto',
    dragDrop: 'Arrastra el archivo aquí o haz clic para seleccionar',
    acceptedFormats: 'PDF, imágenes, Word, Excel, TXT — hasta',
    change: 'Cambiar archivo',
    nameLabel: 'Nombre del documento',
    namePlaceholder: 'Ej: Contrato firmado',
    descriptionLabel: 'Descripción (opcional)',
    descriptionPlaceholder: 'Notas sobre el documento...',
    cancel: 'Cancelar',
    upload: 'Subir',
    uploading: 'Subiendo...',
    success: '¡Documento subido con éxito!',
    error: 'Error al subir documento',
    errorTooLarge: `Archivo mayor que ${MAX_SIZE_MB}MB`,
    errorUnsupported: 'Tipo de archivo no soportado',
    errorNameRequired: 'Ingresa un nombre para el documento',
  },
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '')
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet
  if (type === 'application/pdf' || type.includes('word') || type.includes('text')) return FileText
  return FileIcon
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface UploadDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  leadData?: { name: string; phone?: string; email?: string }
  onSuccess?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export default function UploadDocumentModal({
  isOpen,
  onClose,
  leadId,
  leadData,
  onSuccess,
}: UploadDocumentModalProps) {
  const { user, activeOrgId } = useAuth()
  const lang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[lang]

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; current: number; limit: number }>({
    open: false,
    current: 0,
    limit: 0,
  })

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setFile(null)
      setName('')
      setDescription('')
      setDragActive(false)
      setFileError(null)
      setUploading(false)
    }
  }, [isOpen])

  const validateAndSetFile = (f: File) => {
    setFileError(null)

    if (f.size > MAX_SIZE_BYTES) {
      setFileError(t.errorTooLarge)
      return
    }

    // Aceita por MIME type OU por extensão (navegador pode retornar '' pro type)
    const ext = f.name.split('.').pop()?.toLowerCase() || ''
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv']
    const typeOk = ACCEPTED_TYPES.includes(f.type)
    const extOk = validExtensions.includes(ext)

    if (!typeOk && !extOk) {
      setFileError(t.errorUnsupported)
      return
    }

    setFile(f)
    if (!name) {
      setName(stripExtension(f.name))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) validateAndSetFile(f)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) validateAndSetFile(f)
  }

  const handleUpload = async () => {
    if (!file || !activeOrgId || !user?.id) return

    if (!name.trim()) {
      setFileError(t.errorNameRequired)
      return
    }

    setUploading(true)
    try {
      // Verificar limite mensal de documentos
      const limitRes = await fetch(`/api/plan-limit?org_id=${activeOrgId}&resource=documents`)
      const limitData = await limitRes.json()
      if (!limitData.allowed) {
        setUpgradeModal({ open: true, current: limitData.current, limit: limitData.limit })
        setUploading(false)
        return
      }

      const { data, error } = await uploadDocument(
        file,
        leadId,
        activeOrgId,
        user.id,
        name.trim(),
        description.trim() || undefined
      )

      if (error) throw new Error(error)

      toast.success(t.success)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(t.error + ': ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  const FileIconComp = file ? getFileIcon(file.type) : Upload

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
        style={{ background: 'var(--color-bg-overlay)' }}
        onClick={onClose}
      >
        <div
          className="rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="min-w-0">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Upload size={20} style={{ color: 'var(--color-primary)' }} />
                {t.title}
              </h2>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {leadData?.name ? `${t.subtitle} — ${leadData.name}` : t.subtitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors shrink-0"
              style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-hover)' }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Dropzone */}
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                className="rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{
                  background: dragActive ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
                  border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'var(--color-primary-subtle)' }}
                >
                  <Upload size={22} style={{ color: 'var(--color-primary)' }} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {t.dragDrop}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t.acceptedFormats} {MAX_SIZE_MB}MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTR}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
              >
                <div
                  className="p-2.5 rounded-lg shrink-0"
                  style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
                >
                  <FileIconComp size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {file.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null)
                    setFileError(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  style={{
                    background: 'var(--color-bg-hover)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {t.change}
                </button>
              </div>
            )}

            {/* Erro */}
            {fileError && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)' }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Nome */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t.nameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Descrição */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t.descriptionLabel}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descriptionPlaceholder}
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none transition-colors"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-5 py-4"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--color-bg-hover)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {t.cancel}
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !name.trim() || uploading}
              className="px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t.uploading}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  {t.upload}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, current: 0, limit: 0 })}
        resource="documents"
        current={upgradeModal.current}
        limit={upgradeModal.limit}
      />
    </>
  )
}
