// app/api/addons/route.ts
// GET: listar add-ons ativos da org
// POST: comprar add-on (cria checkout session no Stripe)
// DELETE: cancelar add-on

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { ADDON_CONFIGS, type AddonType, ALL_ADDON_TYPES } from '@/lib/addons'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


/**
 * GET /api/addons?org_id=X
 * Lista add-ons ativos da org com configs
 */
export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id')
    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    const { data: addons, error } = await supabase
      .from('org_addons')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error) throw error

    // Enriquecer com configs
    const enriched = (addons || []).map(addon => ({
      ...addon,
      config: ADDON_CONFIGS[addon.addon_type as AddonType] || null,
    }))

    // Retornar também as opções disponíveis para compra
    const available = ALL_ADDON_TYPES.map(type => ({
      ...ADDON_CONFIGS[type],
      hasPriceId: !!ADDON_CONFIGS[type].stripePriceId,
    }))

    return NextResponse.json({ addons: enriched, available })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/addons
 * Body: { orgId, addonType, quantity, userId, userEmail }
 * Cria sessão de checkout no Stripe para add-on
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, addonType, quantity = 1, userId, userEmail } = body

    if (!orgId || !addonType || !userId) {
      return NextResponse.json({ error: 'orgId, addonType, userId required' }, { status: 400 })
    }

    const config = ADDON_CONFIGS[addonType as AddonType]
    if (!config) {
      return NextResponse.json({ error: `Unknown addon: ${addonType}` }, { status: 400 })
    }

    const priceId = config.stripePriceId
    if (!priceId) {
      return NextResponse.json({ error: `Addon ${addonType} not configured in Stripe yet` }, { status: 400 })
    }

    // Buscar customer_id da org
    const { data: org } = await supabase
      .from('orgs')
      .select('billing_customer_id, name')
      .eq('id', orgId)
      .single()

    let customerId = org?.billing_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { org_id: orgId, user_id: userId, org_name: org?.name || '' },
      })
      customerId = customer.id
      await supabase.from('orgs').update({ billing_customer_id: customerId }).eq('id', orgId)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity }],
      success_url: `${baseUrl}/dashboard/settings/billing?addon_success=true`,
      cancel_url: `${baseUrl}/dashboard/settings/billing?addon_canceled=true`,
      subscription_data: {
        metadata: {
          org_id: orgId,
          addon_type: addonType,
          addon_quantity: String(quantity),
        },
      },
      metadata: {
        org_id: orgId,
        addon_type: addonType,
        addon_quantity: String(quantity),
        user_id: userId,
        is_addon: 'true',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Addon checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/addons
 * Body: { addonId }
 * Cancela add-on (no Stripe e no banco)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { addonId } = await request.json()
    if (!addonId) {
      return NextResponse.json({ error: 'addonId required' }, { status: 400 })
    }

    const { data: addon } = await supabase
      .from('org_addons')
      .select('stripe_subscription_id')
      .eq('id', addonId)
      .single()

    if (!addon) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 })
    }

    // Cancelar no Stripe
    if (addon.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(addon.stripe_subscription_id)
      } catch (err: any) {
        console.warn('Stripe addon cancel error (non-fatal):', err.message)
      }
    }

    // Marcar como canceled no banco
    await supabase
      .from('org_addons')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', addonId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
