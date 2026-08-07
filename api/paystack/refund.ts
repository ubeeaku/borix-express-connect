import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  corsHeaders,
  getUserFromRequest,
  json,
} from '../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { success: false, error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, 503, { success: false, error: 'Service unavailable' });
  }

  const user = await getUserFromRequest(req);
  if (!user) return json(req, 401, { success: false, error: 'Authentication required' });

  const supabase = adminClient();

  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!adminRole) return json(req, 403, { success: false, error: 'Admin access required' });

  let input: any;
  try {
    input = await req.json();
  } catch {
    return json(req, 400, { success: false, error: 'Invalid JSON' });
  }

  const { bookingId, passengerEmail, refundAmount, reason } = input || {};
  if (!bookingId || !passengerEmail || !refundAmount || Number(refundAmount) <= 0) {
    return json(req, 400, { success: false, error: 'Invalid input data' });
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_reference, passenger_email, total_amount, payment_status')
    .eq('id', bookingId)
    .single();
  if (bookingError || !booking) return json(req, 404, { success: false, error: 'Booking not found' });
  if (String(booking.passenger_email).toLowerCase() !== String(passengerEmail).toLowerCase()) {
    return json(req, 400, { success: false, error: 'Email does not match booking' });
  }
  if (Number(refundAmount) > Number(booking.total_amount)) {
    return json(req, 400, { success: false, error: 'Refund exceeds booking amount' });
  }

  const { data: userList, error: userListErr } = await supabase.auth.admin.listUsers();
  if (userListErr) return json(req, 500, { success: false, error: 'Unable to look up passenger' });
  const targetUser = userList?.users.find(
    (u: any) => u.email?.toLowerCase() === String(passengerEmail).toLowerCase(),
  );
  if (!targetUser) {
    return json(req, 404, {
      success: false,
      error: 'User not found. The passenger must have an account to receive wallet refunds.',
    });
  }

  let wallet: any;
  const { data: existingWallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', targetUser.id)
    .maybeSingle();
  if (existingWallet) {
    wallet = existingWallet;
  } else {
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert({ user_id: targetUser.id, balance: 0 })
      .select('id, balance')
      .single();
    if (createError || !newWallet) {
      return json(req, 500, { success: false, error: 'Unable to create wallet' });
    }
    wallet = newWallet;
  }

  const refundAmountInKobo = Math.round(Number(refundAmount) * 100);
  const newBalance = wallet.balance + refundAmountInKobo;
  const { error: walletUpdErr } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', wallet.id);
  if (walletUpdErr) return json(req, 500, { success: false, error: 'Failed to credit wallet' });

  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    amount: refundAmountInKobo,
    type: 'refund',
    description: reason || 'Booking refund',
    booking_reference: booking.booking_reference,
  });

  await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', bookingId);

  return json(req, 200, {
    success: true,
    message: 'Refund processed successfully',
    refundAmount: Number(refundAmount),
    bookingReference: booking.booking_reference,
    newWalletBalance: newBalance / 100,
  });
}
