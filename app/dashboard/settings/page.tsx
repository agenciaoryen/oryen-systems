'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth, useActiveOrgId, useIsStaff } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  User, Shield, Building, Globe, Bell, Save, UserPlus, Trash2,
  X, Loader2, AlertCircle, Lock, Mail, Smartphone, MapPin, Copy, Check,
  Tag, Plus, GripVertical, Pencil, LayoutGrid, ChevronUp, ChevronDown,
  Sun, Moon, CreditCard, Eye, RotateCcw, Clock, Play, Calendar
} from 'lucide-react'
import { useTheme } from '@/lib/ThemeContext'

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
      pipeline: 'Pipeline',
      tags: 'Tags',
      integrations: 'Integrações',
      leadCard: 'Card do Lead'
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
      comingSoon: '(Em Breve)',
      themeTitle: 'Aparência',
      themeSubtitle: 'Escolha entre o tema escuro (padrão) ou claro.',
      themeDark: 'Escuro',
      themeLight: 'Claro',
      themeDarkDesc: 'Fundo escuro, ideal para uso prolongado.',
      themeLightDesc: 'Fundo branco, melhor em ambientes iluminados.',
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
      title: 'Pipeline de Negócios',
      subtitle: 'Personalize as etapas do seu pipeline de negócios imobiliários.',
      stageName: 'ID do Estágio',
      stageLabel: 'Nome Exibido',
      stageColor: 'Cor',
      addStage: 'Adicionar Etapa',
      save: 'Salvar Alterações',
      isWon: 'Etapa de Fechamento',
      isLost: 'Etapa de Perda',
      confirmDelete: 'Tem certeza que deseja excluir esta etapa?',
      cannotDelete: 'Não é possível excluir etapas com contatos associados.',
      stageUpdated: 'Pipeline atualizado com sucesso!'
    },
    tags: {
      title: 'Gerenciar Tags',
      subtitle: 'Crie tags para categorizar seus contatos.',
      tagName: 'Nome da Tag',
      tagColor: 'Cor',
      addTag: 'Adicionar Tag',
      noTags: 'Nenhuma tag criada ainda.',
      confirmDelete: 'Tem certeza que deseja excluir esta tag?',
      tagCreated: 'Tag criada com sucesso!',
      tagDeleted: 'Tag excluída.'
    },
    integrations: {
      title: 'Webhooks & Integrações',
      desc: 'Copie a URL abaixo e cole no campo de Webhook da sua instância UAZAPI para ativar o agente SDR.',
      webhookLabel: 'Webhook de Recebimento (SDR Agent)',
      webhookHint: 'Cole esta URL no campo "Webhook" da sua instância UAZAPI.',
      copy: 'Copiar',
      copied: 'Copiado'
    },
    leadCard: {
      title: 'Card do Lead',
      subtitle: 'Escolha quais informações aparecem nos cards do kanban.',
      fieldsTitle: 'Campos visíveis',
      indicatorsTitle: 'Indicadores',
      fields: {
        total_em_vendas: 'Valor da Venda',
        phone: 'Telefone / WhatsApp',
        email: 'E-mail',
        tags: 'Tags',
        source: 'Origem',
        nicho: 'Nicho / Segmento',
        nome_empresa: 'Nome da Empresa',
        created_at: 'Data de Entrada',
      },
      indicators: {
        show_stale_indicator: 'Lead parado (sem atualização há 5+ dias)',
        show_ai_status: 'Status do agente de IA',
      },
      preview: 'Pré-visualização',
      save: 'Salvar Configuração',
      saved: 'Configuração salva!',
      reset: 'Restaurar padrão',
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
      pipeline: 'Pipeline',
      tags: 'Tags',
      integrations: 'Integrations',
      leadCard: 'Lead Card'
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
      comingSoon: '(Coming Soon)',
      themeTitle: 'Appearance',
      themeSubtitle: 'Choose between dark (default) or light theme.',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeDarkDesc: 'Dark background, ideal for extended use.',
      themeLightDesc: 'White background, best in bright environments.',
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
      title: 'Business Pipeline',
      subtitle: 'Customize your real estate business pipeline stages.',
      stageName: 'Stage ID',
      stageLabel: 'Display Name',
      stageColor: 'Color',
      addStage: 'Add Stage',
      save: 'Save Changes',
      isWon: 'Closing Stage',
      isLost: 'Lost Stage',
      confirmDelete: 'Are you sure you want to delete this stage?',
      cannotDelete: 'Cannot delete stages with associated contacts.',
      stageUpdated: 'Pipeline updated successfully!'
    },
    tags: {
      title: 'Manage Tags',
      subtitle: 'Create tags to categorize your contacts.',
      tagName: 'Tag Name',
      tagColor: 'Color',
      addTag: 'Add Tag',
      noTags: 'No tags created yet.',
      confirmDelete: 'Are you sure you want to delete this tag?',
      tagCreated: 'Tag created successfully!',
      tagDeleted: 'Tag deleted.'
    },
    integrations: {
      title: 'Webhooks & Integrations',
      desc: 'Copy the URL below and paste it in the Webhook field of your UAZAPI instance to activate the SDR agent.',
      webhookLabel: 'Receiving Webhook (SDR Agent)',
      webhookHint: 'Paste this URL in the "Webhook" field of your UAZAPI instance.',
      copy: 'Copy',
      copied: 'Copied'
    },
    leadCard: {
      title: 'Lead Card',
      subtitle: 'Choose which fields appear on kanban lead cards.',
      fieldsTitle: 'Visible fields',
      indicatorsTitle: 'Indicators',
      fields: {
        total_em_vendas: 'Sale Value',
        phone: 'Phone / WhatsApp',
        email: 'Email',
        tags: 'Tags',
        source: 'Source',
        nicho: 'Niche / Segment',
        nome_empresa: 'Company Name',
        created_at: 'Entry Date',
      },
      indicators: {
        show_stale_indicator: 'Stale lead (no update in 5+ days)',
        show_ai_status: 'AI agent status',
      },
      preview: 'Preview',
      save: 'Save Configuration',
      saved: 'Configuration saved!',
      reset: 'Restore defaults',
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
      pipeline: 'Pipeline',
      tags: 'Tags',
      integrations: 'Integraciones',
      leadCard: 'Card del Lead'
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
      comingSoon: '(Próximamente)',
      themeTitle: 'Apariencia',
      themeSubtitle: 'Elige entre el tema oscuro (predeterminado) o claro.',
      themeDark: 'Oscuro',
      themeLight: 'Claro',
      themeDarkDesc: 'Fondo oscuro, ideal para uso prolongado.',
      themeLightDesc: 'Fondo blanco, mejor en entornos iluminados.',
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
      title: 'Pipeline de Negocios',
      subtitle: 'Personalice las etapas de su pipeline inmobiliario.',
      stageName: 'ID de Etapa',
      stageLabel: 'Nombre Mostrado',
      stageColor: 'Color',
      addStage: 'Añadir Etapa',
      save: 'Guardar Cambios',
      isWon: 'Etapa de Cierre',
      isLost: 'Etapa Perdida',
      confirmDelete: '¿Está seguro de que desea eliminar esta etapa?',
      cannotDelete: 'No se pueden eliminar etapas con contactos asociados.',
      stageUpdated: '¡Pipeline actualizado con éxito!'
    },
    tags: {
      title: 'Gestionar Tags',
      subtitle: 'Cree tags para categorizar sus contactos.',
      tagName: 'Nombre del Tag',
      tagColor: 'Color',
      addTag: 'Añadir Tag',
      noTags: 'Ningún tag creado todavía.',
      confirmDelete: '¿Está seguro de que desea eliminar este tag?',
      tagCreated: '¡Tag creado con éxito!',
      tagDeleted: 'Tag eliminado.'
    },
    integrations: {
      title: 'Webhooks e Integraciones',
      desc: 'Copia la URL abajo y pégala en el campo Webhook de tu instancia UAZAPI para activar el agente SDR.',
      webhookLabel: 'Webhook de Recepción (SDR Agent)',
      webhookHint: 'Pega esta URL en el campo "Webhook" de tu instancia UAZAPI.',
      copy: 'Copiar',
      copied: 'Copiado'
    },
    leadCard: {
      title: 'Card del Lead',
      subtitle: 'Elige qué información aparece en los cards del kanban.',
      fieldsTitle: 'Campos visibles',
      indicatorsTitle: 'Indicadores',
      fields: {
        total_em_vendas: 'Valor de Venta',
        phone: 'Teléfono / WhatsApp',
        email: 'Correo Electrónico',
        tags: 'Tags',
        source: 'Origen',
        nicho: 'Nicho / Segmento',
        nome_empresa: 'Nombre de la Empresa',
        created_at: 'Fecha de Ingreso',
      },
      indicators: {
        show_stale_indicator: 'Lead inactivo (sin actualización en 5+ días)',
        show_ai_status: 'Estado del agente de IA',
      },
      preview: 'Vista previa',
      save: 'Guardar Configuración',
      saved: '¡Configuración guardada!',
      reset: 'Restaurar predeterminados',
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
  const { theme, setTheme } = useTheme()

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

  // Estados para Lead Card Config
  const DEFAULT_LEAD_CARD_FIELDS = ['total_em_vendas', 'phone', 'email', 'tags', 'source', 'created_at']
  const ALL_LEAD_CARD_FIELDS = ['total_em_vendas', 'phone', 'email', 'tags', 'source', 'nicho', 'nome_empresa', 'created_at']
  const [leadCardFields, setLeadCardFields] = useState<string[]>(DEFAULT_LEAD_CARD_FIELDS)
  const [leadCardIndicators, setLeadCardIndicators] = useState({ show_stale_indicator: true, show_ai_status: true })
  const [leadCardLoading, setLeadCardLoading] = useState(false)

  // Modal personalizado (substituindo confirm/alert nativos)
  const [modalState, setModalState] = useState<{
    open: boolean
    type: 'alert' | 'confirm'
    title: string
    message: string
    onConfirm?: () => void
  }>({ open: false, type: 'alert', title: '', message: '' })

  function showAlert(message: string, title?: string) {
    setModalState({ open: true, type: 'alert', title: title || '', message })
  }

  function showConfirm(message: string, onConfirm: () => void) {
    setModalState({ open: true, type: 'confirm', title: '', message, onConfirm })
  }

  function closeModal() {
    setModalState(prev => ({ ...prev, open: false }))
  }

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
      showAlert(t.alerts.errorProfile)
      setProfileLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showAlert(t.alerts.passMismatch)
      return
    }
    if (newPassword.length < 6) {
      showAlert(t.alerts.passShort)
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) showAlert(`Erro: ${error.message}`)
    else {
      showAlert(t.alerts.passSuccess)
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  // ─── FUNÇÕES DE EQUIPE ───
  async function handleDeactivateUser(memberId: string) {
    showConfirm(t.alerts.confirmDeactivate, async () => {
      const { error } = await supabase.from('users').update({ status: 'inactive' }).eq('id', memberId)
      if (!error) {
        setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'inactive' } : m))
        showAlert(t.alerts.userDeactivated)
      }
    })
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

      showAlert(t.alerts.inviteSent)
      setInviteEmail('')
      setIsInviteModalOpen(false)
      fetchTeam()
    } catch (error: unknown) {
      const err = error as { message?: string }
      showAlert(`Falha: ${err.message}`)
    } finally {
      setInviteLoading(false)
    }
  }

  // ─── FUNÇÕES DE EMPRESA ───
  async function handleSaveOrg() {
    if (!orgId) return
    setLoading(true)
    const { error } = await supabase.from('orgs').update({ name: orgName }).eq('id', orgId)
    if (!error) showAlert(t.alerts.orgUpdated)
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
    // Se o label mudou, também atualiza o name (slug interno) e migra leads
    const oldStage = pipelineStages.find(s => s.id === stageId)
    if (updates.label && oldStage) {
      const newName = updates.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      if (newName !== oldStage.name) {
        updates.name = newName
        // Migrar leads do nome antigo para o novo
        await supabase
          .from('leads')
          .update({ stage: newName })
          .eq('org_id', orgId)
          .eq('stage', oldStage.name)
      }
    }
    const { error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', stageId)

    if (!error) {
      setPipelineStages(prev => prev.map(s => s.id === stageId ? { ...s, ...updates } : s))
    }
  }

  async function handleDeleteStage(stageId: string) {
    showConfirm(t.pipeline.confirmDelete, async () => {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId)

      if (error) {
        showAlert(t.pipeline.cannotDelete)
      } else {
        setPipelineStages(prev => prev.filter(s => s.id !== stageId))
      }
    })
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
      showAlert(t.tags.tagCreated)
    }
  }

  async function handleDeleteTag(tagId: string) {
    showConfirm(t.tags.confirmDelete, async () => {
      const { error } = await supabase.from('tags').delete().eq('id', tagId)

      if (!error) {
        setTags(prev => prev.filter(t => t.id !== tagId))
        showAlert(t.tags.tagDeleted)
      }
    })
  }

  // ─── OUTROS ───
  const toggleNotif = (key: keyof typeof notifSettings) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ─── LEAD CARD CONFIG ───
  const fetchLeadCardConfig = useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from('orgs')
      .select('lead_card_config')
      .eq('id', orgId)
      .single()

    if (data?.lead_card_config) {
      const config = data.lead_card_config as any
      if (config.fields) setLeadCardFields(config.fields)
      if (config.show_stale_indicator !== undefined || config.show_ai_status !== undefined) {
        setLeadCardIndicators({
          show_stale_indicator: config.show_stale_indicator ?? true,
          show_ai_status: config.show_ai_status ?? true,
        })
      }
    }
  }, [orgId])

  useEffect(() => {
    if (activeTab === 'leadCard') fetchLeadCardConfig()
  }, [activeTab, fetchLeadCardConfig])

  const handleSaveLeadCardConfig = async () => {
    if (!orgId) return
    setLeadCardLoading(true)
    try {
      await supabase
        .from('orgs')
        .update({
          lead_card_config: {
            fields: leadCardFields,
            show_stale_indicator: leadCardIndicators.show_stale_indicator,
            show_ai_status: leadCardIndicators.show_ai_status,
          },
        })
        .eq('id', orgId)
      showAlert(t.leadCard.saved)
    } catch (err) {
      console.error(err)
    } finally {
      setLeadCardLoading(false)
    }
  }

  const handleResetLeadCardConfig = () => {
    setLeadCardFields([...DEFAULT_LEAD_CARD_FIELDS])
    setLeadCardIndicators({ show_stale_indicator: true, show_ai_status: true })
  }

  const toggleLeadCardField = (field: string) => {
    setLeadCardFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/sdr/webhook`
    : `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/sdr/webhook`

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  // ─── LOADING INICIAL ───
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
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
    { id: 'leadCard', label: t.tabs.leadCard, icon: Eye, adminOnly: true },
    { id: 'integrations', label: t.tabs.integrations, icon: Globe, adminOnly: true },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 relative">

      {/* MODAL DE CONVITE */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="p-6 rounded-2xl w-full max-w-md shadow-2xl" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.modal.title}</h3>
              <button onClick={() => setIsInviteModalOpen(false)} style={{ color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="p-3 rounded-lg flex gap-3 items-start" style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary)' }}>
                <AlertCircle className="shrink-0 mt-0.5" size={16} style={{ color: 'var(--color-primary)' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t.modal.info}</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 uppercase" style={{ color: 'var(--color-text-tertiary)' }}>{t.modal.emailLabel}</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colaborador@oryen.com"
                  className="w-full rounded-lg p-3 outline-none"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                />
              </div>
              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {inviteLoading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={18} />}
                {t.modal.submit}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PERSONALIZADO (confirm/alert) */}
      {modalState.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div
            className="p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
          >
            {modalState.title && (
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{modalState.title}</h3>
            )}
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>{modalState.message}</p>
            <div className="flex gap-3 justify-end">
              {modalState.type === 'confirm' && (
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  if (modalState.type === 'confirm' && modalState.onConfirm) {
                    modalState.onConfirm()
                  }
                  closeModal()
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: modalState.type === 'confirm' ? 'var(--color-error)' : 'var(--color-primary)',
                  color: '#fff',
                }}
              >
                {modalState.type === 'confirm' ? 'Confirmar' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t.title}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.subtitle}</p>
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={activeTab === tab.id
                  ? { background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 12px rgba(90, 122, 230, 0.25)' }
                  : { color: 'var(--color-text-tertiary)' }
                }
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </aside>

        {/* CONTEÚDO */}
        <div className="flex-1 backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-2xl min-h-[500px]" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)' }}>

          {/* ABA: PERFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <User size={20} style={{ color: 'var(--color-primary)' }} /> {t.profile.personalData}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.profile.fullName}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full rounded-lg p-3 outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.profile.email}</label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full rounded-lg p-3 cursor-not-allowed" style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
                    />
                  </div>
                </div>

                {/* Preferências Regionais */}
                <div className="pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    <MapPin size={16} style={{ color: 'var(--color-success)' }} /> {t.profile.regionTitle}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.profile.language}</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-lg p-3 outline-none appearance-none" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                      >
                        <option value="pt">🇧🇷 Português</option>
                        <option value="en">🇺🇸 English</option>
                        <option value="es">🇪🇸 Español</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.profile.currency}</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded-lg p-3 outline-none appearance-none" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
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
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.profile.timezone}</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-lg p-3 outline-none appearance-none" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
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
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg w-full md:w-auto justify-center"
                  style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 4px 12px rgba(90, 122, 230, 0.25)' }}
                >
                  {profileLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {t.profile.save}
                </button>
              </div>

              <div className="w-full h-px" style={{ background: 'var(--color-border-subtle)' }} />

              {/* Troca de Senha */}
              <form onSubmit={handleChangePassword} className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <Lock size={20} style={{ color: 'var(--color-error)' }} /> {t.profile.securityTitle}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.profile.newPass}</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder={t.profile.passPlaceholder}
                      className="w-full rounded-lg p-3 outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.profile.confirmPass}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder={t.profile.passPlaceholder}
                      className="w-full rounded-lg p-3 outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newPassword || passwordLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg disabled:cursor-not-allowed w-full md:w-auto justify-center"
                  style={{ background: 'var(--color-error)', color: '#fff' }}
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
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Bell size={20} style={{ color: 'var(--color-accent)' }} /> {t.notifications.title} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.notifications.comingSoon}</span>
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{t.notifications.subtitle}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.notifications.emailLeads.title}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.notifications.emailLeads.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNotif('email_leads')}
                    className="w-12 h-6 rounded-full p-1 transition-colors"
                    style={{ background: notifSettings.email_leads ? 'var(--color-primary)' : 'var(--color-bg-elevated)' }}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifSettings.email_leads ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)' }}>
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.notifications.whatsappLeads.title}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.notifications.whatsappLeads.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNotif('whatsapp_leads')}
                    className="w-12 h-6 rounded-full p-1 transition-colors"
                    style={{ background: notifSettings.whatsapp_leads ? 'var(--color-success)' : 'var(--color-bg-elevated)' }}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifSettings.whatsapp_leads ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--color-indigo-subtle)', color: 'var(--color-indigo)' }}>
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.notifications.browserPush.title}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.notifications.browserPush.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNotif('browser_push')}
                    className="w-12 h-6 rounded-full p-1 transition-colors"
                    style={{ background: notifSettings.browser_push ? 'var(--color-indigo)' : 'var(--color-bg-elevated)' }}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifSettings.browser_push ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Aparência / Tema */}
              <div className="mt-8">
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t.notifications.themeTitle}</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{t.notifications.themeSubtitle}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTheme('dark')}
                    className="flex items-center gap-3 p-4 rounded-xl border transition-all"
                    style={theme === 'dark'
                      ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }
                      : { borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-hover)' }
                    }
                  >
                    <Moon size={20} style={{ color: theme === 'dark' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: theme === 'dark' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{t.notifications.themeDark}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.notifications.themeDarkDesc}</p>
                    </div>
                    {theme === 'dark' && <div className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />}
                  </button>

                  <button
                    onClick={() => setTheme('light')}
                    className="flex items-center gap-3 p-4 rounded-xl border transition-all"
                    style={theme === 'light'
                      ? { borderColor: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }
                      : { borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-hover)' }
                    }
                  >
                    <Sun size={20} style={{ color: theme === 'light' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: theme === 'light' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{t.notifications.themeLight}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.notifications.themeLightDesc}</p>
                    </div>
                    {theme === 'light' && <div className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: EMPRESA */}
          {activeTab === 'company' && isAdmin && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Building size={20} style={{ color: 'var(--color-primary)' }} /> {t.company.title}
              </h2>
              {orgId ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.company.nameLabel}</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full rounded-lg p-3 outline-none" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.company.idLabel}</label>
                    <input
                      type="text"
                      readOnly
                      value={orgId}
                      className="w-full rounded-lg p-3 font-mono text-xs"
                      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
                    />
                  </div>
                  <button
                    onClick={handleSaveOrg}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {t.company.updateBtn}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ color: 'var(--color-text-muted)' }}>
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
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <Shield size={20} style={{ color: 'var(--color-success)' }} /> {t.team.title}
                </h2>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'var(--color-success)', color: 'var(--color-text-primary)' }}
                >
                  <UserPlus size={16} /> {t.team.inviteBtn}
                </button>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-elevated)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[500px]">
                    <thead className="uppercase text-[10px] tracking-wider" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-tertiary)' }}>
                      <tr>
                        <th className="px-4 py-3 font-medium">{t.team.table.name}</th>
                        <th className="px-4 py-3 font-medium">{t.team.table.status}</th>
                        <th className="px-4 py-3 font-medium">{t.team.table.role}</th>
                        <th className="px-4 py-3 font-medium text-right">{t.team.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                      {teamMembers.length > 0 ? teamMembers.map((member) => (
                        <tr key={member.id} className="transition-colors" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <td className="px-4 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            <div className="flex flex-col">
                              {member.name}
                              <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>{member.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {member.status === 'active' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded flex w-fit items-center gap-1" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
                                {t.team.status.active}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                                {t.team.status.inactive}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {member.id !== user.id && (
                              member.status === 'active' ? (
                                <button
                                  onClick={() => handleDeactivateUser(member.id)}
                                  className="transition-colors p-2 rounded-lg"
                                  style={{ color: 'var(--color-text-muted)' }}
                                  title={t.team.actions.deactivate}
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivateUser(member.id)}
                                  className="transition-colors p-2 rounded-lg font-bold text-xs"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  {t.team.actions.reactivate}
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
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
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <LayoutGrid size={20} style={{ color: 'var(--color-indigo)' }} /> {t.pipeline.title}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.pipeline.subtitle}</p>
              </div>

              {/* Lista de Estágios */}
              <div className="space-y-2">
                {pipelineLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
                  </div>
                ) : (
                  pipelineStages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                      style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border-subtle)' }}
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveStage(stage.id, 'up')}
                          disabled={index === 0}
                          className="disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveStage(stage.id, 'down')}
                          disabled={index === pipelineStages.length - 1}
                          className="disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <div className={`w-4 h-4 rounded-full ${AVAILABLE_COLORS.find(c => c.name === stage.color)?.class || 'bg-gray-500'}`} />

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={stage.label}
                          onChange={(e) => {
                            const newLabel = e.target.value
                            setPipelineStages(prev => prev.map(s => s.id === stage.id ? { ...s, label: newLabel } : s))
                          }}
                          onBlur={(e) => {
                            const newLabel = e.target.value.trim()
                            if (newLabel && newLabel !== stage.name) {
                              handleUpdateStage(stage.id, { label: newLabel })
                            }
                          }}
                          className="rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                          placeholder={t.pipeline.stageLabel}
                        />
                        <select
                          value={stage.color}
                          onChange={(e) => handleUpdateStage(stage.id, { color: e.target.value })}
                          className="rounded-lg px-3 py-2 text-sm outline-none appearance-none"
                          style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                        >
                          {AVAILABLE_COLORS.map(color => (
                            <option key={color.name} value={color.name}>{color.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] cursor-pointer" style={{ color: 'var(--color-text-tertiary)' }}>
                          <input
                            type="checkbox"
                            checked={stage.is_won}
                            onChange={(e) => handleUpdateStage(stage.id, { is_won: e.target.checked, is_lost: false })}
                            className="rounded"
                            style={{ borderColor: 'var(--color-border)' }}
                          />
                          ✅
                        </label>
                        <label className="flex items-center gap-1 text-[10px] cursor-pointer" style={{ color: 'var(--color-text-tertiary)' }}>
                          <input
                            type="checkbox"
                            checked={stage.is_lost}
                            onChange={(e) => handleUpdateStage(stage.id, { is_lost: e.target.checked, is_won: false })}
                            className="rounded"
                            style={{ borderColor: 'var(--color-border)' }}
                          />
                          ❌
                        </label>
                      </div>

                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="transition-colors p-2 rounded-lg"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Adicionar Estágio */}
              <div className="pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-secondary)' }}>{t.pipeline.addStage}</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newStageLabel}
                    onChange={(e) => {
                      setNewStageLabel(e.target.value)
                      setNewStageName(e.target.value.toLowerCase().replace(/\s+/g, '_'))
                    }}
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                    placeholder={t.pipeline.stageLabel}
                  />
                  <select
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="rounded-lg px-3 py-2 text-sm outline-none appearance-none w-full sm:w-32"
                    style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                  >
                    {AVAILABLE_COLORS.map(color => (
                      <option key={color.name} value={color.name}>{color.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddStage}
                    disabled={!newStageLabel.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                    style={{ background: 'var(--color-indigo)', color: '#fff' }}
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
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <Tag size={20} style={{ color: 'var(--color-primary)' }} /> {t.tags.title}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.tags.subtitle}</p>
              </div>

              {/* Lista de Tags */}
              <div className="space-y-2">
                {tagsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
                  </div>
                ) : tags.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                    <Tag size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{t.tags.noTags}</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                          AVAILABLE_COLORS.find(c => c.name === tag.color)?.class.replace('bg-', 'bg-') + '/20'
                        }`}
                        style={{ border: '1px solid var(--color-border-subtle)' }}
                      >
                        <div className={`w-3 h-3 rounded-full ${AVAILABLE_COLORS.find(c => c.name === tag.color)?.class || 'bg-gray-500'}`} />
                        <span style={{ color: 'var(--color-text-primary)' }}>{tag.name}</span>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="transition-colors ml-1"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Adicionar Tag */}
              <div className="pt-6" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-secondary)' }}>{t.tags.addTag}</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                    placeholder={t.tags.tagName}
                  />
                  <select
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="rounded-lg px-3 py-2 text-sm outline-none appearance-none w-full sm:w-32"
                    style={{ backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
                  >
                    {AVAILABLE_COLORS.map(color => (
                      <option key={color.name} value={color.name}>{color.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddTag}
                    disabled={!newTagName.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    <Plus size={16} /> {t.tags.addTag}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA: CARD DO LEAD */}
          {activeTab === 'leadCard' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <Eye size={20} style={{ color: 'var(--color-primary)' }} /> {t.leadCard.title}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{t.leadCard.subtitle}</p>
              </div>

              {/* Campos visíveis */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t.leadCard.fieldsTitle}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_LEAD_CARD_FIELDS.map(field => (
                    <button
                      key={field}
                      onClick={() => toggleLeadCardField(field)}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: leadCardFields.includes(field) ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
                        border: `1px solid ${leadCardFields.includes(field) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: leadCardFields.includes(field) ? 'var(--color-primary)' : 'transparent',
                          border: `2px solid ${leadCardFields.includes(field) ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                        }}
                      >
                        {leadCardFields.includes(field) && <Check size={12} color="#fff" />}
                      </div>
                      <span className="text-sm" style={{ color: leadCardFields.includes(field) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                        {t.leadCard.fields[field as keyof typeof t.leadCard.fields]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicadores */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t.leadCard.indicatorsTitle}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['show_stale_indicator', 'show_ai_status'] as const).map(key => (
                    <button
                      key={key}
                      onClick={() => setLeadCardIndicators(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: leadCardIndicators[key] ? 'var(--color-primary-subtle)' : 'var(--color-bg-elevated)',
                        border: `1px solid ${leadCardIndicators[key] ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: leadCardIndicators[key] ? 'var(--color-primary)' : 'transparent',
                          border: `2px solid ${leadCardIndicators[key] ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
                        }}
                      >
                        {leadCardIndicators[key] && <Check size={12} color="#fff" />}
                      </div>
                      <span className="text-sm" style={{ color: leadCardIndicators[key] ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                        {t.leadCard.indicators[key]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pré-visualização */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t.leadCard.preview}</h3>
                <div className="flex justify-center p-6 rounded-xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                  <div className="w-[260px]">
                    <div
                      className="relative p-3 rounded-lg"
                      style={{
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border)',
                        borderLeft: `3px solid ${leadCardIndicators.show_stale_indicator ? '#DDA032' : '#34B368'}`,
                      }}
                    >
                      {/* Indicadores no canto superior direito */}
                      <div className="absolute -top-1.5 -right-1.5 flex items-center gap-1">
                        {leadCardIndicators.show_stale_indicator && (
                          <div className="rounded-full p-1 shadow-lg" style={{ background: 'var(--color-accent)', color: '#111' }} title="7 dias parado">
                            <Clock size={10} />
                          </div>
                        )}
                        {leadCardIndicators.show_ai_status && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--color-success)', boxShadow: '0 0 8px rgba(52, 179, 104, 0.6)' }}
                          >
                            <Play size={10} className="text-white" style={{ marginLeft: 1 }} />
                          </div>
                        )}
                      </div>

                      {/* Nome e Empresa */}
                      <div className="flex items-start gap-2 mb-2 pr-6">
                        <div className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                          JS
                        </div>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <h4 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
                            João Silva
                          </h4>
                          {leadCardFields.includes('nome_empresa') && (
                            <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>Imóveis Premium Ltda</p>
                          )}
                        </div>
                      </div>

                      {/* Valor, Telefone e Email */}
                      {(leadCardFields.includes('total_em_vendas') || leadCardFields.includes('email') || leadCardFields.includes('phone')) && (
                        <div className="space-y-1 mb-2">
                          {leadCardFields.includes('total_em_vendas') && (
                            <div className="text-[11px] font-bold flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                              R$ 150.000,00
                            </div>
                          )}
                          {leadCardFields.includes('phone') && (
                            <div className="flex items-center gap-1.5 text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                              <Smartphone size={10} />
                              <span className="truncate">(51) 99838-8409</span>
                            </div>
                          )}
                          {leadCardFields.includes('email') && (
                            <div className="flex items-center gap-1.5 text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                              <Mail size={10} />
                              <span className="truncate">joao@email.com</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      {leadCardFields.includes('tags') && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium border bg-red-500/10 text-red-400 border-red-500/20">
                            <Tag size={8} />Quente
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <Tag size={8} />Apartamento
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium border bg-green-500/10 text-green-400 border-green-500/20">
                            <Tag size={8} />VIP
                          </span>
                        </div>
                      )}

                      {/* Origem e Nicho */}
                      {(leadCardFields.includes('source') || leadCardFields.includes('nicho')) && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {leadCardFields.includes('source') && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] truncate" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                              Instagram
                            </span>
                          )}
                          {leadCardFields.includes('nicho') && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] truncate" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid rgba(90, 122, 230, 0.2)' }}>
                              Imobiliário
                            </span>
                          )}
                        </div>
                      )}

                      {/* Rodapé */}
                      {leadCardFields.includes('created_at') && (
                        <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                          <div className="flex items-center gap-1.5 text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            <Calendar size={10} />
                            06/04/2026
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid rgba(217, 84, 84, 0.2)' }}>
                            Prioridade
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveLeadCardConfig}
                  disabled={leadCardLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  {leadCardLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {t.leadCard.save}
                </button>
                <button
                  onClick={handleResetLeadCardConfig}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  <RotateCcw size={14} />
                  {t.leadCard.reset}
                </button>
              </div>
            </div>
          )}

          {/* ABA: INTEGRAÇÕES */}
          {activeTab === 'integrations' && isAdmin && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Globe size={20} style={{ color: 'var(--color-indigo)' }} /> {t.integrations.title}
              </h2>
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-indigo-subtle)', border: '1px solid var(--color-indigo)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t.integrations.desc}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{t.integrations.webhookLabel}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="w-full rounded-lg p-3 text-xs font-mono"
                      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-tertiary)' }}
                    />
                    <button
                      onClick={handleCopyWebhook}
                      className="px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-[90px]"
                      style={copiedWebhook
                        ? { background: 'var(--color-success)', color: 'var(--color-text-primary)' }
                        : { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }
                      }
                    >
                      {copiedWebhook ? <><Check size={14} /> {t.integrations.copied}</> : <><Copy size={14} /> {t.integrations.copy}</>}
                    </button>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{t.integrations.webhookHint}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}