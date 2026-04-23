// lib/integrations/crypto.ts
// AES-256-GCM pra encriptar tokens OAuth em repouso.
//
// Como funciona:
//   - Master key: INTEGRATIONS_MASTER_KEY (32 bytes em base64) no env.
//   - Cada token é encriptado com um IV (12 bytes) aleatório por operação.
//   - O blob salvo no banco tem o formato: base64(IV || ciphertext || authTag).
//
// Perder a INTEGRATIONS_MASTER_KEY torna todos os tokens ilegíveis.
// Rotacionar = re-encriptar tudo com a chave nova (operação manual, sem downtime automático).

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12       // GCM recomenda 96 bits
const AUTH_TAG_LENGTH = 16 // GCM gera 128 bits

function getMasterKey(): Buffer {
  const raw = process.env.INTEGRATIONS_MASTER_KEY
  if (!raw) {
    throw new Error('INTEGRATIONS_MASTER_KEY não configurada no ambiente')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`INTEGRATIONS_MASTER_KEY deve ter 32 bytes (tem ${key.length}). Gere novamente com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
  }
  return key
}

/**
 * Encripta uma string. Resultado: base64(IV || ciphertext || authTag).
 */
export function encryptString(plaintext: string): string {
  if (!plaintext) return ''
  const key = getMasterKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64')
}

/**
 * Desencripta uma string encriptada por encryptString().
 */
export function decryptString(blob: string): string {
  if (!blob) return ''
  const key = getMasterKey()
  const raw = Buffer.from(blob, 'base64')
  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Blob encriptado com tamanho inválido')
  }
  const iv = raw.subarray(0, IV_LENGTH)
  const authTag = raw.subarray(raw.length - AUTH_TAG_LENGTH)
  const ciphertext = raw.subarray(IV_LENGTH, raw.length - AUTH_TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8')
}
