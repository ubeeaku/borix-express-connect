import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PAYSTACK_BASE = 'https://api.paystack.co';

function generateReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = 'BRX-';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { success: false, error: 'Method not allowed' });

  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!PAYSTACK_SECRET_KEY) return json(503, { success: false, error: 'Payment service unavailable' });

  let input: any;
  try { input = await req.json(); }
  catch { return json(400, { success: false, error: 'Invalid JSON' }); }

  const { email, name, phone, departureId, passengers, seats, nextOfKinName, nextOfKinPhone } = input || {};
  if (!email || !name || !phone || !departureId || !passengers || !Array.isArray(seats) || seats.length === 0
      || !nextOfKinName || !nextOfKinPhone) {
    return json(400, { success: false, error: 'Missing required fields' });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: departure, error: depErr } = await supabase
    .from('departures')
    .select('id, route_id, travel_date, departure_time, price, commission_amount, total_seats, status, vehicle_id, vehicles(capacity)')
    .eq('id', departureId)
    .single();

  if (depErr || !departure) return json(400, { success: false, error: 'Departure not found' });
  if (!['scheduled', 'boarding'].includes(departure.status)) {
    return json(400, { success: false, error: 'Departure is no longer available' });
  }
  const capacity = (departure as any).vehicles?.capacity ?? departure.total_seats;
  if (seats.some((s: number) => s < 1 || s > capacity)) {
    return json(400, { success: false, error: 'Invalid seat selection' });
  }

  const { data: existing } = await supabase
    .from('booked_seats')
    .select('seat_number')
    .eq('departure_id', departureId)
    .in('seat_number', seats);
  if (existing && existing.length > 0) {
    return json(409, { success: false, error: `Seat(s) ${existing.map((s: any) => s.seat_number).join(', ')} are no longer available` });
  }

  if (!departure.price || Number(departure.price) <= 0) {
    return json(400, { success: false, error: 'Departure price unavailable' });
  }
  const passengersInt = parseInt(String(passengers), 10);
  const amount = Number(departure.price) * passengersInt;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return json(400, { success: false, error: 'Invalid booking amount' });
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
    return json(500, { success: false, error: 'Unable to process booking', details: bookingError?.message });
  }

  const seatRecords = seats.map((seatNumber: number) => ({
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
    return json(409, { success: false, error: 'Selected seats are no longer available' });
  }

  const origin = req.headers.get('origin') || 'https://borixexpress.com';

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
        callback_url: `${origin}/confirmation`,
        metadata: {
          name, phone,
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
    await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
    await supabase.from('bookings').delete().eq('id', bookingData.id);
    return json(502, { success: false, error: 'Unable to reach payment provider' });
  }

  if (!psData?.status) {
    await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
    await supabase.from('bookings').delete().eq('id', bookingData.id);
    return json(502, { success: false, error: 'Unable to initialize payment', details: psData?.message });
  }

  await supabase.from('bookings').update({ payment_status: 'pending' }).eq('id', bookingData.id);

  return json(200, {
    success: true,
    authorization_url: psData.data.authorization_url,
    reference,
    access_code: psData.data.access_code,
  });
});
