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

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    success: true,
    message: 'Paystack initialize imports loaded',
    paystack_base: PAYSTACK_BASE,
    supabase_url_present: Boolean(SUPABASE_URL),
    service_role_key_present: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    functions_loaded: {
      adminClient: typeof adminClient === 'function',
      corsHeaders: typeof corsHeaders === 'function',
      generateReference: typeof generateReference === 'function',
      json: typeof json === 'function',
      prepareDeparture: typeof prepareDeparture === 'function',
      validateBookingInput: typeof validateBookingInput === 'function',
    },
  });
}