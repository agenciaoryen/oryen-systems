// lib/documents/useDocuments.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import type { 
  DocumentTemplate, 
  DocumentCategory, 
  LeadDocument, 
  CreateDocumentForm,
  DocumentStatus 
} from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useDocumentTemplates
// ═══════════════════════════════════════════════════════════════════════════════

export function useDocumentTemplates(niche?: string, language?: string) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true)
        let query = supabase
          .from('document_templates')
          .select('*')
          .eq('is_active', true)
          .order('name')

        // Filtrar por nicho: templates do sistema (niche = null ou niche específico)
        if (niche) {
          query = query.or(`niche.is.null,niche.eq.${niche}`)
        }

        // Filtrar por idioma
        if (language) {
          query = query.eq('language', language)
        }

        const { data, error: err } = await query

        if (err) throw err
        setTemplates(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [niche, language])

  return { templates, loading, error }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useDocumentCategories
// ═══════════════════════════════════════════════════════════════════════════════

export function useDocumentCategories(niche?: string) {
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true)
        let query = supabase
          .from('document_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')

        if (niche) {
          query = query.or(`niche.is.null,niche.eq.${niche}`)
        }

        const { data, error } = await query

        if (error) throw error
        setCategories(data || [])
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [niche])

  return { categories, loading }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useLeadDocuments
// ═══════════════════════════════════════════════════════════════════════════════

export function useLeadDocuments(leadId?: string) {
  const { activeOrgId } = useAuth()
  const [documents, setDocuments] = useState<LeadDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!activeOrgId) return

    try {
      setLoading(true)
      let query = supabase
        .from('lead_documents')
        .select(`
          *,
          template:document_templates(id, name, category),
          lead:leads(id, name, nome_empresa, phone, email)
        `)
        .eq('org_id', activeOrgId)
        .order('created_at', { ascending: false })

      if (leadId) {
        query = query.eq('lead_id', leadId)
      }

      const { data, error: err } = await query

      if (err) throw err
      setDocuments(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, leadId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return { documents, loading, error, refetch: fetchDocuments }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useDocument (single document)
// ═══════════════════════════════════════════════════════════════════════════════

export function useDocument(documentId: string) {
  const [document, setDocument] = useState<LeadDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDocument() {
      try {
        setLoading(true)
        
        // Fetch document
        const { data: doc, error: docErr } = await supabase
          .from('lead_documents')
          .select(`
            *,
            template:document_templates(*),
            lead:leads(id, name, nome_empresa, phone, email)
          `)
          .eq('id', documentId)
          .single()

        if (docErr) throw docErr
        setDocument(doc)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (documentId) {
      fetchDocument()
    }
  }, [documentId])

  return { document, loading, error }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE MANIPULAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renderiza o conteúdo HTML do template substituindo as variáveis
 */
export function renderTemplate(
  content: string, 
  data: Record<string, any>
): string {
  let rendered = content
  
  // Substituir variáveis simples {{key}}
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    rendered = rendered.replace(regex, value?.toString() || '')
  })

  // Remover variáveis não preenchidas
  rendered = rendered.replace(/{{[^}]+}}/g, '')

  return rendered
}

/**
 * Cria um novo documento a partir de um template
 */
export async function createDocument(
  form: CreateDocumentForm,
  orgId: string,
  userId: string,
  template: DocumentTemplate
): Promise<{ data: LeadDocument | null; error: string | null }> {
  try {
    // Renderizar o conteúdo
    const contentHtml = renderTemplate(template.content, form.filled_data)
    
    // Gerar UUID para o documento
    const documentId = crypto.randomUUID()
    
    // Criar documento
    const { data, error } = await supabase
      .from('lead_documents')
      .insert({
        id: documentId,
        lead_id: form.lead_id,
        org_id: orgId,
        template_id: form.template_id,
        name: form.name || template.name,
        content: contentHtml,
        status: 'draft',
        metadata: {
          filled_data: form.filled_data,
          template_name: template.name,
          source_type: 'generated'
        },
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err.message }
  }
}

/**
 * Atualiza o conteúdo de um documento
 */
export async function updateDocument(
  documentId: string,
  updates: Partial<LeadDocument>,
  userId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('lead_documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (error) throw error

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Atualiza o status de um documento
 */
export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  userId?: string,
  details?: Record<string, any>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updates: Record<string, any> = { 
      status,
      updated_at: new Date().toISOString()
    }
    
    // Adicionar timestamps baseado no status
    if (status === 'sent') {
      updates.sent_at = new Date().toISOString()
    } else if (status === 'signed') {
      updates.signed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('lead_documents')
      .update(updates)
      .eq('id', documentId)

    if (error) throw error

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Upload de documento
 */
export async function uploadDocument(
  file: File,
  leadId: string,
  orgId: string,
  userId: string,
  name: string,
  description?: string
): Promise<{ data: LeadDocument | null; error: string | null }> {
  try {
    // Gerar UUID para o documento
    const documentId = crypto.randomUUID()
    
    // Upload do arquivo para o Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${orgId}/${leadId}/${Date.now()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Criar registro do documento
    const { data, error } = await supabase
      .from('lead_documents')
      .insert({
        id: documentId,
        lead_id: leadId,
        org_id: orgId,
        name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        status: 'draft',
        metadata: {
          file_name: file.name,
          file_size: file.size,
          source_type: 'uploaded',
          description
        },
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err.message }
  }
}

/**
 * Deletar documento
 */
export async function deleteDocument(
  documentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Primeiro buscar o documento para verificar se tem arquivo
    const { data: doc } = await supabase
      .from('lead_documents')
      .select('file_url')
      .eq('id', documentId)
      .single()

    // Se tiver arquivo, deletar do storage
    if (doc?.file_url) {
      const path = doc.file_url.split('/documents/')[1]
      if (path) {
        await supabase.storage.from('documents').remove([path])
      }
    }

    // Deletar documento
    const { error } = await supabase
      .from('lead_documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}