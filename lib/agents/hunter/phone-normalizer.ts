// Normalização de telefone por país.
// Converte qualquer formato (com parens, traços, espaços, DDI ou não) pra
// E.164 sem o '+' (formato pro Evolution API e leads.phone do CRM).
//
// Lógica copiada do node "tratativaJid1" do n8n com ajustes:
//   - sem o sufixo @s.whatsapp.net (formato Evolution proprietário)
//   - retorna null se não conseguir normalizar (em vez de devolver lixo)

import { getCountryConfig, type CountryConfig } from './country-config'

export function normalizePhone(raw: string | null | undefined, country?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null

  // Remove qualquer caractere que não seja dígito
  const digits = raw.replace(/\D/g, '')
  if (!digits || digits.length < 8) return null

  const cfg = getCountryConfig(country)

  // CASO 1: já começa com DDI do país
  if (digits.startsWith(cfg.ddi)) {
    if (digits.length === cfg.fullLength) {
      return digits
    }
    // Falta só o prefixo móvel (9 no CL/BR, 1 no MX, etc)
    if (digits.length === cfg.fullLength - 1) {
      const rest = digits.substring(cfg.ddi.length)
      if (cfg.hasDDD && cfg.dddLength) {
        const ddd = rest.substring(0, cfg.dddLength)
        const num = rest.substring(cfg.dddLength)
        return cfg.ddi + ddd + cfg.mobilePrefix + num
      }
      return cfg.ddi + cfg.mobilePrefix + rest
    }
    // Tem DDI mas comprimento estranho — devolve como está se for plausível
    if (digits.length >= cfg.fullLength - 1 && digits.length <= cfg.fullLength + 1) {
      return digits
    }
    return null
  }

  // CASO 2: sem DDI
  // Tem prefixo móvel + número local — só falta DDI
  if (digits.startsWith(cfg.mobilePrefix) && digits.length === cfg.localLength + 1) {
    return cfg.ddi + digits
  }

  // Brasil: tem DDD + 9 + número (12 dígitos), só falta DDI
  if (cfg.hasDDD && cfg.dddLength && digits.length === cfg.localLength + cfg.dddLength + 1) {
    return cfg.ddi + digits
  }

  // Brasil: tem DDD + número (10 dígitos sem o 9), falta DDI e mobile prefix
  if (cfg.hasDDD && cfg.dddLength && digits.length === cfg.localLength + cfg.dddLength) {
    const ddd = digits.substring(0, cfg.dddLength)
    const num = digits.substring(cfg.dddLength)
    return cfg.ddi + ddd + cfg.mobilePrefix + num
  }

  // Só o número local (8 dígitos) — adiciona DDI + mobile prefix
  if (!cfg.hasDDD && digits.length === cfg.localLength) {
    return cfg.ddi + cfg.mobilePrefix + digits
  }

  // Comprimento não bate em nenhum caso conhecido — assume que já está em E.164
  // se for plausível (10-15 dígitos), senão descarta
  if (digits.length >= 10 && digits.length <= 15) {
    return digits
  }

  return null
}

export function extractPhonesFromText(text: string, country?: string | null): string[] {
  if (!text) return []
  const cfg = getCountryConfig(country)

  // Regex genérico (qualquer sequência de 8-15 dígitos com possíveis separadores)
  const generic = /\+?\d[\d\s\-().]{7,18}\d/g

  const matches = new Set<string>()
  const all = [...(text.match(generic) || [])]

  // Também roda o regex específico do país (mais permissivo com formatos locais)
  if (cfg.phoneRegexLocal) {
    all.push(...(text.match(cfg.phoneRegexLocal) || []))
  }

  for (const m of all) {
    const norm = normalizePhone(m, country)
    if (norm) matches.add(norm)
  }

  return Array.from(matches)
}
