import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapeamento de price_id para nome do plano
// Planos v2 (Abril 2026)
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TLluY3PghkCuiR4OcBt2z9E': 'starter',
  'price_1TLlwh3PghkCuiR4cxbEyOT3': 'pro',
  'price_1TLlxl3PghkCuiR4bhofUcOC': 'business',
  'price_1TLlzY3PghkCuiR4nwvO8uy6': 'enterprise',
  // Legado (para subscription.updated de clientes antigos)
  'price_1T8oZU3PghkCuiR4VQeMLnCJ': 'basic',
  'price_1T8odD3PghkCuiR4GEP8EgHp': 'gold',
  'price_1T8oex3PghkCuiR4nAtWe7qo': 'diamond',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      // ═══════════════════════════════════════════════════════════════════
      // CHECKOUT COMPLETADO - Usuário finalizou o pagamento
      // ═══════════════════════════════════════════════════════════════════
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        const orgId = session.metadata?.org_id
        const planName = session.metadata?.plan_name
        const subscriptionId = session.subscription as string

        if (orgId && planName) {
          await supabase
            .from('orgs')
            .update({
              plan: planName,
              plan_status: 'active',
              plan_started_at: new Date().toISOString(),
              billing_customer_id: session.customer as string,
              billing_subscription_id: subscriptionId
            })
            .eq('id', orgId)

          console.log(`✅ Checkout completed: org ${orgId} upgraded to ${planName}`)
        }
        break
      }

      // ═══════════════════════════════════════════════════════════════════
      // ASSINATURA ATUALIZADA - Mudança de plano, renovação, etc
      // ═══════════════════════════════════════════════════════════════════
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        const orgId = subscription.metadata?.org_id
        const priceId = subscription.items.data[0]?.price.id
        const planName = priceId ? PRICE_TO_PLAN[priceId] : null
        
        // Mapear status do Stripe para nosso status
        let planStatus = 'active'
        if (subscription.status === 'past_due') planStatus = 'past_due'
        if (subscription.status === 'canceled') planStatus = 'canceled'
        if (subscription.status === 'trialing') planStatus = 'trial'

        if (orgId) {
          const updateData: any = {
            plan_status: planStatus
          }
          
          if (planName) {
            updateData.plan = planName
          }

          await supabase
            .from('orgs')
            .update(updateData)
            .eq('id', orgId)

          console.log(`✅ Subscription updated: org ${orgId} -> ${planName || 'same plan'}, status: ${planStatus}`)
        }
        break
      }

      // ═══════════════════════════════════════════════════════════════════
      // ASSINATURA CANCELADA
      // ═══════════════════════════════════════════════════════════════════
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        const orgId = subscription.metadata?.org_id

        if (orgId) {
          // Volta para plano starter quando cancela
          await supabase
            .from('orgs')
            .update({
              plan: 'starter',
              plan_status: 'canceled',
              billing_subscription_id: null
            })
            .eq('id', orgId)

          console.log(`✅ Subscription canceled: org ${orgId} downgraded to starter`)
        }
        break
      }

      // ═══════════════════════════════════════════════════════════════════
      // PAGAMENTO REALIZADO COM SUCESSO
      // ═══════════════════════════════════════════════════════════════════
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Buscar org pelo customer_id
        const { data: org } = await supabase
          .from('orgs')
          .select('id')
          .eq('billing_customer_id', invoice.customer as string)
          .single()

        if (org) {
          await supabase
            .from('orgs')
            .update({ plan_status: 'active' })
            .eq('id', org.id)

          console.log(`✅ Invoice paid: org ${org.id}`)
        }
        break
      }

      // ═══════════════════════════════════════════════════════════════════
      // FALHA NO PAGAMENTO
      // ═══════════════════════════════════════════════════════════════════
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Buscar org pelo customer_id
        const { data: org } = await supabase
          .from('orgs')
          .select('id')
          .eq('billing_customer_id', invoice.customer as string)
          .single()

        if (org) {
          await supabase
            .from('orgs')
            .update({ plan_status: 'past_due' })
            .eq('id', org.id)

          console.log(`⚠️ Payment failed: org ${org.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}