// app/dashboard/calendar/types.ts

export type Language = 'pt' | 'en' | 'es'

export type ViewMode = 'month' | 'week' | 'agenda'

export interface CalendarEvent {
  id: string
  org_id: string
  lead_id: string | null
  assigned_to: string | null
  title: string
  description: string | null
  event_type: 'visit' | 'meeting' | 'follow_up' | 'other'
  event_date: string
  start_time: string
  end_time: string | null
  address: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  created_by: string
  notes: string | null
  created_at: string
  updated_at: string
  // Recurrence
  rrule?: string | null
  excluded_dates?: string[] | null
  recurrence_master_id?: string | null
  // Reminder
  reminder_minutes?: number | null
  last_reminder_sent_at?: string | null
  // External sync
  external_source?: string | null
  external_id?: string | null
  external_integration_id?: string | null
  external_read_only?: boolean | null
  // Joined
  leads?: { id: string; name: string; phone: string } | null
}

export interface LeadOption {
  id: string
  name: string
  phone: string | null
}

export interface OrgUser {
  id: string
  full_name: string
  email: string
  role: string
  status: string
}

export interface ChecklistItem {
  id: string
  event_id: string
  text: string
  is_completed: boolean
  position: number
}
