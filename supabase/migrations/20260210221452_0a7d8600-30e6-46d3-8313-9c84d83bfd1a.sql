-- Make email nullable on driver_applications
ALTER TABLE public.driver_applications ALTER COLUMN email DROP NOT NULL;

-- Add 'driver' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

-- Create drivers table for approved drivers
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  application_id UUID REFERENCES public.driver_applications(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all drivers" ON public.drivers FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert drivers" ON public.drivers FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update drivers" ON public.drivers FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete drivers" ON public.drivers FOR DELETE USING (public.is_admin(auth.uid()));
CREATE POLICY "Drivers can view own record" ON public.drivers FOR SELECT USING (user_id = auth.uid());

-- Create driver_trips table
CREATE TABLE public.driver_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  route_id UUID REFERENCES public.routes(id) NOT NULL,
  trip_date DATE NOT NULL,
  departure_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  earnings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all trips" ON public.driver_trips FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Drivers can view own trips" ON public.driver_trips FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_trips.driver_id AND drivers.user_id = auth.uid())
);
CREATE POLICY "Drivers can update own trips" ON public.driver_trips FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_trips.driver_id AND drivers.user_id = auth.uid())
);

-- Create driver_earnings table
CREATE TABLE public.driver_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.driver_trips(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'trip',
  description TEXT,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage earnings" ON public.driver_earnings FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Drivers can view own earnings" ON public.driver_earnings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_earnings.driver_id AND drivers.user_id = auth.uid())
);

-- Create driver_notifications table
CREATE TABLE public.driver_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON public.driver_notifications FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Drivers can view own notifications" ON public.driver_notifications FOR SELECT USING (
  driver_id IS NULL OR EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_notifications.driver_id AND drivers.user_id = auth.uid())
);
CREATE POLICY "Drivers can update own notifications" ON public.driver_notifications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_notifications.driver_id AND drivers.user_id = auth.uid())
);
