// lib/sdr/intake.ts
// ═══════════════════════════════════════════════════════════════════════════════
// INTAKE — Carregamento de contexto pré-processado (código puro, sem LLM)
//
// Substitui o tool loop `buscar_info_lead` que consumia ~10k tokens.
// Executa queries paralelas no Supabase e monta o contexto completo
// que será injetado no prompt do responder.
//
// Latência: ~100ms (queries paralelas)
// Custo: 0 tokens
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos ───

export interface LeadData {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  stage: string | null
  source: string | null
  city: string | null
  nicho: string | null
  tipo_contato: string | null
  interesse: string | null
  instagram: string | null
  total_em_vendas: number | null
  created_at: string
  updated_at: string | null
  conversa_finalizada: boolean | null
}

export interface SavedInfoEntry {
  field: string
  value: string
  collected_at: string
}

export interface PropertyData {
  id: string
  ref: string
  title: string
  description: string | null
  type: string
  transaction: string
  price: number | null
  condo_fee: number | null
  iptu: number | null
  bedrooms: number | null
  suites: number | null
  bathrooms: number | null
  parking: number | null
  total_area: number | null
  private_area: number | null
  neighborhood: string | null
  city: string | null
  state: string | null
  address: string | null
  amenities: string[] | null
  video_url: string | null
  virtual_tour_url: string | null
  site_url: string | null
}

export interface LeadContext {
  lead: LeadData | null
  savedInfo: SavedInfoEntry[]
  notes: string[]
  referenceCode: string | null
  referenceProperty: PropertyData | null
  hasAssistantHistory: boolean
  conversationFinished: boolean
}

// ─── Regex para detectar códigos de referência ───
const REF_PATTERNS = [
  /REF[-\s]?(\d{3,6})/i,
  /COD[-\s]?(\d{3,6})/i,
  /código\s+(\d{3,6})/i,
  /codigo\s+(\d{3,6})/i,
  /imóvel\s+(\d{3,6})/i,
  /imovel\s+(\d{3,6})/i,
  /propriedade\s+(\d{3,6})/i,
]

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface IntakeParams {
  org_id: string
  lead_id: string
  phone: string
  user_message: string
  history: { role: string; body: string; created_at: string }[]
}

export async function loadLeadContext(params: IntakeParams): Promise<LeadContext> {
  const { org_id, lead_id, user_message, history } = params

  // Detectar código de referência na mensagem atual
  const referenceCode = detectReferenceCode(user_message)

  // Executar queries em paralelo para mínima latência
  const [leadResult, savedInfoResult, notesResult, propertyResult, siteResult] = await Promise.all([
    // 1. Dados do lead no CRM
    supabase
      .from('leads')
      .select('id, name, phone, email, stage, source, city, nicho, tipo_contato, interesse, instagram, total_em_vendas, created_at, updated_at, conversa_finalizada')
      .eq('id', lead_id)
      .eq('org_id', org_id)
      .single(),

    // 2. Informações salvas via save_lead_info (metadata em sdr_messages)
    supabase
      .from('sdr_messages')
      .select('body, created_at')
      .eq('lead_id', lead_id)
      .eq('org_id', org_id)
      .eq('role', 'system')
      .eq('type', 'tool_result')
      .order('created_at', { ascending: false })
      .limit(30),

    // 3. Notas do timeline
    supabase
      .from('lead_events')
      .select('type, content, created_at')
      .eq('lead_id', lead_id)
      .eq('type', 'note')
      .order('created_at', { ascending: false })
      .limit(5),

    // 4. Pre-fetch propriedade se referência detectada
    referenceCode
      ? fetchPropertyByRef(org_id, referenceCode)
      : Promise.resolve(null),

    // 5. Verificar site publicado (para URLs de propriedades)
    supabase
      .from('site_settings')
      .select('slug, is_published')
      .eq('org_id', org_id)
      .single()
  ])

  // Processar saved_info
  const savedInfo: SavedInfoEntry[] = []
  if (savedInfoResult.data) {
    for (const m of savedInfoResult.data) {
      try {
        const parsed = JSON.parse(m.body)
        if (parsed.action?.startsWith('lead_info_') && parsed.field && parsed.value) {
          savedInfo.push({
            field: parsed.field,
            value: parsed.value,
            collected_at: parsed.collected_at || m.created_at
          })
        }
      } catch { /* skip malformed entries */ }
    }
  }

  // Deduplicate saved_info — manter apenas o mais recente por campo
  const deduped = new Map<string, SavedInfoEntry>()
  for (const entry of savedInfo) {
    if (!deduped.has(entry.field) || entry.collected_at > deduped.get(entry.field)!.collected_at) {
      deduped.set(entry.field, entry)
    }
  }

  // Processar notas
  const notes = (notesResult.data || []).map(n => n.content).filter(Boolean)

  // Verificar se já houve interação do assistant
  const hasAssistantHistory = history.some(h => h.role === 'assistant')

  // Enriquecer property com site URL se disponível
  let referenceProperty = propertyResult
  if (referenceProperty && siteResult.data?.is_published) {
    referenceProperty.site_url = `/sites/${siteResult.data.slug}/properties/${referenceProperty.id}`
  }

  const lead = leadResult.data as LeadData | null

  console.log(`[SDR:Intake] Lead ${lead_id} | CRM: ${!!lead} | saved_info: ${deduped.size} | ref: ${referenceCode || 'none'} | property: ${!!referenceProperty}`)

  return {
    lead,
    savedInfo: Array.from(deduped.values()),
    notes,
    referenceCode,
    referenceProperty,
    hasAssistantHistory,
    conversationFinished: lead?.conversa_finalizada === true
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function detectReferenceCode(message: string): string | null {
  for (const pattern of REF_PATTERNS) {
    const match = message.match(pattern)
    if (match) return match[0].trim()
  }
  return null
}

async function fetchPropertyByRef(orgId: string, ref: string): Promise<PropertyData | null> {
  const cleanRef = ref.trim()

  // Tentar por external_code
  let result = await supabase
    .from('properties')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .ilike('external_code', cleanRef)
    .limit(1)
    .single()

  if (!result.data) {
    // Tentar por slug
    result = await supabase
      .from('properties')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .eq('slug', cleanRef.toLowerCase())
      .limit(1)
      .single()
  }

  if (!result.data) {
    // Tentar busca parcial no external_code
    result = await supabase
      .from('properties')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .ilike('external_code', `%${cleanRef}%`)
      .limit(1)
      .single()
  }

  if (!result.data) return null

  const p = result.data
  return {
    id: p.id,
    ref: p.external_code || p.slug || p.id.slice(0, 8),
    title: p.title,
    description: p.description,
    type: p.property_type,
    transaction: p.transaction_type,
    price: p.price,
    condo_fee: p.condo_fee,
    iptu: p.iptu,
    bedrooms: p.bedrooms,
    suites: p.suites,
    bathrooms: p.bathrooms,
    parking: p.parking_spots,
    total_area: p.total_area,
    private_area: p.private_area,
    neighborhood: p.address_neighborhood,
    city: p.address_city,
    state: p.address_state,
    address: [p.address_street, p.address_number, p.address_neighborhood, p.address_city].filter(Boolean).join(', '),
    amenities: p.amenities,
    video_url: p.video_url,
    virtual_tour_url: p.virtual_tour_url,
    site_url: null // Preenchido depois com dados do site
  }
}
