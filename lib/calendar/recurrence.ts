import { RRule, RRuleSet, rrulestr } from 'rrule'

/**
 * Mapeamento abreviado: daily, weekly, fortnightly, monthly
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly'

/**
 * Gera a string RRULE a partir da frequência escolhida.
 */
export function rruleFromFrequency(freq: RecurrenceFrequency): string {
  switch (freq) {
    case 'daily':
      return 'FREQ=DAILY'
    case 'weekly':
      return 'FREQ=WEEKLY'
    case 'fortnightly':
      return 'FREQ=WEEKLY;INTERVAL=2'
    case 'monthly':
      return 'FREQ=MONTHLY'
  }
}

/**
 * Converte RRULE string de volta para frequência amigável (para exibição).
 */
export function frequencyLabel(rrule: string): string {
  if (!rrule) return ''
  try {
    const r = rrulestr(rrule) as RRule
    const freq = r.options.freq
    const interval = r.options.interval || 1
    if (freq === RRule.DAILY) return 'Diário'
    if (freq === RRule.WEEKLY && interval === 2) return 'Quinzenal'
    if (freq === RRule.WEEKLY && interval === 1) return 'Semanal'
    if (freq === RRule.MONTHLY) return 'Mensal'
    return ''
  } catch {
    return ''
  }
}

/**
 * Expande uma RRULE dentro de um range de datas [from, to] (YYYY-MM-DD).
 * Retorna um array de strings YYYY-MM-DD com as datas de ocorrência,
 * excluindo as datas em `excludedDates` e respeitando `dtstart`.
 */
export function expandRecurrence(
  dtstart: string,
  rruleStr: string,
  from: string,
  to: string,
  excludedDates: string[] = []
): string[] {
  const rset = new RRuleSet()
  rset.rrule(rrulestr(rruleStr, { dtstart: new Date(dtstart + 'T12:00:00') }))

  for (const ex of excludedDates) {
    rset.exdate(new Date(ex + 'T12:00:00'))
  }

  const rangeStart = new Date(from + 'T00:00:00')
  const rangeEnd = new Date(to + 'T23:59:59')

  return rset
    .between(rangeStart, rangeEnd, true)
    .map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
}

/**
 * Retorna true se a string é uma RRULE válida.
 */
export function isValidRRule(str: string): boolean {
  try {
    rrulestr(str)
    return true
  } catch {
    return false
  }
}
