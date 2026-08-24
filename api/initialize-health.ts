import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  PAYSTACK_BASE,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
  corsHeaders,
  generateReference,
  json,
  prepareDeparture,
  validateBookingInput,
} from './_lib/supabase.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Exact same OPTIONS pattern as initialize.ts
  if (req.method === 'OPTIONS') {
    const headers = corsHeaders(req);

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return res.status(204).end();
  }

  // Exact same method check
  if (req.method !== 'POST') {
    return json(req, res, 405, {
      success: false,
      error: 'Method not allowed',
    });
  }

  return json(req, res, 200, {
    success: true,
    message: 'Initialize handler structure is working',
    paystack_base: PAYSTACK_BASE,
    supabase_url_present: Boolean(SUPABASE_URL),
    service_role_key_present: Boolean(SUPABASE_SERVICE_ROLE_KEY),
  });
}