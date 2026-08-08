import {
  PAYSTACK_BASE,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  corsHeaders,
  generateReference,
  json,
  prepareDeparture,
  validateBookingInput,
} from '../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', corsHeaders(req)['Access-Control-Allow-Origin']);
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: 'Method not allowed',
    }));
    return;
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, 503, { success: false, error: 'Payment service unavailable' });
  }

  let body: any;
  try {
    body = await new Promise((resolve, reject) => {
  let data = '';

  req.on('data', (chunk: Buffer) => {
    data += chunk.toString();
  });

  req.on('end', () => {
    try {
      resolve(JSON.parse(data || '{}'));
    } catch (error) {
      reject(error);
    }
  });

  req.on('error', reject);
});
  } catch {
    return json(req, 400, { success: false, error: 'Invalid JSON' });
  }

  const input = validateBookingInput(body);
  if (!input) return json(req, 400, { success: false, error: 'Invalid or missing fields' });

  const supabase = adminClient();
  const prep = await prepareDeparture(supabase, input.departureId, input.seats, input.passengers);
  if ('error' in prep && prep.error) {
    return json(req, prep.error.status, { success: false, error: prep.error.message });
  }
  const { departure, passengersInt, amount, commission, driverAmount } = prep as any;

  const reference = generateReference();

  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_reference: reference,
      route_id: departure.route_id,
      departure_id: departure.id,
      passenger_name: input.name,
      passenger_email: input.email,
      passenger_phone: input.phone,
      travel_date: departure.travel_date,
      departure_time: departure.departure_time,
      number_of_seats: passengersInt,
      total_amount: amount,
      driver_amount: driverAmount,
      platform_commission: commission,
      payment_status: 'reserved',
      next_of_kin_name: input.nextOfKinName,
      next_of_kin_phone: input.nextOfKinPhone,
    })
    .select('id')
    .single();

  if (bookingError || !bookingData) {
    return json(req, 500, { success: false, error: 'Unable to process booking' });
  }

  const seatRecords = input.seats.map((seatNumber) => ({
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
    return json(req, 409, { success: false, error: 'Selected seats are no longer available' });
  }

  const rollback = async () => {
    await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
    await supabase.from('bookings').delete().eq('id', bookingData.id);
  };

  const siteDomain = (process.env.SITE_DOMAIN || 'borixexpress.com').replace(/^https?:\/\//, '');
  const origin = req.headers.get('origin') || `https://${siteDomain}`;

  let psData: any;
  try {
    const psRes = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: amount * 100,
        reference,
        callback_url: `${origin}/confirmation`,
        metadata: {
          name: input.name,
          phone: input.phone,
          departure_id: departure.id,
          seats: input.seats,
          custom_fields: [
            { display_name: 'Passenger Name', variable_name: 'passenger_name', value: input.name },
            { display_name: 'Phone Number', variable_name: 'phone', value: input.phone },
            { display_name: 'Seats', variable_name: 'seats', value: input.seats.join(', ') },
          ],
        },
      }),
    });
    psData = await psRes.json();
  } catch {
    await rollback();
    return json(req, 502, { success: false, error: 'Unable to reach payment provider' });
  }

  if (!psData?.status || !psData?.data?.authorization_url) {
    await rollback();
    return json(req, 502, { success: false, error: 'Unable to initialize payment' });
  }

  await supabase.from('bookings').update({ payment_status: 'pending' }).eq('id', bookingData.id);

  return json(req, 200, {
    success: true,
    authorization_url: psData.data.authorization_url,
    reference,
    access_code: psData.data.access_code,
  });
}
