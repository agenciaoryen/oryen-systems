// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useActiveOrgId } from '@/lib/AuthContext'
import { toast } from 'sonner'
import {
  Globe,
  Palette,
  User,
  Phone,
  Share2,
  Search as SearchIcon,
  Eye,
  Loader2,
  Save,
  Check,
  X,
  ExternalLink,
  Upload,
  ImageIcon,
  AlertCircle,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
  title: 'Meu Site',
  subtitle: 'Configure e publique seu site profissional de imóveis.',
  saving: 'Salvando...',
  save: 'Salvar Alterações',
  saved: 'Alterações salvas!',
  // Seções
  sections: {
    branding: 'Branding',
    about: 'Sobre o Corretor',
    contact: 'Contato',
    social: 'Redes Sociais',
    seo: 'SEO',
    url: 'URL do Site',
    publish: 'Publicação',
  },
  // Branding
  siteName: 'Nome do site',
  siteNamePlaceholder: 'Ex: João Corretor Imóveis',
  tagline: 'Tagline',
  taglinePlaceholder: 'Ex: Encontre o imóvel dos seus sonhos',
  logo: 'Logo',
  coverImage: 'Imagem de capa',
  primaryColor: 'Cor principal',
  accentColor: 'Cor de destaque',
  // Sobre
  avatar: 'Foto do corretor',
  bio: 'Bio / Sobre',
  bioPlaceholder: 'Conte um pouco sobre você e sua experiência...',
  creci: 'CRECI',
  creciPlaceholder: 'Ex: 12345-F',
  // Contato
  email: 'E-mail',
  phone: 'Telefone',
  whatsapp: 'WhatsApp',
  address: 'Endereço',
  // Social
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  socialPlaceholder: 'https://',
  // SEO
  metaTitle: 'Meta title',
  metaTitlePlaceholder: 'Título para buscadores (Google)',
  metaDescription: 'Meta description',
  metaDescriptionPlaceholder: 'Descrição curta para buscadores (até 160 caracteres)',
  ogImage: 'Imagem de compartilhamento (OG)',
  // URL
  slug: 'Slug (URL)',
  slugHint: 'Seu site ficará em:',
  slugChecking: 'Verificando...',
  slugAvailable: 'Disponível!',
  slugTaken: 'Já está em uso',
  // Publish
  publishTitle: 'Publicar site',
  publishDesc: 'Ao publicar, seu site ficará acessível publicamente.',
  publishBtn: 'Publicar Site',
  unpublishBtn: 'Despublicar',
  publishing: 'Publicando...',
  published: 'Site publicado com sucesso!',
  unpublished: 'Site despublicado.',
  requirements: 'Requisitos para publicar:',
  preview: 'Pré-visualizar',
  visitSite: 'Visitar Site',
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function SiteSettingsPage() {
  const orgId = useActiveOrgId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const [form, setForm] = useState({
    slug: '',
    site_name: '',
    tagline: '',
    logo_url: '',
    cover_image_url: '',
    primary_color: '#4B6BFB',
    accent_color: '#F0A030',
    currency: 'BRL',
    bio: '',
    avatar_url: '',
    creci: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    social_links: {
      instagram: '',
      facebook: '',
      linkedin: '',
      youtube: '',
      tiktok: '',
    },
    meta_title: '',
    meta_description: '',
    og_image_url: '',
    is_published: false,
  })

  // ─── FETCH ───
  const fetchSite = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/site?org_id=${orgId}`)
      const data = await res.json()
      if (data.site) {
        setHasSaved(true)
        setForm({
          slug: data.site.slug || '',
          site_name: data.site.site_name || '',
          tagline: data.site.tagline || '',
          logo_url: data.site.logo_url || '',
          cover_image_url: data.site.cover_image_url || '',
          primary_color: data.site.primary_color || '#4B6BFB',
          accent_color: data.site.accent_color || '#F0A030',
          currency: data.site.currency || 'BRL',
          bio: data.site.bio || '',
          avatar_url: data.site.avatar_url || '',
          creci: data.site.creci || '',
          email: data.site.email || '',
          phone: data.site.phone || '',
          whatsapp: data.site.whatsapp || '',
          address: data.site.address || '',
          social_links: {
            instagram: data.site.social_links?.instagram || '',
            facebook: data.site.social_links?.facebook || '',
            linkedin: data.site.social_links?.linkedin || '',
            youtube: data.site.social_links?.youtube || '',
            tiktok: data.site.social_links?.tiktok || '',
          },
          meta_title: data.site.meta_title || '',
          meta_description: data.site.meta_description || '',
          og_image_url: data.site.og_image_url || '',
          is_published: data.site.is_published || false,
        })
      }
    } catch (err) {
      console.error('Failed to fetch site settings:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchSite()
  }, [fetchSite])

  // ─── HELPERS ───
  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updateSocial = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      social_links: { ...prev.social_links, [field]: value },
    }))
  }

  // ─── SLUG CHECK ───
  useEffect(() => {
    if (!form.slug || form.slug.length < 3) {
      setSlugStatus('idle')
      return
    }

    const timer = setTimeout(async () => {
      setSlugStatus('checking')
      try {
        const res = await fetch(`/api/site?slug=${form.slug}`)
        const data = await res.json()
        // Se retornou site e é de outra org, está em uso
        if (data.site && data.site.org_id !== orgId) {
          setSlugStatus('taken')
        } else {
          setSlugStatus('available')
        }
      } catch {
        setSlugStatus('available')
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [form.slug, orgId])

  // ─── SAVE ───
  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)

    try {
      const res = await fetch('/api/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, ...form }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar')
        return
      }

      setHasSaved(true)
      toast.success(T.saved)
    } catch (err) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  // ─── PUBLISH ───
  const handlePublish = async (publish: boolean) => {
    if (!orgId) return
    setPublishing(true)

    try {
      const res = await fetch('/api/site/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, publish }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.details) {
          data.details.forEach((d: string) => toast.error(d))
        } else {
          toast.error(data.error || 'Erro ao publicar')
        }
        return
      }

      setForm(prev => ({ ...prev, is_published: publish }))
      toast.success(publish ? T.published : T.unpublished)
    } catch (err) {
      toast.error('Erro ao publicar site')
    } finally {
      setPublishing(false)
    }
  }

  // ─── IMAGE UPLOAD (reusa a mesma rota property-image) ───
  const handleImageUpload = async (field: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file || !orgId) return

      const formData = new FormData()
      formData.append('file', file)
      formData.append('org_id', orgId)
      formData.append('property_id', 'site-assets')

      try {
        const res = await fetch('/api/upload/property-image', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.url) {
          updateField(field, data.url)
          toast.success('Imagem enviada!')
        }
      } catch {
        toast.error('Erro ao enviar imagem')
      }
    }
    input.click()
  }

  // ─── STYLES ───
  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]/50"
  const inputStyle = { backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }
  const labelClass = "block text-xs font-semibold mb-1.5"
  const labelStyle = { color: 'var(--color-text-secondary)' }
  const sectionClass = "rounded-2xl border p-6 space-y-4"
  const sectionStyle = { background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }

  const siteUrl = form.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/sites/${form.slug}` : ''

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={32} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {T.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {T.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {form.is_published && form.slug && (
            <a
              href={`/sites/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[var(--color-bg-hover)]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <ExternalLink size={15} /> {T.visitSite}
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? T.saving : T.save}
          </button>
        </div>
      </div>

      {/* ═══ URL DO SITE ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Globe size={18} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.sections.url}</h2>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>{T.slug}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="meu-site"
              className={inputClass}
              style={inputStyle}
            />
            <div className="shrink-0">
              {slugStatus === 'checking' && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />}
              {slugStatus === 'available' && <Check size={16} style={{ color: 'var(--color-success)' }} />}
              {slugStatus === 'taken' && <X size={16} style={{ color: 'var(--color-error)' }} />}
            </div>
          </div>
          {form.slug && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {T.slugHint} <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{siteUrl}</span>
            </p>
          )}
          {slugStatus === 'taken' && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{T.slugTaken}</p>
          )}
        </div>
      </div>

      {/* ═══ BRANDING ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Palette size={18} style={{ color: 'var(--color-indigo)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.sections.branding}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>{T.siteName}</label>
            <input type="text" value={form.site_name} onChange={(e) => updateField('site_name', e.target.value)} placeholder={T.siteNamePlaceholder} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{T.tagline}</label>
            <input type="text" value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} placeholder={T.taglinePlaceholder} className={inputClass} style={inputStyle} />
          </div>
        </div>

        {/* Logo e Cover */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>{T.logo}</label>
            <div
              onClick={() => handleImageUpload('logo_url')}
              className="w-full h-24 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg-hover)] overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-full object-contain p-2" />
              ) : (
                <div className="text-center">
                  <Upload size={20} className="mx-auto mb-1" style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Upload</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{T.coverImage}</label>
            <div
              onClick={() => handleImageUpload('cover_image_url')}
              className="w-full h-24 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg-hover)] overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {form.cover_image_url ? (
                <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <ImageIcon size={20} className="mx-auto mb-1" style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Upload</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>{T.primaryColor}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => updateField('primary_color', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => updateField('primary_color', e.target.value)}
                className={inputClass + ' flex-1'}
                style={inputStyle}
                maxLength={7}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{T.accentColor}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accent_color}
                onChange={(e) => updateField('accent_color', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
              />
              <input
                type="text"
                value={form.accent_color}
                onChange={(e) => updateField('accent_color', e.target.value)}
                className={inputClass + ' flex-1'}
                style={inputStyle}
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Moeda */}
        <div className="mt-4">
          <label className={labelClass} style={labelStyle}>Moeda dos preços</label>
          <select
            value={form.currency}
            onChange={(e) => updateField('currency', e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="BRL">R$ — Real Brasileiro (BRL)</option>
            <option value="USD">$ — Dólar Americano (USD)</option>
            <option value="EUR">€ — Euro (EUR)</option>
            <option value="CLP">$ — Peso Chileno (CLP)</option>
            <option value="ARS">$ — Peso Argentino (ARS)</option>
            <option value="MXN">$ — Peso Mexicano (MXN)</option>
            <option value="COP">$ — Peso Colombiano (COP)</option>
            <option value="PEN">S/ — Sol Peruano (PEN)</option>
            <option value="UYU">$ — Peso Uruguaio (UYU)</option>
            <option value="PYG">₲ — Guarani Paraguaio (PYG)</option>
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Esta moeda será exibida nos preços do seu site público.
          </p>
        </div>
      </div>

      {/* ═══ SOBRE O CORRETOR ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <User size={18} style={{ color: 'var(--color-success)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.sections.about}</h2>
        </div>

        <div className="flex items-start gap-4">
          <div
            onClick={() => handleImageUpload('avatar_url')}
            className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:border-[var(--color-primary)]/50 overflow-hidden shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={28} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className={labelClass} style={labelStyle}>{T.creci}</label>
              <input type="text" value={form.creci} onChange={(e) => updateField('creci', e.target.value)} placeholder={T.creciPlaceholder} className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>{T.bio}</label>
          <textarea value={form.bio} onChange={(e) => updateField('bio', e.target.value)} placeholder={T.bioPlaceholder} rows={4} className={inputClass + ' resize-none'} style={inputStyle} />
        </div>
      </div>

      {/* ═══ CONTATO ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Phone size={18} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.sections.contact}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>{T.email}</label>
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{T.phone}</label>
            <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{T.whatsapp}</label>
            <input type="tel" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} className={inputClass} style={inputStyle} placeholder="5511999999999" />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{T.address}</label>
            <input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)} className={inputClass} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ═══ REDES SOCIAIS ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Share2 size={18} style={{ color: 'var(--color-accent)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.sections.social}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok'] as const).map((network) => (
            <div key={network}>
              <label className={labelClass} style={labelStyle}>{T[network]}</label>
              <input
                type="url"
                value={form.social_links[network]}
                onChange={(e) => updateSocial(network, e.target.value)}
                placeholder={T.socialPlaceholder}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SEO ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <SearchIcon size={18} style={{ color: 'var(--color-accent)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.sections.seo}</h2>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>{T.metaTitle}</label>
          <input type="text" value={form.meta_title} onChange={(e) => updateField('meta_title', e.target.value)} placeholder={T.metaTitlePlaceholder} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>{T.metaDescription}</label>
          <textarea value={form.meta_description} onChange={(e) => updateField('meta_description', e.target.value)} placeholder={T.metaDescriptionPlaceholder} rows={3} className={inputClass + ' resize-none'} style={inputStyle} maxLength={160} />
          <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--color-text-tertiary)' }}>
            {form.meta_description.length}/160
          </p>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>{T.ogImage}</label>
          <div
            onClick={() => handleImageUpload('og_image_url')}
            className="w-full h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg-hover)] overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {form.og_image_url ? (
              <img src={form.og_image_url} alt="OG" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <ImageIcon size={24} className="mx-auto mb-1" style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>1200×630 recomendado</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ PUBLICAÇÃO ═══ */}
      <div className={sectionClass} style={{ ...sectionStyle, borderColor: form.is_published ? 'rgba(16,185,129,0.3)' : sectionStyle.borderColor }}>
        <div className="flex items-center gap-2 mb-2">
          <Eye size={18} style={{ color: form.is_published ? 'var(--color-success)' : 'var(--color-text-tertiary)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.sections.publish}</h2>
          {form.is_published && (
            <span className="ml-auto px-2.5 py-1 rounded-lg text-[11px] font-bold border" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
              ONLINE
            </span>
          )}
        </div>

        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{T.publishDesc}</p>

        <div className="flex items-center gap-3">
          {form.is_published ? (
            <>
              <a
                href={`/sites/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--color-success)', color: 'var(--color-text-primary)' }}
              >
                <ExternalLink size={15} /> {T.visitSite}
              </a>
              <button
                onClick={() => handlePublish(false)}
                disabled={publishing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {publishing ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                {T.unpublishBtn}
              </button>
            </>
          ) : (
            <>
              {form.slug && hasSaved ? (
                <a
                  href={`/sites/${form.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[var(--color-bg-hover)]"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  <Eye size={15} /> {T.preview}
                </a>
              ) : (
                <span
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border opacity-40 cursor-not-allowed"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  title="Salve as alterações primeiro"
                >
                  <Eye size={15} /> {T.preview}
                </span>
              )}
              <button
                onClick={() => handlePublish(true)}
                disabled={publishing || !hasSaved}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {publishing ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
                {publishing ? T.publishing : T.publishBtn}
              </button>
              {!hasSaved && (
                <p className="text-xs w-full mt-1" style={{ color: 'var(--color-accent)' }}>
                  <AlertCircle size={12} className="inline mr-1" />
                  Salve as alterações antes de pré-visualizar ou publicar.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
