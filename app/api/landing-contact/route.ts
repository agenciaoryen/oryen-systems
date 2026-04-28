// POST /api/landing-contact
// Recebe submissão do formulário "Solicitar demonstração" da landing oryen.agency
// e:
//  1. Cria lead no CRM da org Oryen (source='site', stage do primeiro stage do pipeline)
//  2. Dispara alertas pra admins/vendedores da org Oryen no painel
//  3. Envia email de notificação pra agenciaoryen@gmail.com via Resend
//
// Configuração necessária:
//   ORYEN_LANDING_ORG_ID — UUID da org "Oryen" no banco (a que recebe os leads
//   da landing institucional, não confundir com sites de clientes corretores).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendColdEmail } from '@/lib/email/sender'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const NOTIFY_EMAIL = 'agenciaoryen@gmail.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim()
    const phone = String(body.phone || '').trim()
    const message = String(body.message || '').trim()

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Nome, email e WhatsApp são obrigatórios' },
        { status: 400 }
      )
    }

    // Honeypot anti-spam
    if (body.website) {
      return NextResponse.json({ ok: true })
    }

    const orgId = process.env.ORYEN_LANDING_ORG_ID
    if (!orgId) {
      console.error('[LandingContact] ORYEN_LANDING_ORG_ID não configurada')
      return NextResponse.json(
        { error: 'Configuração ausente — contate o time' },
        { status: 500 }
      )
    }

    // 1. Busca primeiro stage do pipeline da org Oryen
    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    // 2. Cria/atualiza lead no CRM (dedup por phone)
    let leadId: string | null = null
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('org_id', orgId)
      .eq('phone', phone)
      .maybeSingle()

    if (existingLead) {
      leadId = existingLead.id
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }
      if (email) updateData.email = email
      if (name) updateData.name = name
      await supabase.from('leads').update(updateData).eq('id', leadId)
    } else {
      const { data: newLead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          org_id: orgId,
          name,
          phone,
          email: email || null,
          source: 'site',
          stage: firstStage?.name || 'new',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertErr) {
        console.error('[LandingContact] Erro ao criar lead:', insertErr)
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }
      leadId = newLead?.id || null
    }

    // 3. Dispara alerta pra admins/vendedores da org
    if (leadId) {
      const { data: orgUsers } = await supabase
        .from('users')
        .select('id')
        .eq('org_id', orgId)
        .neq('role', 'staff')

      if (orgUsers && orgUsers.length > 0) {
        const description = message
          ? `${name} (${phone}) preencheu o formulário da landing. Mensagem: "${message}"`
          : `${name} (${phone}) preencheu o formulário da landing.`

        const alertRows = orgUsers.map((u: any) => ({
          user_id: u.id,
          type: 'urgent',
          title: `Novo lead da landing: ${name}`,
          description,
          action_link: `/dashboard/crm/${leadId}`,
          action_label: 'Ver lead',
          is_read: false,
        }))
        await supabase.from('alerts').insert(alertRows)
      }
    }

    // 4. Email de notificação pra agenciaoryen@gmail.com
    try {
      await sendColdEmail({
        to: NOTIFY_EMAIL,
        subject: `[Oryen Landing] Novo lead: ${name}`,
        bodyText: `Acabou de chegar um lead pela landing oryen.agency.

Nome: ${name}
WhatsApp: ${phone}
Email: ${email || '(não informado)'}
${message ? `\nMensagem:\n${message}\n` : ''}
Lead ID no CRM: ${leadId || '(falhou ao criar)'}
Acesse: https://oryen.agency/dashboard/crm/${leadId || ''}`,
        fromName: 'Oryen Landing',
      })
    } catch (emailErr: any) {
      // Email é best-effort — não falha a request se Resend cair
      console.warn('[LandingContact] Erro ao enviar email (não-fatal):', emailErr.message)
    }

    return NextResponse.json({ ok: true, lead_id: leadId })
  } catch (err: any) {
    console.error('[LandingContact] Erro:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
