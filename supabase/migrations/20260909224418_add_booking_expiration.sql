-- Add an expiration timestamp to pending bookings.
-- Bookings will expire 10 minutes after they are created.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Give existing pending bookings an expiration time.
-- This prevents existing pending bookings from remaining active forever.
UPDATE public.bookings
SET expires_at = created_at + INTERVAL '10 minutes'
WHERE payment_status = 'pending'
  AND expires_at IS NULL;

-- Automatically set expires_at for new bookings when it is not supplied.
ALTER TABLE public.bookings
ALTER COLUMN expires_at
SET DEFAULT (now() + INTERVAL '10 minutes');

-- Index used by the booking-expiration cron job.
CREATE INDEX IF NOT EXISTS bookings_pending_expiration_idx
ON public.bookings (expires_at)
WHERE payment_status = 'pending'
  AND expires_at IS NOT NULL;