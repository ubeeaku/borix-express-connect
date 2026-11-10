import {
  PAYSTACK_BASE,
  adminClient,
  getUserFromRequest,
  json,
} from '../../_lib/supabase.js';
import { nairaToKobo } from '../../../src/lib/driverPayout.js';

export const config = { runtime: 'nodejs' };

type PayoutRequest = {
  request_id: string;
  reference: string;
  amount: number;
};

async function finalize(
  supabase: ReturnType<typeof adminClient>,
  reference: string,
  event: 'transfer.success' | 'transfer.failed' | 'transfer.reversed',
  transferCode: string | null,
  message: string | null,
) {
  await supabase.rpc('finalize_driver_payout', {
    p_reference: reference,
    p_event: event,
    p_transfer_code: transferCode,
    p_message: message,
  });
}

async function syncTransferStatus(
  supabase: ReturnType<typeof adminClient>,
  secret: string,
  reference: string,
  transferCode: string | null,
) {
  const verifyResponse = await fetch(
    PAYSTACK_BASE + '/transfer/verify/' + encodeURIComponent(reference),
    { headers: { Authorization: 'Bearer ' + secret } },
  );
  const result = await verifyResponse.json();
  if (!verifyResponse.ok || !result.status || !result.data) return null;

  const status = String(result.data.status ?? '').toLowerCase();
  const code = result.data.transfer_code ? String(result.data.transfer_code) : transferCode;
  const message = result.data.reason ? String(result.data.reason) : null;

  if (status === 'success') {
    await finalize(supabase, reference, 'transfer.success', code, message);
    return { status: 'success', message };
  }
  if (status === 'failed') {
    await finalize(supabase, reference, 'transfer.failed', code, message);
    return { status: 'failed', message };
  }
  if (status === 'reversed') {
    await finalize(supabase, reference, 'transfer.reversed', code, message);
    return { status: 'reversed', message };
  }

  const payoutStatus = status === 'otp' ? 'otp' : 'processing';
  await supabase.rpc('update_driver_payout_initiation', {
    p_reference: reference,
    p_transfer_code: code,
    p_status: payoutStatus,
    p_message: message,
  });
  return { status: payoutStatus, message };
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return json(req, res, 200, { success: true });
  if (req.method !== 'POST') return json(req, res, 405, { error: 'Method not allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return json(req, res, 401, { error: 'Sign in as a driver to continue' });

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret?.startsWith('sk_live_')) {
    return json(req, res, 503, { error: 'Bank withdrawals are not configured for this environment' });
  }

  const supabase = adminClient();
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (driverError || !driver) return json(req, res, 403, { error: 'Active driver profile not found' });

  const { data: reserved, error: reserveError } = await supabase.rpc(
    'reserve_driver_payout',
    { p_user_id: user.id },
  );
  if (reserveError) {
    const message = reserveError.message.includes('Add and verify')
      ? 'Add and verify a bank account before withdrawing'
      : reserveError.message.includes('no earnings available')
        ? 'There are no earnings available to withdraw'
        : 'Could not prepare your withdrawal';
    return json(req, res, 400, { error: message });
  }

  const payout = (Array.isArray(reserved) ? reserved[0] : reserved) as PayoutRequest | null;
  const amountInKobo = nairaToKobo(payout?.amount);
  if (!payout?.reference || amountInKobo === null) {
    return json(req, res, 500, { error: 'Could not prepare your withdrawal' });
  }

  const { data: payoutRow, error: payoutError } = await supabase
    .from('driver_payout_requests')
    .select('status, paystack_transfer_code, recipient_code, amount')
    .eq('id', payout.request_id)
    .eq('driver_id', driver.id)
    .single();
  if (payoutError || !payoutRow) return json(req, res, 500, { error: 'Could not load your withdrawal request' });

  if (['success', 'failed', 'reversed'].includes(payoutRow.status)) {
    return json(req, res, 200, {
      status: payoutRow.status,
      amount: payoutRow.amount,
      reference: payout.reference,
    });
  }

  try {
    const verified = await syncTransferStatus(
      supabase,
      secret,
      payout.reference,
      payoutRow.paystack_transfer_code,
    );
    if (verified?.status === 'success' || verified?.status === 'failed' || verified?.status === 'reversed') {
      return json(req, res, 200, { ...verified, amount: payoutRow.amount, reference: payout.reference });
    }
    if (verified) {
      return json(req, res, 202, { ...verified, amount: payoutRow.amount, reference: payout.reference });
    }

    if (payoutRow.status !== 'queued' || payoutRow.paystack_transfer_code) {
      return json(req, res, 202, {
        status: verified?.status ?? payoutRow.status,
        amount: payoutRow.amount,
        reference: payout.reference,
        message: 'Your withdrawal is being processed',
      });
    }

    const transferResponse = await fetch(PAYSTACK_BASE + '/transfer', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amountInKobo,
        recipient: payoutRow.recipient_code,
        reference: payout.reference,
        reason: 'Borix driver earnings withdrawal',
      }),
    });
    const transferResult = await transferResponse.json();

    if (!transferResponse.ok || !transferResult.status) {
      const afterFailure = await syncTransferStatus(
        supabase,
        secret,
        payout.reference,
        payoutRow.paystack_transfer_code,
      );
      if (afterFailure) {
        return json(req, res, 202, {
          ...afterFailure,
          amount: payoutRow.amount,
          reference: payout.reference,
          message: 'Your withdrawal status is being confirmed',
        });
      }

      if (transferResponse.status >= 500) {
        return json(req, res, 202, {
          status: 'queued',
          amount: payoutRow.amount,
          reference: payout.reference,
          message: 'Your withdrawal status is being confirmed',
        });
      }

      await finalize(
        supabase,
        payout.reference,
        'transfer.failed',
        null,
        typeof transferResult.message === 'string' ? transferResult.message : 'Paystack did not accept the transfer',
      );
      return json(req, res, 400, {
        status: 'failed',
        error: 'Paystack could not start the transfer. The earnings are available again.',
      });
    }

    const transferCode = transferResult.data?.transfer_code
      ? String(transferResult.data.transfer_code)
      : null;
    const transferStatus = String(transferResult.data?.status ?? '').toLowerCase();
    const payoutStatus = transferStatus === 'otp' ? 'otp' : 'processing';

    const { error: updateError } = await supabase.rpc('update_driver_payout_initiation', {
      p_reference: payout.reference,
      p_transfer_code: transferCode,
      p_status: payoutStatus,
      p_message: typeof transferResult.message === 'string' ? transferResult.message : null,
    });
    if (updateError) {
      return json(req, res, 202, {
        status: 'queued',
        amount: payoutRow.amount,
        reference: payout.reference,
        message: 'Your withdrawal status is being confirmed',
      });
    }

    return json(req, res, 202, {
      status: payoutStatus,
      amount: payoutRow.amount,
      reference: payout.reference,
      message: payoutStatus === 'otp'
        ? 'Your withdrawal is waiting for Paystack approval'
        : 'Your withdrawal is being processed',
    });
  } catch {
    return json(req, res, 202, {
      status: 'queued',
      amount: payoutRow.amount,
      reference: payout.reference,
      message: 'Your withdrawal status is being confirmed',
    });
  }
}

