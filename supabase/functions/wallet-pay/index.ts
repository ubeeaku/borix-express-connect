import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'lovable.app',
  'lovable.dev',
  'lovableproject.com',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  let allowedOrigin = 'https://lovable.app';
  
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

// Input validation schema
const WalletPaySchema = z.object({
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
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token to get user info
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing wallet payment for user:', user.id);

    // Parse and validate input
    let validatedInput;
    try {
      const rawInput = await req.json();
      validatedInput = WalletPaySchema.parse(rawInput);
    } catch (validationError) {
      console.error('Input validation failed:', validationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, amount, name, phone, routeId, date, time, passengers, seats, nextOfKinName, nextOfKinPhone } = validatedInput;

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

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet not found. Please contact support.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Amount is in Naira, wallet balance is in kobo
    const amountInKobo = amount * 100;

    if (wallet.balance < amountInKobo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient wallet balance',
          walletBalance: wallet.balance / 100,
          required: amount
        }),
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

    // Generate booking reference
    const randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
    const reference = `BRX-${randomPart}`;

    // Step 1: Create booking record
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
        payment_status: 'completed', // Wallet payment is instant
        next_of_kin_name: nextOfKinName,
        next_of_kin_phone: nextOfKinPhone,
      })
      .select('id')
      .single();

    if (bookingError || !bookingData) {
      console.error('Booking creation failed:', bookingError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to process booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Reserve seats
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
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Selected seats are no longer available' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Debit wallet
    const newBalance = wallet.balance - amountInKobo;
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);

    if (walletUpdateError) {
      console.error('Wallet debit failed:', walletUpdateError.message);
      // Rollback booking and seats
      await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Record transaction
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        amount: amountInKobo,
        type: 'debit',
        description: `Booking payment`,
        booking_reference: reference,
      });

    if (transactionError) {
      console.error('Transaction record failed:', transactionError.message);
      // Non-critical - payment was successful
    }

    console.log('Wallet payment completed successfully:', reference);

    return new Response(
      JSON.stringify({
        success: true,
        reference: reference,
        message: 'Booking confirmed',
        newBalance: newBalance / 100,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Wallet payment error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to process request' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
