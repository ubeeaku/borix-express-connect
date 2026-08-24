import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  applyCors,
  json,
} from './_lib/supabase.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return json(req, res, 405, {
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, res, 503, {
      success: false,
      error: 'Supabase service unavailable',
    });
  }

  try {
    const supabase = adminClient();

    const { data, error } = await supabase
      .from('departures')
      .select(
        'id, route_id, travel_date, departure_time, price, commission_amount, total_seats, status'
      )
      .in('status', ['scheduled', 'boarding'])
      .order('travel_date', { ascending: true })
      .order('departure_time', { ascending: true });

    if (error) {
      console.error('[departures-health] Supabase error:', error);

      return json(req, res, 500, {
        success: false,
        error: 'Unable to load departures',
      });
    }

    return json(req, res, 200, {
      success: true,
      departures: data ?? [],
    });
  } catch (error) {
    console.error('[departures-health] Unexpected error:', error);

    return json(req, res, 500, {
      success: false,
      error: 'Unexpected server error',
    });
  }
}