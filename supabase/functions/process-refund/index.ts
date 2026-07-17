import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { success: false, error: 'Method not allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json(401, { success: false, error: 'Authentication required' });

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) return json(401, { success: false, error: 'Invalid authentication' });
  const userId = claimsData.claims.sub as string;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: adminRole } = await supabase
    .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (!adminRole) return json(403, { success: false, error: 'Admin access required' });

  let input: any;
  try { input = await req.json(); }
  catch { return json(400, { success: false, error: 'Invalid JSON' }); }

  const { bookingId, passengerEmail, refundAmount, reason } = input || {};
  if (!bookingId || !passengerEmail || !refundAmount || refundAmount <= 0) {
    return json(400, { success: false, error: 'Invalid input data' });
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_reference, passenger_email, total_amount, payment_status')
    .eq('id', bookingId)
    .single();
  if (bookingError || !booking) return json(404, { success: false, error: 'Booking not found' });
  if (booking.passenger_email.toLowerCase() !== String(passengerEmail).toLowerCase()) {
    return json(400, { success: false, error: 'Email does not match booking' });
  }

  const { data: userList, error: userListErr } = await supabase.auth.admin.listUsers();
  if (userListErr) return json(500, { success: false, error: 'Unable to look up passenger' });
  const targetUser = userList?.users.find(
    (u: any) => u.email?.toLowerCase() === String(passengerEmail).toLowerCase(),
  );
  if (!targetUser) {
    return json(404, { success: false, error: 'User not found. The passenger must have an account to receive wallet refunds.' });
  }

  let wallet: any;
  const { data: existingWallet } = await supabase
    .from('wallets').select('id, balance').eq('user_id', targetUser.id).single();
  if (existingWallet) {
    wallet = existingWallet;
  } else {
    const { data: newWallet, error: createError } = await supabase
      .from('wallets').insert({ user_id: targetUser.id, balance: 0 })
      .select('id, balance').single();
    if (createError || !newWallet) return json(500, { success: false, error: 'Unable to create wallet' });
    wallet = newWallet;
  }

  const refundAmountInKobo = Math.round(Number(refundAmount) * 100);
  const newBalance = wallet.balance + refundAmountInKobo;
  const { error: walletUpdErr } = await supabase
    .from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
  if (walletUpdErr) return json(500, { success: false, error: 'Failed to credit wallet' });

  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    amount: refundAmountInKobo,
    type: 'refund',
    description: reason || 'Booking refund',
    booking_reference: booking.booking_reference,
  });

  await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', bookingId);

  return json(200, {
    success: true,
    message: 'Refund processed successfully',
    refundAmount,
    bookingReference: booking.booking_reference,
    newWalletBalance: newBalance / 100,
  });
});
