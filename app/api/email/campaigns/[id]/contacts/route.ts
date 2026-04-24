// POST /api/email/campaigns/[id]/contacts
// Body: { contacts: [{ email, first_name?, company?, role?, city?, phone?, custom_fields? }, ...] }
// Insere contatos na campanha. Dedupe por (campaign_id, email).

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, supabaseAdmin } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const { id } = await params

  // Confirma que a campanha existe e é da org
  const { data: campaign } = await supabaseAdmin
    .from('agent_campaigns')
    .select('id, org_id')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = await request.json()
  const list = Array.isArray(body.contacts) ? body.contacts : []
  if (list.length === 0) return NextResponse.json({ error: 'contacts vazio' }, { status: 400 })

  // Normaliza + filtra inválidos
  const rows = list
    .filter((c: any) => typeof c.email === 'string' && /.+@.+\..+/.test(c.email))
    .map((c: any) => ({
      org_id: auth.orgId,
      campaign_id: id,
      email: String(c.email).trim().toLowerCase(),
      first_name: c.first_name?.trim() || null,
      company: c.company?.trim() || null,
      role: c.role?.trim() || null,
      city: c.city?.trim() || null,
      phone: c.phone?.trim() || null,
      custom_fields: c.custom_fields || {},
      status: 'pending',
    }))

  if (rows.length === 0) return NextResponse.json({ error: 'nenhum email válido' }, { status: 400 })

  // Dedupe por email dentro do payload
  const seen = new Set<string>()
  const uniqueRows = rows.filter((r: any) => {
    if (seen.has(r.email)) return false
    seen.add(r.email)
    return true
  })

  // Insert ignorando duplicados (UNIQUE constraint cuida)
  const { error } = await supabaseAdmin
    .from('email_contacts')
    .upsert(uniqueRows, { onConflict: 'campaign_id,email', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Conta quantos estão na campanha agora
  const { count } = await supabaseAdmin
    .from('email_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)

  return NextResponse.json({
    ok: true,
    submitted: list.length,
    imported: uniqueRows.length,
    rejected: list.length - uniqueRows.length,
    total_in_campaign: count || 0,
  })
}

// GET /api/email/campaigns/[id]/contacts — lista contatos paginada
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  if (!auth.orgId) return NextResponse.json({ error: 'no_org' }, { status: 403 })

  const { id } = await params
  const url = request.nextUrl
  const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 500)
  const offset = Number(url.searchParams.get('offset') || '0')
  const status = url.searchParams.get('status')

  let query = supabaseAdmin
    .from('email_contacts')
    .select('id, email, first_name, company, role, city, status, created_at', { count: 'exact' })
    .eq('campaign_id', id)
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count } = await query
  return NextResponse.json({ contacts: data || [], total: count || 0 })
}
