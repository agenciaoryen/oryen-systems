// app/dashboard/components/CreateDocumentModal.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { 
  useDocumentTemplates, 
  createDocument, 
  renderTemplate 
} from '@/lib/documents'
import type { DocumentTemplate, TemplateVariable } from '@/lib/documents/types'
import {
  X,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Eye,
  Check,
  AlertCircle,
  CalendarCheck,
  Home,
  Building2,
  FileSignature,
  File
} from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Novo Documento',
    selectTemplate: 'Selecione um modelo',
    fillFields: 'Preencha os campos',
    preview: 'Visualizar',
    back: 'Voltar',
    next: 'Próximo',
    create: 'Criar Documento',
    creating: 'Criando...',
    cancel: 'Cancelar',
    required: 'Obrigatório',
    noTemplates: 'Nenhum modelo disponível',
    success: 'Documento criado com sucesso!',
    error: 'Erro ao criar documento',
    step: 'Passo',
    of: 'de',
  },
  en: {
    title: 'New Document',
    selectTemplate: 'Select a template',
    fillFields: 'Fill in the fields',
    preview: 'Preview',
    back: 'Back',
    next: 'Next',
    create: 'Create Document',
    creating: 'Creating...',
    cancel: 'Cancel',
    required: 'Required',
    noTemplates: 'No templates available',
    success: 'Document created successfully!',
    error: 'Error creating document',
    step: 'Step',
    of: 'of',
  },
  es: {
    title: 'Nuevo Documento',
    selectTemplate: 'Selecciona una plantilla',
    fillFields: 'Completa los campos',
    preview: 'Vista previa',
    back: 'Volver',
    next: 'Siguiente',
    create: 'Crear Documento',
    creating: 'Creando...',
    cancel: 'Cancelar',
    required: 'Requerido',
    noTemplates: 'No hay plantillas disponibles',
    success: '¡Documento creado con éxito!',
    error: 'Error al crear documento',
    step: 'Paso',
    of: 'de',
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// ÍCONES POR CATEGORIA
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  visit_order: <CalendarCheck size={20} />,
  rental_authorization: <Home size={20} />,
  sale_authorization: <Building2 size={20} />,
  commercial_proposal: <FileSignature size={20} />,
  other: <File size={20} />,
}

const CATEGORY_COLORS: Record<string, string> = {
  visit_order: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  rental_authorization: 'bg-green-500/10 text-green-400 border-green-500/30',
  sale_authorization: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  commercial_proposal: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  other: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface CreateDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  leadData?: {
    name?: string
    phone?: string
    email?: string
  }
  onSuccess?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function CreateDocumentModal({
  isOpen,
  onClose,
  leadId,
  leadData,
  onSuccess
}: CreateDocumentModalProps) {
  const { user, org, activeOrgId } = useAuth()
  
  const lang = (user?.language as Language) || 'es'
  const t = TRANSLATIONS[lang]
  
  // Buscar templates filtrados por nicho E idioma
  const { templates, loading: loadingTemplates } = useDocumentTemplates(
    org?.niche ?? undefined,
    lang
  )

  // State
  const [step, setStep] = useState(1) // 1: Select template, 2: Fill fields, 3: Preview
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [creating, setCreating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedTemplate(null)
      setFormData({})
      setErrors({})
    }
  }, [isOpen])

  // Pré-preencher com dados do lead e usuário
  useEffect(() => {
    if (selectedTemplate && step === 2) {
      const initialData: Record<string, any> = {}
      
      selectedTemplate.variables.forEach(v => {
        if (v.source) {
          if (v.source === 'lead.name') initialData[v.key] = leadData?.name || ''
          else if (v.source === 'lead.phone') initialData[v.key] = leadData?.phone || ''
          else if (v.source === 'lead.email') initialData[v.key] = leadData?.email || ''
          else if (v.source === 'user.name') initialData[v.key] = user?.name || ''
          else if (v.source === 'org.name') initialData[v.key] = org?.name || ''
          else if (v.source === 'auto' && v.type === 'date') {
            initialData[v.key] = new Date().toLocaleDateString()
          }
        }
        if (v.defaultValue !== undefined) {
          initialData[v.key] = v.defaultValue
        }
      })

      // Preencher data atual
      const now = new Date()
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      initialData['visit_day'] = initialData['contract_day'] = now.getDate().toString()
      initialData['visit_month'] = initialData['contract_month'] = months[now.getMonth()]
      initialData['visit_year'] = initialData['contract_year'] = now.getFullYear().toString()

      setFormData(prev => ({ ...initialData, ...prev }))
    }
  }, [selectedTemplate, step, leadData, user, org])

  // Preview renderizado
  const previewHtml = useMemo(() => {
    if (!selectedTemplate) return ''
    return renderTemplate(selectedTemplate.content, formData)
  }, [selectedTemplate, formData])

  // Validar campos obrigatórios
  const validateForm = (): boolean => {
    if (!selectedTemplate) return false
    
    const newErrors: Record<string, string> = {}
    
    selectedTemplate.variables
      .filter(v => v.required)
      .forEach(v => {
        if (!formData[v.key] || formData[v.key].toString().trim() === '') {
          newErrors[v.key] = t.required
        }
      })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handlers
  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setStep(2)
  }

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleNext = () => {
    if (step === 2) {
      if (validateForm()) {
        setStep(3)
      }
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setSelectedTemplate(null)
      setStep(1)
    } else if (step === 3) {
      setStep(2)
    }
  }

  const handleCreate = async () => {
    if (!selectedTemplate || !activeOrgId || !user?.id) return

    setCreating(true)
    try {
      const { data, error } = await createDocument(
        {
          template_id: selectedTemplate.id,
          lead_id: leadId,
          name: selectedTemplate.name,
          filled_data: formData
        },
        activeOrgId,
        user.id,
        selectedTemplate
      )

      if (error) throw new Error(error)

      toast.success(t.success)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(t.error + ': ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="text-blue-400" size={20} />
              {t.title}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {t.step} {step} {t.of} 3: {
                step === 1 ? t.selectTemplate :
                step === 2 ? t.fillFields :
                t.preview
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Template */}
          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {loadingTemplates ? (
                <div className="col-span-2 flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  {t.noTemplates}
                </div>
              ) : (
                templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-4 rounded-xl border text-left transition-all hover:border-blue-500/50 hover:bg-blue-500/5 ${
                      CATEGORY_COLORS[template.category] || CATEGORY_COLORS.other
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {CATEGORY_ICONS[template.category] || CATEGORY_ICONS.other}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-2">
                          {template.variables.length} campos
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-600 shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: Fill Fields */}
          {step === 2 && selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.variables.map((variable) => (
                <div key={variable.key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {variable.label}
                    {variable.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  
                  {variable.type === 'select' && variable.options ? (
                    <select
                      value={formData[variable.key] || ''}
                      onChange={(e) => handleInputChange(variable.key, e.target.value)}
                      className={`w-full px-3 py-2.5 bg-[#0a0a0a] border rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors ${
                        errors[variable.key] ? 'border-red-500' : 'border-white/10'
                      }`}
                    >
                      <option value="">Seleccionar...</option>
                      {variable.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : variable.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData[variable.key] || false}
                        onChange={(e) => handleInputChange(variable.key, e.target.checked)}
                        className="w-5 h-5 rounded bg-[#0a0a0a] border-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-gray-400 text-sm">Sí</span>
                    </label>
                  ) : (
                    <input
                      type={variable.type === 'email' ? 'email' : variable.type === 'number' ? 'number' : 'text'}
                      value={formData[variable.key] || ''}
                      onChange={(e) => handleInputChange(variable.key, e.target.value)}
                      placeholder={variable.placeholder}
                      className={`w-full px-3 py-2.5 bg-[#0a0a0a] border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors ${
                        errors[variable.key] ? 'border-red-500' : 'border-white/10'
                      }`}
                    />
                  )}
                  
                  {errors[variable.key] && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors[variable.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="bg-white rounded-lg overflow-hidden">
              <div 
                className="p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-[#0a0a0a]">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {step === 1 ? (
              t.cancel
            ) : (
              <>
                <ChevronLeft size={16} />
                {t.back}
              </>
            )}
          </button>

          <div className="flex gap-2">
            {step === 2 && (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Eye size={16} />
                {t.preview}
                <ChevronRight size={16} />
              </button>
            )}
            
            {step === 3 && (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t.creating}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {t.create}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}