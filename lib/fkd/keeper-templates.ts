// lib/fkd/keeper-templates.ts
// Static message templates for Keeper Action Board — by context and language

import type { KeeperContext } from './types'

type Lang = 'pt' | 'en' | 'es'

const TEMPLATES: Record<string, Record<Lang, string>> = {
  followup_1_2: {
    pt: 'Olá {name}! Tudo bem? Notei que estávamos conversando sobre imóveis. Tem novidades que podem te interessar!',
    en: "Hi {name}! Just checking in — we were chatting about properties. I've got some new listings that might interest you!",
    es: '¡Hola {name}! ¿Cómo estás? Estábamos conversando sobre inmuebles. ¡Tengo novedades que pueden interesarte!',
  },
  followup_3plus: {
    pt: 'Oi {name}, ainda tem interesse em buscar imóvel? Posso te ajudar com algo específico?',
    en: "Hey {name}, still looking for a property? I can help with anything specific you need.",
    es: 'Hola {name}, ¿aún tienes interés en buscar inmueble? Puedo ayudarte con algo específico.',
  },
  no_response: {
    pt: 'Olá {name}, vi que minha última mensagem ficou sem resposta. Sem pressa — mas se ainda tiver interesse, estou por aqui!',
    en: "Hi {name}, I noticed my last message went unanswered. No rush — but if you're still interested, I'm here!",
    es: 'Hola {name}, vi que mi último mensaje quedó sin respuesta. Sin prisa — pero si todavía tienes interés, ¡estoy aquí!',
  },
  hot_stale: {
    pt: 'Olá {name}! O imóvel que você viu ainda está disponível. Quer agendar uma visita?',
    en: "Hi {name}! The property you were interested in is still available. Want to schedule a visit?",
    es: '¡Hola {name}! El inmueble que viste todavía está disponible. ¿Quieres agendar una visita?',
  },
  reengagement: {
    pt: 'Olá {name}! Faz um tempo que conversamos. Surgiram novidades no mercado — quem sabe não é uma boa hora para retomar?',
    en: "Hi {name}! It's been a while since we chatted. Some new opportunities just came up — maybe it's a good time to reconnect?",
    es: '¡Hola {name}! Hace tiempo que conversamos. Surgieron novedades en el mercado — ¿quizás es un buen momento para retomar?',
  },
  referral: {
    pt: 'Olá {name}! Espero que esteja gostando do imóvel. Conhece alguém procurando algo parecido? Adoraria ajudar!',
    en: "Hi {name}! Hope you're enjoying your new home. Know anyone looking for something similar? I'd love to help!",
    es: '¡Hola {name}! Espero que estés disfrutando tu inmueble. ¿Conoces a alguien buscando algo similar? ¡Me encantaría ayudar!',
  },
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName
}

export function getKeeperMessage(ctx: KeeperContext, lang: Lang = 'pt'): string {
  const name = getFirstName(ctx.leadName)
  let templateKey: string

  switch (ctx.type) {
    case 'followup':
      templateKey = ctx.attempt <= 2 ? 'followup_1_2' : 'followup_3plus'
      break
    case 'no_response':
      templateKey = 'no_response'
      break
    case 'hot_stale':
      templateKey = 'hot_stale'
      break
    case 'reengagement':
      templateKey = 'reengagement'
      break
    case 'referral':
      templateKey = 'referral'
      break
    default:
      templateKey = 'followup_1_2'
  }

  const template = TEMPLATES[templateKey]?.[lang] || TEMPLATES[templateKey]?.pt || ''
  return template.replace('{name}', name)
}
