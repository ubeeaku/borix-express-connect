
-- Recreate the view with security_invoker so it respects the caller's RLS, not the owner's.
DROP VIEW IF EXISTS public.departure_taken_seats;
CREATE VIEW public.departure_taken_seats
WITH (security_invoker = true) AS
  SELECT departure_id, seat_number, 'booked'::text AS source
  FROM public.booked_seats
  WHERE departure_id IS NOT NULL
  UNION ALL
  SELECT departure_id, seat_number, 'held'::text AS source
  FROM public.seat_holds
  WHERE expires_at > now();

GRANT SELECT ON public.departure_taken_seats TO anon, authenticated;
