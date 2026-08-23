import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import {
  PAYSTACK_BASE,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  applyCors,
  corsHeaders,
  json,
  
} from '../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS')  { applyCors(req, res); return res.status(204).end(); }
  if (req.method !== 'POST') return json(req, res, 405, { success: false, error: 'Method not allowed' });

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, res, 503, { success: false, error: 'Payment service unavailable' });
  }

  let reference = '';
  try {
    const body = req.body;
    reference = String(body?.reference || '');
    if (!/^BRX-[A-Z0-9]{12}$/.test(reference)) throw new Error('bad');
  } catch {
    return json(req, res, 400, { success: false, error: 'Invalid reference format' });
  }

  let psData: any;
  try {
    const psRes = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    psData = await psRes.json();
  } catch {
    return json(req, res, 502, { success: false, error: 'Unable to reach payment provider' });
  }

  if (!psData?.status || !psData?.data) {
    return json(req, res, 400, { success: false, error: 'Unable to verify payment' });
  }
  if (!['success', 'failed', 'pending', 'abandoned'].includes(psData.data.status)) {
    return json(req, res,400, { success: false, error: 'Unable to verify payment status' });
  }

  const paymentStatus =
    psData.data.status === 'success'
      ? 'completed'
      : psData.data.status === 'pending'
        ? 'pending'
        : 'failed';

  const supabase = adminClient();

  const { data: booking, error: updateError } = await supabase
    .from('bookings')
    .update({ payment_status: paymentStatus })
    .eq('booking_reference', reference)
    .select(
      'booking_reference, passenger_name, travel_date, departure_time, number_of_seats, total_amount, payment_status, route_id',
    )
    .single();

  if (updateError || !booking) {
    return json(req, res, 404, { success: false, error: 'Booking not found' });
  }

  const { data: routeData } = await supabase
    .from('routes')
    .select('origin, destination')
    .eq('id', booking.route_id)
    .single();

  return json(req, res,200, {
    success: true,
    status: paymentStatus,
    booking: {
      booking_reference: booking.booking_reference,
      passenger_name: booking.passenger_name,
      travel_date: booking.travel_date,
      departure_time: booking.departure_time,
      number_of_seats: booking.number_of_seats,
      total_amount: booking.total_amount,
      routes: { origin: routeData?.origin, destination: routeData?.destination },
    },
  });
}
