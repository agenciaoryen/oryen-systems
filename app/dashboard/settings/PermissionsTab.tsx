'use client'

import { useEffect, useState, useCallback } from 'react'
import { Shield, Plus, Trash2, Save, Loader2, Check, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  MODULE_LABELS,
  MODULE_GROUPS,
  PERMISSION_MODULES,
  DEFAULT_VENDEDOR_PERMISSIONS,
  DEFAULT_CUSTOM_PERMISSIONS,
  type PermissionModule,
  type OrgRole,
} from '@/lib/permissions'

type Props = {
  orgId: string
}

export default function PermissionsTab({ orgId }: Props) {
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
      toast.error(json.error || 'Erro ao carregar roles')
    }
    setLoading(false)
  }, [orgId, selectedRoleId])

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
      toast.success('Permissões salvas')
      await fetchRoles()
    } else {
      toast.error(json.error || 'Erro ao salvar')
    }
    setSaving(false)
  }

  async function handleCreate() {
    if (newRoleName.trim().length < 2) {
      toast.error('Nome muito curto')
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
      toast.success('Role criado')
      setShowCreate(false)
      setNewRoleName('')
      await fetchRoles()
      setSelectedRoleId(json.role.id)
    } else {
      toast.error(json.error || 'Erro ao criar role')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!selectedRole || selectedRole.is_system) return
    if (!confirm(`Remover o role "${selectedRole.name}"?`)) return
    const res = await fetch(
      `/api/permissions/roles?id=${selectedRole.id}&orgId=${orgId}`,
      { method: 'DELETE' }
    )
    const json = await res.json()
    if (res.ok) {
      toast.success('Role removido')
      setSelectedRoleId(null)
      await fetchRoles()
    } else {
      toast.error(json.error || 'Erro ao remover')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ color: 'var(--color-text-muted)' }}>
        <Loader2 className="animate-spin mr-2" size={20} /> Carregando permissões...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Shield size={20} style={{ color: 'var(--color-primary)' }} /> Permissões por Role
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          <Plus size={16} /> Novo role
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Defina o que cada tipo de usuário pode acessar. O role <strong>Administrador</strong> sempre tem acesso total. Ao convidar, você escolhe qual role atribuir.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        {/* LISTA DE ROLES */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-elevated)' }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            Roles da organização
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
                    SISTEMA
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
              Selecione um role para editar
            </div>
          ) : isAdminRole ? (
            <div className="py-6 text-center space-y-2">
              <Shield size={32} className="mx-auto" style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Administrador</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                O admin sempre tem acesso total e não pode ser editado.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Nome + ações */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Nome do role
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
                    title="Remover role"
                    style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Grupos de permissões */}
              <div className="space-y-4">
                {MODULE_GROUPS.map((groupName) => {
                  const mods = PERMISSION_MODULES.filter((m) => MODULE_LABELS[m].group === groupName)
                  return (
                    <div key={groupName}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                        {groupName}
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
                              <span className="font-medium">{MODULE_LABELS[mod].pt}</span>
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
                Salvar permissões
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
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Novo role</h3>
              <button onClick={() => { setShowCreate(false); setNewRoleName('') }} style={{ color: 'var(--color-text-muted)' }}>
                <XIcon size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  Nome (ex: Gestor, Aux. Finanças)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Gestor"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Você poderá configurar as permissões depois de criar.
                </p>
              </div>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                Criar role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
