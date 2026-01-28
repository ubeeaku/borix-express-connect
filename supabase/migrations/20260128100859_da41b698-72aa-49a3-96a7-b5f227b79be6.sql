-- Fix booked_seats RLS: Restrict read access to future trips only (within 90 days)
-- This prevents competitors from analyzing historical booking patterns

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view booked seats" ON public.booked_seats;

-- Create a more restrictive policy: only allow viewing seats for upcoming trips
CREATE POLICY "Anyone can view future booked seats"
  ON public.booked_seats FOR SELECT
  USING (travel_date >= CURRENT_DATE AND travel_date <= CURRENT_DATE + INTERVAL '90 days');