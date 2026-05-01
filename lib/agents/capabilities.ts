// lib/agents/capabilities.ts
// ═══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE CAPABILITIES
//
// Cada capability é uma "ferramenta" que um agente pode executar. O catálogo
// declara, por capability:
//   - kind:               worker (determinístico) ou agent (LLM)
//   - allowed_for:        quais solution_slugs podem executar essa capability
//   - default_approval:   'auto' | 'pending' (default modo supervisão?)
//   - target_type:        tipo do alvo esperado (lead, deal, etc) ou null
//
// Capabilities que ainda não estão aqui NÃO podem ser executadas pelo kernel.
// Isso fecha o sistema — agente não inventa ações fora do catálogo.
//
// Inspirado no AIOS (Worker vs Agent) — capabilities determinísticas devem
// ser maioria; agent (LLM) só onde criatividade real é necessária.
// ═══════════════════════════════════════════════════════════════════════════════

export type CapabilityKind = 'worker' | 'agent'
export type ApprovalMode = 'auto' | 'pending'

export interface CapabilityDefinition {
  slug: string
  kind: CapabilityKind
  description: string

  // Quais solution_slugs de agent podem executar essa capability.
  // '*' = qualquer agente autorizado.
  allowed_for: string[] | '*'

  // Modo de aprovação default. Capabilities que mandam mensagem pra fora
  // (send_email, send_whatsapp) começam em 'pending' por segurança —
  // admin habilita 'auto' explicitamente.
  default_approval: ApprovalMode

  // Tipo do target esperado, pra validação rápida no kernel
  target_type?: 'lead' | 'deal' | 'message' | 'task' | 'enrollment' | null
}

export const CAPABILITIES: Record<string, CapabilityDefinition> = {
  // ─── Comunicação outbound (alto risco — default supervisão) ───────────
  send_email: {
    slug: 'send_email',
    kind: 'worker',
    description: 'Envia email pro lead via Resend',
    allowed_for: ['bdr_email'],
    default_approval: 'auto',
    target_type: 'lead',
  },

  send_whatsapp: {
    slug: 'send_whatsapp',
    kind: 'worker',
    description: 'Envia mensagem WhatsApp pro lead via UAZAPI/Cloud API',
    allowed_for: ['sdr', 'sdr_imobiliario', 'bdr_prospector', 'followup', 'followup_imobiliario'],
    default_approval: 'pending', // outbound em massa — supervisão por padrão
    target_type: 'lead',
  },

  // ─── Geração / decisão IA (kind: agent — gasta tokens) ────────────────
  generate_reply: {
    slug: 'generate_reply',
    kind: 'agent',
    description: 'Gera resposta personalizada via LLM com contexto do lead',
    allowed_for: ['sdr', 'sdr_imobiliario', 'followup', 'followup_imobiliario'],
    default_approval: 'auto',
    target_type: 'lead',
  },

  classify_intent: {
    slug: 'classify_intent',
    kind: 'agent',
    description: 'Classifica intenção da mensagem do lead',
    allowed_for: ['sdr', 'sdr_imobiliario'],
    default_approval: 'auto',
    target_type: 'message',
  },

  generate_email_template: {
    slug: 'generate_email_template',
    kind: 'agent',
    description: 'Gera template de email personalizado pro lead',
    allowed_for: ['bdr_email'],
    default_approval: 'auto',
    target_type: 'lead',
  },

  // ─── Side-effects no CRM (worker — confiáveis, baratos) ──────────────
  move_pipeline_stage: {
    slug: 'move_pipeline_stage',
    kind: 'worker',
    description: 'Move o lead pra outro stage do pipeline',
    allowed_for: '*',
    default_approval: 'auto',
    target_type: 'lead',
  },

  create_lead: {
    slug: 'create_lead',
    kind: 'worker',
    description: 'Cria lead novo no CRM',
    allowed_for: ['hunter_b2b', 'sdr', 'sdr_imobiliario'],
    default_approval: 'auto',
    target_type: null,
  },

  update_lead: {
    slug: 'update_lead',
    kind: 'worker',
    description: 'Atualiza campos do lead (nome, email, etc)',
    allowed_for: '*',
    default_approval: 'auto',
    target_type: 'lead',
  },

  schedule_visit: {
    slug: 'schedule_visit',
    kind: 'worker',
    description: 'Agenda visita/reunião no calendar do lead',
    allowed_for: ['sdr', 'sdr_imobiliario'],
    default_approval: 'auto',
    target_type: 'lead',
  },

  create_task: {
    slug: 'create_task',
    kind: 'worker',
    description: 'Cria task pra um colaborador (humano ou agente)',
    allowed_for: '*',
    default_approval: 'auto',
    target_type: null,
  },

  // ─── Captação ────────────────────────────────────────────────────────
  capture_leads_serper: {
    slug: 'capture_leads_serper',
    kind: 'worker', // Serper é determinístico; LLM não é mais usado pra extração
    description: 'Busca leads B2B via Serper (Google, Maps, Instagram)',
    allowed_for: ['hunter_b2b'],
    default_approval: 'auto',
    target_type: null,
  },

  scrape_contact_from_website: {
    slug: 'scrape_contact_from_website',
    kind: 'worker',
    description: 'Faz fetch do site do lead e extrai email/telefone',
    allowed_for: ['hunter_b2b'],
    default_approval: 'auto',
    target_type: 'lead',
  },
}

/**
 * Verifica se um agente pode executar uma capability.
 */
export function canAgentExecute(agentSolutionSlug: string, capabilitySlug: string): boolean {
  const cap = CAPABILITIES[capabilitySlug]
  if (!cap) return false
  if (cap.allowed_for === '*') return true
  return cap.allowed_for.includes(agentSolutionSlug)
}

/**
 * Retorna a definição de uma capability ou null.
 */
export function getCapability(slug: string): CapabilityDefinition | null {
  return CAPABILITIES[slug] || null
}

/**
 * Lista capabilities disponíveis pra um agente (pra UI).
 */
export function capabilitiesForAgent(agentSolutionSlug: string): CapabilityDefinition[] {
  return Object.values(CAPABILITIES).filter((cap) => {
    if (cap.allowed_for === '*') return true
    return cap.allowed_for.includes(agentSolutionSlug)
  })
}
