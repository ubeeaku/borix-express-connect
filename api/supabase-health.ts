import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  corsHeaders,
} from './_lib/supabase.js';

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const headers = corsHeaders(req);

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  return res.status(200).json({
    success: true,
    supabase_url_present: Boolean(SUPABASE_URL),
    service_role_key_present: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    message: 'Shared Supabase module loaded successfully',
  });
}