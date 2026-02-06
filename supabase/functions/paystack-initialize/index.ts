import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'lovable.app',
  'lovable.dev',
  'lovableproject.com',
];

// Dynamic CORS based on allowed origins
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  let allowedOrigin = 'https://lovable.app'; // Default fallback
  
  try {
    if (origin) {
      const url = new URL(origin);
      const isAllowed = ALLOWED_ORIGINS.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
      if (isAllowed) {
        allowedOrigin = origin;
      }
    }
  } catch {
    // Invalid origin URL, use default
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Input validation schema - callbackUrl removed for security (open redirect prevention)
const InitSchema = z.object({
  email: z.string().email().max(255),
  amount: z.number().positive().max(10000000),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
  routeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().min(1).max(20),
  passengers: z.string().regex(/^[1-5]$/, 'Passengers must be 1-5'),
  seats: z.array(z.number().min(1).max(25)).min(1).max(25),
  nextOfKinName: z.string().min(2).max(100),
  nextOfKinPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Guest checkout is allowed - no authentication required for booking
    // Security is maintained through:
    // 1. Strict input validation with Zod
    // 2. Service-role database operations with RLS bypass
    // 3. Paystack handles payment security
    // 4. Email verification happens through Paystack's payment flow

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      console.error('Payment configuration error');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input strictly
    let validatedInput;
    try {
      const rawInput = await req.json();
      validatedInput = InitSchema.parse(rawInput);
    } catch (validationError) {
      console.error('Input validation failed:', validationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, amount, name, phone, routeId, date, time, passengers, seats, nextOfKinName, nextOfKinPhone } = validatedInput;

    console.log('Processing guest payment initialization for:', email);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify route exists
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select('id, price')
      .eq('id', routeId)
      .single();

    if (routeError || !route) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid route selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if selected seats are available
    const { data: existingSeats, error: seatsCheckError } = await supabase
      .from('booked_seats')
      .select('seat_number')
      .eq('route_id', routeId)
      .eq('travel_date', date)
      .eq('departure_time', time)
      .in('seat_number', seats);

    if (seatsCheckError) {
      console.error('Seat availability check failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to verify seat availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingSeats && existingSeats.length > 0) {
      const takenSeats = existingSeats.map(s => s.seat_number).join(', ');
      return new Response(
        JSON.stringify({ success: false, error: `Seat(s) ${takenSeats} are no longer available` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a cryptographically secure reference
    const randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
    const reference = `BRX-${randomPart}`;

    // SECURITY FIX: Reserve seats BEFORE initializing Paystack to prevent race condition
    // This ensures users are not charged for seats that become unavailable
    
    // Step 1: Create booking record first (with 'reserved' status initially)
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_reference: reference,
        route_id: routeId,
        passenger_name: name,
        passenger_email: email,
        passenger_phone: phone,
        travel_date: date,
        departure_time: time,
        number_of_seats: parseInt(passengers),
        total_amount: amount,
        payment_status: 'reserved',
        next_of_kin_name: nextOfKinName,
        next_of_kin_phone: nextOfKinPhone,
      })
      .select('id')
      .single();

    if (bookingError || !bookingData) {
      console.error('Booking creation failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to process booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Reserve seats BEFORE Paystack initialization (fail fast if taken)
    const seatRecords = seats.map(seatNumber => ({
      booking_id: bookingData.id,
      seat_number: seatNumber,
      route_id: routeId,
      travel_date: date,
      departure_time: time,
    }));

    const { error: seatInsertError } = await supabase
      .from('booked_seats')
      .insert(seatRecords);

    if (seatInsertError) {
      console.error('Seat reservation failed:', seatInsertError.message);
      // Rollback booking - no Paystack transaction created yet!
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Selected seats are no longer available' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Initialize Paystack ONLY after seats are successfully reserved
    // SECURITY FIX: Validate origin against allowed domains to prevent open redirect
    const requestOrigin = req.headers.get('origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.some(domain => {
      try {
        if (!requestOrigin) return false;
        const url = new URL(requestOrigin);
        return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
      } catch {
        return false;
      }
    });
    const safeCallbackOrigin = isAllowedOrigin ? requestOrigin : 'https://lovable.app';

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack expects amount in kobo
        reference,
        callback_url: `${safeCallbackOrigin}/confirmation`,
        metadata: {
          name,
          phone,
          route_id: routeId,
          travel_date: date,
          departure_time: time,
          passengers: parseInt(passengers),
          seats,
          custom_fields: [
            { display_name: "Passenger Name", variable_name: "passenger_name", value: name },
            { display_name: "Phone Number", variable_name: "phone", value: phone },
            { display_name: "Travel Date", variable_name: "travel_date", value: date },
            { display_name: "Departure Time", variable_name: "departure_time", value: time },
            { display_name: "Seats", variable_name: "seats", value: seats.join(', ') },
          ]
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Payment gateway error');
      // Rollback: release seats and delete booking since payment failed
      await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to initialize payment' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Update booking status to 'pending' now that payment is initialized
    await supabase
      .from('bookings')
      .update({ payment_status: 'pending' })
      .eq('id', bookingData.id);

    console.log('Payment initialized successfully');

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        reference: reference,
        access_code: paystackData.data.access_code,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment processing error');
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to process request' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});