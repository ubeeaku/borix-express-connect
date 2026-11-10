import {
  PAYSTACK_BASE,
  adminClient,
  getUserFromRequest,
  json,
} from '../../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return json(req, res, 200, { success: true });
  if (req.method !== 'GET') return json(req, res, 405, { error: 'Method not allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return json(req, res, 401, { error: 'Sign in as a driver to continue' });

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return json(req, res, 503, { error: 'Bank payout service is not configured' });

  const supabase = adminClient();
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (driverError || !driver) return json(req, res, 403, { error: 'Active driver profile not found' });

  try {
    const banks: Array<{ name: string; code: string }> = [];
    for (let page = 1; page <= 5; page += 1) {
      const response = await fetch(
        PAYSTACK_BASE + '/bank?country=nigeria&currency=NGN&perPage=100&page=' + page,
        { headers: { Authorization: 'Bearer ' + secret } },
      );
      const result = await response.json();
      if (!response.ok || !result.status || !Array.isArray(result.data)) {
        return json(req, res, 502, { error: 'Could not load Nigerian banks from Paystack' });
      }
      banks.push(...result.data
        .filter((bank: any) => bank.active !== false && bank.code && bank.name)
        .map((bank: any) => ({ name: String(bank.name), code: String(bank.code) })));
      if (result.data.length < 100) break;
    }

    const uniqueBanks = [...new Map(banks.map((bank) => [bank.code, bank])).values()]
      .sort((a, b) => a.name.localeCompare(b.name));
    return json(req, res, 200, { banks: uniqueBanks });
  } catch {
    return json(req, res, 502, { error: 'Could not load Nigerian banks from Paystack' });
  }
}

