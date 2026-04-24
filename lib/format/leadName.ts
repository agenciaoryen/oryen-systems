// lib/format/leadName.ts
// Helper centralizado pra exibir o nome do lead com fallback consistente
// em todos os módulos (CRM, Agenda, Prospecção, Documentos, etc).
//
// Regra de exibição (ordem de preferência):
//   1. lead.name (se preenchido e diferente de 'null')
//   2. lead.nome_empresa — APENAS pra orgs que estão em NICHES_USING_COMPANY
//      (ex: ai_agency, onde a empresa é o identificador principal em B2B)
//   3. Telefone formatado (se tiver)
//   4. "Sem nome" / "No name" / "Sin nombre" — conforme o idioma
//
// Real estate (e outros nichos B2C) NUNCA usam nome_empresa como fallback —
// "Imobiliária X" não funciona como nome de pessoa pra contato direto.

export type Lang = 'pt' | 'en' | 'es'

export interface LeadLike {
  name?: string | null
  nome_empresa?: string | null
  phone?: string | null
}

// Nichos B2B onde o nome da empresa pode substituir o nome do lead.
// Adicionar aqui novos nichos B2B no futuro (marketing_agency, consulting, etc).
const NICHES_USING_COMPANY = ['ai_agency']

const NO_NAME: Record<Lang, string> = {
  pt: 'Sem nome',
  en: 'No name',
  es: 'Sin nombre',
}

function isPresent(v?: string | null): boolean {
  if (!v) return false
  const trimmed = String(v).trim()
  return !!trimmed && trimmed.toLowerCase() !== 'null'
}

function shouldUseCompanyFallback(orgNiche?: string | null): boolean {
  return !!orgNiche && NICHES_USING_COMPANY.includes(orgNiche)
}

function formatPhone(phone?: string | null): string | null {
  if (!isPresent(phone)) return null
  const c = String(phone).replace(/\D/g, '')
  if (!c) return null
  if (c.length === 13 && c.startsWith('55')) {
    // Brasil: +55 11 99999-9999
    return `+55 ${c.substring(2, 4)} ${c.substring(4, 9)}-${c.substring(9)}`
  }
  if (c.length === 11 && c.startsWith('569')) {
    // Chile: +56 9 9999 9999
    return `+56 ${c.substring(2, 3)} ${c.substring(3, 7)} ${c.substring(7)}`
  }
  return `+${c}`
}

/**
 * Retorna o nome de exibição do lead, com fallback inteligente por nicho.
 *
 * @param lead         Lead com pelo menos { name, nome_empresa, phone }
 * @param orgNiche     Nicho da org ativa (ex: 'real_estate', 'ai_agency')
 * @param opts.lang    Idioma do usuário (pra fallback "Sem nome")
 * @param opts.usePhoneFallback  Se true (default), usa telefone formatado antes do "Sem nome"
 *
 * @example
 *   formatLeadName(lead, 'ai_agency', { lang: 'pt' })
 *   // → "João Silva" se lead.name preenchido
 *   // → "Imobiliária Tal" se lead.name vazio mas nome_empresa preenchido
 *   // → "+55 11 99999-9999" se só tem phone
 *   // → "Sem nome" como último recurso
 */
export function formatLeadName(
  lead: LeadLike | null | undefined,
  orgNiche?: string | null,
  opts?: { lang?: Lang; usePhoneFallback?: boolean }
): string {
  const lang = opts?.lang || 'pt'
  const usePhone = opts?.usePhoneFallback !== false

  if (!lead) return NO_NAME[lang]

  if (isPresent(lead.name)) return String(lead.name).trim()

  if (shouldUseCompanyFallback(orgNiche) && isPresent(lead.nome_empresa)) {
    return String(lead.nome_empresa).trim()
  }

  if (usePhone) {
    const formatted = formatPhone(lead.phone)
    if (formatted) return formatted
  }

  return NO_NAME[lang]
}

/**
 * Retorna a inicial pra usar no avatar circular.
 */
export function formatLeadInitial(
  lead: LeadLike | null | undefined,
  orgNiche?: string | null
): string {
  if (!lead) return '?'
  if (isPresent(lead.name)) return String(lead.name).trim()[0].toUpperCase()
  if (shouldUseCompanyFallback(orgNiche) && isPresent(lead.nome_empresa)) {
    return String(lead.nome_empresa).trim()[0].toUpperCase()
  }
  return '#'
}

