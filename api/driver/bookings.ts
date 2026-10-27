import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  applyCors,
  getUserFromRequest,
  json,
} from '../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return json(req, res, 405, {
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, res, 503, {
      success: false,
      error: 'Driver bookings are temporarily unavailable',
    });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return json(req, res, 401, {
      success: false,
      error: 'Authentication required',
    });
  }

  const supabase = adminClient();
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (driverError) {
    console.error('[driver/bookings] Driver lookup failed:', driverError);
    return json(req, res, 500, {
      success: false,
      error: 'Unable to load driver bookings',
    });
  }

  if (!driver || driver.status !== 'active') {
    return json(req, res, 403, {
      success: false,
      error: 'Active driver access required',
    });
  }

  const { data: departures, error: departuresError } = await supabase
    .from('departures')
    .select('id, route_id, travel_date, departure_time, status')
    .eq('driver_id', driver.id)
    .order('travel_date', { ascending: false })
    .limit(200);

  if (departuresError) {
    console.error('[driver/bookings] Departure lookup failed:', departuresError);
    return json(req, res, 500, {
      success: false,
      error: 'Unable to load driver departures',
    });
  }

  const departureIds = (departures ?? []).map((departure) => departure.id);
  if (!departureIds.length) {
    return json(req, res, 200, { success: true, bookings: [] });
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(
      'id, booking_reference, passenger_name, passenger_phone, travel_date, departure_time, number_of_seats, total_amount, departure_id'
    )
    .eq('payment_status', 'completed')
    .in('departure_id', departureIds)
    .order('travel_date', { ascending: false })
    .limit(500);

  if (bookingsError) {
    console.error('[driver/bookings] Booking lookup failed:', bookingsError);
    return json(req, res, 500, {
      success: false,
      error: 'Unable to load passenger bookings',
    });
  }

  const bookingIds = (bookings ?? []).map((booking) => booking.id);
  const routeIds = [...new Set((departures ?? []).map((departure) => departure.route_id))];

  const [seatResult, routeResult] = await Promise.all([
    bookingIds.length
      ? supabase
          .from('booked_seats')
          .select('booking_id, seat_number')
          .in('booking_id', bookingIds)
      : Promise.resolve({ data: [], error: null }),
    routeIds.length
      ? supabase
          .from('routes')
          .select('id, origin, destination')
          .in('id', routeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (seatResult.error || routeResult.error) {
    console.error(
      '[driver/bookings] Booking details lookup failed:',
      seatResult.error ?? routeResult.error
    );
    return json(req, res, 500, {
      success: false,
      error: 'Unable to load passenger booking details',
    });
  }

  const departureById = new Map(
    (departures ?? []).map((departure) => [departure.id, departure])
  );
  const routeById = new Map(
    (routeResult.data ?? []).map((route) => [route.id, route])
  );
  const seatsByBooking = new Map<string, number[]>();

  for (const seat of seatResult.data ?? []) {
    const seats = seatsByBooking.get(seat.booking_id) ?? [];
    seats.push(seat.seat_number);
    seatsByBooking.set(seat.booking_id, seats);
  }

  return json(req, res, 200, {
    success: true,
    bookings: (bookings ?? []).map((booking) => {
      const departure = departureById.get(booking.departure_id);
      return {
        ...booking,
        seats: (seatsByBooking.get(booking.id) ?? []).sort((a, b) => a - b),
        route: departure ? routeById.get(departure.route_id) ?? null : null,
        departure_status: departure?.status ?? null,
      };
    }),
  });
}
