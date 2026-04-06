// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { PROPERTY_TYPES, TRANSACTION_TYPES, PROPERTY_STATUSES, AMENITIES, BR_STATES } from '@/lib/properties/constants'
import { toast } from 'sonner'
import {
  Save,
  Loader2,
  ArrowLeft,
  ImageIcon,
  Upload,
  X,
  Star,
  GripVertical,
  Trash2,
  Eye,
  Home,
  MapPin,
  Sliders,
  Camera,
  Send,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
  pt: {
    newTitle: 'Novo Imóvel',
    editTitle: 'Editar Imóvel',
    tabs: { basic: 'Básico', location: 'Localização', features: 'Características', photos: 'Fotos', publish: 'Publicação' },
    // Básico
    title: 'Título do imóvel',
    titlePlaceholder: 'Ex: Apartamento 3 quartos no Centro',
    description: 'Descrição',
    descriptionPlaceholder: 'Descreva o imóvel detalhadamente...',
    propertyType: 'Tipo de imóvel',
    transactionType: 'Tipo de transação',
    price: 'Preço',
    condoFee: 'Condomínio',
    iptu: 'IPTU',
    // Localização
    street: 'Rua',
    number: 'Número',
    complement: 'Complemento',
    neighborhood: 'Bairro',
    city: 'Cidade',
    state: 'Estado',
    zip: 'CEP',
    // Características
    bedrooms: 'Quartos',
    suites: 'Suítes',
    bathrooms: 'Banheiros',
    parkingSpots: 'Vagas',
    totalArea: 'Área total (m²)',
    privateArea: 'Área privativa (m²)',
    amenities: 'Amenidades',
    // Fotos
    uploadPhotos: 'Arraste fotos aqui ou clique para selecionar',
    uploadHint: 'JPG, PNG ou WebP • Máx 5MB • Até 20 fotos',
    setCover: 'Definir como capa',
    isCover: 'Capa',
    removePhoto: 'Remover',
    uploading: 'Enviando...',
    // Publicação
    status: 'Status',
    isFeatured: 'Imóvel destaque',
    featuredHint: 'Aparece em destaque no site e listagens',
    externalCode: 'Código de referência',
    videoUrl: 'URL do vídeo',
    virtualTourUrl: 'URL do tour virtual',
    // Ações
    save: 'Salvar',
    saving: 'Salvando...',
    back: 'Voltar',
    created: 'Imóvel criado com sucesso!',
    updated: 'Imóvel atualizado com sucesso!',
    errorRequired: 'Preencha título, tipo de imóvel e tipo de transação.',
  },
}

type Lang = 'pt' | 'en' | 'es'

const TABS = ['basic', 'location', 'features', 'photos', 'publish'] as const
const TAB_ICONS = { basic: Home, location: MapPin, features: Sliders, photos: Camera, publish: Send }

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

interface PropertyFormProps {
  propertyId?: string
  initialData?: any
}

export default function PropertyForm({ propertyId, initialData }: PropertyFormProps) {
  const router = useRouter()
  const orgId = useActiveOrgId()
  const { user } = useAuth()
  const currency = (user as any)?.currency || 'BRL'
  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  const lang: Lang = 'pt'
  const t = T[lang]
  const isEditing = !!propertyId
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── FORM STATE ───
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('basic')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    property_type: 'apartment',
    transaction_type: 'sale',
    price: '',
    condo_fee: '',
    iptu: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    bedrooms: 0,
    suites: 0,
    bathrooms: 0,
    parking_spots: 0,
    total_area: '',
    private_area: '',
    amenities: [] as string[],
    images: [] as { url: string; order: number; caption?: string; is_cover?: boolean }[],
    video_url: '',
    virtual_tour_url: '',
    status: 'draft',
    is_featured: false,
    external_code: '',
  })

  // Preencher com dados existentes
  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        property_type: initialData.property_type || 'apartment',
        transaction_type: initialData.transaction_type || 'sale',
        price: initialData.price ? String(initialData.price) : '',
        condo_fee: initialData.condo_fee ? String(initialData.condo_fee) : '',
        iptu: initialData.iptu ? String(initialData.iptu) : '',
        address_street: initialData.address_street || '',
        address_number: initialData.address_number || '',
        address_complement: initialData.address_complement || '',
        address_neighborhood: initialData.address_neighborhood || '',
        address_city: initialData.address_city || '',
        address_state: initialData.address_state || '',
        address_zip: initialData.address_zip || '',
        bedrooms: initialData.bedrooms || 0,
        suites: initialData.suites || 0,
        bathrooms: initialData.bathrooms || 0,
        parking_spots: initialData.parking_spots || 0,
        total_area: initialData.total_area ? String(initialData.total_area) : '',
        private_area: initialData.private_area ? String(initialData.private_area) : '',
        amenities: initialData.amenities || [],
        images: initialData.images || [],
        video_url: initialData.video_url || '',
        virtual_tour_url: initialData.virtual_tour_url || '',
        status: initialData.status || 'draft',
        is_featured: initialData.is_featured || false,
        external_code: initialData.external_code || '',
      })
    }
  }, [initialData])

  // ─── HELPERS ───
  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleAmenity = (key: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter(a => a !== key)
        : [...prev.amenities, key],
    }))
  }

  // ─── IMAGE UPLOAD ───
  const handleFiles = async (files: FileList | File[]) => {
    if (!orgId) return
    const tempId = propertyId || 'temp-' + Date.now()
    setUploading(true)

    for (const file of Array.from(files)) {
      if (form.images.length >= 20) break

      // Resize client-side
      const resized = await resizeImage(file, 1920, 0.8)

      const formData = new FormData()
      formData.append('file', resized)
      formData.append('org_id', orgId)
      formData.append('property_id', tempId)

      try {
        const res = await fetch('/api/upload/property-image', { method: 'POST', body: formData })
        const data = await res.json()

        if (data.url) {
          const newImage = {
            url: data.url,
            order: form.images.length,
            is_cover: form.images.length === 0, // Primeira foto é capa
          }
          setForm(prev => ({ ...prev, images: [...prev.images, newImage] }))
        }
      } catch (err) {
        console.error('Upload failed:', err)
        toast.error('Erro ao enviar imagem')
      }
    }

    setUploading(false)
  }

  const removeImage = (index: number) => {
    setForm(prev => {
      const newImages = prev.images.filter((_, i) => i !== index)
      // Se removeu a capa, definir a primeira como capa
      if (newImages.length > 0 && !newImages.some(img => img.is_cover)) {
        newImages[0].is_cover = true
      }
      return { ...prev, images: newImages.map((img, i) => ({ ...img, order: i })) }
    })
  }

  const setCover = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({ ...img, is_cover: i === index })),
    }))
  }

  // ─── RESIZE IMAGE ───
  const resizeImage = (file: File, maxWidth: number, quality: number): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        if (img.width <= maxWidth) {
          resolve(file)
          return
        }
        const canvas = document.createElement('canvas')
        const ratio = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * ratio
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }))
            } else {
              resolve(file)
            }
          },
          file.type,
          quality
        )
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // ─── DROP ZONE ───
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // ─── SAVE ───
  const handleSave = async () => {
    if (!orgId) return
    if (!form.title || !form.property_type || !form.transaction_type) {
      toast.error(t.errorRequired)
      setActiveTab('basic')
      return
    }

    setSaving(true)

    const payload = {
      ...form,
      org_id: orgId,
      price: form.price ? parseFloat(form.price) : null,
      condo_fee: form.condo_fee ? parseFloat(form.condo_fee) : null,
      iptu: form.iptu ? parseFloat(form.iptu) : null,
      total_area: form.total_area ? parseFloat(form.total_area) : null,
      private_area: form.private_area ? parseFloat(form.private_area) : null,
    }

    try {
      const url = isEditing ? `/api/properties/${propertyId}` : '/api/properties'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar')
        return
      }

      toast.success(isEditing ? t.updated : t.created)

      if (!isEditing && data.property?.id) {
        router.replace(`/dashboard/portfolio/${data.property.id}`)
      }
    } catch (err) {
      console.error('Save failed:', err)
      toast.error('Erro ao salvar imóvel')
    } finally {
      setSaving(false)
    }
  }

  // ─── INPUT STYLE ───
  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border transition-all focus:outline-none"
  const inputStyle = { background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }
  const labelClass = "block text-xs font-semibold mb-1.5"
  const labelStyle = { color: 'var(--color-text-secondary)' }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/portfolio')}
            className="p-2 rounded-xl border transition-all hover:bg-white/5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isEditing ? t.editTitle : t.newTitle}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: 'var(--color-primary)', color: 'var(--color-text-primary)', boxShadow: '0 4px 6px -1px rgba(59,130,246,0.2)' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? t.saving : t.save}
        </button>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 p-1 rounded-xl border" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab]
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={
                isActive
                  ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }
                  : { color: 'var(--color-text-muted)', border: '1px solid transparent' }
              }
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{t.tabs[tab]}</span>
            </button>
          )
        })}
      </div>

      {/* ═══ TAB: BÁSICO ═══ */}
      {activeTab === 'basic' && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <div>
            <label className={labelClass} style={labelStyle}>{t.title} *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t.titlePlaceholder}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>{t.description}</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t.descriptionPlaceholder}
              rows={5}
              className={inputClass + ' resize-none'}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>{t.propertyType} *</label>
              <select value={form.property_type} onChange={(e) => updateField('property_type', e.target.value)} className={inputClass} style={inputStyle}>
                {Object.entries(PROPERTY_TYPES).map(([key, labels]) => (
                  <option key={key} value={key}>{labels[lang]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.transactionType} *</label>
              <select value={form.transaction_type} onChange={(e) => updateField('transaction_type', e.target.value)} className={inputClass} style={inputStyle}>
                {Object.entries(TRANSACTION_TYPES).map(([key, labels]) => (
                  <option key={key} value={key}>{labels[lang]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>{t.price} ({currencySymbol})</label>
              <input type="number" value={form.price} onChange={(e) => updateField('price', e.target.value)} className={inputClass} style={inputStyle} min="0" step="0.01" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.condoFee} ({currencySymbol})</label>
              <input type="number" value={form.condo_fee} onChange={(e) => updateField('condo_fee', e.target.value)} className={inputClass} style={inputStyle} min="0" step="0.01" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.iptu} ({currencySymbol})</label>
              <input type="number" value={form.iptu} onChange={(e) => updateField('iptu', e.target.value)} className={inputClass} style={inputStyle} min="0" step="0.01" />
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: LOCALIZAÇÃO ═══ */}
      {activeTab === 'location' && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass} style={labelStyle}>{t.street}</label>
              <input type="text" value={form.address_street} onChange={(e) => updateField('address_street', e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.number}</label>
              <input type="text" value={form.address_number} onChange={(e) => updateField('address_number', e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>{t.complement}</label>
              <input type="text" value={form.address_complement} onChange={(e) => updateField('address_complement', e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.neighborhood}</label>
              <input type="text" value={form.address_neighborhood} onChange={(e) => updateField('address_neighborhood', e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>{t.city}</label>
              <input type="text" value={form.address_city} onChange={(e) => updateField('address_city', e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.state}</label>
              <select value={form.address_state} onChange={(e) => updateField('address_state', e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">—</option>
                {BR_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.zip}</label>
              <input type="text" value={form.address_zip} onChange={(e) => updateField('address_zip', e.target.value)} className={inputClass} style={inputStyle} maxLength={9} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: CARACTERÍSTICAS ═══ */}
      {activeTab === 'features' && (
        <div className="rounded-2xl border p-6 space-y-6" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          {/* Números */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { key: 'bedrooms', label: t.bedrooms },
              { key: 'suites', label: t.suites },
              { key: 'bathrooms', label: t.bathrooms },
              { key: 'parking_spots', label: t.parkingSpots },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className={labelClass} style={labelStyle}>{label}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateField(key, Math.max(0, form[key] - 1))}
                    className="w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold transition-all hover:bg-white/5"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {form[key]}
                  </span>
                  <button
                    onClick={() => updateField(key, form[key] + 1)}
                    className="w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold transition-all hover:bg-white/5"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div>
              <label className={labelClass} style={labelStyle}>{t.totalArea}</label>
              <input type="number" value={form.total_area} onChange={(e) => updateField('total_area', e.target.value)} className={inputClass} style={inputStyle} min="0" step="0.01" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.privateArea}</label>
              <input type="number" value={form.private_area} onChange={(e) => updateField('private_area', e.target.value)} className={inputClass} style={inputStyle} min="0" step="0.01" />
            </div>
          </div>

          {/* Amenidades */}
          <div>
            <label className={labelClass} style={labelStyle}>{t.amenities}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {AMENITIES.map((am) => {
                const isSelected = form.amenities.includes(am.key)
                return (
                  <button
                    key={am.key}
                    onClick={() => toggleAmenity(am.key)}
                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
                    style={
                      isSelected
                        ? { background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }
                        : { color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                    }
                  >
                    {am.label[lang]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: FOTOS ═══ */}
      {activeTab === 'photos' && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
            style={{ borderColor: dragOver ? 'var(--color-primary)' : 'var(--color-border)', background: dragOver ? 'var(--color-primary-subtle)' : 'transparent' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.uploading}</span>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t.uploadPhotos}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.uploadHint}</p>
              </>
            )}
          </div>

          {/* Image grid */}
          {form.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {form.images.map((img, index) => (
                <div
                  key={index}
                  className="relative group rounded-xl overflow-hidden aspect-[4/3] border"
                  style={{ borderColor: img.is_cover ? 'var(--color-accent, #F0A030)' : 'var(--color-border)' }}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />

                  {/* Cover badge */}
                  {img.is_cover && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1" style={{ background: 'var(--color-accent)', color: 'var(--color-text-primary)' }}>
                      <Star size={10} /> {t.isCover}
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" style={{ background: 'var(--color-bg-overlay)' }}>
                    {!img.is_cover && (
                      <button
                        onClick={() => setCover(index)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }}
                      >
                        <Star size={12} className="inline mr-1" />
                        {t.setCover}
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(index)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background: 'var(--color-error)', color: 'var(--color-text-primary)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: PUBLICAÇÃO ═══ */}
      {activeTab === 'publish' && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <div>
            <label className={labelClass} style={labelStyle}>{t.status}</label>
            <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className={inputClass} style={inputStyle}>
              {Object.entries(PROPERTY_STATUSES).map(([key, labels]) => (
                <option key={key} value={key}>{labels[lang]}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.isFeatured}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{t.featuredHint}</p>
            </div>
            <button
              onClick={() => updateField('is_featured', !form.is_featured)}
              className="w-11 h-6 rounded-full transition-all relative"
              style={{ background: form.is_featured ? 'var(--color-primary)' : 'var(--color-border)' }}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${form.is_featured ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>{t.externalCode}</label>
            <input type="text" value={form.external_code} onChange={(e) => updateField('external_code', e.target.value)} className={inputClass} style={inputStyle} placeholder="Gerado automaticamente (ex: REF-1001)" />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Código usado pelo agente SDR para identificar o imóvel. Gerado automaticamente ao salvar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>{t.videoUrl}</label>
              <input type="url" value={form.video_url} onChange={(e) => updateField('video_url', e.target.value)} className={inputClass} style={inputStyle} placeholder="https://youtube.com/..." />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>{t.virtualTourUrl}</label>
              <input type="url" value={form.virtual_tour_url} onChange={(e) => updateField('virtual_tour_url', e.target.value)} className={inputClass} style={inputStyle} placeholder="https://..." />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
