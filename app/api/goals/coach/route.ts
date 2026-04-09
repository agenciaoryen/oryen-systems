import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Rate limiting: 10 calls/day/org
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(orgId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(orgId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(orgId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 })
    return true
  }

  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { org_id, lang = 'pt', payload } = body

  if (!org_id || !payload) {
    return NextResponse.json({ error: 'org_id and payload required' }, { status: 400 })
  }

  if (!checkRateLimit(org_id)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const langMap: Record<string, string> = {
    pt: 'português brasileiro',
    en: 'English',
    es: 'español',
  }

  const systemPrompt = `Você é o coach estratégico de metas do Oryen CRM, uma plataforma para corretores de imóveis.
Analise o progresso das metas e forneça coaching acionável em ${langMap[lang] || 'português brasileiro'}.
Seja específico — cite números exatos, percentuais e dias restantes.
NÃO cumprimente. NÃO use emojis.
Retorne APENAS JSON válido com estas chaves:
- "summary": string (2-3 frases avaliação geral do progresso do mês)
- "recommendations": string[] (3-4 recomendações específicas e acionáveis, cada uma com menos de 120 caracteres)
- "pace_analysis": string (1-2 frases sobre ritmo atual e projeção para o fim do mês)
- "priority_goal": string (qual meta precisa de mais atenção agora e por quê, 1 frase)
Foque no que o usuário deve FAZER, não apenas descrever dados.
Se uma meta está atrasada, sugira ações diárias concretas para recuperar.
Se uma meta está adiantada, sugira elevar o target ou focar em metas atrasadas.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Dados de metas do CRM "${payload.org_name}" em ${payload.month}:\n${JSON.stringify(payload, null, 0)}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      ...parsed,
      generated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Goals coach error:', err)
    return NextResponse.json({ error: 'AI coaching failed' }, { status: 500 })
  }
}
