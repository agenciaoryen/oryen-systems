import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapeamento de planos para price_id do Stripe
// Planos v2 (Abril 2026)
const PRICE_IDS: Record<string, string> = {
  starter: 'price_1TLluY3PghkCuiR4OcBt2z9E',
  pro: 'price_1TLlwh3PghkCuiR4cxbEyOT3',
  business: 'price_1TLlxl3PghkCuiR4bhofUcOC',
  enterprise: 'price_1TLlzY3PghkCuiR4nwvO8uy6',
  // Legado (mantido para compatibilidade caso alguém tente reativar)
  basic: 'price_1T8oZU3PghkCuiR4VQeMLnCJ',
  gold: 'price_1T8odD3PghkCuiR4GEP8EgHp',
  diamond: 'price_1T8oex3PghkCuiR4nAtWe7qo',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, planName, userId, userEmail } = body

    if (!orgId || !planName || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, planName, userId' },
        { status: 400 }
      )
    }

    const priceId = PRICE_IDS[planName]
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid plan: ${planName}` },
        { status: 400 }
      )
    }

    // Buscar org para ver se já tem customer_id
    const { data: org } = await supabase
      .from('orgs')
      .select('billing_customer_id, name')
      .eq('id', orgId)
      .single()

    let customerId = org?.billing_customer_id

    // Se não tem customer, cria um novo
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          org_id: orgId,
          user_id: userId,
          org_name: org?.name || ''
        }
      })
      customerId = customer.id

      // Salva o customer_id na org
      await supabase
        .from('orgs')
        .update({ billing_customer_id: customerId })
        .eq('id', orgId)
    }

    // URLs de retorno (custom ou padrão billing)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    const successUrl = body.successUrl
      ? `${baseUrl}${body.successUrl}`
      : `${baseUrl}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = body.cancelUrl
      ? `${baseUrl}${body.cancelUrl}`
      : `${baseUrl}/dashboard/settings/billing?canceled=true`

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          org_id: orgId,
          plan_name: planName
        }
      },
      metadata: {
        org_id: orgId,
        plan_name: planName,
        user_id: userId
      }
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}