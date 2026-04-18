// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useActiveOrgId, useAuth } from '@/lib/AuthContext'
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

type Lang = 'pt' | 'en' | 'es'

const TRANSLATIONS = {
  pt: {
    title: 'Meu Site',
    subtitle: 'Configure e publique seu site profissional de imóveis.',
    saving: 'Salvando...',
    save: 'Salvar Alterações',
    saved: 'Alterações salvas!',
    sections: { branding: 'Branding', about: 'Sobre o Corretor', contact: 'Contato', social: 'Redes Sociais', seo: 'SEO', url: 'URL do Site', publish: 'Publicação' },
    siteName: 'Nome do site', siteNamePlaceholder: 'Ex: João Corretor Imóveis',
    tagline: 'Tagline', taglinePlaceholder: 'Ex: Encontre o imóvel dos seus sonhos',
    logo: 'Logo', coverImage: 'Imagem de capa',
    primaryColor: 'Cor principal', accentColor: 'Cor de destaque',
    heroTextColor: 'Cor do texto da capa', heroPreview: 'Pré-visualização da capa',
    themeLabel: 'Tema do site', themeDark: 'Escuro', themeDarkDesc: 'Fundo escuro, texto claro',
    themeLight: 'Claro', themeLightDesc: 'Fundo claro, texto escuro',
    currencyLabel: 'Moeda dos preços', currencyHint: 'Esta moeda será exibida nos preços do seu site público.',
    previewSiteNameFallback: 'Nome do Site',
    avatar: 'Foto do corretor', bio: 'Bio / Sobre', bioPlaceholder: 'Conte um pouco sobre você e sua experiência...',
    creci: 'CRECI', creciPlaceholder: 'Ex: 12345-F',
    email: 'E-mail', phone: 'Telefone', whatsapp: 'WhatsApp', address: 'Endereço',
    instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok',
    socialPlaceholder: 'https://',
    metaTitle: 'Meta title', metaTitlePlaceholder: 'Título para buscadores (Google)',
    metaDescription: 'Meta description', metaDescriptionPlaceholder: 'Descrição curta para buscadores (até 160 caracteres)',
    ogImage: 'Imagem de compartilhamento (OG)', ogHint: '1200×630 recomendado',
    upload: 'Upload',
    removeLogo: 'Remover logo', removeCover: 'Remover imagem de capa', removeAvatar: 'Remover foto', removeOg: 'Remover imagem OG',
    slug: 'Slug (URL)', slugHint: 'Seu site ficará em:', slugChecking: 'Verificando...', slugAvailable: 'Disponível!', slugTaken: 'Já está em uso',
    domainTitle: 'Domínio Próprio', domainDesc: 'Use seu próprio domínio para um site ainda mais profissional.',
    domainLabel: 'Seu domínio', domainPlaceholder: 'Ex: www.meusite.com.br',
    domainAdd: 'Conectar Domínio', domainAdding: 'Conectando...',
    domainRemove: 'Remover', domainRemoving: 'Removendo...',
    domainVerify: 'Verificar DNS', domainVerifying: 'Verificando...',
    domainStatusActive: 'Conectado', domainStatusPending: 'Aguardando DNS', domainStatusMisconfigured: 'DNS incorreto',
    domainDnsTitle: 'Configure o DNS do seu domínio:',
    domainDnsOption1: 'Opção 1 — CNAME (recomendado para subdomínios como www):',
    domainDnsOption2: 'Opção 2 — Registro A (para domínio raiz):',
    domainDnsType: 'Tipo', domainDnsName: 'Nome', domainDnsValue: 'Valor',
    domainDnsHint: 'Após configurar o DNS, clique em "Verificar DNS". A propagação pode levar até 48h.',
    domainCurrentUrl: 'URL atual (gratuita):', domainOr: 'ou',
    publishTitle: 'Publicar site', publishDesc: 'Ao publicar, seu site ficará acessível publicamente.',
    publishBtn: 'Publicar Site', unpublishBtn: 'Despublicar',
    publishing: 'Publicando...', published: 'Site publicado com sucesso!', unpublished: 'Site despublicado.',
    requirements: 'Requisitos para publicar:', preview: 'Pré-visualizar', visitSite: 'Visitar Site',
    saveBeforePreview: 'Salve as alterações primeiro',
    saveBeforePublish: 'Salve as alterações antes de pré-visualizar ou publicar.',
    toastSaveError: 'Erro ao salvar', toastSaveGenericError: 'Erro ao salvar configurações',
    toastDomainConnected: 'Domínio conectado! Configure o DNS.', toastDomainConnectError: 'Erro ao conectar domínio',
    toastDomainRemoved: 'Domínio removido', toastDomainRemoveError: 'Erro ao remover domínio',
    toastDnsOk: 'DNS verificado! Domínio ativo.', toastDnsPending: 'DNS ainda não propagou. Tente novamente mais tarde.',
    toastPublishError: 'Erro ao publicar', toastPublishGenericError: 'Erro ao publicar site',
    toastImageOk: 'Imagem enviada!', toastImageError: 'Erro ao enviar imagem',
    toastCopied: 'Copiado!',
  },
  en: {
    title: 'My Site',
    subtitle: 'Set up and publish your professional real estate site.',
    saving: 'Saving...', save: 'Save Changes', saved: 'Changes saved!',
    sections: { branding: 'Branding', about: 'About the Agent', contact: 'Contact', social: 'Social Media', seo: 'SEO', url: 'Site URL', publish: 'Publishing' },
    siteName: 'Site name', siteNamePlaceholder: 'Ex: John Realtor',
    tagline: 'Tagline', taglinePlaceholder: 'Ex: Find the home of your dreams',
    logo: 'Logo', coverImage: 'Cover image',
    primaryColor: 'Primary color', accentColor: 'Accent color',
    heroTextColor: 'Hero text color', heroPreview: 'Hero preview',
    themeLabel: 'Site theme', themeDark: 'Dark', themeDarkDesc: 'Dark background, light text',
    themeLight: 'Light', themeLightDesc: 'Light background, dark text',
    currencyLabel: 'Price currency', currencyHint: 'This currency will be shown in prices on your public site.',
    previewSiteNameFallback: 'Site Name',
    avatar: 'Agent photo', bio: 'Bio / About', bioPlaceholder: 'Tell a bit about yourself and your experience...',
    creci: 'License', creciPlaceholder: 'Ex: 12345-F',
    email: 'E-mail', phone: 'Phone', whatsapp: 'WhatsApp', address: 'Address',
    instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok',
    socialPlaceholder: 'https://',
    metaTitle: 'Meta title', metaTitlePlaceholder: 'Title for search engines (Google)',
    metaDescription: 'Meta description', metaDescriptionPlaceholder: 'Short description for search engines (up to 160 characters)',
    ogImage: 'Sharing image (OG)', ogHint: '1200×630 recommended',
    upload: 'Upload',
    removeLogo: 'Remove logo', removeCover: 'Remove cover image', removeAvatar: 'Remove photo', removeOg: 'Remove OG image',
    slug: 'Slug (URL)', slugHint: 'Your site will be at:', slugChecking: 'Checking...', slugAvailable: 'Available!', slugTaken: 'Already in use',
    domainTitle: 'Custom Domain', domainDesc: 'Use your own domain for an even more professional site.',
    domainLabel: 'Your domain', domainPlaceholder: 'Ex: www.mysite.com',
    domainAdd: 'Connect Domain', domainAdding: 'Connecting...',
    domainRemove: 'Remove', domainRemoving: 'Removing...',
    domainVerify: 'Verify DNS', domainVerifying: 'Verifying...',
    domainStatusActive: 'Connected', domainStatusPending: 'Waiting DNS', domainStatusMisconfigured: 'DNS incorrect',
    domainDnsTitle: 'Configure your domain DNS:',
    domainDnsOption1: 'Option 1 — CNAME (recommended for subdomains like www):',
    domainDnsOption2: 'Option 2 — A Record (for root domain):',
    domainDnsType: 'Type', domainDnsName: 'Name', domainDnsValue: 'Value',
    domainDnsHint: 'After configuring DNS, click "Verify DNS". Propagation can take up to 48h.',
    domainCurrentUrl: 'Current URL (free):', domainOr: 'or',
    publishTitle: 'Publish site', publishDesc: 'Once published, your site will be publicly accessible.',
    publishBtn: 'Publish Site', unpublishBtn: 'Unpublish',
    publishing: 'Publishing...', published: 'Site published successfully!', unpublished: 'Site unpublished.',
    requirements: 'Requirements to publish:', preview: 'Preview', visitSite: 'Visit Site',
    saveBeforePreview: 'Save changes first',
    saveBeforePublish: 'Save changes before previewing or publishing.',
    toastSaveError: 'Error saving', toastSaveGenericError: 'Error saving settings',
    toastDomainConnected: 'Domain connected! Configure DNS.', toastDomainConnectError: 'Error connecting domain',
    toastDomainRemoved: 'Domain removed', toastDomainRemoveError: 'Error removing domain',
    toastDnsOk: 'DNS verified! Domain active.', toastDnsPending: 'DNS not propagated yet. Try again later.',
    toastPublishError: 'Error publishing', toastPublishGenericError: 'Error publishing site',
    toastImageOk: 'Image uploaded!', toastImageError: 'Error uploading image',
    toastCopied: 'Copied!',
  },
  es: {
    title: 'Mi Sitio',
    subtitle: 'Configura y publica tu sitio profesional de inmuebles.',
    saving: 'Guardando...', save: 'Guardar Cambios', saved: '¡Cambios guardados!',
    sections: { branding: 'Branding', about: 'Sobre el Agente', contact: 'Contacto', social: 'Redes Sociales', seo: 'SEO', url: 'URL del Sitio', publish: 'Publicación' },
    siteName: 'Nombre del sitio', siteNamePlaceholder: 'Ej: Juan Agente Inmobiliario',
    tagline: 'Tagline', taglinePlaceholder: 'Ej: Encuentra el inmueble de tus sueños',
    logo: 'Logo', coverImage: 'Imagen de portada',
    primaryColor: 'Color principal', accentColor: 'Color de acento',
    heroTextColor: 'Color del texto de portada', heroPreview: 'Vista previa de portada',
    themeLabel: 'Tema del sitio', themeDark: 'Oscuro', themeDarkDesc: 'Fondo oscuro, texto claro',
    themeLight: 'Claro', themeLightDesc: 'Fondo claro, texto oscuro',
    currencyLabel: 'Moneda de los precios', currencyHint: 'Esta moneda se mostrará en los precios de tu sitio público.',
    previewSiteNameFallback: 'Nombre del Sitio',
    avatar: 'Foto del agente', bio: 'Bio / Sobre', bioPlaceholder: 'Cuenta un poco sobre ti y tu experiencia...',
    creci: 'Matrícula', creciPlaceholder: 'Ej: 12345-F',
    email: 'Email', phone: 'Teléfono', whatsapp: 'WhatsApp', address: 'Dirección',
    instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok',
    socialPlaceholder: 'https://',
    metaTitle: 'Meta title', metaTitlePlaceholder: 'Título para buscadores (Google)',
    metaDescription: 'Meta description', metaDescriptionPlaceholder: 'Descripción corta para buscadores (hasta 160 caracteres)',
    ogImage: 'Imagen para compartir (OG)', ogHint: '1200×630 recomendado',
    upload: 'Subir',
    removeLogo: 'Quitar logo', removeCover: 'Quitar imagen de portada', removeAvatar: 'Quitar foto', removeOg: 'Quitar imagen OG',
    slug: 'Slug (URL)', slugHint: 'Tu sitio estará en:', slugChecking: 'Verificando...', slugAvailable: '¡Disponible!', slugTaken: 'Ya está en uso',
    domainTitle: 'Dominio Propio', domainDesc: 'Usa tu propio dominio para un sitio aún más profesional.',
    domainLabel: 'Tu dominio', domainPlaceholder: 'Ej: www.misitio.com',
    domainAdd: 'Conectar Dominio', domainAdding: 'Conectando...',
    domainRemove: 'Quitar', domainRemoving: 'Quitando...',
    domainVerify: 'Verificar DNS', domainVerifying: 'Verificando...',
    domainStatusActive: 'Conectado', domainStatusPending: 'Esperando DNS', domainStatusMisconfigured: 'DNS incorrecto',
    domainDnsTitle: 'Configura el DNS de tu dominio:',
    domainDnsOption1: 'Opción 1 — CNAME (recomendado para subdominios como www):',
    domainDnsOption2: 'Opción 2 — Registro A (para dominio raíz):',
    domainDnsType: 'Tipo', domainDnsName: 'Nombre', domainDnsValue: 'Valor',
    domainDnsHint: 'Tras configurar el DNS, haz clic en "Verificar DNS". La propagación puede tardar hasta 48h.',
    domainCurrentUrl: 'URL actual (gratis):', domainOr: 'o',
    publishTitle: 'Publicar sitio', publishDesc: 'Al publicar, tu sitio quedará accesible públicamente.',
    publishBtn: 'Publicar Sitio', unpublishBtn: 'Despublicar',
    publishing: 'Publicando...', published: '¡Sitio publicado con éxito!', unpublished: 'Sitio despublicado.',
    requirements: 'Requisitos para publicar:', preview: 'Previsualizar', visitSite: 'Visitar Sitio',
    saveBeforePreview: 'Guarda los cambios primero',
    saveBeforePublish: 'Guarda los cambios antes de previsualizar o publicar.',
    toastSaveError: 'Error al guardar', toastSaveGenericError: 'Error al guardar la configuración',
    toastDomainConnected: '¡Dominio conectado! Configura el DNS.', toastDomainConnectError: 'Error al conectar el dominio',
    toastDomainRemoved: 'Dominio quitado', toastDomainRemoveError: 'Error al quitar el dominio',
    toastDnsOk: '¡DNS verificado! Dominio activo.', toastDnsPending: 'El DNS aún no propagó. Inténtalo más tarde.',
    toastPublishError: 'Error al publicar', toastPublishGenericError: 'Error al publicar el sitio',
    toastImageOk: '¡Imagen enviada!', toastImageError: 'Error al enviar la imagen',
    toastCopied: '¡Copiado!',
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function SiteSettingsPage() {
  const orgId = useActiveOrgId()
  const { user } = useAuth()
  const lang = (user?.language as Lang) || 'pt'
  const t = TRANSLATIONS[lang]

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
        toast.error(data.error || t.toastSaveError)
        return
      }

      setHasSaved(true)
      toast.success(t.saved)
    } catch (err) {
      toast.error(t.toastSaveGenericError)
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
        toast.error(data.error || t.toastDomainConnectError)
        return
      }
      toast.success(t.toastDomainConnected)
      setDomainInput('')
      await fetchDomainStatus()
    } catch {
      toast.error(t.toastDomainConnectError)
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
      toast.success(t.toastDomainRemoved)
      setDomainData(null)
    } catch {
      toast.error(t.toastDomainRemoveError)
    } finally {
      setDomainAction('idle')
    }
  }

  const handleVerifyDomain = async () => {
    setDomainAction('verifying')
    await fetchDomainStatus()
    setDomainAction('idle')
    if (domainData?.status === 'active') {
      toast.success(t.toastDnsOk)
    } else {
      toast.error(t.toastDnsPending)
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
          toast.error(data.error || t.toastPublishError)
        }
        return
      }

      setForm(prev => ({ ...prev, is_published: publish }))
      toast.success(publish ? t.published : t.unpublished)
    } catch (err) {
      toast.error(t.toastPublishGenericError)
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
          toast.success(t.toastImageOk)
        }
      } catch {
        toast.error(t.toastImageError)
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
            {t.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {t.subtitle}
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
              <ExternalLink size={15} /> {t.visitSite}
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>

      {/* ═══ URL DO SITE ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Globe size={18} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.sections.url}</h2>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>{t.slug}</label>
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
              {t.slugHint} <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{siteUrl}</span>
            </p>
          )}
          {slugStatus === 'taken' && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{t.slugTaken}</p>
          )}
        </div>
      </div>

      {/* ═══ DOMÍNIO PRÓPRIO ═══ */}
      {hasSaved && (
        <div className={sectionClass} style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={18} style={{ color: 'var(--color-success)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.domainTitle}</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{t.domainDesc}</p>

          {/* URL gratuita atual */}
          {form.slug && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
              <Globe size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.domainCurrentUrl}</span>
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
                      {domainData.status === 'active' ? t.domainStatusActive : domainData.status === 'misconfigured' ? t.domainStatusMisconfigured : t.domainStatusPending}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {domainData.status !== 'active' && (
                    <button onClick={handleVerifyDomain} disabled={domainAction === 'verifying'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                      {domainAction === 'verifying' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {domainAction === 'verifying' ? t.domainVerifying : t.domainVerify}
                    </button>
                  )}
                  <button onClick={handleRemoveDomain} disabled={domainAction === 'removing'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid var(--color-error-subtle)' }}>
                    {domainAction === 'removing' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    {domainAction === 'removing' ? t.domainRemoving : t.domainRemove}
                  </button>
                </div>
              </div>

              {/* Instruções DNS (só se não está ativo) */}
              {domainData.status !== 'active' && (
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.domainDnsTitle}</p>

                  {/* CNAME */}
                  <div>
                    <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{t.domainDnsOption1}</p>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      <span>{t.domainDnsType}</span>
                      <span>{t.domainDnsName}</span>
                      <span>{t.domainDnsValue}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2 rounded-lg" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                      <span>CNAME</span>
                      <span>www</span>
                      <button onClick={() => { navigator.clipboard.writeText('cname.vercel-dns.com'); toast.success(t.toastCopied) }} className="flex items-center gap-1 hover:opacity-80 text-left">
                        cname.vercel-dns.com <Copy size={10} className="shrink-0 opacity-50" />
                      </button>
                    </div>
                  </div>

                  {/* A Record */}
                  <div>
                    <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{t.domainDnsOption2}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2 rounded-lg" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                      <span>A</span>
                      <span>@</span>
                      <button onClick={() => { navigator.clipboard.writeText('76.76.21.21'); toast.success(t.toastCopied) }} className="flex items-center gap-1 hover:opacity-80 text-left">
                        76.76.21.21 <Copy size={10} className="shrink-0 opacity-50" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t.domainDnsHint}</p>
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
                placeholder={t.domainPlaceholder}
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
                {domainAction === 'adding' ? t.domainAdding : t.domainAdd}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ BRANDING ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Palette size={18} style={{ color: 'var(--color-indigo)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.sections.branding}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>{t.siteName}</label>
            <input type="text" value={form.site_name} onChange={(e) => updateField('site_name', e.target.value)} placeholder={t.siteNamePlaceholder} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{t.tagline}</label>
            <input type="text" value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} placeholder={t.taglinePlaceholder} className={inputClass} style={inputStyle} />
          </div>
        </div>

        {/* Logo e Cover */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>{t.logo}</label>
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
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.upload}</span>
                  </div>
                )}
              </div>
              {form.logo_url && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateField('logo_url', '') }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'var(--color-error)', color: '#fff' }}
                  title={t.removeLogo}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{t.coverImage}</label>
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
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.upload}</span>
                  </div>
                )}
              </div>
              {form.cover_image_url && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateField('cover_image_url', '') }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'var(--color-error)', color: '#fff' }}
                  title={t.removeCover}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tema do Site */}
        <div>
          <label className={labelClass} style={labelStyle}>{t.themeLabel}</label>
          <div className="flex gap-3">
            {([
              { value: 'dark', label: t.themeDark, desc: t.themeDarkDesc, bg: '#0A0A0F', text: '#fff', border: '#2A2A3C' },
              { value: 'light', label: t.themeLight, desc: t.themeLightDesc, bg: '#FFFFFF', text: '#1A1A2E', border: '#E2E2EC' },
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
            <label className={labelClass} style={labelStyle}>{t.primaryColor}</label>
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
            <label className={labelClass} style={labelStyle}>{t.accentColor}</label>
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
          <label className={labelClass} style={labelStyle}>{t.heroTextColor}</label>
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
          <label className={labelClass} style={labelStyle}>{t.heroPreview}</label>
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
                {form.site_name || t.previewSiteNameFallback}
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
          <label className={labelClass} style={labelStyle}>{t.currencyLabel}</label>
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
            {t.currencyHint}
          </p>
        </div>
      </div>

      {/* ═══ SOBRE O CORRETOR ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <User size={18} style={{ color: 'var(--color-success)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.sections.about}</h2>
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
                title={t.removeAvatar}
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className={labelClass} style={labelStyle}>{t.creci}</label>
              <input type="text" value={form.creci} onChange={(e) => updateField('creci', e.target.value)} placeholder={t.creciPlaceholder} className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>{t.bio}</label>
          <textarea value={form.bio} onChange={(e) => updateField('bio', e.target.value)} placeholder={t.bioPlaceholder} rows={4} className={inputClass + ' resize-none'} style={inputStyle} />
        </div>
      </div>

      {/* ═══ CONTATO ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Phone size={18} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.sections.contact}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>{t.email}</label>
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{t.phone}</label>
            <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{t.whatsapp}</label>
            <input type="tel" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} className={inputClass} style={inputStyle} placeholder="5511999999999" />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>{t.address}</label>
            <input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)} className={inputClass} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ═══ REDES SOCIAIS ═══ */}
      <div className={sectionClass} style={sectionStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Share2 size={18} style={{ color: 'var(--color-accent)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.sections.social}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok'] as const).map((network) => (
            <div key={network}>
              <label className={labelClass} style={labelStyle}>{t[network]}</label>
              <input
                type="url"
                value={form.social_links[network]}
                onChange={(e) => updateSocial(network, e.target.value)}
                placeholder={t.socialPlaceholder}
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
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.sections.seo}</h2>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>{t.metaTitle}</label>
          <input type="text" value={form.meta_title} onChange={(e) => updateField('meta_title', e.target.value)} placeholder={t.metaTitlePlaceholder} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>{t.metaDescription}</label>
          <textarea value={form.meta_description} onChange={(e) => updateField('meta_description', e.target.value)} placeholder={t.metaDescriptionPlaceholder} rows={3} className={inputClass + ' resize-none'} style={inputStyle} maxLength={160} />
          <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--color-text-tertiary)' }}>
            {form.meta_description.length}/160
          </p>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>{t.ogImage}</label>
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
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.ogHint}</span>
                </div>
              )}
            </div>
            {form.og_image_url && (
              <button
                onClick={(e) => { e.stopPropagation(); updateField('og_image_url', '') }}
                className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                style={{ background: 'var(--color-error)', color: '#fff' }}
                title={t.removeOg}
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
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.sections.publish}</h2>
          {form.is_published && (
            <span className="ml-auto px-2.5 py-1 rounded-lg text-[11px] font-bold border" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
              ONLINE
            </span>
          )}
        </div>

        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t.publishDesc}</p>

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
                <ExternalLink size={15} /> {t.visitSite}
              </a>
              <button
                onClick={() => handlePublish(false)}
                disabled={publishing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {publishing ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                {t.unpublishBtn}
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
                  <Eye size={15} /> {t.preview}
                </a>
              ) : (
                <span
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border opacity-40 cursor-not-allowed"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  title={t.saveBeforePreview}
                >
                  <Eye size={15} /> {t.preview}
                </span>
              )}
              <button
                onClick={() => handlePublish(true)}
                disabled={publishing || !hasSaved}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {publishing ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
                {publishing ? t.publishing : t.publishBtn}
              </button>
              {!hasSaved && (
                <p className="text-xs w-full mt-1" style={{ color: 'var(--color-accent)' }}>
                  <AlertCircle size={12} className="inline mr-1" />
                  {t.saveBeforePublish}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
