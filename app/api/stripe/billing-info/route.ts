// app/api/stripe/billing-info/route.ts
// GET: retorna invoices, método de pagamento e próxima cobrança do Stripe

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveOrgId, supabaseAdmin as supabase } from '@/lib/api-auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const orgId = resolveOrgId(auth, request.nextUrl.searchParams.get('org_id'))

    // Buscar customer_id da org
    const { data: org } = await supabase
      .from('orgs')
      .select('billing_customer_id')
      .eq('id', orgId)
      .single()

    if (!org?.billing_customer_id) {
      return NextResponse.json({
        invoices: [],
        paymentMethod: null,
        upcomingInvoice: null,
      })
    }

    const customerId = org.billing_customer_id

    // Buscar tudo em paralelo
    // Nota: `retrieveUpcoming` foi removido do SDK Stripe v20 — substituído por `createPreview`.
    const [invoicesResult, customerResult, upcomingResult] = await Promise.allSettled([
      stripe.invoices.list({
        customer: customerId,
        limit: 12,
      }),
      stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      }),
      stripe.invoices.createPreview({ customer: customerId }),
    ])

    // --- Invoices ---
    const invoices = invoicesResult.status === 'fulfilled'
      ? invoicesResult.value.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          date: inv.created,
          amount: inv.amount_paid,
          currency: inv.currency,
          status: inv.status,
          pdfUrl: inv.invoice_pdf,
          hostedUrl: inv.hosted_invoice_url,
        }))
      : []

    // --- Payment Method ---
    let paymentMethod = null
    if (customerResult.status === 'fulfilled') {
      const customer = customerResult.value as Stripe.Customer
      const pm = customer.invoice_settings?.default_payment_method as Stripe.PaymentMethod | null
      if (pm && pm.card) {
        paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        }
      }
    }

    // --- Upcoming Invoice ---
    let upcomingInvoice = null
    if (upcomingResult.status === 'fulfilled') {
      const upcoming = upcomingResult.value
      upcomingInvoice = {
        date: upcoming.next_payment_attempt || upcoming.period_end,
        amount: upcoming.amount_due,
        currency: upcoming.currency,
      }
    }

    return NextResponse.json({
      invoices,
      paymentMethod,
      upcomingInvoice,
    })
  } catch (error: any) {
    console.error('[billing-info] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
