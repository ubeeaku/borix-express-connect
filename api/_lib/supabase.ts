import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const PAYSTACK_BASE = 'https://api.paystack.co';

const SITE_DOMAIN = (
  process.env.SITE_DOMAIN || 'borixexpress.com'
).replace(/^https?:\/\//, '');

const ALLOWED_ORIGIN_DOMAINS = [
  SITE_DOMAIN,
  'localhost',
  '127.0.0.1',
  'lovable.app',
  'lovable.dev',
  'lovableproject.com',
  'vercel.app',
];

export function corsHeaders(
  req: VercelRequest
): Record<string, string> {
  const origin =
    typeof req.headers.origin === 'string'
      ? req.headers.origin
      : '';

  let allowedOrigin = `https://${SITE_DOMAIN}`;

  if (origin) {
    try {
      const url = new URL(origin);

      const ok = ALLOWED_ORIGIN_DOMAINS.some(
        (domain) =>
          url.hostname === domain ||
          url.hostname.endsWith(`.${domain}`)
      );

      if (ok) {
        allowedOrigin = origin;
      }
    } catch {
      // Keep default origin.
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, content-type',
    'Access-Control-Allow-Methods':
      'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials':
      'true',
    'Content-Type': 'application/json',
  };
}

export function applyCors(
  req: VercelRequest,
  res: VercelResponse
) {
  const headers = corsHeaders(req);

  Object.entries(headers).forEach(
    ([key, value]) => {
      res.setHeader(key, value);
    }
  );
}

export function json(
  req: VercelRequest,
  res: VercelResponse,
  status: number,
  body: unknown
) {
  applyCors(req, res);

  return res.status(status).json(body);
}

/** Names of env vars required by server API routes. */
export function missingEnv(): string[] {
  const missing: string[] = [];

  if (!SUPABASE_URL) {
    missing.push('SUPABASE_URL');
  }

  if (!SUPABASE_ANON_KEY) {
    missing.push('SUPABASE_ANON_KEY');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  return missing;
}

export function adminClient(): SupabaseClient {
  const missing = missingEnv();

  if (missing.length) {
    throw new Error(
      `Server misconfigured: missing env var(s) ${missing.join(', ')}`
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function getUserFromRequest(
  req: VercelRequest
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const client = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );

  const { data, error } =
    await client.auth.getUser();

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export function generateReference(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  let out = 'BRX-';

  for (let i = 0; i < 12; i++) {
    out +=
      chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

export interface BookingInput {
  email: string;
  name: string;
  phone: string;
  departureId: string;
  passengers: string;
  seats: number[];
  nextOfKinName: string;
  nextOfKinPhone: string;
}

export function validateBookingInput(
  input: any
): BookingInput | null {
  if (!input) return null;

  const {
    email,
    name,
    phone,
    departureId,
    passengers,
    seats,
    nextOfKinName,
    nextOfKinPhone,
  } = input;

  if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  if (
    typeof name !== 'string' ||
    name.trim().length < 2
  ) {
    return null;
  }

  if (
    typeof phone !== 'string' ||
    !/^\+?[0-9]{10,15}$/.test(phone)
  ) {
    return null;
  }

  if (
    typeof departureId !== 'string' ||
    departureId.length < 10
  ) {
    return null;
  }

  if (
    !/^[1-9][0-9]?$/.test(String(passengers))
  ) {
    return null;
  }

  if (
    !Array.isArray(seats) ||
    seats.length === 0 ||
    seats.length > 30
  ) {
    return null;
  }

  if (
    seats.some(
      (s) =>
        typeof s !== 'number' ||
        !Number.isInteger(s) ||
        s < 1 ||
      s > 60
    )
  ) {
    return null;
  }

  // Prevent duplicate seat numbers in one booking.
  if (new Set(seats).size !== seats.length) {
    return null;
  }

  // The number of selected seats must match the
  // number of passengers.
  if (seats.length !== Number(passengers)) {
    return null;
  }

  if (
    typeof nextOfKinName !== 'string' ||
    nextOfKinName.trim().length < 2
  ) {
    return null;
  }

  if (
    typeof nextOfKinPhone !== 'string' ||
    !/^\+?[0-9]{10,15}$/.test(nextOfKinPhone)
  ) {
    return null;
  }

  return {
    email,
    name,
    phone,
    departureId,
    passengers: String(passengers),
    seats,
    nextOfKinName,
    nextOfKinPhone,
  };
}

/**
 * Loads the departure, validates availability,
 * validates the vehicle capacity/occupied seats,
 * and computes server-side amounts.
 *
 * Vehicle information now comes directly from the
 * departure snapshot rather than the vehicles table.
 */
export async function prepareDeparture(
  supabase: SupabaseClient,
  departureId: string,
  seats: number[],
  passengers: string
) {
  const {
    data: departure,
    error,
  } = await supabase
    .from('departures')
    .select(
      `
        id,
        route_id,
        travel_date,
        departure_time,
        price,
        commission_amount,
        total_seats,
        occupied_seats,
        status,
        vehicle_type,
        vehicle_model,
        vehicle_year,
        vehicle_plate_number,
        vehicle_color,
        vehicle_capacity
      `
    )
    .eq('id', departureId)
    .single();

  if (error || !departure) {
    return {
      error: {
        status: 400,
        message: 'Departure not found',
      },
    };
  }

  if (
    !['scheduled', 'boarding'].includes(
      departure.status as string
    )
  ) {
    return {
      error: {
        status: 400,
        message:
          'Departure is no longer available',
      },
    };
  }

  const capacity = Number(
    departure.vehicle_capacity ??
      departure.total_seats ??
      0
  );

  const occupiedSeats = Math.max(
    Number(departure.occupied_seats ?? 0),
    0
  );

  const borixSeats = Math.max(
    Number(departure.total_seats ?? 0),
    0
  );

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return {
      error: {
        status: 400,
        message:
          'Vehicle capacity is unavailable',
      },
    };
  }

  if (
    occupiedSeats < 0 ||
    occupiedSeats > capacity
  ) {
    return {
      error: {
        status: 400,
        message:
          'Invalid vehicle occupancy configuration',
      },
    };
  }

  /*
   * total_seats represents the number of seats
   * available for Borix bookings after accounting
   * for seats already occupied before the trip.
   */
  const expectedBorixSeats =
    capacity - occupiedSeats;

  if (borixSeats !== expectedBorixSeats) {
    return {
      error: {
        status: 400,
        message:
          'Departure seat capacity is incorrectly configured',
      },
    };
  }

  const passengersInt = parseInt(
    passengers,
    10
  );

  if (
    !Number.isInteger(passengersInt) ||
    passengersInt < 1
  ) {
    return {
      error: {
        status: 400,
        message: 'Invalid passenger count',
      },
    };
  }

  if (seats.length !== passengersInt) {
    return {
      error: {
        status: 400,
        message:
          'Number of selected seats must match passenger count',
      },
    };
  }

  /*
   * Physical seats 1..occupiedSeats are reserved
   * for people already occupying the vehicle before
   * the Borix booking.
   */
  const preOccupiedSeats = seats.filter(
    (seat) => seat <= occupiedSeats
  );

  if (preOccupiedSeats.length > 0) {
    return {
      error: {
        status: 409,
        message: `Seat(s) ${preOccupiedSeats.join(
          ', '
        )} are already occupied`,
      },
    };
  }

  /*
   * Selected seats must be within the physical
   * vehicle capacity.
   */
  if (
    seats.some(
      (seat) =>
        seat < 1 ||
        seat > capacity
    )
  ) {
    return {
      error: {
        status: 400,
        message:
          'Invalid seat selection',
      },
    };
  }

  /*
   * Make sure the number of requested seats cannot
   * exceed the number of seats Borix is allowed to sell.
   */
  if (passengersInt > borixSeats) {
    return {
      error: {
        status: 400,
        message:
          `Only ${borixSeats} Borix seat${
            borixSeats === 1 ? '' : 's'
          } are available`,
      },
    };
  }

  /*
   * Check whether any of the selected physical seats
   * have already been booked by another Borix customer.
   */
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from('booked_seats')
    .select('seat_number')
    .eq('departure_id', departureId)
    .in('seat_number', seats);

  if (existingError) {
    return {
      error: {
        status: 500,
        message:
          'Unable to verify seat availability',
      },
    };
  }

  if (existing && existing.length > 0) {
    return {
      error: {
        status: 409,
        message: `Seat(s) ${existing
          .map((s: any) => s.seat_number)
          .join(', ')} are no longer available`,
      },
    };
  }

  if (
    !departure.price ||
    Number(departure.price) <= 0
  ) {
    return {
      error: {
        status: 400,
        message:
          'Departure price unavailable',
      },
    };
  }

  const amount =
    Number(departure.price) *
    passengersInt;

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 10_000_000
  ) {
    return {
      error: {
        status: 400,
        message: 'Invalid booking amount',
      },
    };
  }

  const commission =
    Number(
      departure.commission_amount ?? 0
    ) * passengersInt;

  return {
    departure,
    passengersInt,
    amount,
    commission,
    driverAmount:
      amount - commission,
  };
}