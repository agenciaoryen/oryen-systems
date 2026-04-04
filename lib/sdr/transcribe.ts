// lib/sdr/transcribe.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Transcrição de áudio via Groq Whisper (prioritário) ou OpenAI Whisper (fallback)
//
// Groq: whisper-large-v3-turbo — grátis no free tier, ~1s de latência
// OpenAI: whisper-1 — $0.006/min, ~2-3s de latência
//
// Fluxo:
// 1. Recebe URL do áudio (UAZAPI mediaUrl)
// 2. Baixa o arquivo como buffer
// 3. Envia para Groq/OpenAI Whisper
// 4. Retorna texto transcrito
// ═══════════════════════════════════════════════════════════════════════════════

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

interface TranscriptionResult {
  text: string
  provider: 'groq' | 'openai'
  duration_ms: number
}

/**
 * Transcreve áudio a partir de uma URL.
 * Prioridade: Groq → OpenAI → fallback erro
 */
export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  const start = Date.now()

  // 1. Baixar áudio como buffer
  const audioBuffer = await downloadAudio(audioUrl)
  if (!audioBuffer) {
    throw new Error('Falha ao baixar áudio')
  }

  console.log(`[Transcribe] Áudio baixado: ${(audioBuffer.byteLength / 1024).toFixed(1)}KB`)

  // 2. Tentar Groq primeiro (grátis + rápido)
  if (GROQ_API_KEY) {
    try {
      const text = await transcribeWithGroq(audioBuffer)
      const duration = Date.now() - start
      console.log(`[Transcribe] Groq OK em ${duration}ms: "${text.slice(0, 80)}..."`)
      return { text, provider: 'groq', duration_ms: duration }
    } catch (err: any) {
      console.warn(`[Transcribe] Groq falhou: ${err.message}, tentando OpenAI...`)
    }
  }

  // 3. Fallback OpenAI
  if (OPENAI_API_KEY) {
    try {
      const text = await transcribeWithOpenAI(audioBuffer)
      const duration = Date.now() - start
      console.log(`[Transcribe] OpenAI OK em ${duration}ms: "${text.slice(0, 80)}..."`)
      return { text, provider: 'openai', duration_ms: duration }
    } catch (err: any) {
      console.error(`[Transcribe] OpenAI falhou: ${err.message}`)
      throw err
    }
  }

  throw new Error('Nenhuma API de transcrição configurada (GROQ_API_KEY ou OPENAI_API_KEY)')
}

/**
 * Verifica se transcrição está disponível (pelo menos uma key configurada)
 */
export function isTranscriptionAvailable(): boolean {
  return !!(GROQ_API_KEY || OPENAI_API_KEY)
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNLOAD DO ÁUDIO
// ═══════════════════════════════════════════════════════════════════════════════

async function downloadAudio(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) {
      console.error(`[Transcribe] Download falhou: ${res.status} ${res.statusText}`)
      return null
    }
    return await res.arrayBuffer()
  } catch (err: any) {
    console.error(`[Transcribe] Download erro: ${err.message}`)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROQ WHISPER
// ═══════════════════════════════════════════════════════════════════════════════

async function transcribeWithGroq(audioBuffer: ArrayBuffer): Promise<string> {
  const formData = new FormData()
  const blob = new Blob([audioBuffer], { type: 'audio/ogg' })
  formData.append('file', blob, 'audio.ogg')
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', 'pt')
  formData.append('response_format', 'json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData,
    signal: AbortSignal.timeout(30000)
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Groq ${res.status}: ${body}`)
  }

  const data = await res.json()
  return (data.text || '').trim()
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI WHISPER
// ═══════════════════════════════════════════════════════════════════════════════

async function transcribeWithOpenAI(audioBuffer: ArrayBuffer): Promise<string> {
  const formData = new FormData()
  const blob = new Blob([audioBuffer], { type: 'audio/ogg' })
  formData.append('file', blob, 'audio.ogg')
  formData.append('model', 'whisper-1')
  formData.append('language', 'pt')
  formData.append('response_format', 'json')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
    signal: AbortSignal.timeout(30000)
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${body}`)
  }

  const data = await res.json()
  return (data.text || '').trim()
}
