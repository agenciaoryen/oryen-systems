// POST /api/email/campaigns/[id]/preview
// Gera um email de exemplo usando a config da campanha e um contato "fake"
// (pego do primeiro contato real pending, ou um genérico se não houver).
// Útil pro usuário ver como vai ficar ANTES de iniciar o disparo.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'
import { generateColdEmail } from '@/lib/email/ai-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const { id } = await params

  const { data: campaign } = await supabaseAdmin
    .from('agent_campaigns')
    .select('*')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const config = campaign.config || {}
  if (!config.pitch_hook || !config.sender_name || !config.call_to_action) {
    return NextResponse.json({ error: 'Config incompleta' }, { status: 400 })
  }

  // Pega um contato real de exemplo (o primeiro pending)
  const { data: sample } = await supabaseAdmin
    .from('email_contacts')
    .select('email, first_name, company, role, city, custom_fields')
    .eq('campaign_id', id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  const contactInput = sample || {
    email: 'exemplo@empresa.com',
    first_name: 'Ana',
    company: 'Imobiliária Exemplo',
    role: 'Corretora',
    city: 'São Paulo',
    custom_fields: {},
  }

  try {
    const generated = await generateColdEmail(contactInput as any, {
      pitch_hook: config.pitch_hook,
      sender_name: config.sender_name,
      call_to_action: config.call_to_action,
      tone: config.tone || 'direto',
      language: 'pt',
    })
    return NextResponse.json({
      preview: generated,
      contact_used: {
        email: contactInput.email,
        first_name: contactInput.first_name,
        company: contactInput.company,
      },
      is_sample: !sample,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
