// app/booking/[slug]/page.tsx
// Página pública de agendamento (sem auth)

import { supabaseAdmin } from '@/lib/api-auth'
import { notFound } from 'next/navigation'
import BookingForm from '@/app/dashboard/calendar/components/BookingForm'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params

  const { data: booking } = await supabaseAdmin
    .from('public_booking_slots')
    .select('*, users(full_name)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!booking) return notFound()

  return <BookingForm booking={booking} />
}
