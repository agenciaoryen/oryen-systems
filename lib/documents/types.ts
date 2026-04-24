// lib/documents/types.ts

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DO MÓDULO DE DOCUMENTOS
// ═══════════════════════════════════════════════════════════════════════════════

export type DocumentStatus = 
  | 'draft'      // Rascunho
  | 'ready'      // Pronto para enviar
  | 'sent'       // Enviado
  | 'viewed'     // Visualizado pelo destinatário
  | 'signed'     // Assinado
  | 'archived'   // Arquivado
  | 'canceled'   // Cancelado

export type DocumentSourceType = 'generated' | 'uploaded'

export type SendVia = 'email' | 'whatsapp' | null

export type VariableType = 'text' | 'number' | 'email' | 'date' | 'select' | 'boolean' | 'image'

// ─────────────────────────────────────────────────────────────────────────────────
// CATEGORIAS
// ─────────────────────────────────────────────────────────────────────────────────

export interface DocumentCategory {
  id: string
  slug: string
  name_pt: string
  name_en: string
  name_es: string
  description_pt?: string
  description_en?: string
  description_es?: string
  niche?: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────────
// VARIÁVEIS DO TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────────

export interface TemplateVariable {
  key: string
  label: string
  type: VariableType
  required?: boolean
  placeholder?: string
  source?: string // 'lead.name', 'lead.phone', 'user.name', 'org.name', 'auto'
  options?: string[] // Para tipo 'select'
  defaultValue?: string | number | boolean
}

// ─────────────────────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────────

export interface DocumentTemplate {
  id: string
  org_id?: string
  name: string
  description?: string
  category: string // slug da categoria
  content: string // HTML com {{variáveis}}
  variables: TemplateVariable[]
  niche?: string
  language: string
  is_system: boolean
  is_active: boolean
  version?: number
  created_by?: string
  created_at: string
  updated_at?: string
}

// ─────────────────────────────────────────────────────────────────────────────────
// DOCUMENTOS DO LEAD
// ─────────────────────────────────────────────────────────────────────────────────

export interface LeadDocument {
  id: string
  lead_id: string
  org_id: string
  template_id?: string
  name: string
  content?: string
  file_url?: string
  file_type?: string
  status: DocumentStatus
  sent_via?: SendVia
  sent_at?: string
  signed_at?: string
  metadata?: Record<string, any>
  created_by?: string
  created_at: string
  updated_at: string
  
  // Joins
  template?: DocumentTemplate
  lead?: {
    id: string
    name: string
    nome_empresa?: string | null
    phone?: string
    email?: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// HISTÓRICO
// ─────────────────────────────────────────────────────────────────────────────────

export type DocumentAction = 
  | 'created'
  | 'edited'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'downloaded'
  | 'archived'
  | 'canceled'

export interface LeadDocumentHistory {
  id: string
  document_id: string
  action: DocumentAction
  details?: Record<string, any>
  user_id?: string
  user_name?: string
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────────
// FORMULÁRIO DE CRIAÇÃO
// ─────────────────────────────────────────────────────────────────────────────────

export interface CreateDocumentForm {
  template_id: string
  lead_id: string
  name?: string
  filled_data: Record<string, any>
}

export interface UploadDocumentForm {
  lead_id: string
  name: string
  description?: string
  file: File
  category?: string
}

// ─────────────────────────────────────────────────────────────────────────────────
// TRADUÇÕES
// ─────────────────────────────────────────────────────────────────────────────────

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, { pt: string; en: string; es: string }> = {
  draft: { pt: 'Rascunho', en: 'Draft', es: 'Borrador' },
  ready: { pt: 'Pronto', en: 'Ready', es: 'Listo' },
  sent: { pt: 'Enviado', en: 'Sent', es: 'Enviado' },
  viewed: { pt: 'Visualizado', en: 'Viewed', es: 'Visto' },
  signed: { pt: 'Assinado', en: 'Signed', es: 'Firmado' },
  archived: { pt: 'Arquivado', en: 'Archived', es: 'Archivado' },
  canceled: { pt: 'Cancelado', en: 'Canceled', es: 'Cancelado' },
}

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  ready: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  sent: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  viewed: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  signed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  archived: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  canceled: 'bg-red-500/10 text-red-400 border-red-500/30',
}