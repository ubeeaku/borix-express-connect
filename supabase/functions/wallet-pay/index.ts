import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";

const ALLOWED_ORIGINS = ['lovable.app', 'lovable.dev', 'lovableproject.com', 'vercel.app',
  'borixexpress.com'];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  let allowedOrigin = 'https://borixexpress.com';
  try {
    if (origin) {
      const url = new URL(origin);
      const isAllowed = ALLOWED_ORIGINS.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`));
      if (isAllowed) allowedOrigin = origin;
    }
  } catch { /* default */ }
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const WalletPaySchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  departureId: z.string().uuid(),
  passengers: z.string().regex(/^[1-9][0-9]?$/),
  seats: z.array(z.number().min(1).max(60)).min(1).max(30),
  nextOfKinName: z.string().min(2).max(100),
  nextOfKinPhone: z.string().regex(/^\+?[0-9]{10,15}$/),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let input;
    try { input = WalletPaySchema.parse(await req.json()); }
    catch (e) {
      console.error('Validation failed:', e);
      return new Response(JSON.stringify({ success: false, error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { email, amount, name, phone, departureId, passengers, seats, nextOfKinName, nextOfKinPhone } = input;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: departure, error: depErr } = await supabase
      .from('departures')
      .select('id, route_id, travel_date, departure_time, price, commission_amount, total_seats, status, vehicles(capacity)')
      .eq('id', departureId)
      .single();
    if (depErr || !departure) {
      return new Response(JSON.stringify({ success: false, error: 'Departure not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!['scheduled', 'boarding'].includes(departure.status)) {
      return new Response(JSON.stringify({ success: false, error: 'Departure is no longer available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const capacity = (departure as any).vehicles?.capacity ?? departure.total_seats;
    if (seats.some(s => s < 1 || s > capacity)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid seat selection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: wallet, error: walletErr } = await supabase
      .from('wallets').select('id, balance').eq('user_id', user.id).single();
    if (walletErr || !wallet) {
      return new Response(JSON.stringify({ success: false, error: 'Wallet not found. Please contact support.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const amountInKobo = amount * 100;
    if (wallet.balance < amountInKobo) {
      return new Response(JSON.stringify({
        success: false, error: 'Insufficient wallet balance',
        walletBalance: wallet.balance / 100, required: amount,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: existing } = await supabase
      .from('booked_seats').select('seat_number').eq('departure_id', departureId).in('seat_number', seats);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ success: false, error: `Seat(s) ${existing.map(s => s.seat_number).join(', ')} are no longer available` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const reference = `BRX-${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
    const passengersInt = parseInt(passengers);
    const commission = (departure.commission_amount ?? 0) * passengersInt;
    const driverAmount = amount - commission;

    const { data: bookingData, error: bookingErr } = await supabase
      .from('bookings').insert({
        booking_reference: reference,
        route_id: departure.route_id,
        departure_id: departure.id,
        passenger_name: name, passenger_email: email, passenger_phone: phone,
        travel_date: departure.travel_date, departure_time: departure.departure_time,
        number_of_seats: passengersInt,
        total_amount: amount,
        driver_amount: driverAmount,
        platform_commission: commission,
        payment_status: 'completed',
        next_of_kin_name: nextOfKinName, next_of_kin_phone: nextOfKinPhone,
      }).select('id').single();
    if (bookingErr || !bookingData) {
      return new Response(JSON.stringify({ success: false, error: 'Unable to process booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const seatRecords = seats.map(s => ({
      booking_id: bookingData.id, seat_number: s,
      route_id: departure.route_id, departure_id: departure.id,
      travel_date: departure.travel_date, departure_time: departure.departure_time,
    }));
    const { error: seatErr } = await supabase.from('booked_seats').insert(seatRecords);
    if (seatErr) {
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return new Response(JSON.stringify({ success: false, error: 'Selected seats are no longer available' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const newBalance = wallet.balance - amountInKobo;
    const { error: walletUpdErr } = await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
    if (walletUpdErr) {
      await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return new Response(JSON.stringify({ success: false, error: 'Payment processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id, amount: amountInKobo, type: 'debit',
      description: 'Booking payment', booking_reference: reference,
    });

    return new Response(JSON.stringify({
      success: true, reference, message: 'Booking confirmed', newBalance: newBalance / 100,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Wallet payment error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Unable to process request' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});
