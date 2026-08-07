
-- =========================================================================
-- PHASE 1: Departure marketplace data model
-- =========================================================================

-- ---------- PARKS ----------
CREATE TABLE public.parks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  address text,
  contact_phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.parks TO authenticated;
GRANT ALL ON public.parks TO service_role;
ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active parks" ON public.parks
  FOR SELECT USING (status = 'active' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage parks insert" ON public.parks
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage parks update" ON public.parks
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage parks delete" ON public.parks
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


-- ---------- VEHICLES ----------
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('sienna','hiace','coaster')),
  plate_number text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0 AND capacity <= 60),
  year integer,
  color text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plate_number)
);
GRANT SELECT ON public.vehicles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vehicles" ON public.vehicles
  FOR SELECT USING (status = 'active' OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = vehicles.driver_id AND d.user_id = auth.uid()));
CREATE POLICY "Drivers can insert own vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "Drivers can update own vehicles" ON public.vehicles
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "Admins/drivers can delete vehicles" ON public.vehicles
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );


-- ---------- DEPARTURES ----------
CREATE TABLE public.departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE RESTRICT,
  park_id uuid NOT NULL REFERENCES public.parks(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  travel_date date NOT NULL,
  departure_time text NOT NULL,
  total_seats integer NOT NULL CHECK (total_seats > 0),
  price integer NOT NULL CHECK (price > 0),
  commission_amount integer NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','boarding','in_transit','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX departures_lookup_idx ON public.departures (travel_date, route_id, status);
GRANT SELECT ON public.departures TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.departures TO authenticated;
GRANT ALL ON public.departures TO service_role;
ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scheduled departures" ON public.departures
  FOR SELECT USING (
    status IN ('scheduled','boarding','in_transit')
    OR public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = departures.driver_id AND d.user_id = auth.uid())
  );
CREATE POLICY "Drivers/admins insert departures" ON public.departures
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
  );
CREATE POLICY "Drivers/admins update departures" ON public.departures
  FOR UPDATE TO authenticated USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
  );
CREATE POLICY "Admins delete departures" ON public.departures
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


-- ---------- SEAT HOLDS (10-minute soft reservations) ----------
CREATE TABLE public.seat_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  seat_number integer NOT NULL,
  session_id text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seat_holds_active_idx ON public.seat_holds (departure_id, expires_at);
GRANT SELECT, INSERT, DELETE ON public.seat_holds TO anon, authenticated;
GRANT ALL ON public.seat_holds TO service_role;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;

-- Public can view active holds (no PII), insert/delete via edge function (service role)
CREATE POLICY "Anyone can view active seat holds" ON public.seat_holds
  FOR SELECT USING (expires_at > now());
CREATE POLICY "Anyone can create seat holds" ON public.seat_holds
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete own seat holds" ON public.seat_holds
  FOR DELETE USING (true);


-- ---------- PLATFORM SETTINGS ----------
CREATE TABLE public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true), -- singleton row
  default_commission_amount integer NOT NULL DEFAULT 2000 CHECK (default_commission_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings" ON public.platform_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins update platform settings" ON public.platform_settings
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert platform settings" ON public.platform_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.platform_settings (id, default_commission_amount) VALUES (true, 2000)
  ON CONFLICT (id) DO NOTHING;


-- ---------- EXTEND EXISTING TABLES ----------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS departure_id uuid REFERENCES public.departures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_amount integer,
  ADD COLUMN IF NOT EXISTS platform_commission integer;
CREATE INDEX IF NOT EXISTS bookings_departure_idx ON public.bookings (departure_id);

ALTER TABLE public.booked_seats
  ADD COLUMN IF NOT EXISTS departure_id uuid REFERENCES public.departures(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS booked_seats_departure_idx ON public.booked_seats (departure_id);

-- Prevent double-booking the same seat on the same departure
CREATE UNIQUE INDEX IF NOT EXISTS booked_seats_departure_seat_unique
  ON public.booked_seats (departure_id, seat_number)
  WHERE departure_id IS NOT NULL;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS total_trips integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_photo_url text;


-- ---------- updated_at triggers ----------
CREATE TRIGGER parks_updated_at BEFORE UPDATE ON public.parks
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();
CREATE TRIGGER departures_updated_at BEFORE UPDATE ON public.departures
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();
CREATE TRIGGER platform_settings_updated_at BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();


-- ---------- AVAILABLE SEATS VIEW for new departures ----------
-- Drop & recreate to support both legacy + new departure-based bookings
DROP VIEW IF EXISTS public.departure_taken_seats;
CREATE VIEW public.departure_taken_seats AS
  SELECT departure_id, seat_number, 'booked'::text AS source
  FROM public.booked_seats
  WHERE departure_id IS NOT NULL
  UNION ALL
  SELECT departure_id, seat_number, 'held'::text AS source
  FROM public.seat_holds
  WHERE expires_at > now();

GRANT SELECT ON public.departure_taken_seats TO anon, authenticated;


-- ---------- SEED SAMPLE PARKS ----------
INSERT INTO public.parks (name, city, address, contact_phone, status) VALUES
  ('Terminus Park', 'Jos', 'Terminus, Jos North', '+2348012345001', 'active'),
  ('Bauchi Road Park', 'Jos', 'Bauchi Road, Jos', '+2348012345002', 'active'),
  ('Bukuru Park', 'Jos', 'Bukuru, Jos South', '+2348012345003', 'active'),
  ('Rayfield Park', 'Jos', 'Rayfield, Jos South', '+2348012345004', 'active'),
  ('Utako Park', 'Abuja', 'Utako, FCT', '+2348012345005', 'active'),
  ('Jabi Park', 'Abuja', 'Jabi, FCT', '+2348012345006', 'active')
ON CONFLICT DO NOTHING;
