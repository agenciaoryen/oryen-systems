// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useActiveOrgId } from '@/lib/AuthContext'
import { PROPERTY_TYPES, TRANSACTION_TYPES, PROPERTY_STATUSES, formatArea } from '@/lib/properties/constants'
import { formatPrice } from '@/lib/format'
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Home,
  Bed,
  Bath,
  Car,
  Maximize,
  Star,
  Eye,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react'
import CustomSelect from '@/app/dashboard/components/CustomSelect'

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
  pt: {
    title: 'Portfólio de Imóveis',
    subtitle: 'Gerencie seus imóveis. Eles aparecem automaticamente no seu site.',
    newProperty: 'Novo Imóvel',
    search: 'Buscar por título...',
    allStatuses: 'Todos os Status',
    allTypes: 'Todos os Tipos',
    noProperties: 'Nenhum imóvel cadastrado',
    noPropertiesDesc: 'Cadastre seu primeiro imóvel para começar a montar seu portfólio.',
    noResults: 'Nenhum imóvel encontrado',
    noResultsDesc: 'Tente mudar os filtros ou buscar outro termo.',
    featured: 'Destaque',
    edit: 'Editar',
    delete: 'Excluir',
    confirmDelete: 'Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.',
    deleting: 'Excluindo...',
    of: 'de',
    properties: 'imóveis',
    bedrooms: 'quartos',
    bathrooms: 'banheiros',
    parking: 'vagas',
    cancel: 'Cancelar',
  },
  en: {
    title: 'Property Portfolio',
    subtitle: 'Manage your properties. They appear automatically on your site.',
    newProperty: 'New Property',
    search: 'Search by title...',
    allStatuses: 'All Statuses',
    allTypes: 'All Types',
    noProperties: 'No properties yet',
    noPropertiesDesc: 'Add your first property to start building your portfolio.',
    noResults: 'No properties found',
    noResultsDesc: 'Try changing the filters or search term.',
    featured: 'Featured',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this property? This action cannot be undone.',
    deleting: 'Deleting...',
    of: 'of',
    properties: 'properties',
    bedrooms: 'bedrooms',
    bathrooms: 'bathrooms',
    parking: 'parking',
    cancel: 'Cancel',
  },
  es: {
    title: 'Portafolio de Inmuebles',
    subtitle: 'Gestione sus inmuebles. Aparecen automáticamente en su sitio.',
    newProperty: 'Nuevo Inmueble',
    search: 'Buscar por título...',
    allStatuses: 'Todos los Estados',
    allTypes: 'Todos los Tipos',
    noProperties: 'Ningún inmueble registrado',
    noPropertiesDesc: 'Registre su primer inmueble para empezar a armar su portafolio.',
    noResults: 'Ningún inmueble encontrado',
    noResultsDesc: 'Intente cambiar los filtros o buscar otro término.',
    featured: 'Destacado',
    edit: 'Editar',
    delete: 'Eliminar',
    confirmDelete: '¿Está seguro que desea eliminar este inmueble? Esta acción no se puede deshacer.',
    deleting: 'Eliminando...',
    of: 'de',
    properties: 'inmuebles',
    bedrooms: 'habitaciones',
    bathrooms: 'baños',
    parking: 'estacionamiento',
    cancel: 'Cancelar',
  },
}

type Lang = 'pt' | 'en' | 'es'

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  draft: { bg: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)', border: 'var(--color-border)' },
  active: { bg: 'var(--color-success-subtle)', color: 'var(--color-success)', border: 'var(--color-success)' },
  sold: { bg: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: 'var(--color-primary)' },
  rented: { bg: 'var(--color-indigo-subtle)', color: 'var(--color-indigo)', border: 'var(--color-indigo)' },
  inactive: { bg: 'var(--color-error-subtle)', color: 'var(--color-error)', border: 'var(--color-error)' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function PortfolioPage() {
  const router = useRouter()
  const orgId = useActiveOrgId()
  const { user } = useAuth()
  const currency = (user as any)?.currency || 'BRL'
  const lang: Lang = ((user as any)?.language as Lang) || 'pt'
  const t = T[lang] || T.pt

  // States
  const [properties, setProperties] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ─── FETCH ───
  const fetchProperties = useCallback(async () => {
    if (!orgId) return
    setLoading(true)

    const params = new URLSearchParams({
      org_id: orgId,
      page: String(page),
      limit: '12',
    })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)

    try {
      const res = await fetch(`/api/properties?${params}`)
      const data = await res.json()
      setProperties(data.properties || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error('Failed to fetch properties:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, page, search, statusFilter, typeFilter])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, typeFilter])

  // ─── DELETE ───
  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    setDeleting(deleteConfirmId)
    setDeleteConfirmId(null)

    try {
      await fetch(`/api/properties/${deleteConfirmId}?org_id=${orgId}`, { method: 'DELETE' })
      fetchProperties()
    } catch (err) {
      console.error('Failed to delete property:', err)
    } finally {
      setDeleting(null)
    }
  }

  // ─── TOGGLE FEATURED ───
  const handleToggleFeatured = async (e: React.MouseEvent, prop: any) => {
    e.stopPropagation()
    const newValue = !prop.is_featured
    // Atualizar otimisticamente na UI
    setProperties(prev => prev.map(p => p.id === prop.id ? { ...p, is_featured: newValue } : p))
    try {
      await fetch(`/api/properties/${prop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prop, is_featured: newValue, org_id: orgId }),
      })
    } catch (err) {
      // Reverter em caso de erro
      setProperties(prev => prev.map(p => p.id === prop.id ? { ...p, is_featured: !newValue } : p))
    }
  }

  // ─── COVER IMAGE ───
  const getCover = (images: any[]) => {
    if (!images || images.length === 0) return null
    const cover = images.find((img: any) => img.is_cover)
    return cover?.url || images[0]?.url || null
  }

  return (
    <div className="space-y-6 pb-6">
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
        <button
          onClick={() => router.push('/dashboard/portfolio/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0"
          style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 6px -1px rgba(59,130,246,0.2)' }}
        >
          <Plus size={18} />
          {t.newProperty}
        </button>
      </div>

      {/* ═══ FILTROS ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Busca */}
        <div className="relative sm:flex-1 sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border transition-all"
            style={{
              background: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status + Tipo (lado a lado no mobile) */}
        <div className="flex gap-3">
          <div className="flex-1 sm:w-44 sm:flex-none">
            <CustomSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: '', label: t.allStatuses },
                ...Object.entries(PROPERTY_STATUSES).map(([key, labels]) => ({ value: key, label: labels[lang] })),
              ]}
            />
          </div>

          <div className="flex-1 sm:w-44 sm:flex-none">
            <CustomSelect
              value={typeFilter}
              onChange={(v) => setTypeFilter(v)}
              options={[
                { value: '', label: t.allTypes },
                ...Object.entries(PROPERTY_TYPES).map(([key, labels]) => ({ value: key, label: labels[lang] })),
              ]}
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border overflow-hidden shrink-0 self-stretch sm:self-auto" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setViewMode('grid')}
            className="px-3 py-2.5 transition-all"
            style={{ background: viewMode === 'grid' ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)', color: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="px-3 py-2.5 transition-all"
            style={{ background: viewMode === 'list' ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)', color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* ═══ CONTADOR ═══ */}
      {!loading && (
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {total} {t.properties}
        </p>
      )}

      {/* ═══ LOADING ═══ */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!loading && properties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-primary-subtle)' }}>
            <Home size={28} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {total === 0 ? t.noProperties : t.noResults}
          </h3>
          <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {total === 0 ? t.noPropertiesDesc : t.noResultsDesc}
          </p>
          {total === 0 && (
            <button
              onClick={() => router.push('/dashboard/portfolio/new')}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <Plus size={18} />
              {t.newProperty}
            </button>
          )}
        </div>
      )}

      {/* ═══ GRID VIEW ═══ */}
      {!loading && properties.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {properties.map((prop) => {
            const cover = getCover(prop.images)
            return (
              <div
                key={prop.id}
                className="rounded-2xl border overflow-hidden transition-all hover:shadow-lg hover:shadow-black/10 group cursor-pointer"
                style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
                onClick={() => router.push(`/dashboard/portfolio/${prop.id}`)}
              >
                {/* Imagem */}
                <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--color-bg-surface)' }}>
                  {cover ? (
                    <img src={cover} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={40} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  )}
                  {/* Status badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase" style={{ background: (STATUS_STYLES[prop.status] || STATUS_STYLES.draft).bg, color: (STATUS_STYLES[prop.status] || STATUS_STYLES.draft).color, border: `1px solid ${(STATUS_STYLES[prop.status] || STATUS_STYLES.draft).border}` }}>
                    {PROPERTY_STATUSES[prop.status]?.[lang] || prop.status}
                  </div>
                  {/* Featured toggle */}
                  <button
                    onClick={(e) => handleToggleFeatured(e, prop)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg transition-all hover:scale-110"
                    style={{
                      background: prop.is_featured ? 'var(--color-accent)' : 'var(--color-bg-overlay)',
                      color: prop.is_featured ? '#111' : 'var(--color-text-muted)',
                    }}
                    title={prop.is_featured ? 'Remover destaque' : 'Destacar imóvel'}
                  >
                    <Star size={14} fill={prop.is_featured ? 'currentColor' : 'none'} />
                  </button>
                  {/* Price overlay */}
                  {prop.price && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg backdrop-blur-sm text-sm font-bold" style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}>
                      {formatPrice(prop.price, currency)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                      {PROPERTY_TYPES[prop.property_type]?.[lang]} • {TRANSACTION_TYPES[prop.transaction_type]?.[lang]}
                    </p>
                    {prop.external_code && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-tertiary)' }}>
                        {prop.external_code}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm truncate mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    {prop.title}
                  </h3>
                  {prop.address_neighborhood && (
                    <p className="text-xs truncate mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                      {prop.address_neighborhood}{prop.address_city ? `, ${prop.address_city}` : ''}
                    </p>
                  )}
                  {/* Features */}
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {prop.bedrooms > 0 && (
                      <span className="flex items-center gap-1"><Bed size={13} /> {prop.bedrooms}</span>
                    )}
                    {prop.bathrooms > 0 && (
                      <span className="flex items-center gap-1"><Bath size={13} /> {prop.bathrooms}</span>
                    )}
                    {prop.parking_spots > 0 && (
                      <span className="flex items-center gap-1"><Car size={13} /> {prop.parking_spots}</span>
                    )}
                    {prop.total_area && (
                      <span className="flex items-center gap-1"><Maximize size={13} /> {formatArea(prop.total_area)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/portfolio/${prop.id}`) }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <Edit3 size={13} /> {t.edit}
                  </button>
                  <div className="w-px" style={{ background: 'var(--color-border)' }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(prop.id) }}
                    disabled={deleting === prop.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all disabled:opacity-50"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {deleting === prop.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    {deleting === prop.id ? t.deleting : t.delete}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {!loading && properties.length > 0 && viewMode === 'list' && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          {properties.map((prop, i) => {
            const cover = getCover(prop.images)
            return (
              <div
                key={prop.id}
                className="flex items-center gap-4 p-4 transition-all cursor-pointer"
                style={{ borderBottom: i < properties.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                onClick={() => router.push(`/dashboard/portfolio/${prop.id}`)}
              >
                {/* Thumb */}
                <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--color-bg-surface)' }}>
                  {cover ? (
                    <img src={cover} alt={prop.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={20} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {prop.title}
                    </h3>
                    <button
                      onClick={(e) => handleToggleFeatured(e, prop)}
                      className="shrink-0 transition-all hover:scale-110"
                      style={{ color: prop.is_featured ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                      title={prop.is_featured ? 'Remover destaque' : 'Destacar imóvel'}
                    >
                      <Star size={13} fill={prop.is_featured ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {PROPERTY_TYPES[prop.property_type]?.[lang]} • {TRANSACTION_TYPES[prop.transaction_type]?.[lang]}
                    {prop.address_neighborhood ? ` • ${prop.address_neighborhood}` : ''}
                  </p>
                </div>

                {/* Features */}
                <div className="hidden md:flex items-center gap-3 text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                  {prop.bedrooms > 0 && <span className="flex items-center gap-1"><Bed size={13} /> {prop.bedrooms}</span>}
                  {prop.total_area && <span className="flex items-center gap-1"><Maximize size={13} /> {formatArea(prop.total_area)}</span>}
                </div>

                {/* Price */}
                <div className="text-sm font-bold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                  {formatPrice(prop.price, currency)}
                </div>

                {/* Status */}
                <div className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase shrink-0" style={{ background: (STATUS_STYLES[prop.status] || STATUS_STYLES.draft).bg, color: (STATUS_STYLES[prop.status] || STATUS_STYLES.draft).color, border: `1px solid ${(STATUS_STYLES[prop.status] || STATUS_STYLES.draft).border}` }}>
                  {PROPERTY_STATUSES[prop.status]?.[lang]}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/portfolio/${prop.id}`) }}
                    className="p-2 rounded-lg transition-all"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(prop.id) }}
                    disabled={deleting === prop.id}
                    className="p-2 rounded-lg transition-all disabled:opacity-50"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {deleting === prop.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ PAGINAÇÃO ═══ */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border transition-all disabled:opacity-30"
            style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm px-3" style={{ color: 'var(--color-text-secondary)' }}>
            {page} {t.of} {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border transition-all disabled:opacity-30"
            style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="p-6 rounded-2xl w-full max-w-sm shadow-2xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              {t.confirmDelete}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'var(--color-error)', color: '#fff' }}
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
