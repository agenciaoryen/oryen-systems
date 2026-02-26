'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth, useActiveOrgId, useIsStaff } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  User, Shield, Building, Globe, Bell, Save, UserPlus, Trash2,
  X, Loader2, AlertCircle, Lock, Mail, Smartphone, MapPin, Copy, Check,
  Tag, Plus, GripVertical, Pencil, LayoutGrid, ChevronUp, ChevronDown
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
}

interface PipelineStage {
  id: string
  org_id: string
  name: string
  label: string
  color: string
  position: number
  is_active: boolean
  is_won: boolean
  is_lost: boolean
}

interface TagItem {
  id: string
  org_id: string
  name: string
  color: string
}

interface SettingsTab {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  adminOnly: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADUÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSLATIONS = {
  pt: {
    title: 'Configurações',
    subtitle: 'Gerencie sua conta e as preferências da plataforma.',
    tabs: {
      profile: 'Meu Perfil',
      notifications: 'Preferências',
      company: 'Empresa',
      team: 'Equipe',
      pipeline: 'Funil de Vendas',
      tags: 'Tags',
      integrations: 'Integrações'
    },
    profile: {
      personalData: 'Dados Pessoais',
      fullName: 'Nome Completo',
      email: 'E-mail',
      regionTitle: 'Preferências Regionais',
      language: 'Idioma',
      currency: 'Moeda Padrão',
      timezone: 'Fuso Horário',
      save: 'Salvar Alterações',
      securityTitle: 'Segurança',
      newPass: 'Nova Senha',
      confirmPass: 'Confirmar Senha',
      changePass: 'Alterar Senha',
      passPlaceholder: '••••••••'
    },
    notifications: {
      title: 'Preferências de Alerta',
      subtitle: 'Escolha como você deseja ser avisado sobre novos leads e atividades.',
      emailLeads: { title: 'E-mail para Novos Leads', desc: 'Receba um e-mail sempre que um novo lead entrar.' },
      whatsappLeads: { title: 'Alerta no WhatsApp', desc: 'Receba um "zap" da IA com o resumo do lead.' },
      browserPush: { title: 'Notificações no Navegador', desc: 'Pop-up no canto da tela quando a Oryen estiver aberta.' },
      comingSoon: '(Em Breve)'
    },
    company: {
      title: 'Dados da Organização',
      nameLabel: 'Nome da Empresa',
      idLabel: 'ID da Organização',
      updateBtn: 'Atualizar Empresa',
      noOrg: 'Nenhuma organização vinculada.'
    },
    team: {
      title: 'Gestão de Usuários',
      inviteBtn: 'Convidar Membro',
      table: { name: 'Nome', status: 'Status', role: 'Cargo', actions: 'Ações', empty: 'Nenhum membro encontrado.' },
      status: { active: 'Ativo', inactive: 'Inativo' },
      actions: { deactivate: 'Desativar', reactivate: 'Reativar' }
    },
    pipeline: {
      title: 'Funil de Vendas',
      subtitle: 'Personalize as etapas do seu pipeline de vendas.',
      stageName: 'ID do Estágio',
      stageLabel: 'Nome Exibido',
      stageColor: 'Cor',
      addStage: 'Adicionar Etapa',
      save: 'Salvar Alterações',
      isWon: 'Etapa de Ganho',
      isLost: 'Etapa de Perda',
      confirmDelete: 'Tem certeza que deseja excluir esta etapa?',
      cannotDelete: 'Não é possível excluir etapas com leads associados.',
      stageUpdated: 'Pipeline atualizado com sucesso!'
    },
    tags: {
      title: 'Gerenciar Tags',
      subtitle: 'Crie tags para categorizar seus leads.',
      tagName: 'Nome da Tag',
      tagColor: 'Cor',
      addTag: 'Adicionar Tag',
      noTags: 'Nenhuma tag criada ainda.',
      confirmDelete: 'Tem certeza que deseja excluir esta tag?',
      tagCreated: 'Tag criada com sucesso!',
      tagDeleted: 'Tag excluída.'
    },
    integrations: {
      title: 'Webhooks & Automação',
      desc: 'Configure as URLs de saída para o n8n ou outras ferramentas.',
      webhookLabel: 'Webhook de Envio (WhatsApp)',
      copy: 'Copiar',
      copied: 'Copiado',
      comingSoon: '(Em Breve)'
    },
    modal: {
      title: 'Convidar Membro',
      info: 'O usuário receberá um e-mail.',
      emailLabel: 'E-MAIL',
      submit: 'Enviar Convite'
    },
    alerts: {
      successProfile: 'Perfil atualizado com sucesso!',
      errorProfile: 'Erro ao atualizar perfil.',
      passMismatch: 'As senhas não coincidem.',
      passShort: 'A senha deve ter pelo menos 6 caracteres.',
      passSuccess: 'Senha alterada com sucesso!',
      confirmDeactivate: 'Tem certeza que deseja desativar o acesso deste usuário?',
      userDeactivated: 'Usuário desativado.',
      inviteSent: 'Convite enviado!',
      orgUpdated: 'Empresa atualizada!',
      saved: 'Salvo com sucesso!'
    }
  },
  en: {
    title: 'Settings',
    subtitle: 'Manage your account and platform preferences.',
    tabs: {
      profile: 'My Profile',
      notifications: 'Preferences',
      company: 'Company',
      team: 'Team',
      pipeline: 'Sales Pipeline',
      tags: 'Tags',
      integrations: 'Integrations'
    },
    profile: {
      personalData: 'Personal Data',
      fullName: 'Full Name',
      email: 'Email',
      regionTitle: 'Regional Preferences',
      language: 'Language',
      currency: 'Default Currency',
      timezone: 'Timezone',
      save: 'Save Changes',
      securityTitle: 'Security',
      newPass: 'New Password',
      confirmPass: 'Confirm Password',
      changePass: 'Change Password',
      passPlaceholder: '••••••••'
    },
    notifications: {
      title: 'Alert Preferences',
      subtitle: 'Choose how you want to be notified about new leads and activities.',
      emailLeads: { title: 'Email for New Leads', desc: 'Receive an email whenever a new lead arrives.' },
      whatsappLeads: { title: 'WhatsApp Alert', desc: 'Receive a message from AI with the lead summary.' },
      browserPush: { title: 'Browser Notifications', desc: 'Pop-up on screen corner when Oryen is open.' },
      comingSoon: '(Coming Soon)'
    },
    company: {
      title: 'Organization Data',
      nameLabel: 'Company Name',
      idLabel: 'Organization ID',
      updateBtn: 'Update Company',
      noOrg: 'No organization linked.'
    },
    team: {
      title: 'User Management',
      inviteBtn: 'Invite Member',
      table: { name: 'Name', status: 'Status', role: 'Role', actions: 'Actions', empty: 'No members found.' },
      status: { active: 'Active', inactive: 'Inactive' },
      actions: { deactivate: 'Deactivate', reactivate: 'Reactivate' }
    },
    pipeline: {
      title: 'Sales Pipeline',
      subtitle: 'Customize your sales pipeline stages.',
      stageName: 'Stage ID',
      stageLabel: 'Display Name',
      stageColor: 'Color',
      addStage: 'Add Stage',
      save: 'Save Changes',
      isWon: 'Won Stage',
      isLost: 'Lost Stage',
      confirmDelete: 'Are you sure you want to delete this stage?',
      cannotDelete: 'Cannot delete stages with associated leads.',
      stageUpdated: 'Pipeline updated successfully!'
    },
    tags: {
      title: 'Manage Tags',
      subtitle: 'Create tags to categorize your leads.',
      tagName: 'Tag Name',
      tagColor: 'Color',
      addTag: 'Add Tag',
      noTags: 'No tags created yet.',
      confirmDelete: 'Are you sure you want to delete this tag?',
      tagCreated: 'Tag created successfully!',
      tagDeleted: 'Tag deleted.'
    },
    integrations: {
      title: 'Webhooks & Automation',
      desc: 'Configure output URLs for n8n or other tools here.',
      webhookLabel: 'Sending Webhook (WhatsApp)',
      copy: 'Copy',
      copied: 'Copied',
      comingSoon: '(Coming Soon)'
    },
    modal: {
      title: 'Invite Member',
      info: 'The user will receive an email.',
      emailLabel: 'EMAIL',
      submit: 'Send Invite'
    },
    alerts: {
      successProfile: 'Profile updated successfully!',
      errorProfile: 'Error updating profile.',
      passMismatch: 'Passwords do not match.',
      passShort: 'Password must be at least 6 characters.',
      passSuccess: 'Password changed successfully!',
      confirmDeactivate: 'Are you sure you want to deactivate this user?',
      userDeactivated: 'User deactivated.',
      inviteSent: 'Invite sent!',
      orgUpdated: 'Company updated!',
      saved: 'Saved successfully!'
    }
  },
  es: {
    title: 'Configuración',
    subtitle: 'Administre su cuenta y preferencias de la plataforma.',
    tabs: {
      profile: 'Mi Perfil',
      notifications: 'Preferencias',
      company: 'Empresa',
      team: 'Equipo',
      pipeline: 'Pipeline de Ventas',
      tags: 'Tags',
      integrations: 'Integraciones'
    },
    profile: {
      personalData: 'Datos Personales',
      fullName: 'Nombre Completo',
      email: 'Correo Electrónico',
      regionTitle: 'Preferencias Regionales',
      language: 'Idioma',
      currency: 'Moneda Predeterminada',
      timezone: 'Zona Horaria',
      save: 'Guardar Cambios',
      securityTitle: 'Seguridad',
      newPass: 'Nueva Contraseña',
      confirmPass: 'Confirmar Contraseña',
      changePass: 'Cambiar Contraseña',
      passPlaceholder: '••••••••'
    },
    notifications: {
      title: 'Preferencias de Alerta',
      subtitle: 'Elija cómo desea ser notificado sobre nuevos leads y actividades.',
      emailLeads: { title: 'Email para Nuevos Leads', desc: 'Reciba un correo cada vez que ingrese un nuevo lead.' },
      whatsappLeads: { title: 'Alerta de WhatsApp', desc: 'Reciba un mensaje de la IA con el resumen del lead.' },
      browserPush: { title: 'Notificaciones del Navegador', desc: 'Pop-up en la esquina cuando Oryen esté abierto.' },
      comingSoon: '(Próximamente)'
    },
    company: {
      title: 'Datos de la Organización',
      nameLabel: 'Nombre de la Empresa',
      idLabel: 'ID de la Organización',
      updateBtn: 'Actualizar Empresa',
      noOrg: 'Ninguna organización vinculada.'
    },
    team: {
      title: 'Gestión de Usuarios',
      inviteBtn: 'Invitar Miembro',
      table: { name: 'Nombre', status: 'Estado', role: 'Rol', actions: 'Acciones', empty: 'No se encontraron miembros.' },
      status: { active: 'Activo', inactive: 'Inactivo' },
      actions: { deactivate: 'Desactivar', reactivate: 'Reactivar' }
    },
    pipeline: {
      title: 'Pipeline de Ventas',
      subtitle: 'Personalice las etapas de su pipeline de ventas.',
      stageName: 'ID de Etapa',
      stageLabel: 'Nombre Mostrado',
      stageColor: 'Color',
      addStage: 'Añadir Etapa',
      save: 'Guardar Cambios',
      isWon: 'Etapa Ganada',
      isLost: 'Etapa Perdida',
      confirmDelete: '¿Está seguro de que desea eliminar esta etapa?',
      cannotDelete: 'No se pueden eliminar etapas con leads asociados.',
      stageUpdated: '¡Pipeline actualizado con éxito!'
    },
    tags: {
      title: 'Gestionar Tags',
      subtitle: 'Cree tags para categorizar sus leads.',
      tagName: 'Nombre del Tag',
      tagColor: 'Color',
      addTag: 'Añadir Tag',
      noTags: 'Ningún tag creado todavía.',
      confirmDelete: '¿Está seguro de que desea eliminar este tag?',
      tagCreated: '¡Tag creado con éxito!',
      tagDeleted: 'Tag eliminado.'
    },
    integrations: {
      title: 'Webhooks y Automatización',
      desc: 'Configure aquí las URL de salida para n8n u otras herramientas.',
      webhookLabel: 'Webhook de Envío (WhatsApp)',
      copy: 'Copiar',
      copied: 'Copiado',
      comingSoon: '(Próximamente)'
    },
    modal: {
      title: 'Invitar Miembro',
      info: 'El usuario recibirá un correo electrónico.',
      emailLabel: 'CORREO',
      submit: 'Enviar Invitación'
    },
    alerts: {
      successProfile: '¡Perfil actualizado con éxito!',
      errorProfile: 'Error al actualizar perfil.',
      passMismatch: 'Las contraseñas no coinciden.',
      passShort: 'La contraseña debe tener al menos 6 caracteres.',
      passSuccess: '¡Contraseña cambiada con éxito!',
      confirmDeactivate: '¿Está seguro de que desea desactivar este usuario?',
      userDeactivated: 'Usuario desactivado.',
      inviteSent: '¡Invitación enviada!',
      orgUpdated: '¡Empresa actualizada!',
      saved: '¡Guardado con éxito!'
    }
  }
}

type Language = keyof typeof TRANSLATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// CORES DISPONÍVEIS
// ═══════════════════════════════════════════════════════════════════════════════

const AVAILABLE_COLORS = [
  { name: 'gray', label: 'Cinza', class: 'bg-gray-500' },
  { name: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { name: 'amber', label: 'Âmbar', class: 'bg-amber-500' },
  { name: 'cyan', label: 'Ciano', class: 'bg-cyan-500' },
  { name: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { name: 'indigo', label: 'Índigo', class: 'bg-indigo-500' },
  { name: 'emerald', label: 'Esmeralda', class: 'bg-emerald-500' },
  { name: 'rose', label: 'Rosa', class: 'bg-rose-500' },
  { name: 'green', label: 'Verde', class: 'bg-green-500' },
  { name: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { name: 'yellow', label: 'Amarelo', class: 'bg-yellow-500' },
  { name: 'pink', label: 'Pink', class: 'bg-pink-500' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  const { user, org } = useAuth()
  const orgId = useActiveOrgId()
  const isStaff = useIsStaff()

  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)

  // Estados para Equipe
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  // Estados para Empresa
  const [orgName, setOrgName] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('vendedor')

  // Estados para Perfil
  const [profileName, setProfileName] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [language, setLanguage] = useState('pt')
  const [currency, setCurrency] = useState('BRL')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')

  // Estados para Senha
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Estados para Pipeline
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageLabel, setNewStageLabel] = useState('')
  const [newStageColor, setNewStageColor] = useState('gray')

  // Estados para Tags
  const [tags, setTags] = useState<TagItem[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('blue')

  // Outros
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [notifSettings, setNotifSettings] = useState({
    email_leads: true,
    whatsapp_leads: true,
    browser_push: false
  })

  // Configuração de idioma
  const userLang = (user?.language as Language) || 'pt'
  const t = TRANSLATIONS[userLang]

  // ─── CARREGAR DADOS INICIAIS ───
  useEffect(() => {
    async function fetchData() {
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('role, full_name, language, currency, timezone')
        .eq('id', user.id)
        .single()

      if (userData) {
        setCurrentUserRole(userData.role || 'vendedor')
        setProfileName(userData.full_name || '')
        setLanguage(userData.language || 'pt')
        setCurrency(userData.currency || 'BRL')
        setTimezone(userData.timezone || 'America/Sao_Paulo')
      }

      if (org) {
        setOrgName(org.name || '')
      }
    }

    fetchData()
  }, [user, org])

  // ─── CARREGAR EQUIPE ───
  const fetchTeam = useCallback(async () => {
    if (!orgId) return

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId)

    if (data) {
      const mappedMembers: TeamMember[] = data.map((d) => ({
        id: d.id,
        name: d.full_name || d.name || 'Sem nome',
        email: d.email,
        role: d.role || 'vendedor',
        status: d.status || 'active'
      }))
      setTeamMembers(mappedMembers)
    }
  }, [orgId])

  // ─── CARREGAR PIPELINE ───
  const fetchPipeline = useCallback(async () => {
    if (!orgId) return

    setPipelineLoading(true)
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('org_id', orgId)
      .order('position')

    if (data) {
      setPipelineStages(data)
    }
    setPipelineLoading(false)
  }, [orgId])

  // ─── CARREGAR TAGS ───
  const fetchTags = useCallback(async () => {
    if (!orgId) return

    setTagsLoading(true)
    const { data } = await supabase
      .from('tags')
      .select('*')
      .eq('org_id', orgId)
      .order('name')

    if (data) {
      setTags(data)
    }
    setTagsLoading(false)
  }, [orgId])

  // Carregar dados quando mudar de aba
  useEffect(() => {
    if (activeTab === 'team') fetchTeam()
    if (activeTab === 'pipeline') fetchPipeline()
    if (activeTab === 'tags') fetchTags()
  }, [activeTab, fetchTeam, fetchPipeline, fetchTags])

  // ─── FUNÇÕES DE PERFIL ───
  async function handleSaveProfile() {
    if (!user) return
    setProfileLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileName,
          language: language,
          currency: currency,
          timezone: timezone
        })
        .eq('id', user.id)

      if (error) throw error
      await supabase.auth.updateUser({ data: { full_name: profileName } })
      window.location.reload()
    } catch (error) {
      console.error(error)
      alert(t.alerts.errorProfile)
      setProfileLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert(t.alerts.passMismatch)
      return
    }
    if (newPassword.length < 6) {
      alert(t.alerts.passShort)
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) alert(`Erro: ${error.message}`)
    else {
      alert(t.alerts.passSuccess)
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  // ─── FUNÇÕES DE EQUIPE ───
  async function handleDeactivateUser(memberId: string) {
    if (!confirm(t.alerts.confirmDeactivate)) return
    const { error } = await supabase.from('users').update({ status: 'inactive' }).eq('id', memberId)
    if (!error) {
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'inactive' } : m))
      alert(t.alerts.userDeactivated)
    }
  }

  async function handleReactivateUser(memberId: string) {
    const { error } = await supabase.from('users').update({ status: 'active' }).eq('id', memberId)
    if (!error) {
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'active' } : m))
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setInviteLoading(true)
    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, orgId: orgId })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      alert(t.alerts.inviteSent)
      setInviteEmail('')
      setIsInviteModalOpen(false)
      fetchTeam()
    } catch (error: unknown) {
      const err = error as { message?: string }
      alert(`Falha: ${err.message}`)
    } finally {
      setInviteLoading(false)
    }
  }

  // ─── FUNÇÕES DE EMPRESA ───
  async function handleSaveOrg() {
    if (!orgId) return
    setLoading(true)
    const { error } = await supabase.from('orgs').update({ name: orgName }).eq('id', orgId)
    if (!error) alert(t.alerts.orgUpdated)
    setLoading(false)
  }

  // ─── FUNÇÕES DE PIPELINE ───
  async function handleAddStage() {
    if (!orgId || !newStageName.trim() || !newStageLabel.trim()) return

    const maxPosition = pipelineStages.length > 0 
      ? Math.max(...pipelineStages.map(s => s.position)) 
      : 0

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({
        org_id: orgId,
        name: newStageName.toLowerCase().replace(/\s+/g, '_'),
        label: newStageLabel,
        color: newStageColor,
        position: maxPosition + 1,
        is_active: true,
        is_won: false,
        is_lost: false
      })
      .select()
      .single()

    if (!error && data) {
      setPipelineStages(prev => [...prev, data])
      setNewStageName('')
      setNewStageLabel('')
      setNewStageColor('gray')
    }
  }

  async function handleUpdateStage(stageId: string, updates: Partial<PipelineStage>) {
    const { error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', stageId)

    if (!error) {
      setPipelineStages(prev => prev.map(s => s.id === stageId ? { ...s, ...updates } : s))
    }
  }

  async function handleDeleteStage(stageId: string) {
    if (!confirm(t.pipeline.confirmDelete)) return

    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', stageId)

    if (error) {
      alert(t.pipeline.cannotDelete)
    } else {
      setPipelineStages(prev => prev.filter(s => s.id !== stageId))
    }
  }

  async function handleMoveStage(stageId: string, direction: 'up' | 'down') {
    const index = pipelineStages.findIndex(s => s.id === stageId)
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= pipelineStages.length) return

    const newStages = [...pipelineStages]
    const temp = newStages[index]
    newStages[index] = newStages[newIndex]
    newStages[newIndex] = temp

    // Atualizar posições
    const updates = newStages.map((s, i) => ({ ...s, position: i + 1 }))
    setPipelineStages(updates)

    // Salvar no banco
    for (const stage of updates) {
      await supabase
        .from('pipeline_stages')
        .update({ position: stage.position })
        .eq('id', stage.id)
    }
  }

  // ─── FUNÇÕES DE TAGS ───
  async function handleAddTag() {
    if (!orgId || !newTagName.trim()) return

    const { data, error } = await supabase
      .from('tags')
      .insert({
        org_id: orgId,
        name: newTagName,
        color: newTagColor
      })
      .select()
      .single()

    if (!error && data) {
      setTags(prev => [...prev, data])
      setNewTagName('')
      setNewTagColor('blue')
      alert(t.tags.tagCreated)
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!confirm(t.tags.confirmDelete)) return

    const { error } = await supabase.from('tags').delete().eq('id', tagId)

    if (!error) {
      setTags(prev => prev.filter(t => t.id !== tagId))
      alert(t.tags.tagDeleted)
    }
  }

  // ─── OUTROS ───
  const toggleNotif = (key: keyof typeof notifSettings) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText('https://webhook2.letierren8n.com/webhook/envia-mensagem')
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  // ─── LOADING INICIAL ───
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const userEmail = user.email || ''
  const isAdmin = currentUserRole === 'admin' || isStaff

  // Definindo as abas
  const tabs: SettingsTab[] = [
    { id: 'profile', label: t.tabs.profile, icon: User, adminOnly: false },
    { id: 'notifications', label: t.tabs.notifications, icon: Bell, adminOnly: false },
    { id: 'company', label: t.tabs.company, icon: Building, adminOnly: true },
    { id: 'team', label: t.tabs.team, icon: Shield, adminOnly: true },
    { id: 'pipeline', label: t.tabs.pipeline, icon: LayoutGrid, adminOnly: true },
    { id: 'tags', label: t.tabs.tags, icon: Tag, adminOnly: true },
    { id: 'integrations', label: t.tabs.integrations, icon: Globe, adminOnly: true },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 relative">

      {/* MODAL DE CONVITE */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">{t.modal.title}</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg flex gap-3 items-start">
                <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-blue-200 leading-relaxed">{t.modal.info}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">{t.modal.emailLabel}</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colaborador@oryen.com"
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviteLoading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={18} />}
                {t.modal.submit}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t.title}</h1>
        <p className="text-gray-400 text-sm mt-1">{t.subtitle}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">

        {/* MENU LATERAL */}
        <aside className="w-full md:w-56 flex flex-col gap-1">
          {tabs.map((tab) => {
            if (tab.adminOnly && !isAdmin) return null
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </aside>

        {/* CONTEÚDO */}
        <div className="flex-1 bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 md:p-6 shadow-2xl min-h-[500px]">

          {/* ABA: PERFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User size={20} className="text-blue-500" /> {t.profile.personalData}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.profile.fullName}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.profile.email}</label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full bg-black/20 border border-white/5 rounded-lg p-3 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Preferências Regionais */}
                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-4">
                    <MapPin size={16} className="text-emerald-500" /> {t.profile.regionTitle}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t.profile.language}</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500 outline-none appearance-none"
                      >
                        <option value="pt">🇧🇷 Português</option>
                        <option value="en">🇺🇸 English</option>
                        <option value="es">🇪🇸 Español</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t.profile.currency}</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500 outline-none appearance-none"
                      >
                        <option value="BRL">R$ (BRL)</option>
                        <option value="USD">$ (USD)</option>
                        <option value="EUR">€ (EUR)</option>
                        <option value="CLP">CLP$ (Chile)</option>
                        <option value="MXN">MX$ (México)</option>
                        <option value="CAD">C$ (Canada)</option>
                        <option value="ARS">ARS$ (Arg)</option>
                        <option value="COP">COL$ (Col)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t.profile.timezone}</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500 outline-none appearance-none"
                      >
                        <option value="America/Sao_Paulo">🇧🇷 São Paulo</option>
                        <option value="America/New_York">🇺🇸 New York</option>
                        <option value="Europe/Lisbon">🇵🇹 Lisboa</option>
                        <option value="Europe/London">🇬🇧 London</option>
                        <option value="America/Mexico_City">🇲🇽 Mexico City</option>
                        <option value="America/Santiago">🇨🇱 Santiago</option>
                        <option value="America/Bogota">🇨🇴 Bogota</option>
                        <option value="America/Argentina/Buenos_Aires">🇦🇷 Buenos Aires</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 w-full md:w-auto justify-center"
                >
                  {profileLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {t.profile.save}
                </button>
              </div>

              <div className="w-full h-px bg-white/5" />

              {/* Troca de Senha */}
              <form onSubmit={handleChangePassword} className="space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Lock size={20} className="text-rose-500" /> {t.profile.securityTitle}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.profile.newPass}</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder={t.profile.passPlaceholder}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-rose-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.profile.confirmPass}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder={t.profile.passPlaceholder}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newPassword || passwordLoading}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 w-full md:w-auto justify-center"
                >
                  {passwordLoading ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                  {t.profile.changePass}
                </button>
              </form>
            </div>
          )}

          {/* ABA: NOTIFICAÇÕES */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Bell size={20} className="text-yellow-500" /> {t.notifications.title} <span className="text-xs text-gray-500">{t.notifications.comingSoon}</span>
              </h2>
              <p className="text-sm text-gray-400">{t.notifications.subtitle}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.notifications.emailLeads.title}</p>
                      <p className="text-xs text-gray-500">{t.notifications.emailLeads.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNotif('email_leads')}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${notifSettings.email_leads ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifSettings.email_leads ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.notifications.whatsappLeads.title}</p>
                      <p className="text-xs text-gray-500">{t.notifications.whatsappLeads.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNotif('whatsapp_leads')}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${notifSettings.whatsapp_leads ? 'bg-emerald-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifSettings.whatsapp_leads ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.notifications.browserPush.title}</p>
                      <p className="text-xs text-gray-500">{t.notifications.browserPush.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNotif('browser_push')}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${notifSettings.browser_push ? 'bg-purple-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifSettings.browser_push ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: EMPRESA */}
          {activeTab === 'company' && isAdmin && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building size={20} className="text-blue-500" /> {t.company.title}
              </h2>
              {orgId ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.company.nameLabel}</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t.company.idLabel}</label>
                    <input
                      type="text"
                      readOnly
                      value={orgId}
                      className="w-full bg-black/20 border border-white/5 rounded-lg p-3 text-gray-500 font-mono text-xs"
                    />
                  </div>
                  <button
                    onClick={handleSaveOrg}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {t.company.updateBtn}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                  <AlertCircle size={32} />
                  <p>{t.company.noOrg}</p>
                </div>
              )}
            </div>
          )}

          {/* ABA: EQUIPE */}
          {activeTab === 'team' && isAdmin && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield size={20} className="text-emerald-500" /> {t.team.title}
                </h2>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  <UserPlus size={16} /> {t.team.inviteBtn}
                </button>
              </div>
              <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[500px]">
                    <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t.team.table.name}</th>
                        <th className="px-4 py-3 font-medium">{t.team.table.status}</th>
                        <th className="px-4 py-3 font-medium">{t.team.table.role}</th>
                        <th className="px-4 py-3 font-medium text-right">{t.team.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {teamMembers.length > 0 ? teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4 text-white font-medium">
                            <div className="flex flex-col">
                              {member.name}
                              <span className="text-[10px] text-gray-500 font-normal">{member.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {member.status === 'active' ? (
                              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 flex w-fit items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {t.team.status.active}
                              </span>
                            ) : (
                              <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-700">
                                {t.team.status.inactive}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase">
                              {member.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {member.id !== user.id && (
                              member.status === 'active' ? (
                                <button
                                  onClick={() => handleDeactivateUser(member.id)}
                                  className="text-gray-600 hover:text-rose-500 transition-colors p-2 hover:bg-rose-500/10 rounded-lg"
                                  title={t.team.actions.deactivate}
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivateUser(member.id)}
                                  className="text-gray-600 hover:text-emerald-500 transition-colors p-2 hover:bg-emerald-500/10 rounded-lg font-bold text-xs"
                                >
                                  {t.team.actions.reactivate}
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                            {t.team.table.empty}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ABA: PIPELINE */}
          {activeTab === 'pipeline' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <LayoutGrid size={20} className="text-purple-500" /> {t.pipeline.title}
                </h2>
                <p className="text-sm text-gray-400 mt-1">{t.pipeline.subtitle}</p>
              </div>

              {/* Lista de Estágios */}
              <div className="space-y-2">
                {pipelineLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  pipelineStages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveStage(stage.id, 'up')}
                          disabled={index === 0}
                          className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveStage(stage.id, 'down')}
                          disabled={index === pipelineStages.length - 1}
                          className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <div className={`w-4 h-4 rounded-full ${AVAILABLE_COLORS.find(c => c.name === stage.color)?.class || 'bg-gray-500'}`} />

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={stage.label}
                          onChange={(e) => handleUpdateStage(stage.id, { label: e.target.value })}
                          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                          placeholder={t.pipeline.stageLabel}
                        />
                        <select
                          value={stage.color}
                          onChange={(e) => handleUpdateStage(stage.id, { color: e.target.value })}
                          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none appearance-none"
                        >
                          {AVAILABLE_COLORS.map(color => (
                            <option key={color.name} value={color.name}>{color.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stage.is_won}
                            onChange={(e) => handleUpdateStage(stage.id, { is_won: e.target.checked, is_lost: false })}
                            className="rounded border-gray-600"
                          />
                          ✅
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stage.is_lost}
                            onChange={(e) => handleUpdateStage(stage.id, { is_lost: e.target.checked, is_won: false })}
                            className="rounded border-gray-600"
                          />
                          ❌
                        </label>
                      </div>

                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-gray-500 hover:text-rose-500 transition-colors p-2 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Adicionar Estágio */}
              <div className="border-t border-white/5 pt-6">
                <h3 className="text-sm font-bold text-gray-300 mb-4">{t.pipeline.addStage}</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newStageLabel}
                    onChange={(e) => {
                      setNewStageLabel(e.target.value)
                      setNewStageName(e.target.value.toLowerCase().replace(/\s+/g, '_'))
                    }}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                    placeholder={t.pipeline.stageLabel}
                  />
                  <select
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none appearance-none w-full sm:w-32"
                  >
                    {AVAILABLE_COLORS.map(color => (
                      <option key={color.name} value={color.name}>{color.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddStage}
                    disabled={!newStageLabel.trim()}
                    className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    <Plus size={16} /> {t.pipeline.addStage}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: TAGS */}
          {activeTab === 'tags' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Tag size={20} className="text-cyan-500" /> {t.tags.title}
                </h2>
                <p className="text-sm text-gray-400 mt-1">{t.tags.subtitle}</p>
              </div>

              {/* Lista de Tags */}
              <div className="space-y-2">
                {tagsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : tags.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tag size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{t.tags.noTags}</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                          AVAILABLE_COLORS.find(c => c.name === tag.color)?.class.replace('bg-', 'bg-') + '/20'
                        } border-white/10`}
                      >
                        <div className={`w-3 h-3 rounded-full ${AVAILABLE_COLORS.find(c => c.name === tag.color)?.class || 'bg-gray-500'}`} />
                        <span className="text-white">{tag.name}</span>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-gray-400 hover:text-rose-500 transition-colors ml-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Adicionar Tag */}
              <div className="border-t border-white/5 pt-6">
                <h3 className="text-sm font-bold text-gray-300 mb-4">{t.tags.addTag}</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                    placeholder={t.tags.tagName}
                  />
                  <select
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none appearance-none w-full sm:w-32"
                  >
                    {AVAILABLE_COLORS.map(color => (
                      <option key={color.name} value={color.name}>{color.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddTag}
                    disabled={!newTagName.trim()}
                    className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    <Plus size={16} /> {t.tags.addTag}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: INTEGRAÇÕES */}
          {activeTab === 'integrations' && isAdmin && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe size={20} className="text-purple-500" /> {t.integrations.title} <span className="text-xs text-gray-500">{t.integrations.comingSoon}</span>
              </h2>
              <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl">
                <p className="text-sm text-purple-200">{t.integrations.desc}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">{t.integrations.webhookLabel}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://webhook2.letierren8n.com/webhook/envia-mensagem"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-gray-400 text-xs font-mono"
                    />
                    <button
                      onClick={handleCopyWebhook}
                      className={`px-4 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-2 min-w-[90px] ${
                        copiedWebhook ? 'bg-emerald-600' : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {copiedWebhook ? <><Check size={14} /> {t.integrations.copied}</> : <><Copy size={14} /> {t.integrations.copy}</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}