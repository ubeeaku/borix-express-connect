import crypto from 'node:crypto';
import { adminClient } from '../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

// Public webhook — Paystack signature verification only, no CORS.
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature') || '';
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const supabase = adminClient();
  const type = event?.event;
  const data = event?.data ?? {};

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
    console.error('[paystack-webhook] handler error', e);
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
