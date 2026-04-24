// lib/email/ai-generator.ts
// Gera o conteúdo de um email de cold outbound usando Claude.
// Recebe dados do contato + config da campanha e devolve { subject, body }.

import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-haiku-4-5-20251001' // rápido e barato pra gerar volume

interface ContactInput {
  email: string
  first_name?: string | null
  company?: string | null
  role?: string | null
  city?: string | null
  custom_fields?: Record<string, any>
}

interface CampaignConfig {
  pitch_hook: string       // 1 frase do problema que Oryen resolve
  sender_name: string
  call_to_action: string
  tone: 'direto' | 'amigavel' | 'provocativo'
  language?: 'pt' | 'en' | 'es'
}

export interface GeneratedEmail {
  subject: string
  body_text: string
}

const TONE_INSTRUCTIONS: Record<string, Record<string, string>> = {
  pt: {
    direto: 'Tom direto, objetivo, sem enrolação. Frases curtas. Zero adjetivos de marketing tipo "inovador", "disruptivo", "revolucionário".',
    amigavel: 'Tom amigável, consultivo, como um colega de mercado conversando. Educado mas humano. Evite formalidade excessiva.',
    provocativo: 'Tom provocativo que questiona o status quo. Abre com uma pergunta incisiva ou uma estatística que incomoda. Sem ser rude.',
  },
  en: {
    direto: 'Direct, objective tone, no fluff. Short sentences. No marketing adjectives like "innovative", "disruptive", "revolutionary".',
    amigavel: 'Friendly, consultative tone, like a peer in the industry chatting. Polite but human.',
    provocativo: 'Provocative tone that challenges status quo. Open with a sharp question or a stat that stings. Not rude.',
  },
  es: {
    direto: 'Tono directo, objetivo, sin relleno. Frases cortas. Sin adjetivos marketineros.',
    amigavel: 'Tono amigable, consultivo, como un colega del mercado conversando.',
    provocativo: 'Tono provocativo que cuestiona el status quo. Abre con pregunta incisiva o estadística que incomode.',
  },
}

export async function generateColdEmail(
  contact: ContactInput,
  config: CampaignConfig
): Promise<GeneratedEmail> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')

  const lang = config.language || 'pt'
  const toneInstruction = TONE_INSTRUCTIONS[lang][config.tone] || TONE_INSTRUCTIONS.pt.direto

  const customFieldsText = contact.custom_fields && Object.keys(contact.custom_fields).length > 0
    ? `\nCampos extras: ${Object.entries(contact.custom_fields).map(([k, v]) => `${k}=${v}`).join(', ')}`
    : ''

  const contactInfo = [
    `Nome: ${contact.first_name || '(desconhecido — use saudação genérica)'}`,
    contact.company ? `Empresa: ${contact.company}` : null,
    contact.role ? `Cargo: ${contact.role}` : null,
    contact.city ? `Cidade: ${contact.city}` : null,
  ].filter(Boolean).join('\n') + customFieldsText

  const systemPrompt = `Você escreve emails B2B de prospecção fria altamente personalizados e curtos. Regras fundamentais:

1. NUNCA use spam triggers: "grátis", "garantia", "ganhe dinheiro", "clique aqui", "promoção", "exclusivo", etc.
2. Subject line curta (máximo 50 caracteres). Pessoal. Sem CAPS.
3. Corpo curto: 50-90 palavras MÁXIMO. Leitor gasta 8 segundos.
4. Abertura personalizada usando dado real do contato (cidade, cargo, empresa). Se não tiver dado, abrir com contexto.
5. UMA frase explicando o problema/oportunidade. Uma só.
6. UM CTA claro. Não peça "15 minutos", peça algo bem pequeno como uma pergunta simples.
7. Assinatura: só primeiro nome do remetente.
8. Sem link no corpo (reduz spam score).
9. Sem HTML — só texto puro.
10. ${toneInstruction}

Retorne OBRIGATORIAMENTE neste formato exato (nada mais):

SUBJECT: <linha de assunto>
---
<corpo do email>`

  const userPrompt = `CONTATO:
${contactInfo}

OFERTA (o que você resolve): ${config.pitch_hook}

CTA desejado: ${config.call_to_action}

REMETENTE: ${config.sender_name}

Escreve o email.`

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content.find(c => c.type === 'text')
  if (!text || text.type !== 'text') {
    throw new Error('Resposta vazia do modelo')
  }

  return parseEmailResponse(text.text)
}

function parseEmailResponse(raw: string): GeneratedEmail {
  const trimmed = raw.trim()
  // Separador "---" entre subject e body
  const match = trimmed.match(/SUBJECT:\s*(.+?)\s*\n+---\s*\n+([\s\S]+)/i)
  if (match) {
    return {
      subject: match[1].trim().replace(/^["']|["']$/g, ''),
      body_text: match[2].trim(),
    }
  }
  // Fallback: se o modelo não seguiu o formato, pega primeira linha como subject
  const lines = trimmed.split('\n').filter(l => l.trim())
  const subject = lines[0].replace(/^subject:\s*/i, '').replace(/^["']|["']$/g, '').trim()
  const body = lines.slice(1).join('\n').replace(/^---\s*\n?/, '').trim()
  return { subject, body_text: body || trimmed }
}
