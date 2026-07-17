import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PAYSTACK_BASE = 'https://api.paystack.co';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { success: false, error: 'Method not allowed' });

  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!PAYSTACK_SECRET_KEY) return json(503, { success: false, error: 'Payment service unavailable' });

  let reference: string;
  try {
    const body = await req.json();
    reference = String(body?.reference || '');
    if (!/^BRX-[A-Z0-9]{12}$/.test(reference)) throw new Error('bad');
  } catch {
    return json(400, { success: false, error: 'Invalid reference format' });
  }

  let psData: any;
  try {
    const psRes = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    psData = await psRes.json();
  } catch {
    return json(502, { success: false, error: 'Unable to reach payment provider' });
  }

  if (!psData?.status || !psData?.data) return json(400, { success: false, error: 'Unable to verify payment' });
  if (!['success', 'failed', 'pending'].includes(psData.data.status)) {
    return json(400, { success: false, error: 'Unable to verify payment status' });
  }

  const paymentStatus = psData.data.status === 'success' ? 'completed'
    : psData.data.status === 'failed' ? 'failed' : 'pending';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: booking, error: updateError } = await supabase
    .from('bookings')
    .update({ payment_status: paymentStatus })
    .eq('booking_reference', reference)
    .select('booking_reference, passenger_name, travel_date, departure_time, number_of_seats, total_amount, payment_status, route_id')
    .single();

  if (updateError || !booking) return json(404, { success: false, error: 'Booking not found' });

  const { data: routeData } = await supabase
    .from('routes')
    .select('origin, destination')
    .eq('id', booking.route_id)
    .single();

  return json(200, {
    success: true,
    status: paymentStatus,
    booking: {
      booking_reference: booking.booking_reference,
      passenger_name: booking.passenger_name,
      travel_date: booking.travel_date,
      departure_time: booking.departure_time,
      number_of_seats: booking.number_of_seats,
      total_amount: booking.total_amount,
      routes: { origin: routeData?.origin, destination: routeData?.destination },
    },
  });
});
