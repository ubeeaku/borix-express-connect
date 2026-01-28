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

    // SECURITY: Verify the transaction with Paystack FIRST
    // This proves the caller has a valid reference that went through Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status || !paystackData.data) {
      console.error('Payment verification failed - invalid transaction');
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to verify payment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only proceed if Paystack confirms this is a valid transaction
    // This prevents random reference guessing attacks
    if (!['success', 'failed', 'pending'].includes(paystackData.data.status)) {
      console.error('Payment verification failed - unknown status');
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to verify payment status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine payment status from Paystack
    let paymentStatus: 'completed' | 'failed' | 'pending' = 'pending';
    if (paystackData.data.status === 'success') {
      paymentStatus = 'completed';
    } else if (paystackData.data.status === 'failed') {
      paymentStatus = 'failed';
    }

    // Update booking status and retrieve minimal booking info
    // Only update if booking exists with this reference
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({ payment_status: paymentStatus })
      .eq('booking_reference', reference)
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
      console.error('Booking not found for reference');
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch route information separately
    const { data: routeData } = await supabase
      .from('routes')
      .select('origin, destination')
      .eq('id', booking.route_id)
      .single();

    console.log('Payment verification completed successfully');

    // Return only minimal, non-sensitive booking data
    // Note: No email, phone, or next-of-kin details are exposed
    return new Response(
      JSON.stringify({
        success: true,
        status: paymentStatus,
        booking: {
          booking_reference: booking.booking_reference,
          passenger_name: booking.passenger_name,
          travel_date: booking.travel_date,
          departure_time: booking.departure_time,
          number_of_seats: booking.number_of_seats,
          total_amount: booking.total_amount,
          routes: {
            origin: routeData?.origin,
            destination: routeData?.destination,
          },
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
