import {
  PAYSTACK_BASE,
  adminClient,
  getUserFromRequest,
  json,
} from '../../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return json(req, res, 200, { success: true });
  if (req.method !== 'GET' && req.method !== 'POST') return json(req, res, 405, { error: 'Method not allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return json(req, res, 401, { error: 'Sign in as a driver to continue' });

  const supabase = adminClient();
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('id, full_name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (driverError || !driver) return json(req, res, 403, { error: 'Active driver profile not found' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('driver_payout_accounts')
      .select('bank_code, bank_name, account_name, account_number_last4, updated_at')
      .eq('driver_id', driver.id)
      .maybeSingle();
    if (error) return json(req, res, 500, { error: 'Could not load your bank account' });
    return json(req, res, 200, { account: data ?? null });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret?.startsWith('sk_live_')) {
    return json(req, res, 503, { error: 'Verified bank payouts are not configured for this environment' });
  }

  const accountNumber = typeof req.body?.account_number === 'string'
    ? req.body.account_number.replace(/\s/g, '')
    : '';
  const bankCode = typeof req.body?.bank_code === 'string'
    ? req.body.bank_code
    : '';

  if (!/^\d{10}$/.test(accountNumber) || !/^\d{2,8}$/.test(bankCode)) {
    return json(req, res, 400, { error: 'Enter a valid 10-digit bank account and choose a bank' });
  }

  const { data: activePayout } = await supabase
    .from('driver_payout_requests')
    .select('id')
    .eq('driver_id', driver.id)
    .in('status', ['queued', 'otp', 'processing'])
    .limit(1)
    .maybeSingle();

  if (activePayout) {
    return json(req, res, 409, { error: 'Wait for your current withdrawal to finish before changing bank details' });
  }

  try {
    const resolveUrl = new URL(PAYSTACK_BASE + '/bank/resolve');
    resolveUrl.searchParams.set('account_number', accountNumber);
    resolveUrl.searchParams.set('bank_code', bankCode);

    const resolveResponse = await fetch(resolveUrl, {
      headers: { Authorization: 'Bearer ' + secret },
    });
    const resolved = await resolveResponse.json();

    if (!resolveResponse.ok || !resolved.status || !resolved.data?.account_name) {
      return json(req, res, 400, { error: 'Paystack could not verify those bank details. Check the bank and account number.' });
    }

    const bankResponse = await fetch(
      PAYSTACK_BASE + '/bank?country=nigeria&currency=NGN&perPage=100&page=1',
      { headers: { Authorization: 'Bearer ' + secret } },
    );
    const bankResult = await bankResponse.json();
    const bank = Array.isArray(bankResult.data)
      ? bankResult.data.find((item: any) => String(item.code) === bankCode)
      : null;
    if (!bankResponse.ok || !bankResult.status || !bank) {
      return json(req, res, 400, { error: 'Choose a valid Nigerian bank from the list' });
    }

    const recipientResponse = await fetch(PAYSTACK_BASE + '/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: String(resolved.data.account_name),
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
        description: 'Borix driver payout ' + driver.id,
      }),
    });
    const recipientResult = await recipientResponse.json();

    if (!recipientResponse.ok || !recipientResult.status || !recipientResult.data?.recipient_code) {
      return json(req, res, 502, { error: 'Paystack verified the account but could not prepare it for payouts' });
    }

    const { error: saveError } = await supabase
      .from('driver_payout_accounts')
      .upsert({
        driver_id: driver.id,
        recipient_code: String(recipientResult.data.recipient_code),
        bank_code: bankCode,
        bank_name: String(bank.name),
        account_name: String(resolved.data.account_name),
        account_number_last4: accountNumber.slice(-4),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'driver_id' });

    if (saveError) return json(req, res, 500, { error: 'Bank account was verified but could not be saved. Please try again.' });

    return json(req, res, 200, {
      account: {
        bank_code: bankCode,
        bank_name: String(bank.name),
        account_name: String(resolved.data.account_name),
        account_number_last4: accountNumber.slice(-4),
        updated_at: new Date().toISOString(),
      },
    });
  } catch {
    return json(req, res, 502, { error: 'Paystack bank verification is temporarily unavailable' });
  }
}

