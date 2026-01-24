import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema - reference must match our format
const VerifySchema = z.object({
  reference: z.string().regex(/^BRX-[A-Z0-9]{12}$/, 'Invalid reference format'),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = claimsData.claims.email as string;

    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      console.error('Payment configuration error');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    let validatedInput;
    try {
      const rawInput = await req.json();
      validatedInput = VerifySchema.parse(rawInput);
    } catch (validationError) {
      console.error('Input validation failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid reference format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { reference } = validatedInput;

    console.log('Processing payment verification');

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, verify the booking exists and belongs to the authenticated user
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, passenger_email')
      .eq('booking_reference', reference)
      .single();

    if (fetchError || !existingBooking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the booking belongs to the authenticated user
    if (existingBooking.passenger_email !== userEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized access to booking' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Payment verification failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to verify payment' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine payment status
    let paymentStatus: 'completed' | 'failed' | 'pending' = 'pending';
    if (paystackData.data.status === 'success') {
      paymentStatus = 'completed';
    } else if (paystackData.data.status === 'failed') {
      paymentStatus = 'failed';
    }

    // Update booking status and retrieve minimal booking info
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({ payment_status: paymentStatus })
      .eq('booking_reference', reference)
      .eq('passenger_email', userEmail) // Extra security: only update if email matches
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

    if (updateError || !booking) {
      console.error('Booking update failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to update booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch route information separately
    const { data: routeData } = await supabase
      .from('routes')
      .select('origin, destination')
      .eq('id', booking.route_id)
      .single();
    console.log('Payment verification completed');

    // Return only minimal, non-sensitive booking data
    return new Response(
      JSON.stringify({
        success: true,
        status: paymentStatus,
        booking: {
          reference: booking.booking_reference,
          passengerName: booking.passenger_name,
          travelDate: booking.travel_date,
          departureTime: booking.departure_time,
          seats: booking.number_of_seats,
          amount: booking.total_amount,
          origin: routeData?.origin,
          destination: routeData?.destination,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment verification error');
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
