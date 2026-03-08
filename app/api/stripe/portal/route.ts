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

    if (!org?.billing_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found for this organization' },
        { status: 404 }
      )
    }

    // Criar sessão do portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.billing_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`
    })

    return NextResponse.json({ url: portalSession.url })

  } catch (error: any) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}