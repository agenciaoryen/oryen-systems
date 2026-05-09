// lib/fkd/doer-rules.ts
// Rule engine for Doer next-action suggestions and value opportunities

import type { DealContext, DoerAction, ValueOpportunity } from './types'

type Lang = 'pt' | 'en' | 'es'

const SUGGESTIONS: Record<string, Record<Lang, { suggestion: string; message: string }>> = {
  stalled_negotiation: {
    pt: { suggestion: 'Negociação parada há {days} dias — retome o contato', message: 'Olá {name}! Nossa última conversa foi há {days} dias. Tem novidades sobre o imóvel — podemos conversar?' },
    en: { suggestion: 'Negotiation stalled for {days} days — reach out again', message: "Hi {name}! It's been {days} days since we last spoke. I have updates on the property — can we chat?" },
    es: { suggestion: 'Negociación estancada por {days} días — retoma el contacto', message: '¡Hola {name}! Han pasado {days} días desde nuestra última conversación. Tengo novedades sobre el inmueble — ¿podemos hablar?' },
  },
  proposal_followup: {
    pt: { suggestion: 'Proposta enviada há {days} dias — faça follow-up', message: 'Olá {name}! Enviei a proposta há {days} dias. Alguma dúvida que eu possa esclarecer?' },
    en: { suggestion: 'Proposal sent {days} days ago — follow up', message: "Hi {name}! I sent the proposal {days} days ago. Any questions I can help clarify?" },
    es: { suggestion: 'Propuesta enviada hace {days} días — haz seguimiento', message: '¡Hola {name}! Envié la propuesta hace {days} días. ¿Alguna duda que pueda aclarar?' },
  },
  send_proposal: {
    pt: { suggestion: 'Visita feita — envie a proposta comercial', message: 'Olá {name}! Foi ótimo te receber na visita. Vou te enviar a proposta — podemos conversar sobre os detalhes?' },
    en: { suggestion: 'Visit completed — send the proposal', message: "Hi {name}! Great having you at the visit. I'll send over the proposal — let's discuss the details?" },
    es: { suggestion: 'Visita hecha — envía la propuesta', message: '¡Hola {name}! Fue genial recibirte en la visita. Te enviaré la propuesta — ¿podemos conversar los detalles?' },
  },
  ask_objection: {
    pt: { suggestion: 'Negociação longa — pergunte qual é a objeção real', message: 'Olá {name}! Percebi que estamos há um tempo nessa fase. Existe algo específico que está te impedindo de avançar? Posso ajudar a resolver.' },
    en: { suggestion: 'Long negotiation — ask about the real objection', message: "Hi {name}! I noticed we've been at this stage for a while. Is there anything specific holding you back? I can help resolve it." },
    es: { suggestion: 'Negociación larga — pregunta cuál es la objeción real', message: '¡Hola {name}! Noté que llevamos un tiempo en esta fase. ¿Hay algo específico que te impide avanzar? Puedo ayudarte a resolverlo.' },
  },
  offer_condition: {
    pt: { suggestion: 'Múltiplas visitas sem fechamento — ofereça condição especial', message: 'Olá {name}! Vi que você visitou alguns imóveis conosco. Posso conseguir uma condição especial para você — quer conversar?' },
    en: { suggestion: 'Multiple visits without closing — offer special condition', message: "Hi {name}! I noticed you've visited a few properties with us. I can arrange a special deal for you — want to chat?" },
    es: { suggestion: 'Múltiples visitas sin cierre — ofrece condición especial', message: '¡Hola {name}! Vi que visitaste algunos inmuebles con nosotros. Puedo conseguir una condición especial para ti — ¿quieres conversar?' },
  },
  keep_active: {
    pt: { suggestion: 'Mantenha o relacionamento ativo', message: 'Olá {name}! Tudo bem? Seguimos à disposição para qualquer dúvida sobre imóveis.' },
    en: { suggestion: 'Keep the relationship active', message: "Hi {name}! Hope all is well. I'm here if you have any questions about properties." },
    es: { suggestion: 'Mantén la relación activa', message: '¡Hola {name}! ¿Cómo estás? Estoy a tu disposición para cualquier consulta sobre inmuebles.' },
  },
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName
}

const CLOSING_STAGES = ['fechamento', 'closing', 'negociacao', 'negotiation']
const PROPOSAL_STAGES = ['proposta', 'proposal']

export function getNextAction(ctx: DealContext, leadName: string, lang: Lang = 'pt'): DoerAction {
  const name = getFirstName(leadName)
  const t = (key: string) => {
    const entry = SUGGESTIONS[key]?.[lang] || SUGGESTIONS[key]?.pt
    if (!entry) return { suggestion: key, message: '' }
    return {
      suggestion: entry.suggestion.replace('{days}', String(ctx.daysInStage || ctx.daysSinceActivity)),
      message: entry.message.replace('{name}', name).replace('{days}', String(ctx.daysInStage || ctx.daysSinceActivity)),
    }
  }

  // Rule 1: Stalled closing/negotiation (7+ days)
  if (CLOSING_STAGES.some(s => ctx.stage.toLowerCase().includes(s)) && ctx.daysSinceActivity >= 7) {
    const { suggestion, message } = t('stalled_negotiation')
    return { actionType: 'send_followup', priority: 'high', suggestion, suggestedMessage: message }
  }

  // Rule 2: Proposal sent + 5+ days stalled
  if (PROPOSAL_STAGES.some(s => ctx.stage.toLowerCase().includes(s)) && ctx.daysInStage >= 5) {
    const { suggestion, message } = t('proposal_followup')
    return { actionType: 'send_followup', priority: 'high', suggestion, suggestedMessage: message }
  }

  // Rule 3: Visit done but no proposal yet
  if (ctx.visitCount >= 1 && !CLOSING_STAGES.some(s => ctx.stage.toLowerCase().includes(s)) && !PROPOSAL_STAGES.some(s => ctx.stage.toLowerCase().includes(s))) {
    const { suggestion, message } = t('send_proposal')
    return { actionType: 'send_proposal', priority: 'high', suggestion, suggestedMessage: message }
  }

  // Rule 4: Long negotiation with no recent activity
  if (CLOSING_STAGES.some(s => ctx.stage.toLowerCase().includes(s)) && ctx.daysSinceActivity >= 3 && ctx.daysInStage >= 10) {
    const { suggestion, message } = t('ask_objection')
    return { actionType: 'ask_objection', priority: 'medium', suggestion, suggestedMessage: message }
  }

  // Rule 5: Multiple visits, no closing, long time
  if (ctx.visitCount >= 2 && !CLOSING_STAGES.some(s => ctx.stage.toLowerCase().includes(s)) && ctx.daysInStage >= 14) {
    const { suggestion, message } = t('offer_condition')
    return { actionType: 'offer_condition', priority: 'medium', suggestion, suggestedMessage: message }
  }

  // Default: keep active
  const { suggestion, message } = t('keep_active')
  return { actionType: 'keep_active', priority: 'low', suggestion, suggestedMessage: message }
}

export function getValueOpportunities(
  leads: Array<{ id: string; name: string; stage: string; total_em_vendas: number; updated_at: string; phone: string | null }>,
  lang: Lang = 'pt'
): ValueOpportunity[] {
  const opportunities: ValueOpportunity[] = []
  const name = (n: string) => getFirstName(n || 'cliente')

  for (const lead of leads) {
    // Won 60+ days ago → ask for referral
    const wonStages = ['won', 'ganhou', 'ganho', 'fechado']
    const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24))

    if (wonStages.some(s => lead.stage?.toLowerCase().includes(s)) && daysSinceUpdate >= 60) {
      const msgs = {
        pt: { suggestion: 'Cliente satisfeito há {days}d — peça indicação', message: 'Olá {name}! Espero que esteja gostando do imóvel. Sabe de alguém procurando algo parecido? Adoraria ajudar!' },
        en: { suggestion: 'Happy client {days}d ago — ask for referral', message: "Hi {name}! Hope you're loving the property. Know anyone looking for something similar? I'd love to help!" },
        es: { suggestion: 'Cliente satisfecho hace {days}d — pide recomendación', message: '¡Hola {name}! Espero que estés disfrutando tu inmueble. ¿Conoces a alguien buscando algo similar? ¡Me encantaría ayudar!' },
      }
      const m = msgs[lang] || msgs.pt
      opportunities.push({
        opportunityType: 'referral',
        leadId: lead.id,
        leadName: lead.name || 'cliente',
        dealValue: lead.total_em_vendas || 0,
        suggestion: m.suggestion.replace('{days}', String(daysSinceUpdate)),
        suggestedMessage: m.message.replace('{name}', name(lead.name)),
      })
    }
  }

  return opportunities
}
