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
  json,
} from '../_lib/supabase.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    return res.status(204).end();
  }

  // --------------------------------------------------
  // POST only
  // --------------------------------------------------

  if (req.method !== 'POST') {
    return json(req, res, 405, {
      success: false,
      error: 'Method not allowed',
    });
  }

  // --------------------------------------------------
  // Environment variables
  // --------------------------------------------------

  const PAYSTACK_SECRET_KEY =
    process.env.PAYSTACK_SECRET_KEY;

  if (
    !PAYSTACK_SECRET_KEY ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(
      '[paystack/verify] Missing environment configuration:',
      {
        hasPaystackSecret: Boolean(PAYSTACK_SECRET_KEY),
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      }
    );

    return json(req, res, 503, {
      success: false,
      error: 'Payment service unavailable',
    });
  }

  // --------------------------------------------------
  // Read request body safely
  // --------------------------------------------------

  let body: any = req.body;

  console.log('[paystack/verify] Request received:', {
    method: req.method,
    contentType: req.headers['content-type'],
    bodyType: typeof body,
    body: body,
  });

  // Vercel normally parses JSON automatically.
  // This fallback also handles cases where body arrives
  // as a JSON string.
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      console.error(
        '[paystack/verify] Failed to parse body string:',
        error
      );

      return json(req, res, 400, {
        success: false,
        error: 'Invalid JSON body',
      });
    }
  }

  // --------------------------------------------------
  // Reference
  // --------------------------------------------------

  const reference = String(
    body?.reference || ''
  ).trim();

  console.log('[paystack/verify] Reference received:', {
    reference,
    length: reference.length,
  });

  if (!reference) {
    return json(req, res, 400, {
      success: false,
      error: 'Payment reference is required',
    });
  }

  if (!/^BRX-[A-Z0-9]{12}$/.test(reference)) {
    console.error(
      '[paystack/verify] Invalid reference format:',
      reference
    );

    return json(req, res, 400, {
      success: false,
      error: 'Invalid reference format',
    });
  }

  const supabase = adminClient();

  // --------------------------------------------------
  // Find booking
  // --------------------------------------------------

  const {
    data: booking,
    error: bookingError,
  } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_reference,
      passenger_name,
      passenger_email,
      passenger_phone,
      travel_date,
      departure_time,
      number_of_seats,
      total_amount,
      payment_status,
      route_id,
      departure_id,
      next_of_kin_name,
      next_of_kin_phone
    `)
    .eq('booking_reference', reference)
    .maybeSingle();

  if (bookingError) {
    console.error(
      '[paystack/verify] Booking lookup error:',
      bookingError
    );

    return json(req, res, 500, {
      success: false,
      error: 'Unable to load booking',
    });
  }

  if (!booking) {
    console.error(
      '[paystack/verify] Booking not found:',
      reference
    );

    return json(req, res, 404, {
      success: false,
      error: 'Booking not found',
    });
  }

  console.log('[paystack/verify] Booking found:', {
    bookingId: booking.id,
    reference: booking.booking_reference,
    amount: booking.total_amount,
    paymentStatus: booking.payment_status,
  });

  // --------------------------------------------------
  // Load actual booked seats
  // --------------------------------------------------

  const {
    data: seatData,
    error: seatError,
  } = await supabase
    .from('booked_seats')
    .select('seat_number')
    .eq('booking_id', booking.id)
    .order('seat_number');

  if (seatError) {
    console.error(
      '[paystack/verify] Seat lookup error:',
      seatError
    );

    return json(req, res, 500, {
      success: false,
      error: 'Unable to load booked seats',
    });
  }

  const seatNumbers = (seatData ?? []).map(
    (seat) => seat.seat_number
  );

  // --------------------------------------------------
  // Load departure information
  // --------------------------------------------------

  let departureData: any = null;

  if (booking.departure_id) {
    const {
      data,
      error: departureError,
    } = await supabase
      .from('departures')
      .select(`
        id,
        route_id,
        park_id,
        driver_id,
        vehicle_id,
        travel_date,
        departure_time,
        price
      `)
      .eq('id', booking.departure_id)
      .maybeSingle();

    if (departureError) {
      console.error(
        '[paystack/verify] Departure lookup error:',
        departureError
      );
    } else {
      departureData = data;
    }
  }

  // --------------------------------------------------
  // Load park information
  // --------------------------------------------------

  let parkData: any = null;

  if (departureData?.park_id) {
    const {
      data,
      error: parkError,
    } = await supabase
      .from('parks')
      .select(`
        id,
        name,
        city,
        address
      `)
      .eq('id', departureData.park_id)
      .maybeSingle();

    if (parkError) {
      console.error(
        '[paystack/verify] Park lookup error:',
        parkError
      );
    } else {
      parkData = data;
    }
  }

  // --------------------------------------------------
  // Load driver information
  // --------------------------------------------------

  let driverData: any = null;

  if (departureData?.driver_id) {
    const {
      data,
      error: driverError,
    } = await supabase
      .from('drivers')
      .select(`
        id,
        full_name,
        phone
      `)
      .eq('id', departureData.driver_id)
      .maybeSingle();

    if (driverError) {
      console.error(
        '[paystack/verify] Driver lookup error:',
        driverError
      );
    } else {
      driverData = data;
    }
  }

  // --------------------------------------------------
  // Load vehicle information
  // --------------------------------------------------

  let vehicleData: any = null;

  if (departureData?.vehicle_id) {
    const {
      data,
      error: vehicleError,
    } = await supabase
      .from('vehicles')
      .select(`
        id,
        vehicle_type,
        plate_number,
        capacity
      `)
      .eq('id', departureData.vehicle_id)
      .maybeSingle();

    if (vehicleError) {
      console.error(
        '[paystack/verify] Vehicle lookup error:',
        vehicleError
      );
    } else {
      vehicleData = data;
    }
  }

  // --------------------------------------------------
  // Verify transaction with Paystack
  // --------------------------------------------------

  let psData: any;

  try {
    const paystackUrl =
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(
        reference
      )}`;

    console.log(
      '[paystack/verify] Calling Paystack:',
      paystackUrl
    );

    const psRes = await fetch(paystackUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await psRes.text();

    console.log(
      '[paystack/verify] Paystack HTTP status:',
      psRes.status
    );

    console.log(
      '[paystack/verify] Paystack response:',
      responseText
    );

    try {
      psData = JSON.parse(responseText);
    } catch {
      console.error(
        '[paystack/verify] Paystack returned non-JSON response'
      );

      return json(req, res, 502, {
        success: false,
        error: 'Invalid response from payment provider',
      });
    }
  } catch (error) {
    console.error(
      '[paystack/verify] Paystack request failed:',
      error
    );

    return json(req, res, 502, {
      success: false,
      error: 'Unable to reach payment provider',
    });
  }

  // --------------------------------------------------
  // Paystack response validation
  // --------------------------------------------------

  if (!psData?.status || !psData?.data) {
    console.error(
      '[paystack/verify] Invalid Paystack response:',
      psData
    );

    return json(req, res, 502, {
      success: false,
      error:
        psData?.message ||
        'Unable to verify payment',
    });
  }

  const transaction = psData.data;

  // --------------------------------------------------
  // Reference check
  // --------------------------------------------------

  if (transaction.reference !== reference) {
    console.error(
      '[paystack/verify] Reference mismatch:',
      {
        expected: reference,
        received: transaction.reference,
      }
    );

    return json(req, res, 400, {
      success: false,
      error: 'Payment reference mismatch',
    });
  }

  // --------------------------------------------------
  // Amount check
  // --------------------------------------------------

  const expectedAmountKobo =
    Math.round(Number(booking.total_amount) * 100);

  const paidAmountKobo =
    Number(transaction.amount);

  console.log(
    '[paystack/verify] Amount comparison:',
    {
      expectedAmountKobo,
      paidAmountKobo,
    }
  );

  if (
    !Number.isFinite(paidAmountKobo) ||
    paidAmountKobo !== expectedAmountKobo
  ) {
    console.error(
      '[paystack/verify] Amount mismatch:',
      {
        expectedAmountKobo,
        paidAmountKobo,
        reference,
      }
    );

    return json(req, res, 400, {
      success: false,
      error:
        'Payment amount does not match booking amount',
    });
  }

  // --------------------------------------------------
  // Currency check
  // --------------------------------------------------

  if (
    transaction.currency &&
    transaction.currency !== 'NGN'
  ) {
    console.error(
      '[paystack/verify] Currency mismatch:',
      transaction.currency
    );

    return json(req, res, 400, {
      success: false,
      error: 'Invalid payment currency',
    });
  }

  // --------------------------------------------------
  // Payment status
  // --------------------------------------------------

  let paymentStatus:
    | 'completed'
    | 'failed'
    | 'pending';

  switch (transaction.status) {
    case 'success':
      paymentStatus = 'completed';
      break;

    case 'pending':
      paymentStatus = 'pending';
      break;

    case 'failed':
    case 'abandoned':
      paymentStatus = 'failed';
      break;

    default:
      console.error(
        '[paystack/verify] Unknown Paystack transaction status:',
        transaction.status
      );

      return json(req, res, 400, {
        success: false,
        error:
          'Unable to verify payment status',
      });
  }

  // --------------------------------------------------
  // Update booking
  // --------------------------------------------------

  const {
    data: updatedBooking,
    error: updateError,
  } = await supabase
    .from('bookings')
    .update({
      payment_status: paymentStatus,
    })
    .eq('id', booking.id)
    .select(`
      booking_reference,
      passenger_name,
      travel_date,
      departure_time,
      number_of_seats,
      total_amount,
      payment_status,
      route_id
    `)
    .single();

  if (updateError || !updatedBooking) {
    console.error(
      '[paystack/verify] Booking update error:',
      updateError
    );

    return json(req, res, 500, {
      success: false,
      error: 'Unable to update booking',
    });
  }

  // --------------------------------------------------
  // Route
  // --------------------------------------------------

  const { data: routeData } =
    await supabase
      .from('routes')
      .select('origin, destination')
      .eq('id', updatedBooking.route_id)
      .maybeSingle();

  // --------------------------------------------------
  // Success
  // --------------------------------------------------

  console.log(
    '[paystack/verify] Payment verification complete:',
    {
      reference,
      paymentStatus,
      transactionStatus: transaction.status,
      seats: seatNumbers,
      park: parkData?.name ?? null,
      driver: driverData?.full_name ?? null,
      vehicle: vehicleData?.vehicle_type ?? null,
    }
  );

  return json(req, res, 200, {
    success: true,
    status: paymentStatus,

    booking: {
      booking_reference:
        updatedBooking.booking_reference,

      passenger_name:
        updatedBooking.passenger_name,

      passenger_email:
        booking.passenger_email,

      passenger_phone:
        booking.passenger_phone,

      travel_date:
        updatedBooking.travel_date,

      departure_time:
        updatedBooking.departure_time,

      number_of_seats:
        updatedBooking.number_of_seats,

      total_amount:
        updatedBooking.total_amount,

      payment_status:
        updatedBooking.payment_status,

      next_of_kin_name:
        booking.next_of_kin_name,

      next_of_kin_phone:
        booking.next_of_kin_phone,

      route: {
        origin:
          routeData?.origin ?? null,

        destination:
          routeData?.destination ?? null,
      },

      seats: seatNumbers,

      park: parkData
        ? {
            id: parkData.id,
            name: parkData.name,
            city: parkData.city,
            address: parkData.address,
          }
        : null,

      driver: driverData
        ? {
            id: driverData.id,
            full_name: driverData.full_name,
            phone: driverData.phone,
          }
        : null,

      vehicle: vehicleData
        ? {
            id: vehicleData.id,
            vehicle_type:
              vehicleData.vehicle_type,
            plate_number:
              vehicleData.plate_number,
            capacity:
              vehicleData.capacity,
          }
        : null,
    },

    transaction: {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      paid_at:
        transaction.paid_at ?? null,
    },
  });
}