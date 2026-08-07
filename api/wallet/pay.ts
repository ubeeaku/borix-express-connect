import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  corsHeaders,
  generateReference,
  getUserFromRequest,
  json,
  prepareDeparture,
  validateBookingInput,
} from '../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { success: false, error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, 503, { success: false, error: 'Payment service unavailable' });
  }

  const user = await getUserFromRequest(req);
  if (!user) return json(req, 401, { success: false, error: 'Authentication required' });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { success: false, error: 'Invalid JSON' });
  }

  const input = validateBookingInput(body);
  if (!input) return json(req, 400, { success: false, error: 'Invalid input data' });

  const supabase = adminClient();
  const prep = await prepareDeparture(supabase, input.departureId, input.seats, input.passengers);
  if ('error' in prep && prep.error) {
    return json(req, prep.error.status, { success: false, error: prep.error.message });
  }
  const { departure, passengersInt, amount, commission, driverAmount } = prep as any;

  const { data: wallet, error: walletErr } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', user.id)
    .maybeSingle();
  if (walletErr || !wallet) {
    return json(req, 404, { success: false, error: 'Wallet not found. Please contact support.' });
  }

  const amountInKobo = Math.round(amount * 100);
  if (wallet.balance < amountInKobo) {
    return json(req, 400, {
      success: false,
      error: 'Insufficient wallet balance',
      walletBalance: wallet.balance / 100,
      required: amount,
    });
  }

  const reference = generateReference();

  const { data: bookingData, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      booking_reference: reference,
      route_id: departure.route_id,
      departure_id: departure.id,
      passenger_name: input.name,
      passenger_email: input.email,
      passenger_phone: input.phone,
      travel_date: departure.travel_date,
      departure_time: departure.departure_time,
      number_of_seats: passengersInt,
      total_amount: amount,
      driver_amount: driverAmount,
      platform_commission: commission,
      payment_status: 'completed',
      next_of_kin_name: input.nextOfKinName,
      next_of_kin_phone: input.nextOfKinPhone,
    })
    .select('id')
    .single();
  if (bookingErr || !bookingData) {
    return json(req, 500, { success: false, error: 'Unable to process booking' });
  }

  const seatRecords = input.seats.map((s) => ({
    booking_id: bookingData.id,
    seat_number: s,
    route_id: departure.route_id,
    departure_id: departure.id,
    travel_date: departure.travel_date,
    departure_time: departure.departure_time,
  }));
  const { error: seatErr } = await supabase.from('booked_seats').insert(seatRecords);
  if (seatErr) {
    await supabase.from('bookings').delete().eq('id', bookingData.id);
    return json(req, 409, { success: false, error: 'Selected seats are no longer available' });
  }

  const newBalance = wallet.balance - amountInKobo;
  const { error: walletUpdErr } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', wallet.id);
  if (walletUpdErr) {
    await supabase.from('booked_seats').delete().eq('booking_id', bookingData.id);
    await supabase.from('bookings').delete().eq('id', bookingData.id);
    return json(req, 500, { success: false, error: 'Payment processing failed' });
  }

  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    amount: amountInKobo,
    type: 'debit',
    description: 'Booking payment',
    booking_reference: reference,
  });

  return json(req, 200, {
    success: true,
    reference,
    message: 'Booking confirmed',
    newBalance: newBalance / 100,
  });
}
