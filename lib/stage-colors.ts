// Mapeamento das cores de pipeline_stages.
//
// A coluna `pipeline_stages.color` guarda o SLUG do Tailwind (ex: 'amber',
// 'emerald', 'pink') — não um hex code. Componentes que tentam usar o valor
// direto como CSS color acabam com fundo transparente porque 'amber' não é
// uma cor CSS válida.
//
// Esta função converte o slug em hex estável, compatível com os
// AVAILABLE_COLORS do /dashboard/settings (bg-*-500 variants).

const SLUG_TO_HEX: Record<string, string> = {
  gray:    '#6B7280',
  blue:    '#3B82F6',
  amber:   '#F59E0B',
  cyan:    '#06B6D4',
  purple:  '#A855F7',
  indigo:  '#6366F1',
  emerald: '#10B981',
  rose:    '#F43F5E',
  green:   '#22C55E',
  red:     '#EF4444',
  yellow:  '#EAB308',
  pink:    '#EC4899',
}

const DEFAULT_HEX = '#6366F1' // indigo

/**
 * Converte um valor de pipeline_stages.color em hex renderizável.
 * Aceita tanto slugs (amber, emerald, ...) quanto hex já pronto (#F59E0B).
 * Fallback: indigo.
 */
export function stageColorHex(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_HEX
  const trimmed = raw.trim()
  if (!trimmed) return DEFAULT_HEX
  // Já é hex
  if (trimmed.startsWith('#')) return trimmed
  // Slug conhecido
  const hex = SLUG_TO_HEX[trimmed.toLowerCase()]
  return hex || DEFAULT_HEX
}

export { SLUG_TO_HEX as STAGE_HEX_MAP, DEFAULT_HEX as STAGE_DEFAULT_HEX }
