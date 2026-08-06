import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const PAYSTACK_BASE = 'https://api.paystack.co';

const ALLOWED_ORIGIN_DOMAINS = [
  'borixexpress.com',
  'lovable.app',
  'lovable.dev',
  'lovableproject.com',
  'vercel.app',
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  let allowedOrigin = 'https://borixexpress.com';
  try {
    if (origin) {
      const url = new URL(origin);
      const ok = ALLOWED_ORIGIN_DOMAINS.some(
        (d) => url.hostname === d || url.hostname.endsWith(`.${d}`),
      );
      if (ok) allowedOrigin = origin;
    }
  } catch {
    /* keep default */
  }
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

export function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

/** Names of the env vars that must be present for the API routes to work. */
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}

export function adminClient(): SupabaseClient {
  const missing = missingEnv();
  if (missing.length) {
    throw new Error(`Server misconfigured: missing env var(s) ${missing.join(', ')}`);
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export function generateReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = 'BRX-';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
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

export function validateBookingInput(input: any): BookingInput | null {
  if (!input) return null;
  const { email, name, phone, departureId, passengers, seats, nextOfKinName, nextOfKinPhone } =
    input;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (typeof name !== 'string' || name.trim().length < 2) return null;
  if (typeof phone !== 'string' || !/^\+?[0-9]{10,15}$/.test(phone)) return null;
  if (typeof departureId !== 'string' || departureId.length < 10) return null;
  if (!/^[1-9][0-9]?$/.test(String(passengers))) return null;
  if (!Array.isArray(seats) || seats.length === 0 || seats.length > 30) return null;
  if (seats.some((s) => typeof s !== 'number' || s < 1 || s > 60)) return null;
  if (typeof nextOfKinName !== 'string' || nextOfKinName.trim().length < 2) return null;
  if (typeof nextOfKinPhone !== 'string' || !/^\+?[0-9]{10,15}$/.test(nextOfKinPhone)) return null;
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

/** Loads the departure, validates availability, and computes server-side amounts. */
export async function prepareDeparture(
  supabase: SupabaseClient,
  departureId: string,
  seats: number[],
  passengers: string,
) {
  const { data: departure, error } = await supabase
    .from('departures')
    .select(
      'id, route_id, travel_date, departure_time, price, commission_amount, total_seats, status, vehicles(capacity)',
    )
    .eq('id', departureId)
    .single();

  if (error || !departure) return { error: { status: 400, message: 'Departure not found' } };
  if (!['scheduled', 'boarding'].includes(departure.status as string)) {
    return { error: { status: 400, message: 'Departure is no longer available' } };
  }
  const capacity = (departure as any).vehicles?.capacity ?? departure.total_seats;
  if (seats.some((s) => s < 1 || s > capacity)) {
    return { error: { status: 400, message: 'Invalid seat selection' } };
  }
  if (!departure.price || Number(departure.price) <= 0) {
    return { error: { status: 400, message: 'Departure price unavailable' } };
  }

  const { data: existing } = await supabase
    .from('booked_seats')
    .select('seat_number')
    .eq('departure_id', departureId)
    .in('seat_number', seats);
  if (existing && existing.length > 0) {
    return {
      error: {
        status: 409,
        message: `Seat(s) ${existing.map((s: any) => s.seat_number).join(', ')} are no longer available`,
      },
    };
  }

  const passengersInt = parseInt(passengers, 10);
  const amount = Number(departure.price) * passengersInt;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return { error: { status: 400, message: 'Invalid booking amount' } };
  }
  const commission = Number(departure.commission_amount ?? 0) * passengersInt;

  return {
    departure,
    passengersInt,
    amount,
    commission,
    driverAmount: amount - commission,
  };
}
