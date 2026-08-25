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

export const config = { runtime: 'nodejs' };

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    return res.status(204).end();
  }

  // POST only
  if (req.method !== 'POST') {
    return json(req, res, 405, {
      success: false,
      error: 'Method not allowed',
    });
  }

  const PAYSTACK_SECRET_KEY =
    process.env.PAYSTACK_SECRET_KEY;

  // Server configuration check
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

  // Validate reference
  const reference = String(
    req.body?.reference || ''
  ).trim();

  if (!/^BRX-[A-Z0-9]{12}$/.test(reference)) {
    return json(req, res, 400, {
      success: false,
      error: 'Invalid reference format',
    });
  }

  const supabase = adminClient();

  // Find the booking first
  const {
    data: booking,
    error: bookingError,
  } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_reference,
      passenger_name,
      travel_date,
      departure_time,
      number_of_seats,
      total_amount,
      payment_status,
      route_id
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
    return json(req, res, 404, {
      success: false,
      error: 'Booking not found',
    });
  }

  // Verify transaction with Paystack
  let psData: any;

  try {
    const psRes = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    psData = await psRes.json();

    console.log(
      '[paystack/verify] Paystack status:',
      psRes.status
    );
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

  if (!psData?.status || !psData?.data) {
    console.error(
      '[paystack/verify] Invalid Paystack response:',
      psData
    );

    return json(req, res, 502, {
      success: false,
      error: 'Unable to verify payment',
    });
  }

  const transaction = psData.data;

  // Verify reference returned by Paystack
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

  // Paystack amounts are in kobo.
  // Borix stores amounts in naira.
  const expectedAmountKobo =
    Math.round(Number(booking.total_amount) * 100);

  const paidAmountKobo =
    Number(transaction.amount);

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
      error: 'Payment amount does not match booking amount',
    });
  }

  // We expect Nigerian Naira payments.
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

  // Determine final payment status.
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
      return json(req, res, 400, {
        success: false,
        error: 'Unable to verify payment status',
      });
  }

  // Update booking only after all verification checks pass.
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

  // Load route information
  const { data: routeData } =
    await supabase
      .from('routes')
      .select('origin, destination')
      .eq('id', updatedBooking.route_id)
      .maybeSingle();

  return json(req, res, 200, {
    success: true,
    status: paymentStatus,

    booking: {
      booking_reference:
        updatedBooking.booking_reference,

      passenger_name:
        updatedBooking.passenger_name,

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

      routes: {
        origin: routeData?.origin ?? null,
        destination:
          routeData?.destination ?? null,
      },
    },

    transaction: {
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      paid_at: transaction.paid_at ?? null,
    },
  });
}