import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  applyCors,
  json,
} from '../_lib/supabase.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return json(req, res, 405, {
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, res, 503, {
      success: false,
      error: 'Supabase service unavailable',
    });
  }

  try {
    const supabase = adminClient();

    const { data: expiredBookings, error: findError } =
      await supabase
        .from('bookings')
        .select('id, booking_reference')
        .eq('payment_status', 'pending')
        .not('expires_at', 'is', null)
        .lte('expires_at', new Date().toISOString());

    if (findError) {
      console.error('[bookings/expire] Find error:', findError);

      return json(req, res, 500, {
        success: false,
        error: 'Unable to find expired bookings',
      });
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      return json(req, res, 200, {
        success: true,
        expired: 0,
      });
    }

    let expiredCount = 0;

    for (const booking of expiredBookings) {
      const { error: seatError } = await supabase
        .from('booked_seats')
        .delete()
        .eq('booking_id', booking.id);

      if (seatError) {
        console.error(
          '[bookings/expire] Seat cleanup error:',
          booking.booking_reference,
          seatError
        );
        continue;
      }

      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'expired',
        })
        .eq('id', booking.id)
        .eq('payment_status', 'pending');

      if (bookingError) {
        console.error(
          '[bookings/expire] Booking update error:',
          booking.booking_reference,
          bookingError
        );
        continue;
      }

      expiredCount++;

      console.log(
        '[bookings/expire] Expired:',
        booking.booking_reference
      );
    }

    return json(req, res, 200, {
      success: true,
      expired: expiredCount,
    });
  } catch (error) {
    console.error('[bookings/expire] Unexpected error:', error);

    return json(req, res, 500, {
      success: false,
      error: 'Unexpected server error',
    });
  }
}
