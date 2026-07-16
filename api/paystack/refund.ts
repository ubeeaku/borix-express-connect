import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors, getAuthClient, getServiceClient, jsonError } from '../_lib/paystack';

export const config = { runtime: 'nodejs' };

const RefundSchema = z.object({
  bookingId: z.string().uuid(),
  passengerEmail: z.string().email(),
  refundAmount: z.number().positive(),
  reason: z.string().max(500).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader) return jsonError(res, 401, 'Authentication required');

  let user;
  try {
    const authClient = getAuthClient(authHeader);
    const { data, error } = await authClient.auth.getUser();
    if (error || !data.user) return jsonError(res, 401, 'Invalid authentication');
    user = data.user;
  } catch (e) {
    return jsonError(res, 500, 'Server misconfigured', String(e));
  }

  const supabase = getServiceClient();

  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!adminRole) return jsonError(res, 403, 'Admin access required');

  let input: z.infer<typeof RefundSchema>;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    input = RefundSchema.parse(body);
  } catch (e) {
    return jsonError(res, 400, 'Invalid input data', e instanceof Error ? e.message : e);
  }

  const { bookingId, passengerEmail, refundAmount, reason } = input;

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_reference, passenger_email, total_amount, payment_status')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) return jsonError(res, 404, 'Booking not found');
  if (booking.passenger_email.toLowerCase() !== passengerEmail.toLowerCase()) {
    return jsonError(res, 400, 'Email does not match booking');
  }

  const { data: userList, error: userListErr } = await supabase.auth.admin.listUsers();
  if (userListErr) return jsonError(res, 500, 'Unable to look up passenger');
  const targetUser = userList?.users.find(
    u => u.email?.toLowerCase() === passengerEmail.toLowerCase(),
  );
  if (!targetUser) {
    return jsonError(
      res,
      404,
      'User not found. The passenger must have an account to receive wallet refunds.',
    );
  }

  let wallet;
  const { data: existingWallet } = await supabase
    .from('wallets').select('id, balance').eq('user_id', targetUser.id).single();
  if (existingWallet) {
    wallet = existingWallet;
  } else {
    const { data: newWallet, error: createError } = await supabase
      .from('wallets').insert({ user_id: targetUser.id, balance: 0 })
      .select('id, balance').single();
    if (createError || !newWallet) return jsonError(res, 500, 'Unable to create wallet');
    wallet = newWallet;
  }

  const refundAmountInKobo = Math.round(refundAmount * 100);
  const newBalance = wallet.balance + refundAmountInKobo;
  const { error: walletUpdErr } = await supabase
    .from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
  if (walletUpdErr) return jsonError(res, 500, 'Failed to credit wallet');

  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    amount: refundAmountInKobo,
    type: 'refund',
    description: reason || 'Booking refund',
    booking_reference: booking.booking_reference,
  });

  await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', bookingId);

  return res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    refundAmount,
    bookingReference: booking.booking_reference,
    newWalletBalance: newBalance / 100,
  });
}
