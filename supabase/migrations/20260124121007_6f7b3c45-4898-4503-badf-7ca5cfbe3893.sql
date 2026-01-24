-- Create booked_seats table for seat selection
CREATE TABLE public.booked_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  seat_number INTEGER NOT NULL CHECK (seat_number >= 1 AND seat_number <= 5),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  travel_date DATE NOT NULL,
  departure_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent double booking of same seat
  UNIQUE (route_id, travel_date, departure_time, seat_number)
);

-- Enable RLS
ALTER TABLE public.booked_seats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booked_seats
-- Anyone can view booked seats (needed to show seat availability)
CREATE POLICY "Anyone can view booked seats"
  ON public.booked_seats
  FOR SELECT
  USING (true);

-- Admins can manage booked seats  
CREATE POLICY "Admins can insert booked seats"
  ON public.booked_seats
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update booked seats"
  ON public.booked_seats
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete booked seats"
  ON public.booked_seats
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Add index for fast seat availability lookups
CREATE INDEX idx_booked_seats_lookup 
  ON public.booked_seats (route_id, travel_date, departure_time);

-- Add INSERT policy for bookings (fixing security warning)
CREATE POLICY "Users can create own bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (passenger_email = (auth.jwt() ->> 'email'));

-- Add index for booking lookups
CREATE INDEX idx_bookings_search 
  ON public.bookings (booking_reference, passenger_name, passenger_email);

CREATE INDEX idx_bookings_date 
  ON public.bookings (travel_date, departure_time);