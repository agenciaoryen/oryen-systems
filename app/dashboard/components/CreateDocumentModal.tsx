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
  File,
  HelpCircle
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

// ═══════════════════════════════════════════════════════════════════════════════
// DICAS DE AJUDA PARA CAMPOS (por key do campo)
// Explicações claras sobre o que é cada campo e qual informação deve conter
// ═══════════════════════════════════════════════════════════════════════════════

const FIELD_HINTS: Record<string, { pt: string; en: string; es: string }> = {
  // ═══ DADOS DA VISITA ═══
  visit_day: {
    pt: 'Dia do mês em que a visita ocorrerá (1-31)',
    en: 'Day of the month when the visit will occur (1-31)',
    es: 'Día del mes en que se realizará la visita (1-31). Ejemplo: 15'
  },
  visit_month: {
    pt: 'Nome do mês por extenso',
    en: 'Full month name',
    es: 'Nombre del mes escrito completo. Ejemplo: Marzo, Abril, Mayo'
  },
  visit_year: {
    pt: 'Ano com 4 dígitos',
    en: 'Year with 4 digits',
    es: 'Año con 4 dígitos. Ejemplo: 2026'
  },
  
  // ═══ DADOS DO CONTRATO ═══
  city: {
    pt: 'Cidade onde o contrato está sendo assinado',
    en: 'City where the contract is being signed',
    es: 'Ciudad donde se firma el documento. Ejemplo: Santiago, Valparaíso, Concepción'
  },
  contract_day: {
    pt: 'Dia do mês da assinatura do contrato',
    en: 'Day of contract signature',
    es: 'Día del mes en que se firma el contrato (1-31)'
  },
  contract_month: {
    pt: 'Mês da assinatura por extenso',
    en: 'Month of signature in full',
    es: 'Mes de firma escrito completo. Ejemplo: Enero, Febrero'
  },
  contract_year: {
    pt: 'Ano da assinatura com 4 dígitos',
    en: 'Year of signature with 4 digits',
    es: 'Año de firma con 4 dígitos. Ejemplo: 2026'
  },
  contract_duration: {
    pt: 'Por quantos dias este contrato será válido',
    en: 'How many days this contract will be valid',
    es: 'Cantidad de días que el contrato/autorización tendrá validez. Generalmente 60, 90 o 120 días'
  },
  is_exclusive: {
    pt: 'Se o contrato é exclusivo (só esta imobiliária pode negociar)',
    en: 'If the contract is exclusive (only this agency can negotiate)',
    es: 'Marque si este es un contrato de exclusividad, donde solo su corredora puede ofrecer la propiedad'
  },
  
  // ═══ DADOS DO CLIENTE (visitante/interessado) ═══
  client_name: {
    pt: 'Nome completo do cliente que visitará o imóvel',
    en: 'Full name of client who will visit the property',
    es: 'Nombre completo de la persona interesada que realizará la visita a la propiedad'
  },
  client_rut: {
    pt: 'RUT é o documento de identificação chileno (equivalente ao CPF)',
    en: 'RUT is the Chilean ID number',
    es: 'RUT (Rol Único Tributario): Documento de identidad chileno. Formato: 12.345.678-9'
  },
  client_phone: {
    pt: 'Telefone de contato do cliente',
    en: 'Client contact phone number',
    es: 'Número de teléfono del cliente para contacto. Incluya código de área (+56 9 ...)'
  },
  
  // ═══ DADOS DO PROPRIETÁRIO ═══
  owner_name: {
    pt: 'Nome completo do dono do imóvel',
    en: 'Full name of property owner',
    es: 'Nombre completo del dueño de la propiedad tal como aparece en sus documentos'
  },
  owner_rut: {
    pt: 'RUT é o documento de identificação chileno',
    en: 'RUT is the Chilean ID number',
    es: 'RUT del propietario (Rol Único Tributario). Formato: 12.345.678-9'
  },
  owner_nationality: {
    pt: 'País de origem do proprietário',
    en: 'Owner country of origin',
    es: 'Nacionalidad del propietario. Ejemplo: Chilena, Argentina, Peruana'
  },
  owner_address: {
    pt: 'Endereço residencial atual do proprietário',
    en: 'Current residential address of owner',
    es: 'Dirección donde vive actualmente el propietario (puede ser diferente de la propiedad)'
  },
  owner_comuna: {
    pt: 'Comuna/bairro onde o proprietário mora',
    en: 'District where owner lives',
    es: 'Comuna o sector donde reside el propietario. Ejemplo: Providencia, Las Condes, Ñuñoa'
  },
  owner_city: {
    pt: 'Cidade onde o proprietário mora',
    en: 'City where owner lives',
    es: 'Ciudad de residencia del propietario'
  },
  owner_civil_status: {
    pt: 'Estado civil do proprietário',
    en: 'Owner marital status',
    es: 'Estado civil del propietario: Soltero/a, Casado/a, Viudo/a o Divorciado/a'
  },
  owner_profession: {
    pt: 'Profissão ou ocupação do proprietário',
    en: 'Owner profession or occupation',
    es: 'Profesión u ocupación del propietario. Ejemplo: Ingeniero, Médico, Comerciante'
  },
  owner_email: {
    pt: 'Email de contato do proprietário',
    en: 'Owner contact email',
    es: 'Correo electrónico del propietario para envío de documentos y notificaciones'
  },
  owner_phone: {
    pt: 'Telefone de contato do proprietário',
    en: 'Owner contact phone',
    es: 'Teléfono del propietario. Incluya código de área (+56 9 ...)'
  },
  
  // ═══ DADOS DO IMÓVEL ═══
  property_address: {
    pt: 'Endereço completo do imóvel (rua, número)',
    en: 'Full property address (street, number)',
    es: 'Dirección completa de la propiedad: calle, número, depto si aplica. Ejemplo: Av. Providencia 1234, Depto 501'
  },
  property_comuna: {
    pt: 'Comuna/bairro onde o imóvel está localizado',
    en: 'District where property is located',
    es: 'Comuna donde se ubica la propiedad. Ejemplo: Santiago Centro, Vitacura, La Florida'
  },
  property_location: {
    pt: 'Localização/região do imóvel',
    en: 'Property location/region',
    es: 'Ubicación o sector específico de la propiedad. Ejemplo: Barrio El Golf, Sector Oriente'
  },
  property_rol: {
    pt: 'ROL é o número de identificação do imóvel no registro chileno',
    en: 'ROL is the property ID number in Chilean registry',
    es: 'ROL: Número único que identifica la propiedad en el Conservador de Bienes Raíces. Se encuentra en las contribuciones o escritura. Formato: 1234-5'
  },
  property_surface: {
    pt: 'Área total do imóvel em metros quadrados',
    en: 'Total property area in square meters',
    es: 'Superficie total de la propiedad en metros cuadrados (m²). Ejemplo: 120 m²'
  },
  property_land_surface: {
    pt: 'Área do terreno em metros quadrados',
    en: 'Land area in square meters',
    es: 'Superficie del terreno en m². Para casas, es el tamaño total del sitio'
  },
  property_built_surface: {
    pt: 'Área construída em metros quadrados',
    en: 'Built area in square meters',
    es: 'Superficie construida en m². Es el área techada/habitable de la propiedad'
  },
  property_type: {
    pt: 'Tipo de imóvel (casa, apartamento, terreno, etc)',
    en: 'Property type (house, apartment, land, etc)',
    es: 'Tipo de propiedad: Casa, Departamento, Terreno, Local comercial, Oficina, Bodega o Parcela'
  },
  
  // ═══ VALORES E CONDIÇÕES ═══
  property_value: {
    pt: 'Valor de venda ou avaliação do imóvel',
    en: 'Property sale or appraisal value',
    es: 'Valor de la propiedad. Puede ser en UF (Unidad de Fomento) o CLP. Ejemplo: UF 5.000 o $150.000.000'
  },
  sale_price: {
    pt: 'Preço de venda do imóvel',
    en: 'Property sale price',
    es: 'Precio de venta de la propiedad. En UF o CLP. Ejemplo: UF 8.000'
  },
  rental_price: {
    pt: 'Valor mensal do aluguel',
    en: 'Monthly rental price',
    es: 'Precio mensual de arriendo. En CLP o UF. Ejemplo: $500.000 o UF 15'
  },
  rental_period: {
    pt: 'Período mínimo de locação em meses',
    en: 'Minimum rental period in months',
    es: 'Período mínimo de arriendo en meses. Generalmente 12 o 24 meses'
  },
  guarantee_months: {
    pt: 'Quantos meses de garantia/caução são exigidos',
    en: 'How many months of deposit are required',
    es: 'Meses de garantía que debe pagar el arrendatario. Generalmente 1 o 2 meses de arriendo'
  },
  commission_percentage: {
    pt: 'Porcentagem de comissão sobre a transação',
    en: 'Commission percentage on the transaction',
    es: 'Porcentaje de comisión que cobra la corredora. Generalmente 50% del primer mes para arriendos, o 2% del valor para ventas'
  },
  
  // ═══ DADOS DO CORRETOR/EMPRESA ═══
  agent_name: {
    pt: 'Nome do corretor responsável pela negociação',
    en: 'Name of agent responsible for the deal',
    es: 'Nombre completo del corredor de propiedades que gestiona esta operación'
  },
  org_name: {
    pt: 'Nome da imobiliária ou corretora',
    en: 'Real estate agency name',
    es: 'Nombre de la corredora de propiedades o empresa inmobiliaria'
  },
  org_logo: {
    pt: 'Logo da empresa para o documento',
    en: 'Company logo for the document',
    es: 'Logo de su empresa que aparecerá en el documento generado'
  },
  generated_date: {
    pt: 'Data de geração do documento',
    en: 'Document generation date',
    es: 'Fecha en que se genera el documento (automático)'
  },
}

const CATEGORY_COLORS: Record<string, string> = {
  visit_order: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  rental_authorization: 'bg-green-500/10 text-green-400 border-green-500/30',
  sale_authorization: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  commercial_proposal: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  other: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: FieldHint (Tooltip de ajuda)
// ═══════════════════════════════════════════════════════════════════════════════

function FieldHint({ fieldKey, lang, label }: { fieldKey: string; lang: Language; label: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const hint = FIELD_HINTS[fieldKey]
  
  // Se não tiver hint específico, criar um baseado no tipo de campo
  const getText = () => {
    if (hint) {
      return hint[lang] || hint.es || hint.en
    }
    // Fallback inteligente baseado no label
    const fallbacks: Record<Language, string> = {
      pt: `Informe: ${label}`,
      en: `Enter: ${label}`,
      es: `Ingrese la información correspondiente a "${label}"`
    }
    return fallbacks[lang]
  }
  
  return (
    <div className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsVisible(!isVisible)
        }}
        className="text-gray-500 hover:text-blue-400 transition-colors focus:outline-none"
        aria-label="Ajuda"
      >
        <HelpCircle size={14} />
      </button>
      
      {isVisible && (
        <>
          {/* Overlay para fechar no mobile */}
          <div 
            className="fixed inset-0 z-40 sm:hidden" 
            onClick={() => setIsVisible(false)} 
          />
          
          {/* Tooltip - posicionado à direita */}
          <div className="absolute z-50 left-6 top-1/2 -translate-y-1/2 w-64 sm:w-72 p-3 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-2xl text-xs text-gray-200 leading-relaxed whitespace-normal">
            {getText()}
            {/* Seta apontando para a esquerda */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#1a1a1a]" />
          </div>
        </>
      )}
    </div>
  )
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
  const { user, activeOrg, activeOrgId } = useAuth()
  
  const lang = (user?.language as Language) || 'es'
  const t = TRANSLATIONS[lang]
  
  // Buscar templates filtrados por nicho E idioma
  const { templates, loading: loadingTemplates } = useDocumentTemplates(
    activeOrg?.niche ?? undefined,
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
          else if (v.source === 'org.name') initialData[v.key] = activeOrg?.name || ''
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
  }, [selectedTemplate, step, leadData, user, activeOrg])

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
                  <label className="flex items-center text-sm font-medium text-gray-300 mb-1.5">
                    {variable.label}
                    {variable.required && <span className="text-red-400 ml-1">*</span>}
                    <FieldHint fieldKey={variable.key} lang={lang} label={variable.label} />
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
            <div className="bg-gray-100 rounded-lg overflow-hidden p-4">
              <div 
                className="mx-auto bg-white rounded-lg shadow-lg p-8"
                style={{
                  maxWidth: '210mm',
                  width: '100%',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  fontSize: '11pt',
                  lineHeight: '1.5',
                  color: '#1a1a1a'
                }}
              >
                <style dangerouslySetInnerHTML={{ __html: `
                  .doc-preview-create h1, .doc-preview-create h2, .doc-preview-create h3, .doc-preview-create h4 {
                    color: #0f172a !important;
                    margin-bottom: 0.5em;
                    font-weight: 600;
                  }
                  .doc-preview-create h1 { font-size: 18pt; }
                  .doc-preview-create h2 { font-size: 14pt; }
                  .doc-preview-create h3 { font-size: 12pt; }
                  .doc-preview-create p {
                    margin-bottom: 0.75em;
                    color: #374151 !important;
                  }
                  .doc-preview-create table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1em 0;
                    font-size: 10pt;
                  }
                  .doc-preview-create th, .doc-preview-create td {
                    border: 1px solid #d1d5db !important;
                    padding: 10px 12px;
                    text-align: left;
                    vertical-align: top;
                    color: #1f2937 !important;
                  }
                  .doc-preview-create th {
                    background-color: #f3f4f6 !important;
                    font-weight: 600;
                    color: #1f2937 !important;
                  }
                  .doc-preview-create tr:nth-child(even) {
                    background-color: #f9fafb;
                  }
                  .doc-preview-create strong, .doc-preview-create b {
                    font-weight: 600;
                    color: #1f2937 !important;
                  }
                  .doc-preview-create ul, .doc-preview-create ol {
                    margin: 0.5em 0 0.5em 1.5em;
                    color: #374151 !important;
                  }
                  .doc-preview-create li {
                    margin-bottom: 0.25em;
                    color: #374151 !important;
                  }
                  .doc-preview-create span, .doc-preview-create div {
                    color: #1f2937 !important;
                  }
                `}} />
                <div 
                  className="doc-preview-create"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
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