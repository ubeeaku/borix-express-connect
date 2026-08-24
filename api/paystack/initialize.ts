import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  PAYSTACK_BASE,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  applyCors,
  generateReference,
  json,
  prepareDeparture,
  validateBookingInput,
} from '../_lib/supabase.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    return res.status(204).end();
  }

  // Only POST is allowed
  if (req.method !== 'POST') {
    return json(req, res, 405, {
      success: false,
      error: 'Method not allowed',
    });
  }

  // Check required environment variables
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

  if (
    !PAYSTACK_SECRET_KEY ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return json(req, res, 503, {
      success: false,
      error: 'Payment service unavailable',
    });
  }

  // Vercel Node functions provide the parsed request body
  const body = req.body;

  if (!body) {
    return json(req, res, 400, {
      success: false,
      error: 'Invalid JSON',
    });
  }

  // Validate booking input
  const input = validateBookingInput(body);

  if (!input) {
    return json(req, res, 400, {
      success: false,
      error: 'Invalid or missing fields',
    });
  }

  // Supabase admin client
  const supabase = adminClient();

  // Validate departure and calculate amount server-side
  const prep = await prepareDeparture(
    supabase,
    input.departureId,
    input.seats,
    input.passengers
  );

  if ('error' in prep && prep.error) {
    return json(req, res, prep.error.status, {
      success: false,
      error: prep.error.message,
    });
  }

  const {
    departure,
    passengersInt,
    amount,
    commission,
    driverAmount,
  } = prep as any;

  // Generate booking reference
  const reference = generateReference();

  // Create booking
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
    console.error(
      '[paystack/initialize] booking error:',
      bookingError
    );

    return json(req, res, 500, {
      success: false,
      error: 'Unable to process booking',
    });
  }

  // Reserve selected seats
  const seatRecords = input.seats.map((seatNumber) => ({
    booking_id: bookingData.id,
    seat_number: seatNumber,
    route_id: departure.route_id,
    departure_id: departure.id,
    travel_date: departure.travel_date,
    departure_time: departure.departure_time,
  }));

  const { error: seatErr } = await supabase
    .from('booked_seats')
    .insert(seatRecords);

  if (seatErr) {
    console.error(
      '[paystack/initialize] seat error:',
      seatErr
    );

    await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingData.id);

    return json(req, res, 409, {
      success: false,
      error: 'Selected seats are no longer available',
    });
  }

  // Roll back booking and seats if Paystack initialization fails
  const rollback = async () => {
    await supabase
      .from('booked_seats')
      .delete()
      .eq('booking_id', bookingData.id);

    await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingData.id);
  };

  // Determine callback origin
  const siteDomain = (
    process.env.SITE_DOMAIN || 'borixexpress.com'
  ).replace(/^https?:\/\//, '');

  const requestOrigin =
    typeof req.headers.origin === 'string'
      ? req.headers.origin
      : '';

  const allowedOrigins = [
    `https://${siteDomain}`,
    'http://localhost:8080',
    'http://localhost:5173',
  ];

  const origin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : `https://${siteDomain}`;

  // Initialize Paystack transaction
  let psData: any;

  try {
    const psRes = await fetch(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
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
              {
                display_name: 'Passenger Name',
                variable_name: 'passenger_name',
                value: input.name,
              },
              {
                display_name: 'Phone Number',
                variable_name: 'phone',
                value: input.phone,
              },
              {
                display_name: 'Seats',
                variable_name: 'seats',
                value: input.seats.join(', '),
              },
            ],
          },
        }),
      }
    );

    psData = await psRes.json();

    console.log(
      '[paystack/initialize] Paystack status:',
      psRes.status
    );
  } catch (error) {
    console.error(
      '[paystack/initialize] Paystack request failed:',
      error
    );

    await rollback();

    return json(req, res, 502, {
      success: false,
      error: 'Unable to reach payment provider',
    });
  }

  // Paystack rejected initialization
  if (
    !psData?.status ||
    !psData?.data?.authorization_url
  ) {
    console.error(
      '[paystack/initialize] Paystack response:',
      psData
    );

    await rollback();

    return json(req, res, 502, {
      success: false,
      error:
        psData?.message ||
        'Unable to initialize payment',
    });
  }

  // Mark booking as pending
  await supabase
    .from('bookings')
    .update({
      payment_status: 'pending',
    })
    .eq('id', bookingData.id);

  // Return payment URL to frontend
  return json(req, res, 200, {
    success: true,
    authorization_url:
      psData.data.authorization_url,
    reference,
    access_code: psData.data.access_code,
  });
}