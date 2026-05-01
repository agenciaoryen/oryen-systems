// lib/agents/handler-registry.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Registry de handlers do kernel.
//
// Cada capability declarada em capabilities.ts precisa de um handler que
// implementa a lógica concreta. O registry mapeia slug → função.
//
// Uso:
//   import { registerHandler } from './handler-registry'
//   registerHandler('send_email', sendEmailHandler)
//
// O kernel usa `getHandler(capability)` em duas situações:
//   1. Quando runAgentCapability é chamado direto pelo caller
//   2. Quando admin aprova uma action pendente — kernel reexecuta usando
//      o input persistido em agent_actions.input
//
// Sem o registry, a 2ª situação não seria possível: o caller que originou
// a action pode não estar mais no contexto (a aprovação vem de uma chamada
// HTTP separada do admin).
// ═══════════════════════════════════════════════════════════════════════════════

import type { HandlerContext, HandlerResult } from './kernel'

export type HandlerFn = (ctx: HandlerContext) => Promise<HandlerResult>

const REGISTRY = new Map<string, HandlerFn>()

export function registerHandler(capabilitySlug: string, fn: HandlerFn): void {
  if (REGISTRY.has(capabilitySlug)) {
    console.warn(`[handler-registry] Sobrescrevendo handler de "${capabilitySlug}"`)
  }
  REGISTRY.set(capabilitySlug, fn)
}

export function getHandler(capabilitySlug: string): HandlerFn | null {
  return REGISTRY.get(capabilitySlug) || null
}

export function listRegisteredCapabilities(): string[] {
  return Array.from(REGISTRY.keys())
}
