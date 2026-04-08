// app/api/analytics/insights/route.ts
// POST: Gera insights com Claude AI a partir dos dados do CRM

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { buildInsightPayload } from '@/lib/analytics/aggregations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rate limiting simples (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_CALLS_PER_DAY = 20

function checkRateLimit(orgId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(orgId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(orgId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 })
    return true
  }

  if (entry.count >= MAX_CALLS_PER_DAY) return false

  entry.count++
  return true
}

const LANG_MAP: Record<string, string> = {
  pt: 'português brasileiro',
  en: 'English',
  es: 'español',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, lang = 'pt', range_days = 30 } = body

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    // Rate limit check
    if (!checkRateLimit(org_id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 20 insights per day.' },
        { status: 429 }
      )
    }

    // Buscar nome da org
    const { data: orgData } = await supabase
      .from('orgs')
      .select('name')
      .eq('id', org_id)
      .single()

    const orgName = orgData?.name || 'Organization'

    // Build compact payload
    const payload = await buildInsightPayload(supabase, org_id, range_days)

    // Chamar Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const langLabel = LANG_MAP[lang] || 'português brasileiro'

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `Você é o analista de dados do Oryen, uma plataforma CRM para corretores de imóveis.
Gere insights concisos em ${langLabel}.
Seja específico — cite números e percentuais. Não cumprimente e não se apresente.
Retorne APENAS um JSON válido com as chaves:
- "insight": string (1 parágrafo, 2-4 frases com análise dos dados)
- "alerts": string[] (2-3 ações curtas e específicas, cada uma com menos de 100 caracteres)
Foque em problemas, oportunidades e ações concretas — não em descrições genéricas.
Se não houver dados suficientes, sugira ações para gerar dados.`,
      messages: [
        {
          role: 'user',
          content: `Analise os dados do CRM "${orgName}" nos últimos ${range_days} dias:\n${JSON.stringify(payload, null, 0)}`,
        },
      ],
    })

    const textBlock = response.content.find((b: any) => b.type === 'text')
    const rawText = (textBlock as any)?.text?.trim() || '{}'

    // Parse JSON da resposta
    let parsed: { insight: string; alerts: string[] }
    try {
      // Extrair JSON mesmo que venha com markdown code block
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] || rawText)
    } catch {
      parsed = {
        insight: rawText,
        alerts: [],
      }
    }

    return NextResponse.json({
      insight: parsed.insight || '',
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts.slice(0, 3) : [],
      generated_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Analytics insight error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
