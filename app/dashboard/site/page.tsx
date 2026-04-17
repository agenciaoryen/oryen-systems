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
  Trash2,
  Link2,
  Shield,
  RefreshCw,
  Copy,
} from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

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
  heroTextColor: 'Cor do texto da capa',
  heroPreview: 'Pré-visualização da capa',
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
  // Custom Domain
  domainTitle: 'Domínio Próprio',
  domainDesc: 'Use seu próprio domínio para um site ainda mais profissional.',
  domainLabel: 'Seu domínio',
  domainPlaceholder: 'Ex: www.meusite.com.br',
  domainAdd: 'Conectar Domínio',
  domainAdding: 'Conectando...',
  domainRemove: 'Remover',
  domainRemoving: 'Removendo...',
  domainVerify: 'Verificar DNS',
  domainVerifying: 'Verificando...',
  domainStatusActive: 'Conectado',
  domainStatusPending: 'Aguardando DNS',
  domainStatusMisconfigured: 'DNS incorreto',
  domainDnsTitle: 'Configure o DNS do seu domínio:',
  domainDnsOption1: 'Opção 1 — CNAME (recomendado para subdomínios como www):',
  domainDnsOption2: 'Opção 2 — Registro A (para domínio raiz):',
  domainDnsType: 'Tipo',
  domainDnsName: 'Nome',
  domainDnsValue: 'Valor',
  domainDnsHint: 'Após configurar o DNS, clique em "Verificar DNS". A propagação pode levar até 48h.',
  domainCurrentUrl: 'URL atual (gratuita):',
  domainOr: 'ou',
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

  // Domain state
  const [domainInput, setDomainInput] = useState('')
  const [domainData, setDomainData] = useState<any>(null)
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainAction, setDomainAction] = useState<'idle' | 'adding' | 'removing' | 'verifying'>('idle')

  const [form, setForm] = useState({
    slug: '',
    site_name: '',
    tagline: '',
    logo_url: '',
    cover_image_url: '',
    primary_color: '#4B6BFB',
    accent_color: '#F0A030',
    hero_text_color: '#FFFFFF',
    site_theme: 'dark' as 'dark' | 'light',
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
          hero_text_color: data.site.hero_text_color || '#FFFFFF',
          site_theme: data.site.site_theme || 'dark',
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

  // ─── DOMAIN ───
  const fetchDomainStatus = useCallback(async () => {
    if (!orgId) return
    try {
      const res = await fetch(`/api/site/domain?org_id=${orgId}`)
      const data = await res.json()
      setDomainData(data)
    } catch {}
  }, [orgId])

  useEffect(() => {
    if (orgId && hasSaved) fetchDomainStatus()
  }, [orgId, hasSaved, fetchDomainStatus])

  const handleAddDomain = async () => {
    if (!orgId || !domainInput.trim()) return
    setDomainAction('adding')
    try {
      const res = await fetch('/api/site/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, domain: domainInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao conectar domínio')
        return
      }
      toast.success('Domínio conectado! Configure o DNS.')
      setDomainInput('')
      await fetchDomainStatus()
    } catch {
      toast.error('Erro ao conectar domínio')
    } finally {
      setDomainAction('idle')
    }
  }

  const handleRemoveDomain = async () => {
    if (!orgId) return
    setDomainAction('removing')
    try {
      await fetch('/api/site/domain', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })
      toast.success('Domínio removido')
      setDomainData(null)
    } catch {
      toast.error('Erro ao remover domínio')
    } finally {
      setDomainAction('idle')
    }
  }

  const handleVerifyDomain = async () => {
    setDomainAction('verifying')
    await fetchDomainStatus()
    setDomainAction('idle')
    if (domainData?.status === 'active') {
      toast.success('DNS verificado! Domínio ativo.')
    } else {
      toast.error('DNS ainda não propagou. Tente novamente mais tarde.')
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
  const publicUrl = domainData?.domain && domainData?.status === 'active' ? `https://${domainData.domain}` : siteUrl

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={32} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
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
              href={publicUrl}
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

      {/* ═══ DOMÍNIO PRÓPRIO ═══ */}
      {hasSaved && (
        <div className={sectionClass} style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={18} style={{ color: 'var(--color-success)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.domainTitle}</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{T.domainDesc}</p>

          {/* URL gratuita atual */}
          {form.slug && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
              <Globe size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{T.domainCurrentUrl}</span>
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-primary)' }}>{siteUrl}</span>
            </div>
          )}

          {/* Se já tem domínio configurado */}
          {domainData?.domain ? (
            <div className="space-y-4">
              {/* Status do domínio */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{
                    background: domainData.status === 'active' ? 'var(--color-success-subtle)' : domainData.status === 'misconfigured' ? 'var(--color-error-subtle)' : 'var(--color-warning-subtle)'
                  }}>
                    {domainData.status === 'active' ? <Shield size={16} style={{ color: 'var(--color-success)' }} /> :
                     domainData.status === 'misconfigured' ? <AlertCircle size={16} style={{ color: 'var(--color-error)' }} /> :
                     <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-warning)' }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{domainData.domain}</p>
                    <p className="text-[11px] font-medium" style={{
                      color: domainData.status === 'active' ? 'var(--color-success)' : domainData.status === 'misconfigured' ? 'var(--color-error)' : 'var(--color-warning)'
                    }}>
                      {domainData.status === 'active' ? T.domainStatusActive : domainData.status === 'misconfigured' ? T.domainStatusMisconfigured : T.domainStatusPending}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {domainData.status !== 'active' && (
                    <button onClick={handleVerifyDomain} disabled={domainAction === 'verifying'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                      {domainAction === 'verifying' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {domainAction === 'verifying' ? T.domainVerifying : T.domainVerify}
                    </button>
                  )}
                  <button onClick={handleRemoveDomain} disabled={domainAction === 'removing'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error-subtle)' }}>
                    {domainAction === 'removing' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    {domainAction === 'removing' ? T.domainRemoving : T.domainRemove}
                  </button>
                </div>
              </div>

              {/* Instruções DNS (só se não está ativo) */}
              {domainData.status !== 'active' && (
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{T.domainDnsTitle}</p>

                  {/* CNAME */}
                  <div>
                    <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{T.domainDnsOption1}</p>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      <span>{T.domainDnsType}</span>
                      <span>{T.domainDnsName}</span>
                      <span>{T.domainDnsValue}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2 rounded-lg" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                      <span>CNAME</span>
                      <span>www</span>
                      <button onClick={() => { navigator.clipboard.writeText('cname.vercel-dns.com'); toast.success('Copiado!') }} className="flex items-center gap-1 hover:opacity-80 text-left">
                        cname.vercel-dns.com <Copy size={10} className="shrink-0 opacity-50" />
                      </button>
                    </div>
                  </div>

                  {/* A Record */}
                  <div>
                    <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{T.domainDnsOption2}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2 rounded-lg" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                      <span>A</span>
                      <span>@</span>
                      <button onClick={() => { navigator.clipboard.writeText('76.76.21.21'); toast.success('Copiado!') }} className="flex items-center gap-1 hover:opacity-80 text-left">
                        76.76.21.21 <Copy size={10} className="shrink-0 opacity-50" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{T.domainDnsHint}</p>
                </div>
              )}
            </div>
          ) : (
            /* Input para adicionar domínio */
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={e => setDomainInput(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder={T.domainPlaceholder}
                onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                className="flex-1 min-w-0 rounded-xl p-3 text-sm outline-none transition-all"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              />
              <button
                onClick={handleAddDomain}
                disabled={!domainInput.trim() || domainAction === 'adding'}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {domainAction === 'adding' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {domainAction === 'adding' ? T.domainAdding : T.domainAdd}
              </button>
            </div>
          )}
        </div>
      )}

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
            <div className="relative group">
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
              {form.logo_url && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateField('logo_url', '') }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'var(--color-error)', color: '#fff' }}
                  title="Remover logo"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{T.coverImage}</label>
            <div className="relative group">
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
              {form.cover_image_url && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateField('cover_image_url', '') }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'var(--color-error)', color: '#fff' }}
                  title="Remover imagem de capa"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tema do Site */}
        <div>
          <label className={labelClass} style={labelStyle}>Tema do site</label>
          <div className="flex gap-3">
            {([
              { value: 'dark', label: 'Escuro', desc: 'Fundo escuro, texto claro', bg: '#0A0A0F', text: '#fff', border: '#2A2A3C' },
              { value: 'light', label: 'Claro', desc: 'Fundo claro, texto escuro', bg: '#FFFFFF', text: '#1A1A2E', border: '#E2E2EC' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateField('site_theme', opt.value)}
                className="flex-1 rounded-xl p-4 text-left transition-all"
                style={{
                  background: opt.bg,
                  border: `2px solid ${form.site_theme === opt.value ? 'var(--color-primary)' : opt.border}`,
                  boxShadow: form.site_theme === opt.value ? '0 0 0 3px rgba(75,107,251,0.2)' : 'none',
                }}
              >
                <p className="text-sm font-bold" style={{ color: opt.text }}>{opt.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: opt.text, opacity: 0.6 }}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>{T.primaryColor}</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['#4B6BFB', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#1E293B'].map((c) => (
                <button
                  key={c}
                  onClick={() => updateField('primary_color', c)}
                  className="w-7 h-7 rounded-lg cursor-pointer transition-all hover:scale-110 border-2"
                  style={{
                    background: c,
                    borderColor: form.primary_color === c ? '#fff' : 'transparent',
                    boxShadow: form.primary_color === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                  title={c}
                />
              ))}
            </div>
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
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['#F0A030', '#F59E0B', '#EAB308', '#F97316', '#EF4444', '#EC4899', '#A855F7', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#64748B'].map((c) => (
                <button
                  key={c}
                  onClick={() => updateField('accent_color', c)}
                  className="w-7 h-7 rounded-lg cursor-pointer transition-all hover:scale-110 border-2"
                  style={{
                    background: c,
                    borderColor: form.accent_color === c ? '#fff' : 'transparent',
                    boxShadow: form.accent_color === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                  title={c}
                />
              ))}
            </div>
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

        {/* Cor do texto da capa */}
        <div>
          <label className={labelClass} style={labelStyle}>{T.heroTextColor}</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {['#FFFFFF', '#F1F5F9', '#0F172A', '#1E293B', '#EDEDF5', '#FEF3C7', '#E0E7FF'].map((c) => (
              <button
                key={c}
                onClick={() => updateField('hero_text_color', c)}
                className="w-7 h-7 rounded-lg cursor-pointer transition-all hover:scale-110 border-2"
                style={{
                  background: c,
                  borderColor: form.hero_text_color === c ? 'var(--color-primary)' : 'var(--color-border)',
                  boxShadow: form.hero_text_color === c ? `0 0 0 2px var(--color-primary)` : 'none',
                }}
                title={c}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.hero_text_color}
              onChange={(e) => updateField('hero_text_color', e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
            />
            <input
              type="text"
              value={form.hero_text_color}
              onChange={(e) => updateField('hero_text_color', e.target.value)}
              className={inputClass + ' flex-1'}
              style={inputStyle}
              maxLength={7}
            />
          </div>
        </div>

        {/* Pré-visualização da capa */}
        <div>
          <label className={labelClass} style={labelStyle}>{T.heroPreview}</label>
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ height: 180 }}
          >
            {/* Background */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${form.primary_color} 0%, color-mix(in srgb, ${form.primary_color} 70%, #000) 100%)` }} />
            {form.cover_image_url && (
              <div className="absolute inset-0">
                <img src={form.cover_image_url} alt="" className="w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2))` }} />
              </div>
            )}
            {/* Conteúdo */}
            <div className="relative flex flex-col items-center justify-center h-full px-4 text-center">
              {form.tagline && (
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: form.accent_color }}>
                  {form.tagline}
                </p>
              )}
              <h3 className="text-lg sm:text-xl font-bold leading-tight" style={{ color: form.hero_text_color }}>
                {form.site_name || 'Nome do Site'}
              </h3>
              {form.bio && (
                <p className="text-[10px] mt-1 opacity-70 line-clamp-1" style={{ color: form.hero_text_color }}>
                  {form.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Moeda */}
        <div className="mt-4">
          <label className={labelClass} style={labelStyle}>Moeda dos preços</label>
          <CustomSelect
            value={form.currency}
            onChange={(v) => updateField('currency', v)}
            options={[
              { value: 'BRL', label: 'R$ — Real Brasileiro (BRL)' },
              { value: 'USD', label: '$ — Dólar Americano (USD)' },
              { value: 'EUR', label: '€ — Euro (EUR)' },
              { value: 'CLP', label: '$ — Peso Chileno (CLP)' },
              { value: 'ARS', label: '$ — Peso Argentino (ARS)' },
              { value: 'MXN', label: '$ — Peso Mexicano (MXN)' },
              { value: 'COP', label: '$ — Peso Colombiano (COP)' },
              { value: 'PEN', label: 'S/ — Sol Peruano (PEN)' },
              { value: 'UYU', label: '$ — Peso Uruguaio (UYU)' },
              { value: 'PYG', label: '₲ — Guarani Paraguaio (PYG)' },
            ]}
          />
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
          <div className="relative group shrink-0">
            <div
              onClick={() => handleImageUpload('avatar_url')}
              className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:border-[var(--color-primary)]/50 overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={28} style={{ color: 'var(--color-text-muted)' }} />
              )}
            </div>
            {form.avatar_url && (
              <button
                onClick={(e) => { e.stopPropagation(); updateField('avatar_url', '') }}
                className="absolute -top-1 -right-1 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                style={{ background: 'var(--color-error)', color: '#fff' }}
                title="Remover foto"
              >
                <Trash2 size={10} />
              </button>
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
          <div className="relative group">
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
            {form.og_image_url && (
              <button
                onClick={(e) => { e.stopPropagation(); updateField('og_image_url', '') }}
                className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                style={{ background: 'var(--color-error)', color: '#fff' }}
                title="Remover imagem OG"
              >
                <Trash2 size={12} />
              </button>
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
                style={{ background: 'var(--color-success)', color: '#fff' }}
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
