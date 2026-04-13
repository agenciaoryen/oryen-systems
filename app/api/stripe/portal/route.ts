import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId } = body

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing orgId' },
        { status: 400 }
      )
    }

    // Buscar customer_id da org
    const { data: org } = await supabase
      .from('orgs')
      .select('billing_customer_id')
      .eq('id', orgId)
      .single()

    let customerId = org?.billing_customer_id

    // Se não tem customer_id, tentar buscar/criar no Stripe
    if (!customerId) {
      // Buscar email e nome da org para criar customer
      const { data: orgFull } = await supabase
        .from('orgs')
        .select('name')
        .eq('id', orgId)
        .single()

      // Buscar email do admin da org
      const { data: adminMember } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', 'admin')
        .limit(1)
        .single()

      let adminEmail = ''
      if (adminMember?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', adminMember.user_id)
          .single()
        adminEmail = profile?.email || ''
      }

      // Procurar customer existente no Stripe por metadata
      const existingCustomers = await stripe.customers.search({
        query: `metadata["org_id"]:"${orgId}"`,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      } else {
        // Criar novo customer
        const customer = await stripe.customers.create({
          email: adminEmail || undefined,
          name: orgFull?.name || undefined,
          metadata: { org_id: orgId },
        })
        customerId = customer.id
      }

      // Salvar no banco para próximas vezes
      await supabase
        .from('orgs')
        .update({ billing_customer_id: customerId })
        .eq('id', orgId)
    }

    // Criar sessão do portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`
    })

    return NextResponse.json({ url: portalSession.url })

  } catch (error: any) {
    console.error('Stripe portal error:', error)

    // Erro específico do portal não configurado
    if (error.code === 'resource_missing' && error.message?.includes('portal')) {
      return NextResponse.json(
        { error: 'portal_not_configured', message: 'O Customer Portal do Stripe precisa ser configurado. Acesse: https://dashboard.stripe.com/settings/billing/portal' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}