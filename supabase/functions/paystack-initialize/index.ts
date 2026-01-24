import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const InitSchema = z.object({
  email: z.string().email().max(255),
  amount: z.number().positive().max(10000000),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
  routeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().min(1).max(20),
  passengers: z.string().regex(/^[1-5]$/, 'Passengers must be 1-5'),
  callbackUrl: z.string().url().optional(),
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
      validatedInput = InitSchema.parse(rawInput);
    } catch (validationError) {
      console.error('Input validation failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, amount, name, phone, routeId, date, time, passengers, callbackUrl } = validatedInput;

    // Verify the authenticated user's email matches the booking email
    if (userEmail !== email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email must match authenticated user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing payment initialization for authenticated user');

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

    // Generate a cryptographically secure reference
    const randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
    const reference = `BRX-${randomPart}`;

    // Initialize Paystack transaction
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
        callback_url: callbackUrl || `${req.headers.get('origin')}/confirmation`,
        metadata: {
          name,
          phone,
          route_id: routeId,
          travel_date: date,
          departure_time: time,
          passengers: parseInt(passengers),
          custom_fields: [
            { display_name: "Passenger Name", variable_name: "passenger_name", value: name },
            { display_name: "Phone Number", variable_name: "phone", value: phone },
            { display_name: "Travel Date", variable_name: "travel_date", value: date },
            { display_name: "Departure Time", variable_name: "departure_time", value: time },
          ]
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Payment gateway error');
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to initialize payment' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create booking record in database
    const { error: bookingError } = await supabase
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
        payment_status: 'pending',
      });

    if (bookingError) {
      console.error('Booking creation failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to process booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
