// lib/fkd/types.ts — Shared types for FKD Keeper & Doer

export type PriorityLevel = 'urgent' | 'important' | 'opportunity'

export interface ActionItem {
  id: string
  leadId: string
  leadName: string
  phone: string | null
  priority: PriorityLevel
  context: string
  contextType: 'followup' | 'no_response' | 'hot_stale' | 'reengagement' | 'referral'
  daysSinceContact: number
  suggestedMessage: string
  metadata: Record<string, any>
}

export interface DealItem {
  leadId: string
  leadName: string
  stage: string
  value: number
  daysInStage: number
  daysSinceActivity: number
  visitCount: number
  hasPendingDoc: boolean
  lastDocStatus: string | null
  phone: string | null
  nextAction: DoerAction | null
}

export interface DoerAction {
  actionType: 'send_followup' | 'send_proposal' | 'offer_condition' | 'ask_objection' | 'schedule_visit' | 'send_document' | 'ask_referral' | 'offer_financing' | 'keep_active'
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  suggestedMessage: string
}

export interface ValueOpportunity {
  opportunityType: 'referral' | 'financing' | 'objection'
  leadId: string
  leadName: string
  dealValue: number
  suggestion: string
  suggestedMessage: string
}

export interface VisitItem {
  id: string
  leadId: string | null
  leadName: string
  title: string
  time: string
  address?: string
}

export interface DocItem {
  id: string
  leadId: string | null
  leadName: string
  docName: string
  status: string
  sentAt: string | null
}

// Contexts for templates & rules

export interface FollowUpContext {
  type: 'followup'
  leadName: string
  attempt: number
  maxAttempts: number
  summary?: string
  daysSinceContact: number
}

export interface NoResponseContext {
  type: 'no_response'
  leadName: string
  daysSinceContact: number
}

export interface HotStaleContext {
  type: 'hot_stale'
  leadName: string
  stage: string
  score: string
  daysSinceContact: number
}

export interface ReengagementContext {
  type: 'reengagement'
  leadName: string
  daysSinceLost: number
}

export interface ReferralContext {
  type: 'referral'
  leadName: string
  daysSinceWon: number
  dealValue: number
}

export type KeeperContext =
  | FollowUpContext
  | NoResponseContext
  | HotStaleContext
  | ReengagementContext
  | ReferralContext

export interface DealContext {
  stage: string
  daysInStage: number
  daysSinceActivity: number
  dealValue: number
  visitCount: number
  hasPendingDoc: boolean
  lastDocStatus?: string
}
