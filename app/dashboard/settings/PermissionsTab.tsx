'use client'

import { useEffect, useState, useCallback } from 'react'
import { Shield, Plus, Trash2, Save, Loader2, Check, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/AuthContext'
import {
  MODULE_LABELS,
  MODULE_GROUPS,
  GROUP_LABELS,
  PERMISSION_MODULES,
  DEFAULT_VENDEDOR_PERMISSIONS,
  DEFAULT_CUSTOM_PERMISSIONS,
  type PermissionModule,
  type OrgRole,
} from '@/lib/permissions'

type Props = {
  orgId: string
}

type Lang = 'pt' | 'en' | 'es'

const TRANSLATIONS = {
  pt: {
    title: 'Permissões por Role',
    newRole: 'Novo role',
    intro: (admin: string) => <>Defina o que cada tipo de usuário pode acessar. O role <strong>{admin}</strong> sempre tem acesso total. Ao convidar, você escolhe qual role atribuir.</>,
    adminWord: 'Administrador',
    rolesOfOrg: 'Roles da organização',
    system: 'SISTEMA',
    selectRole: 'Selecione um role para editar',
    adminTitle: 'Administrador',
    adminDesc: 'O admin sempre tem acesso total e não pode ser editado.',
    roleName: 'Nome do role',
    removeRole: 'Remover role',
    savePerms: 'Salvar permissões',
    saving: 'Salvando...',
    modalTitle: 'Novo role',
    modalNameLabel: 'Nome (ex: Gestor, Aux. Finanças)',
    modalNamePlaceholder: 'Gestor',
    modalHint: 'Você poderá configurar as permissões depois de criar.',
    createRole: 'Criar role',
    loading: 'Carregando permissões...',
    confirmRemove: (name: string) => `Remover o role "${name}"?`,
    toastLoadError: 'Erro ao carregar roles',
    toastSaved: 'Permissões salvas',
    toastSaveError: 'Erro ao salvar',
    toastNameShort: 'Nome muito curto',
    toastRoleCreated: 'Role criado',
    toastCreateError: 'Erro ao criar role',
    toastRoleRemoved: 'Role removido',
    toastRemoveError: 'Erro ao remover',
  },
  en: {
    title: 'Permissions by Role',
    newRole: 'New role',
    intro: (admin: string) => <>Define what each user type can access. The <strong>{admin}</strong> role always has full access. When inviting, you choose which role to assign.</>,
    adminWord: 'Administrator',
    rolesOfOrg: 'Organization roles',
    system: 'SYSTEM',
    selectRole: 'Select a role to edit',
    adminTitle: 'Administrator',
    adminDesc: 'The admin always has full access and cannot be edited.',
    roleName: 'Role name',
    removeRole: 'Remove role',
    savePerms: 'Save permissions',
    saving: 'Saving...',
    modalTitle: 'New role',
    modalNameLabel: 'Name (e.g. Manager, Finance Assistant)',
    modalNamePlaceholder: 'Manager',
    modalHint: 'You will be able to configure permissions after creating.',
    createRole: 'Create role',
    loading: 'Loading permissions...',
    confirmRemove: (name: string) => `Remove the role "${name}"?`,
    toastLoadError: 'Error loading roles',
    toastSaved: 'Permissions saved',
    toastSaveError: 'Error saving',
    toastNameShort: 'Name too short',
    toastRoleCreated: 'Role created',
    toastCreateError: 'Error creating role',
    toastRoleRemoved: 'Role removed',
    toastRemoveError: 'Error removing',
  },
  es: {
    title: 'Permisos por Rol',
    newRole: 'Nuevo rol',
    intro: (admin: string) => <>Define lo que cada tipo de usuario puede acceder. El rol <strong>{admin}</strong> siempre tiene acceso total. Al invitar, eliges qué rol asignar.</>,
    adminWord: 'Administrador',
    rolesOfOrg: 'Roles de la organización',
    system: 'SISTEMA',
    selectRole: 'Selecciona un rol para editar',
    adminTitle: 'Administrador',
    adminDesc: 'El admin siempre tiene acceso total y no puede ser editado.',
    roleName: 'Nombre del rol',
    removeRole: 'Quitar rol',
    savePerms: 'Guardar permisos',
    saving: 'Guardando...',
    modalTitle: 'Nuevo rol',
    modalNameLabel: 'Nombre (ej: Gestor, Aux. Finanzas)',
    modalNamePlaceholder: 'Gestor',
    modalHint: 'Podrás configurar los permisos después de crear.',
    createRole: 'Crear rol',
    loading: 'Cargando permisos...',
    confirmRemove: (name: string) => `¿Quitar el rol "${name}"?`,
    toastLoadError: 'Error al cargar los roles',
    toastSaved: 'Permisos guardados',
    toastSaveError: 'Error al guardar',
    toastNameShort: 'Nombre muy corto',
    toastRoleCreated: 'Rol creado',
    toastCreateError: 'Error al crear el rol',
    toastRoleRemoved: 'Rol quitado',
    toastRemoveError: 'Error al quitar',
  },
} as const

export default function PermissionsTab({ orgId }: Props) {
  const { user } = useAuth()
  const lang = (user?.language as Lang) || 'pt'
  const t = TRANSLATIONS[lang]
  const [roles, setRoles] = useState<OrgRole[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({})
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null
  const isAdminRole = selectedRole?.slug === 'admin'

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/permissions/roles?orgId=${orgId}`)
    const json = await res.json()
    if (res.ok) {
      setRoles(json.roles || [])
      // Selecionar vendedor por padrão
      if (!selectedRoleId) {
        const vendedor = json.roles?.find((r: OrgRole) => r.slug === 'vendedor')
        if (vendedor) setSelectedRoleId(vendedor.id)
      }
    } else {
      toast.error(json.error || t.toastLoadError)
    }
    setLoading(false)
  }, [orgId, selectedRoleId, t])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Quando trocar role selecionado, popular edit state
  useEffect(() => {
    if (!selectedRole) return
    setEditName(selectedRole.name)
    // Merge com defaults para ter todas as chaves
    const base =
      selectedRole.slug === 'vendedor'
        ? DEFAULT_VENDEDOR_PERMISSIONS
        : DEFAULT_CUSTOM_PERMISSIONS
    const merged: Record<string, boolean> = { ...base }
    for (const mod of PERMISSION_MODULES) {
      if (selectedRole.permissions?.[mod] !== undefined) {
        merged[mod] = selectedRole.permissions[mod] === true
      }
    }
    setEditPerms(merged)
  }, [selectedRole])

  async function handleSave() {
    if (!selectedRole) return
    setSaving(true)
    const res = await fetch('/api/permissions/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedRole.id,
        orgId,
        name: selectedRole.is_system ? undefined : editName,
        permissions: editPerms,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success(t.toastSaved)
      await fetchRoles()
    } else {
      toast.error(json.error || t.toastSaveError)
    }
    setSaving(false)
  }

  async function handleCreate() {
    if (newRoleName.trim().length < 2) {
      toast.error(t.toastNameShort)
      return
    }
    setSaving(true)
    const res = await fetch('/api/permissions/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId,
        name: newRoleName.trim(),
        permissions: DEFAULT_CUSTOM_PERMISSIONS,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success(t.toastRoleCreated)
      setShowCreate(false)
      setNewRoleName('')
      await fetchRoles()
      setSelectedRoleId(json.role.id)
    } else {
      toast.error(json.error || t.toastCreateError)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!selectedRole || selectedRole.is_system) return
    if (!confirm(t.confirmRemove(selectedRole.name))) return
    const res = await fetch(
      `/api/permissions/roles?id=${selectedRole.id}&orgId=${orgId}`,
      { method: 'DELETE' }
    )
    const json = await res.json()
    if (res.ok) {
      toast.success(t.toastRoleRemoved)
      setSelectedRoleId(null)
      await fetchRoles()
    } else {
      toast.error(json.error || t.toastRemoveError)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ color: 'var(--color-text-muted)' }}>
        <Loader2 className="animate-spin mr-2" size={20} /> {t.loading}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Shield size={20} style={{ color: 'var(--color-primary)' }} /> {t.title}
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          <Plus size={16} /> {t.newRole}
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {t.intro(t.adminWord)}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        {/* LISTA DE ROLES */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-elevated)' }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            {t.rolesOfOrg}
          </div>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className="w-full text-left px-3 py-2.5 flex items-center justify-between transition-colors"
              style={{
                background: role.id === selectedRoleId ? 'var(--color-primary-subtle)' : 'transparent',
                color: role.id === selectedRoleId ? 'var(--color-primary)' : 'var(--color-text-primary)',
                borderBottom: '1px solid var(--color-border-subtle)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{role.name}</span>
                {role.is_system && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>
                    {t.system}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* PAINEL DE EDIÇÃO */}
        <div className="rounded-xl p-5" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-elevated)' }}>
          {!selectedRole ? (
            <div className="text-sm py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
              {t.selectRole}
            </div>
          ) : isAdminRole ? (
            <div className="py-6 text-center space-y-2">
              <Shield size={32} className="mx-auto" style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.adminTitle}</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {t.adminDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Nome + ações */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.roleName}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    disabled={selectedRole.is_system}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-60"
                    style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                {!selectedRole.is_system && (
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg"
                    title={t.removeRole}
                    style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Grupos de permissões */}
              <div className="space-y-4">
                {MODULE_GROUPS.map((groupKey) => {
                  const mods = PERMISSION_MODULES.filter((m) => MODULE_LABELS[m].group === groupKey)
                  return (
                    <div key={groupKey}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                        {GROUP_LABELS[groupKey][lang]}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mods.map((mod) => {
                          const enabled = editPerms[mod] === true
                          return (
                            <button
                              key={mod}
                              type="button"
                              onClick={() => setEditPerms((p) => ({ ...p, [mod]: !enabled }))}
                              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all text-left"
                              style={{
                                background: enabled ? 'var(--color-success-subtle)' : 'var(--color-bg-base)',
                                border: `1px solid ${enabled ? 'var(--color-success)' : 'var(--color-border-subtle)'}`,
                                color: 'var(--color-text-primary)',
                              }}
                            >
                              <span className="font-medium">{MODULE_LABELS[mod][lang]}</span>
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                style={{
                                  background: enabled ? 'var(--color-success)' : 'var(--color-bg-hover)',
                                  color: enabled ? '#fff' : 'var(--color-text-muted)',
                                }}
                              >
                                {enabled ? <Check size={12} /> : <XIcon size={12} />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? t.saving : t.savePerms}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: NOVO ROLE */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="p-6 rounded-2xl w-full max-w-md shadow-2xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.modalTitle}</h3>
              <button onClick={() => { setShowCreate(false); setNewRoleName('') }} style={{ color: 'var(--color-text-muted)' }}>
                <XIcon size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {t.modalNameLabel}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder={t.modalNamePlaceholder}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t.modalHint}
                </p>
              </div>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                {saving ? t.saving : t.createRole}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
