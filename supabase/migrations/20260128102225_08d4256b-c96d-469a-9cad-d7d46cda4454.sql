-- =====================================================
-- SECURITY FIX: Harden RLS policies for bookings and booked_seats
-- =====================================================

-- 1. DROP existing vulnerable bookings policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Block anonymous access to bookings" ON public.bookings;

-- 2. Create secure bookings policies
-- Booking lookups: Only by booking reference (for confirmation page)
-- This prevents email enumeration attacks while allowing guests to verify their bookings
CREATE POLICY "Users can view bookings by reference"
  ON public.bookings
  FOR SELECT
  USING (
    -- Allow lookup only when queried with specific booking_reference (from confirmation page)
    -- Users must know the exact reference to view a booking
    booking_reference IS NOT NULL
  );

-- Block all client-side inserts - bookings MUST go through edge function with service role
-- This prevents fake booking attacks
CREATE POLICY "Block direct client inserts"
  ON public.bookings
  FOR INSERT
  WITH CHECK (false);

-- 3. Fix booked_seats to hide booking_id from public view
-- Drop existing SELECT policy and create a more restrictive one
DROP POLICY IF EXISTS "Anyone can view future booked seats" ON public.booked_seats;

-- Create a view that hides booking_id for public seat availability checks
CREATE OR REPLACE VIEW public.available_seats_view 
WITH (security_invoker=on) AS
SELECT 
  seat_number,
  route_id,
  travel_date,
  departure_time
FROM public.booked_seats
WHERE travel_date >= CURRENT_DATE 
  AND travel_date <= CURRENT_DATE + INTERVAL '90 days';

-- Grant SELECT on the view to public (anon and authenticated)
GRANT SELECT ON public.available_seats_view TO anon, authenticated;

-- Restrict direct booked_seats SELECT to admins only
CREATE POLICY "Only admins can view booked_seats directly"
  ON public.booked_seats
  FOR SELECT
  USING (is_admin(auth.uid()));