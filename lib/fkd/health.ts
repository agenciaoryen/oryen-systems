// lib/fkd/health.ts
// Relationship health score computation

export type HealthScore = 'green' | 'yellow' | 'red'

export function getHealthScore(daysSinceLastContact: number): HealthScore {
  if (daysSinceLastContact <= 3) return 'green'
  if (daysSinceLastContact <= 7) return 'yellow'
  return 'red'
}

export function getHealthLabel(score: HealthScore, lang: 'pt' | 'en' | 'es' = 'pt'): string {
  const labels: Record<HealthScore, Record<string, string>> = {
    green: { pt: 'Ativo', en: 'Active', es: 'Activo' },
    yellow: { pt: 'Esfriando', en: 'Cooling', es: 'Enfriándose' },
    red: { pt: 'Frio', en: 'Cold', es: 'Frío' },
  }
  return labels[score][lang] || labels[score].pt
}

export function getHealthColor(score: HealthScore): string {
  return score === 'green' ? '#10b981' : score === 'yellow' ? '#f59e0b' : '#ef4444'
}
