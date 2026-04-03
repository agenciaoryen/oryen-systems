// lib/sdr/normalize-phone.ts
// Normalização de número de telefone WhatsApp
// Portado do workflow n8n validado (blocos: contem_lid?, tratativa_Numero, NumeroTratado)

import type { UazapiWebhookPayload } from './types'

interface PhoneExtraction {
  phone: string              // numero normalizado principal
  phoneFallback: string | null // versao alternativa (com/sem digito 9) para busca dupla no CRM
  isLid: boolean             // true = veio no formato lid (sem numero real disponivel)
}

/**
 * Extrai e normaliza o numero de telefone do payload UAZAPI.
 *
 * O UAZAPI pode enviar o numero em 3 formatos diferentes:
 * 1. lid (ex: "123456789:0@lid") — formato interno do WhatsApp, sem numero real
 * 2. senderPn (ex: "5511999887766@s.whatsapp.net") — numero real
 * 3. remoteJidAlt (ex: "5511999887766@s.whatsapp.net") — fallback
 *
 * Para números BR (55), trata o dígito 9:
 * - Celulares BR tem 11 dígitos após o 55 (2 DDD + 9 + 8 dígitos)
 * - Alguns sistemas armazenam sem o 9 (10 dígitos após 55)
 * - Gera ambas versões para busca dupla no CRM
 */
export function extractPhone(payload: UazapiWebhookPayload): PhoneExtraction {
  // 1. Melhor campo: chatId (no v2 normalizado, contém "555198706224@s.whatsapp.net")
  // Se chatId contém @s.whatsapp.net, é o campo mais confiável
  const chatId = payload.chatId || ''
  const hasChatIdPhone = chatId.includes('@s.whatsapp.net') || chatId.includes('@c.us')

  // 2. Detectar formato lid
  const rawFrom = payload.lid || payload.from || chatId || ''
  const isLid = rawFrom.includes('@lid') && !hasChatIdPhone

  let rawPhone = ''

  if (hasChatIdPhone) {
    // chatId tem o número real — usar direto
    rawPhone = chatId
  } else if (isLid) {
    // lid nao tem numero real — usar senderPn ou remoteJidAlt
    rawPhone = payload.senderPn || payload.remoteJidAlt || ''
  } else {
    // Prioridade: senderPn > from > chatId > remoteJidAlt
    rawPhone = payload.senderPn || payload.from || chatId || payload.remoteJidAlt || ''
  }

  // 2. Limpar: remover @s.whatsapp.net, @c.us, @lid, espaços, traços, parênteses
  const phone = cleanPhone(rawPhone)

  // 3. Gerar fallback BR (com/sem dígito 9) para busca dupla
  const phoneFallback = generateBRFallback(phone)

  return { phone, phoneFallback, isLid }
}

/**
 * Remove sufixos WhatsApp e caracteres não numéricos.
 */
function cleanPhone(raw: string): string {
  return raw
    .replace(/@s\.whatsapp\.net$/i, '')
    .replace(/@c\.us$/i, '')
    .replace(/@lid$/i, '')
    .replace(/[:]/g, '')       // remover : do formato lid
    .replace(/[^0-9]/g, '')    // manter apenas digitos
}

/**
 * Para números BR (código 55), gera a versão alternativa:
 * - Se tem 13 dígitos (55 + 2 DDD + 9 + 8) → gera versão sem o 9 (12 dígitos)
 * - Se tem 12 dígitos (55 + 2 DDD + 8) → gera versão com o 9 (13 dígitos)
 *
 * Isso é necessário porque o CRM pode ter o lead com ou sem o dígito 9.
 *
 * Para outros países, retorna null (sem fallback).
 */
function generateBRFallback(phone: string): string | null {
  if (!phone.startsWith('55')) return null

  const withoutCountry = phone.slice(2) // remover 55

  if (withoutCountry.length === 11) {
    // 2 DDD + 9 + 8 dígitos → remover o 9 (terceiro caractere após 55)
    // Ex: 11 9 88776655 → 11 88776655
    const ddd = withoutCountry.slice(0, 2)
    const rest = withoutCountry.slice(3) // pular o 9
    return `55${ddd}${rest}`
  }

  if (withoutCountry.length === 10) {
    // 2 DDD + 8 dígitos → inserir 9 após DDD
    // Ex: 11 88776655 → 11 9 88776655
    const ddd = withoutCountry.slice(0, 2)
    const rest = withoutCountry.slice(2)
    return `55${ddd}9${rest}`
  }

  return null
}

/**
 * Valida se o número extraído é usável.
 * Retorna false para números vazios, muito curtos, ou que são lid sem fallback.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || phone.length < 8) return false
  // Verificar se não é apenas zeros ou artefato do lid
  if (/^0+$/.test(phone)) return false
  return true
}
