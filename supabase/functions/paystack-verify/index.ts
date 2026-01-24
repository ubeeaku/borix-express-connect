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

    const { reference } = await req.json();

    console.log('Verifying payment:', reference);

    if (!reference) {
      throw new Error('Reference is required');
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackResponse.json();
    console.log('Paystack verification response:', paystackData);

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Verification failed');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine payment status
    let paymentStatus: 'completed' | 'failed' | 'pending' = 'pending';
    if (paystackData.data.status === 'success') {
      paymentStatus = 'completed';
    } else if (paystackData.data.status === 'failed') {
      paymentStatus = 'failed';
    }

    // Update booking status
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({ payment_status: paymentStatus })
      .eq('booking_reference', reference)
      .select(`
        *,
        routes (origin, destination, price, duration)
      `)
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw new Error('Failed to update booking status');
    }

    console.log('Booking updated:', booking);

    return new Response(
      JSON.stringify({
        success: true,
        status: paymentStatus,
        booking: booking,
        transaction: paystackData.data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
