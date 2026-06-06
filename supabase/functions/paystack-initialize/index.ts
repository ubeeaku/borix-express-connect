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
      const isAllowed = ALLOWED_ORIGINS.some(domain =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
      if (isAllowed) allowedOrigin = origin;
    }
  } catch { /* default */ }
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const InitSchema = z.object({
  email: z.string().email().max(255),
  amount: z.number().positive().max(10000000),
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
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Payment service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let input;
    try {
      input = InitSchema.parse(await req.json());
    } catch (e) {
      console.error('Validation failed:', e);
      return new Response(JSON.stringify({ success: false, error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { email, amount, name, phone, departureId, passengers, seats, nextOfKinName, nextOfKinPhone } = input;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up departure (must be scheduled/boarding)
    const { data: departure, error: depErr } = await supabase
      .from('departures')
      .select('id, route_id, travel_date, departure_time, price, commission_amount, total_seats, status, vehicle_id, vehicles(capacity)')
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

    // Already booked?
    const { data: existing } = await supabase
      .from('booked_seats')
      .select('seat_number')
      .eq('departure_id', departureId)
      .in('seat_number', seats);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ success: false, error: `Seat(s) ${existing.map(s => s.seat_number).join(', ')} are no longer available` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const reference = `BRX-${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
    const passengersInt = parseInt(passengers);
    const commission = (departure.commission_amount ?? 0) * passengersInt;
    const driverAmount = amount - commission;

    // Create booking with reserved status
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
      console.error('Booking creation failed:', bookingError?.message);
      return new Response(JSON.stringify({ success: false, error: 'Unable to process booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Reserve seats
    const seatRecords = seats.map(seatNumber => ({
      booking_id: bookingData.id,
      seat_number: seatNumber,
      route_id: departure.route_id,
      departure_id: departure.id,
      travel_date: departure.travel_date,
      departure_time: departure.departure_time,
    }));

    const { error: seatErr } = await supabase.from('booked_seats').insert(seatRecords);
    if (seatErr) {
      console.error('Seat reserve failed:', seatErr.message);
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return new Response(JSON.stringify({ success: false, error: 'Selected seats are no longer available' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Init Paystack
    const requestOrigin = req.headers.get('origin') || '';
    const isAllowed = ALLOWED_ORIGINS.some(domain => {
      try {
        if (!requestOrigin) return false;
        const url = new URL(requestOrigin);
        return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
      } catch { return false; }
    });
    const safeOrigin = isAllowed ? requestOrigin : 'https://lovable.app';

    const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100,
        reference,
        callback_url: `${safeOrigin}/confirmation`,
        metadata: {
          name, phone,
          departure_id: departure.id,
          seats,
          custom_fields: [
            { display_name: "Passenger Name", variable_name: "passenger_name", value: name },
            { display_name: "Phone Number", variable_name: "phone", value: phone },
            { display_name: "Seats", variable_name: "seats", value: seats.join(', ') },
          ],
        },
      }),
    });

    const psData = await psRes.json();
    if (!psData.status) {
      console.error('Paystack error');
      await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return new Response(JSON.stringify({ success: false, error: 'Unable to initialize payment' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('bookings').update({ payment_status: 'pending' }).eq('id', bookingData.id);

    return new Response(JSON.stringify({
      success: true,
      authorization_url: psData.data.authorization_url,
      reference,
      access_code: psData.data.access_code,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Unable to process request' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});
