import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors, getServiceClient, jsonError, PAYSTACK_BASE } from '../_lib/paystack';

export const config = { runtime: 'nodejs' };

const VerifySchema = z.object({
  reference: z.string().regex(/^BRX-[A-Z0-9]{12}$/, 'Invalid reference format'),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY) return jsonError(res, 503, 'Payment service unavailable');

  let reference: string;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    ({ reference } = VerifySchema.parse(body));
  } catch (e) {
    return jsonError(res, 400, 'Invalid reference format', e instanceof Error ? e.message : e);
  }

  let psData: any;
  try {
    const psRes = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    psData = await psRes.json();
  } catch (e) {
    console.error('[paystack/verify] paystack fetch failed', e);
    return jsonError(res, 502, 'Unable to reach payment provider');
  }

  if (!psData?.status || !psData?.data) return jsonError(res, 400, 'Unable to verify payment');
  if (!['success', 'failed', 'pending'].includes(psData.data.status)) {
    return jsonError(res, 400, 'Unable to verify payment status');
  }

  const paymentStatus: 'completed' | 'failed' | 'pending' =
    psData.data.status === 'success' ? 'completed'
      : psData.data.status === 'failed' ? 'failed'
      : 'pending';

  let supabase;
  try { supabase = getServiceClient(); }
  catch { return jsonError(res, 500, 'Server misconfigured'); }

  const { data: booking, error: updateError } = await supabase
    .from('bookings')
    .update({ payment_status: paymentStatus })
    .eq('booking_reference', reference)
    .select('booking_reference, passenger_name, travel_date, departure_time, number_of_seats, total_amount, payment_status, route_id')
    .single();

  if (updateError || !booking) return jsonError(res, 404, 'Booking not found');

  const { data: routeData } = await supabase
    .from('routes')
    .select('origin, destination')
    .eq('id', booking.route_id)
    .single();

  return res.status(200).json({
    success: true,
    status: paymentStatus,
    booking: {
      booking_reference: booking.booking_reference,
      passenger_name: booking.passenger_name,
      travel_date: booking.travel_date,
      departure_time: booking.departure_time,
      number_of_seats: booking.number_of_seats,
      total_amount: booking.total_amount,
      routes: {
        origin: routeData?.origin,
        destination: routeData?.destination,
      },
    },
  });
}
