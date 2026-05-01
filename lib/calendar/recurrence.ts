/**
 * Implementação própria de recorrência de eventos.
 * Suporta: daily, weekly, fortnightly, monthly.
 * Evita dependência externa (rrule) que causava falha no Turbopack.
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly'

/**
 * Gera a string RRULE a partir da frequência escolhida.
 */
export function rruleFromFrequency(freq: RecurrenceFrequency): string {
  switch (freq) {
    case 'daily': return 'FREQ=DAILY'
    case 'weekly': return 'FREQ=WEEKLY'
    case 'fortnightly': return 'FREQ=WEEKLY;INTERVAL=2'
    case 'monthly': return 'FREQ=MONTHLY'
  }
}

/**
 * Converte RRULE string de volta para frequência amigável (para exibição).
 */
export function frequencyLabel(rrule: string): string {
  if (!rrule) return ''
  if (rrule.includes('DAILY')) return 'Diário'
  if (rrule.includes('INTERVAL=2')) return 'Quinzenal'
  if (rrule.includes('WEEKLY')) return 'Semanal'
  if (rrule.includes('MONTHLY')) return 'Mensal'
  return ''
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7)
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

/**
 * Expande uma RRULE dentro de um range de datas [from, to] (YYYY-MM-DD).
 * Retorna um array de strings YYYY-MM-DD com as datas de ocorrência,
 * excluindo as datas em `excludedDates`.
 */
export function expandRecurrence(
  dtstart: string,
  rruleStr: string,
  from: string,
  to: string,
  excludedDates: string[] = []
): string[] {
  const start = new Date(dtstart + 'T12:00:00')
  const rangeStart = new Date(from + 'T00:00:00')
  const rangeEnd = new Date(to + 'T23:59:59')
  const excluded = new Set(excludedDates)

  const result: string[] = []
  let maxIterations = 1000 // safety limit

  if (rruleStr.includes('DAILY')) {
    let current = new Date(start)
    while (current <= rangeEnd && maxIterations-- > 0) {
      if (current >= rangeStart) {
        const ds = dateStr(current)
        if (!excluded.has(ds)) result.push(ds)
      }
      current = addDays(current, 1)
    }
  } else if (rruleStr.includes('INTERVAL=2')) {
    // Fortnightly (a cada 2 semanas)
    let current = new Date(start)
    while (current <= rangeEnd && maxIterations-- > 0) {
      if (current >= rangeStart) {
        const ds = dateStr(current)
        if (!excluded.has(ds)) result.push(ds)
      }
      current = addWeeks(current, 2)
    }
  } else if (rruleStr.includes('WEEKLY')) {
    let current = new Date(start)
    while (current <= rangeEnd && maxIterations-- > 0) {
      if (current >= rangeStart) {
        const ds = dateStr(current)
        if (!excluded.has(ds)) result.push(ds)
      }
      current = addWeeks(current, 1)
    }
  } else if (rruleStr.includes('MONTHLY')) {
    let current = new Date(start)
    while (current <= rangeEnd && maxIterations-- > 0) {
      if (current >= rangeStart) {
        const ds = dateStr(current)
        if (!excluded.has(ds)) result.push(ds)
      }
      current = addMonths(current, 1)
    }
  }

  return result
}
