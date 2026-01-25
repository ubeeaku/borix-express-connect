-- Fix 1: Block anonymous access to bookings table
-- Add explicit policy to deny anonymous SELECT
CREATE POLICY "Block anonymous access to bookings"
  ON public.bookings FOR SELECT
  TO anon
  USING (false);

-- Fix 2: Restrict booked_seats to authenticated users only (drop public access)
DROP POLICY IF EXISTS "Anyone can view booked seats" ON public.booked_seats;

-- Allow authenticated users to view seats for routes they're interested in
CREATE POLICY "Authenticated users can view booked seats"
  ON public.booked_seats FOR SELECT
  TO authenticated
  USING (true);

-- Fix 3 & 4: Add missing UPDATE and DELETE policies for bookings

-- Allow admins to update any booking
CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Allow admins to delete any booking
CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));