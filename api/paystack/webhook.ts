import crypto from 'node:crypto';

import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  adminClient,
} from '../_lib/supabase.js';

export const config = { runtime: 'nodejs' };

// Paystack webhook.
// No CORS is required because this endpoint is called by Paystack.
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed',
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const secret =
    process.env.PAYSTACK_SECRET_KEY;

  if (
    !secret ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Webhook not configured',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Read raw request body.
  // Signature must be calculated from the exact raw body.
  const raw = await req.text();

  const signature =
    req.headers.get('x-paystack-signature') || '';

  const expected = crypto
    .createHmac('sha512', secret)
    .update(raw)
    .digest('hex');

  const sigBuf = Buffer.from(
    signature,
    'utf8'
  );

  const expectedBuf = Buffer.from(
    expected,
    'utf8'
  );

  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(
      sigBuf,
      expectedBuf
    )
  ) {
    console.error(
      '[paystack-webhook] Invalid signature'
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid signature',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Parse event.
  let event: any;

  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid JSON',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const type = event?.event;
  const data = event?.data ?? {};

  console.log(
    '[paystack-webhook] Event:',
    type,
    'Reference:',
    data?.reference
  );

  const supabase = adminClient();

  try {
    /*
     * Successful payment
     */
    if (
      type === 'charge.success' &&
      data.reference
    ) {
      const reference =
        String(data.reference);

      // Only process Borix booking references.
      if (
        !/^BRX-[A-Z0-9]{12}$/.test(reference)
      ) {
        console.warn(
          '[paystack-webhook] Ignoring non-Borix reference:',
          reference
        );

        return new Response(
          JSON.stringify({
            success: true,
            ignored: true,
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      // Load booking.
      const {
        data: booking,
        error: bookingError,
      } = await supabase
        .from('bookings')
        .select(
          'id, booking_reference, total_amount, payment_status'
        )
        .eq(
          'booking_reference',
          reference
        )
        .maybeSingle();

      if (bookingError) {
        console.error(
          '[paystack-webhook] Booking lookup error:',
          bookingError
        );

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Booking lookup failed',
          }),
          {
            status: 500,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      if (!booking) {
        console.error(
          '[paystack-webhook] Booking not found:',
          reference
        );

        // Return 200 so Paystack doesn't endlessly
        // retry an event for a nonexistent booking.
        return new Response(
          JSON.stringify({
            success: true,
            ignored: true,
            reason: 'Booking not found',
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      // Verify Paystack amount against booking.
      const expectedAmountKobo =
        Math.round(
          Number(booking.total_amount) * 100
        );

      const paidAmountKobo =
        Number(data.amount);

      if (
        !Number.isFinite(paidAmountKobo) ||
        paidAmountKobo !==
          expectedAmountKobo
      ) {
        console.error(
          '[paystack-webhook] Amount mismatch:',
          {
            reference,
            expectedAmountKobo,
            paidAmountKobo,
          }
        );

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Payment amount mismatch',
          }),
          {
            status: 400,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      // Verify currency.
      if (
        data.currency &&
        data.currency !== 'NGN'
      ) {
        console.error(
          '[paystack-webhook] Currency mismatch:',
          data.currency
        );

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid payment currency',
          }),
          {
            status: 400,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      // Idempotency:
      // If already completed, don't need to do anything.
      if (
        booking.payment_status !==
        'completed'
      ) {
        const {
          error: updateError,
        } = await supabase
          .from('bookings')
          .update({
            payment_status:
              'completed',
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(
            '[paystack-webhook] Booking update error:',
            updateError
          );

          return new Response(
            JSON.stringify({
              success: false,
              error:
                'Unable to update booking',
            }),
            {
              status: 500,
              headers: {
                'Content-Type':
                  'application/json',
              },
            }
          );
        }
      }
    }

    /*
     * Failed payment
     */
    else if (
      type === 'charge.failed' &&
      data.reference
    ) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'failed',
        })
        .eq(
          'booking_reference',
          String(data.reference)
        );
    }

    /*
     * Refund
     */
    else if (
      type === 'refund.processed' &&
      data.transaction?.reference
    ) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'refunded',
        })
        .eq(
          'booking_reference',
          String(
            data.transaction.reference
          )
        );
    }

    /*
     * Other Paystack events
     *
     * We acknowledge them successfully.
     * We don't need to process every event.
     */
  } catch (error) {
    console.error(
      '[paystack-webhook] Handler error:',
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Webhook handler failed',
      }),
      {
        status: 500,
        headers: {
          'Content-Type':
            'application/json',
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
    }),
    {
      status: 200,
      headers: {
        'Content-Type':
          'application/json',
      },
    }
  );
}