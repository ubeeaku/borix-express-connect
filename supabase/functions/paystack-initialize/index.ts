import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      throw new Error('Payment configuration error');
    }

    const { email, amount, name, phone, routeId, date, time, passengers, callbackUrl } = await req.json();

    console.log('Initializing payment:', { email, amount, name, routeId, date, time, passengers });

    // Validate required fields
    if (!email || !amount || !name || !phone || !routeId || !date || !time || !passengers) {
      throw new Error('Missing required fields');
    }

    // Generate a unique reference
    const reference = `BRX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
    console.log('Paystack response:', paystackData);

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Failed to initialize payment');
    }

    // Create booking record in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: bookingError } = await supabase
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
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      throw new Error('Failed to create booking');
    }

    console.log('Booking created:', booking);

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
    console.error('Payment initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
