import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { getServiceClient, jsonError } from '../_lib/paystack';

// Read raw body so signature check matches Paystack's HMAC exactly.
export const config = { runtime: 'nodejs', api: { bodyParser: false } };

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('[paystack/webhook] no secret configured');
    return jsonError(res, 503, 'Webhook not configured');
  }

  let raw = '';
  try { raw = await readRawBody(req); }
  catch (e) { return jsonError(res, 400, 'Unable to read request body', String(e)); }

  const signature = String(req.headers['x-paystack-signature'] || '');
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  if (!signature || signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    console.error('[paystack/webhook] invalid signature');
    return jsonError(res, 401, 'Invalid signature');
  }

  let event: any;
  try { event = JSON.parse(raw); }
  catch { return jsonError(res, 400, 'Invalid JSON payload'); }

  const supabase = getServiceClient();
  const type = event?.event as string | undefined;
  const data = event?.data ?? {};
  console.log('[paystack/webhook]', type, data?.reference);

  try {
    if (type === 'charge.success' && data.reference) {
      await supabase
        .from('bookings')
        .update({ payment_status: 'completed' })
        .eq('booking_reference', data.reference);
    } else if (type === 'charge.failed' && data.reference) {
      await supabase
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('booking_reference', data.reference);
    } else if (type === 'refund.processed' && data.transaction?.reference) {
      await supabase
        .from('bookings')
        .update({ payment_status: 'refunded' })
        .eq('booking_reference', data.transaction.reference);
    }
  } catch (e) {
    console.error('[paystack/webhook] handler error', e);
    return jsonError(res, 500, 'Webhook handler failed');
  }

  return res.status(200).json({ success: true });
}
