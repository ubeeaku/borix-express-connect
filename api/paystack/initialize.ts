import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  applyCors,
  getServiceClient,
  jsonError,
  generateReference,
  safeCallbackOrigin,
  PAYSTACK_BASE,
} from '../_lib/paystack';

export const config = { runtime: 'nodejs' };

const InitSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  departureId: z.string().uuid(),
  passengers: z.string().regex(/^[1-9][0-9]?$/),
  seats: z.array(z.number().min(1).max(60)).min(1).max(30),
  nextOfKinName: z.string().min(2).max(100),
  nextOfKinPhone: z.string().regex(/^\+?[0-9]{10,15}$/),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY) {
    console.error('[paystack/initialize] PAYSTACK_SECRET_KEY missing');
    return jsonError(res, 503, 'Payment service unavailable');
  }

  let input: z.infer<typeof InitSchema>;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    input = InitSchema.parse(body);
  } catch (e) {
    console.error('[paystack/initialize] validation failed', e);
    return jsonError(res, 400, 'Invalid input data', e instanceof Error ? e.message : e);
  }

  const { email, name, phone, departureId, passengers, seats, nextOfKinName, nextOfKinPhone } = input;

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (e) {
    console.error('[paystack/initialize] server misconfigured', e);
    return jsonError(res, 500, 'Server misconfigured');
  }

  const { data: departure, error: depErr } = await supabase
    .from('departures')
    .select('id, route_id, travel_date, departure_time, price, commission_amount, total_seats, status, vehicle_id, vehicles(capacity)')
    .eq('id', departureId)
    .single();

  if (depErr || !departure) return jsonError(res, 400, 'Departure not found', depErr?.message);
  if (!['scheduled', 'boarding'].includes(departure.status)) {
    return jsonError(res, 400, 'Departure is no longer available');
  }
  const capacity = (departure as any).vehicles?.capacity ?? departure.total_seats;
  if (seats.some(s => s < 1 || s > capacity)) return jsonError(res, 400, 'Invalid seat selection');

  const { data: existing } = await supabase
    .from('booked_seats')
    .select('seat_number')
    .eq('departure_id', departureId)
    .in('seat_number', seats);
  if (existing && existing.length > 0) {
    return jsonError(res, 409, `Seat(s) ${existing.map(s => s.seat_number).join(', ')} are no longer available`);
  }

  if (!departure.price || Number(departure.price) <= 0) {
    return jsonError(res, 400, 'Departure price unavailable');
  }
  const passengersInt = parseInt(passengers, 10);
  const amount = Number(departure.price) * passengersInt;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return jsonError(res, 400, 'Invalid booking amount');
  }
  const commission = Number(departure.commission_amount ?? 0) * passengersInt;
  const driverAmount = amount - commission;
  const reference = generateReference();

  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_reference: reference,
      route_id: departure.route_id,
      departure_id: departure.id,
      passenger_name: name,
      passenger_email: email,
      passenger_phone: phone,
      travel_date: departure.travel_date,
      departure_time: departure.departure_time,
      number_of_seats: passengersInt,
      total_amount: amount,
      driver_amount: driverAmount,
      platform_commission: commission,
      payment_status: 'reserved',
      next_of_kin_name: nextOfKinName,
      next_of_kin_phone: nextOfKinPhone,
    })
    .select('id')
    .single();

  if (bookingError || !bookingData) {
    console.error('[paystack/initialize] booking insert failed', bookingError?.message);
    return jsonError(res, 500, 'Unable to process booking', bookingError?.message);
  }

  const seatRecords = seats.map(seatNumber => ({
    booking_id: bookingData.id,
    seat_number: seatNumber,
    route_id: departure.route_id,
    departure_id: departure.id,
    travel_date: departure.travel_date,
    departure_time: departure.departure_time,
  }));
  const { error: seatErr } = await supabase.from('booked_seats').insert(seatRecords);
  if (seatErr) {
    await supabase.from('bookings').delete().eq('id', bookingData.id);
    return jsonError(res, 409, 'Selected seats are no longer available', seatErr.message);
  }

  const callbackOrigin = safeCallbackOrigin(req);
  let psData: any;
  try {
    const psRes = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100,
        reference,
        callback_url: `${callbackOrigin}/confirmation`,
        metadata: {
          name,
          phone,
          departure_id: departure.id,
          seats,
          custom_fields: [
            { display_name: 'Passenger Name', variable_name: 'passenger_name', value: name },
            { display_name: 'Phone Number', variable_name: 'phone', value: phone },
            { display_name: 'Seats', variable_name: 'seats', value: seats.join(', ') },
          ],
        },
      }),
    });
    psData = await psRes.json();
  } catch (e) {
    console.error('[paystack/initialize] paystack fetch failed', e);
    await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
    await supabase.from('bookings').delete().eq('id', bookingData.id);
    return jsonError(res, 502, 'Unable to reach payment provider');
  }

  if (!psData?.status) {
    console.error('[paystack/initialize] paystack rejected', psData);
    await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
    await supabase.from('bookings').delete().eq('id', bookingData.id);
    return jsonError(res, 502, 'Unable to initialize payment', psData?.message);
  }

  await supabase.from('bookings').update({ payment_status: 'pending' }).eq('id', bookingData.id);

  return res.status(200).json({
    success: true,
    authorization_url: psData.data.authorization_url,
    reference,
    access_code: psData.data.access_code,
  });
}
