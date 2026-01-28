-- =====================================================
-- SECURITY FIX: Block all public access to bookings table
-- Bookings must ONLY be accessed via secure edge functions
-- =====================================================

-- 1. DROP the vulnerable policy that exposes all bookings
DROP POLICY IF EXISTS "Users can view bookings by reference" ON public.bookings;

-- 2. Block all anonymous/authenticated SELECT access 
-- Only admins can directly query bookings table
-- Guest booking lookups go through edge function with Paystack verification
CREATE POLICY "Only admins can view bookings directly"
  ON public.bookings
  FOR SELECT
  USING (is_admin(auth.uid()));