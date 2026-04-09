// lib/goals/pace.ts
// Pace calculation utilities for goal tracking

import type { PaceStatus } from './types'
import { INVERTED_TEMPLATES } from './constants'

export function getDaysElapsed(periodStart: Date): number {
  const now = new Date()
  const diff = now.getTime() - periodStart.getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function getDaysRemaining(periodEnd: Date): number {
  const now = new Date()
  const diff = periodEnd.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function getDaysTotal(periodStart: Date, periodEnd: Date): number {
  const diff = periodEnd.getTime() - periodStart.getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function getProjectedValue(
  currentValue: number,
  daysElapsed: number,
  daysTotal: number
): number {
  if (daysElapsed <= 0) return 0
  const dailyRate = currentValue / daysElapsed
  return dailyRate * daysTotal
}

export function getNeededDailyRate(
  currentValue: number,
  targetValue: number,
  daysRemaining: number
): number {
  if (daysRemaining <= 0) return 0
  return Math.max(0, (targetValue - currentValue) / daysRemaining)
}

export function getPaceStatus(
  currentValue: number,
  targetValue: number,
  daysElapsed: number,
  daysTotal: number,
  templateId: string
): PaceStatus {
  if (targetValue <= 0) return 'on_track'

  const isInverted = INVERTED_TEMPLATES.includes(templateId)

  if (isInverted) {
    // For response_time: lower is better
    // If current avg is below target, we're ahead
    if (currentValue <= 0) return 'ahead'
    if (currentValue <= targetValue * 0.8) return 'ahead'
    if (currentValue <= targetValue) return 'on_track'
    if (currentValue <= targetValue * 1.3) return 'behind'
    return 'critical'
  }

  const projected = getProjectedValue(currentValue, daysElapsed, daysTotal)

  if (projected >= targetValue * 1.1) return 'ahead'
  if (projected >= targetValue * 0.85) return 'on_track'
  if (projected >= targetValue * 0.5) return 'behind'
  return 'critical'
}

export function getProgressPercentage(
  currentValue: number,
  targetValue: number,
  templateId: string
): number {
  if (targetValue <= 0) return 0

  const isInverted = INVERTED_TEMPLATES.includes(templateId)

  if (isInverted) {
    // response_time: target=30min, current=20min → 100% (achieved)
    // target=30min, current=45min → 66%
    if (currentValue <= 0) return 100
    return Math.min(100, (targetValue / currentValue) * 100)
  }

  return Math.min(100, (currentValue / targetValue) * 100)
}
