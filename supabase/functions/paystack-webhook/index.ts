import { createClient } from 'npm:@supabase/supabase-js@2';

// Public webhook — no CORS, no JWT check. Signature verification only.

async function hmacSha512Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const secret = Deno.env.get('PAYSTACK_WEBHOOK_SECRET') || Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature') || '';
  const expected = await hmacSha512Hex(secret, raw);
  if (!signature || !timingSafeEqual(signature, expected)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const type = event?.event;
  const data = event?.data ?? {};

  try {
    if (type === 'charge.success' && data.reference) {
      await supabase.from('bookings').update({ payment_status: 'completed' }).eq('booking_reference', data.reference);
    } else if (type === 'charge.failed' && data.reference) {
      await supabase.from('bookings').update({ payment_status: 'failed' }).eq('booking_reference', data.reference);
    } else if (type === 'refund.processed' && data.transaction?.reference) {
      await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('booking_reference', data.transaction.reference);
    }
  } catch (e) {
    console.error('[paystack-webhook] handler error', e);
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
