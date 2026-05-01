// app/dashboard/calendar/constants.ts
import type React from 'react'

// ─── Event Type Colors ───
export const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; dotStyle: React.CSSProperties }> = {
  visit:     { bg: 'var(--color-primary-subtle)', text: 'var(--color-primary)', dotStyle: { backgroundColor: 'var(--color-primary)' } },
  meeting:   { bg: 'rgba(168,85,247,0.1)', text: 'rgb(192,132,252)', dotStyle: { backgroundColor: 'rgb(192,132,252)' } },
  follow_up: { bg: 'var(--color-success-subtle)', text: 'var(--color-success)', dotStyle: { backgroundColor: 'var(--color-success)' } },
  other:     { bg: 'var(--color-bg-hover)', text: 'var(--color-text-tertiary)', dotStyle: { backgroundColor: 'var(--color-text-tertiary)' } },
}

// ─── Status Colors ───
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: 'var(--color-primary-subtle)', text: 'var(--color-primary)' },
  completed: { bg: 'var(--color-success-subtle)', text: 'var(--color-success)' },
  cancelled: { bg: 'var(--color-bg-hover)', text: 'var(--color-text-muted)' },
  no_show:   { bg: 'var(--color-error-subtle)', text: 'var(--color-error)' },
}

// ─── User Colors (auto-assigned by hash) ───
export const USER_COLORS = [
  { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', border: '#3B82F6' },
  { bg: 'rgba(239,68,68,0.15)',  text: '#EF4444', border: '#EF4444' },
  { bg: 'rgba(34,197,94,0.15)',  text: '#22C55E', border: '#22C55E' },
  { bg: 'rgba(234,179,8,0.15)',  text: '#EAB308', border: '#EAB308' },
  { bg: 'rgba(168,85,247,0.15)', text: '#A855F7', border: '#A855F7' },
  { bg: 'rgba(236,72,153,0.15)', text: '#EC4899', border: '#EC4899' },
  { bg: 'rgba(14,165,233,0.15)', text: '#0EA5E9', border: '#0EA5E9' },
  { bg: 'rgba(249,115,22,0.15)', text: '#F97316', border: '#F97316' },
  { bg: 'rgba(132,204,22,0.15)', text: '#84CC16', border: '#84CC16' },
  { bg: 'rgba(20,184,166,0.15)', text: '#14B8A6', border: '#14B8A6' },
]

export function getUserColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

// ─── Helpers ───
export function formatTime(time: string) {
  return time?.slice(0, 5) || ''
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
