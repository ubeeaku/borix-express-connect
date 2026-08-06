-- =========================================================
-- Borix Express - full backend schema
-- Run this ONCE in your own Supabase project (SQL Editor).
-- Order: 1) this file  2) 02_seed.sql  3) create your admin user
-- =========================================================

\restrict 0oX7TsFiJFmKuvCl0vljPqB5jV4mqcW0XabyeHzmLAeqgJsrgSjxwpVgZF4Qsa6

CREATE SCHEMA app_private;

CREATE SCHEMA public;

COMMENT ON SCHEMA public IS 'standard public schema';

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'driver'
);

CREATE TYPE public.driver_application_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'suspended'
);

CREATE TYPE public.vehicle_ownership_type AS ENUM (
    'own_sienna',
    'own_sharon',
    'partnership'
);

CREATE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;

CREATE FUNCTION app_private.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE app_private.has_role(_user_id, 'admin')
  END
$$;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;

COMMENT ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) IS 'Security-critical: Checks if user has specified role. Uses SECURITY DEFINER to bypass RLS. Null user_id always returns false.';

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE public.has_role(_user_id, 'admin')
  END
$$;

COMMENT ON FUNCTION public.is_admin(_user_id uuid) IS 'Security-critical: Checks if user is admin. Uses SECURITY DEFINER to bypass RLS. Null user_id always returns false.';

CREATE FUNCTION public.update_wallet_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.booked_seats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    seat_number integer NOT NULL,
    route_id uuid NOT NULL,
    travel_date date NOT NULL,
    departure_time text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    departure_id uuid,
    CONSTRAINT booked_seats_seat_number_check CHECK (((seat_number >= 1) AND (seat_number <= 5)))
);

CREATE VIEW public.available_seats_view WITH (security_invoker='true') AS
 SELECT seat_number,
    route_id,
    travel_date,
    departure_time
   FROM public.booked_seats
  WHERE ((travel_date >= CURRENT_DATE) AND (travel_date <= (CURRENT_DATE + '90 days'::interval)));

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_reference text NOT NULL,
    route_id uuid NOT NULL,
    passenger_name text NOT NULL,
    passenger_email text NOT NULL,
    passenger_phone text NOT NULL,
    travel_date date NOT NULL,
    departure_time text NOT NULL,
    number_of_seats integer NOT NULL,
    total_amount integer NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    next_of_kin_name text,
    next_of_kin_phone text,
    departure_id uuid,
    driver_amount integer,
    platform_commission integer
);

CREATE TABLE public.seat_holds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    departure_id uuid NOT NULL,
    seat_number integer NOT NULL,
    session_id text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE VIEW public.departure_taken_seats WITH (security_invoker='true') AS
 SELECT booked_seats.departure_id,
    booked_seats.seat_number,
    'booked'::text AS source
   FROM public.booked_seats
  WHERE (booked_seats.departure_id IS NOT NULL)
UNION ALL
 SELECT seat_holds.departure_id,
    seat_holds.seat_number,
    'held'::text AS source
   FROM public.seat_holds
  WHERE (seat_holds.expires_at > now());

CREATE TABLE public.departures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id uuid NOT NULL,
    park_id uuid NOT NULL,
    driver_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    travel_date date NOT NULL,
    departure_time text NOT NULL,
    total_seats integer NOT NULL,
    price integer NOT NULL,
    commission_amount integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT departures_commission_amount_check CHECK ((commission_amount >= 0)),
    CONSTRAINT departures_price_check CHECK ((price > 0)),
    CONSTRAINT departures_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'boarding'::text, 'in_transit'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT departures_total_seats_check CHECK ((total_seats > 0))
);

CREATE TABLE public.driver_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    address text NOT NULL,
    state text NOT NULL,
    city text NOT NULL,
    years_experience integer DEFAULT 0 NOT NULL,
    vehicle_ownership public.vehicle_ownership_type NOT NULL,
    vehicle_details text,
    guarantor_name text NOT NULL,
    guarantor_phone text NOT NULL,
    guarantor_address text,
    guarantor_relationship text,
    bank_account_name text NOT NULL,
    bank_name text NOT NULL,
    bank_account_number text NOT NULL,
    drivers_license_url text,
    nin_url text,
    passport_photo_url text,
    vehicle_papers_url text,
    roadworthiness_url text,
    status public.driver_application_status DEFAULT 'pending'::public.driver_application_status NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.driver_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    trip_id uuid,
    amount integer NOT NULL,
    type text DEFAULT 'trip'::text NOT NULL,
    description text,
    paid boolean DEFAULT false,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.driver_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'general'::text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.driver_trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    route_id uuid NOT NULL,
    trip_date date NOT NULL,
    departure_time text NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    accepted_at timestamp with time zone,
    completed_at timestamp with time zone,
    earnings integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    application_id uuid,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rating numeric(3,2) DEFAULT 5.00,
    total_trips integer DEFAULT 0 NOT NULL,
    profile_photo_url text,
    CONSTRAINT drivers_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);

CREATE TABLE public.parks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    address text,
    contact_phone text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT parks_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);

CREATE TABLE public.platform_settings (
    id boolean DEFAULT true NOT NULL,
    default_commission_amount integer DEFAULT 2000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_settings_default_commission_amount_check CHECK ((default_commission_amount >= 0)),
    CONSTRAINT platform_settings_id_check CHECK ((id = true))
);

CREATE TABLE public.routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    price integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    vehicle_type text NOT NULL,
    plate_number text NOT NULL,
    capacity integer NOT NULL,
    year integer,
    color text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vehicles_capacity_check CHECK (((capacity > 0) AND (capacity <= 60))),
    CONSTRAINT vehicles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text]))),
    CONSTRAINT vehicles_vehicle_type_check CHECK ((vehicle_type = ANY (ARRAY['sienna'::text, 'hiace'::text, 'coaster'::text])))
);

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL,
    description text,
    booking_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_transactions_type_check CHECK ((type = ANY (ARRAY['credit'::text, 'debit'::text])))
);

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.booked_seats
    ADD CONSTRAINT booked_seats_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.booked_seats
    ADD CONSTRAINT booked_seats_route_id_travel_date_departure_time_seat_numbe_key UNIQUE (route_id, travel_date, departure_time, seat_number);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booking_reference_key UNIQUE (booking_reference);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.departures
    ADD CONSTRAINT departures_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_applications
    ADD CONSTRAINT driver_applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_earnings
    ADD CONSTRAINT driver_earnings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_notifications
    ADD CONSTRAINT driver_notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_trips
    ADD CONSTRAINT driver_trips_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.parks
    ADD CONSTRAINT parks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.seat_holds
    ADD CONSTRAINT seat_holds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_plate_number_key UNIQUE (plate_number);

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);

CREATE INDEX booked_seats_departure_idx ON public.booked_seats USING btree (departure_id);

CREATE UNIQUE INDEX booked_seats_departure_seat_unique ON public.booked_seats USING btree (departure_id, seat_number) WHERE (departure_id IS NOT NULL);

CREATE INDEX bookings_departure_idx ON public.bookings USING btree (departure_id);

CREATE INDEX departures_lookup_idx ON public.departures USING btree (travel_date, route_id, status);

CREATE UNIQUE INDEX drivers_user_id_unique_when_set ON public.drivers USING btree (user_id) WHERE (user_id IS NOT NULL);

CREATE INDEX idx_booked_seats_lookup ON public.booked_seats USING btree (route_id, travel_date, departure_time);

CREATE INDEX idx_bookings_date ON public.bookings USING btree (travel_date, departure_time);

CREATE INDEX idx_bookings_search ON public.bookings USING btree (booking_reference, passenger_name, passenger_email);

CREATE INDEX seat_holds_active_idx ON public.seat_holds USING btree (departure_id, expires_at);

CREATE TRIGGER departures_updated_at BEFORE UPDATE ON public.departures FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();

CREATE TRIGGER parks_updated_at BEFORE UPDATE ON public.parks FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();

CREATE TRIGGER platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();

CREATE TRIGGER update_driver_applications_updated_at BEFORE UPDATE ON public.driver_applications FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_wallet_updated_at();

ALTER TABLE ONLY public.booked_seats
    ADD CONSTRAINT booked_seats_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.booked_seats
    ADD CONSTRAINT booked_seats_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.booked_seats
    ADD CONSTRAINT booked_seats_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);

ALTER TABLE ONLY public.departures
    ADD CONSTRAINT departures_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.departures
    ADD CONSTRAINT departures_park_id_fkey FOREIGN KEY (park_id) REFERENCES public.parks(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.departures
    ADD CONSTRAINT departures_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.departures
    ADD CONSTRAINT departures_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.driver_earnings
    ADD CONSTRAINT driver_earnings_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_earnings
    ADD CONSTRAINT driver_earnings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.driver_trips(id);

ALTER TABLE ONLY public.driver_notifications
    ADD CONSTRAINT driver_notifications_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_trips
    ADD CONSTRAINT driver_trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.driver_trips
    ADD CONSTRAINT driver_trips_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.driver_applications(id);

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.seat_holds
    ADD CONSTRAINT seat_holds_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;

CREATE POLICY "Admins can delete applications" ON public.driver_applications FOR DELETE USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can delete booked seats" ON public.booked_seats FOR DELETE USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can delete drivers" ON public.drivers FOR DELETE USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can delete routes" ON public.routes FOR DELETE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can insert booked seats" ON public.booked_seats FOR INSERT WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can insert drivers" ON public.drivers FOR INSERT WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can insert routes" ON public.routes FOR INSERT TO authenticated WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can insert transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can insert wallets" ON public.wallets FOR INSERT WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all trips" ON public.driver_trips USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can manage earnings" ON public.driver_earnings USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can manage notifications" ON public.driver_notifications USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can update applications" ON public.driver_applications FOR UPDATE USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can update booked seats" ON public.booked_seats FOR UPDATE USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can update drivers" ON public.drivers FOR UPDATE USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can update routes" ON public.routes FOR UPDATE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can update wallets" ON public.wallets FOR UPDATE USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can view all applications" ON public.driver_applications FOR SELECT USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can view all drivers" ON public.drivers FOR SELECT USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins delete departures" ON public.departures FOR DELETE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins insert platform settings" ON public.platform_settings FOR INSERT TO authenticated WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins manage parks delete" ON public.parks FOR DELETE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins manage parks insert" ON public.parks FOR INSERT TO authenticated WITH CHECK (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins manage parks update" ON public.parks FOR UPDATE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins update platform settings" ON public.platform_settings FOR UPDATE TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Admins/drivers can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.drivers d
  WHERE ((d.id = vehicles.driver_id) AND (d.user_id = auth.uid())))) OR app_private.is_admin(auth.uid())));

CREATE POLICY "Anyone can create seat holds" ON public.seat_holds FOR INSERT WITH CHECK ((((length(COALESCE(session_id, ''::text)) >= 8) AND (length(COALESCE(session_id, ''::text)) <= 128)) AND (expires_at > now()) AND (expires_at < (now() + '00:30:00'::interval))));

CREATE POLICY "Anyone can read platform settings" ON public.platform_settings FOR SELECT USING (true);

CREATE POLICY "Anyone can submit driver application" ON public.driver_applications FOR INSERT WITH CHECK ((((length(COALESCE(full_name, ''::text)) >= 2) AND (length(COALESCE(full_name, ''::text)) <= 200)) AND ((length(COALESCE(phone, ''::text)) >= 6) AND (length(COALESCE(phone, ''::text)) <= 20))));

CREATE POLICY "Anyone can view active parks" ON public.parks FOR SELECT USING (((status = 'active'::text) OR app_private.is_admin(auth.uid())));

CREATE POLICY "Anyone can view active seat holds" ON public.seat_holds FOR SELECT USING ((expires_at > now()));

CREATE POLICY "Anyone can view active vehicles" ON public.vehicles FOR SELECT USING (((status = 'active'::text) OR app_private.is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.drivers d
  WHERE ((d.id = vehicles.driver_id) AND (d.user_id = auth.uid()))))));

CREATE POLICY "Anyone can view routes" ON public.routes FOR SELECT USING (true);

CREATE POLICY "Anyone can view scheduled departures" ON public.departures FOR SELECT USING (((status = ANY (ARRAY['scheduled'::text, 'boarding'::text, 'in_transit'::text])) OR app_private.is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.drivers d
  WHERE ((d.id = departures.driver_id) AND (d.user_id = auth.uid()))))));

CREATE POLICY "Block direct client inserts" ON public.bookings FOR INSERT WITH CHECK (false);

CREATE POLICY "Drivers can insert own vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.drivers d
  WHERE ((d.id = vehicles.driver_id) AND (d.user_id = auth.uid())))) OR app_private.is_admin(auth.uid())));

CREATE POLICY "Drivers can update own notifications" ON public.driver_notifications FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_notifications.driver_id) AND (drivers.user_id = auth.uid())))));

CREATE POLICY "Drivers can update own trips" ON public.driver_trips FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_trips.driver_id) AND (drivers.user_id = auth.uid())))));

CREATE POLICY "Drivers can update own vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.drivers d
  WHERE ((d.id = vehicles.driver_id) AND (d.user_id = auth.uid())))) OR app_private.is_admin(auth.uid())));

CREATE POLICY "Drivers can view own earnings" ON public.driver_earnings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_earnings.driver_id) AND (drivers.user_id = auth.uid())))));

CREATE POLICY "Drivers can view own notifications" ON public.driver_notifications FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_notifications.driver_id) AND (drivers.user_id = auth.uid())))) OR ((driver_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.drivers
  WHERE (drivers.user_id = auth.uid()))))));

CREATE POLICY "Drivers can view own record" ON public.drivers FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY "Drivers can view own trips" ON public.driver_trips FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_trips.driver_id) AND (drivers.user_id = auth.uid())))));

CREATE POLICY "Drivers/admins insert departures" ON public.departures FOR INSERT TO authenticated WITH CHECK ((app_private.is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.drivers d
  WHERE ((d.id = departures.driver_id) AND (d.user_id = auth.uid()))))));

CREATE POLICY "Drivers/admins update departures" ON public.departures FOR UPDATE TO authenticated USING ((app_private.is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.drivers d
  WHERE ((d.id = departures.driver_id) AND (d.user_id = auth.uid()))))));

CREATE POLICY "Only admins can view booked_seats directly" ON public.booked_seats FOR SELECT USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Only admins can view bookings directly" ON public.bookings FOR SELECT USING (app_private.is_admin(auth.uid()));

CREATE POLICY "Session owners can delete their seat holds" ON public.seat_holds FOR DELETE USING (((length(COALESCE(session_id, ''::text)) >= 8) AND (session_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'session_id'::text))));

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.wallets
  WHERE ((wallets.id = wallet_transactions.wallet_id) AND (wallets.user_id = auth.uid())))));

CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING ((user_id = auth.uid()));

ALTER TABLE public.booked_seats ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.driver_notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.driver_trips ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA app_private TO anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO sandbox_exec;

GRANT ALL ON FUNCTION app_private.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION app_private.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION app_private.has_role(_user_id uuid, _role public.app_role) TO service_role;

GRANT ALL ON FUNCTION app_private.is_admin(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION app_private.is_admin(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION app_private.is_admin(_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;

REVOKE ALL ON FUNCTION public.is_admin(_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_admin(_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.update_wallet_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_wallet_updated_at() TO service_role;

GRANT ALL ON TABLE public.booked_seats TO anon;
GRANT ALL ON TABLE public.booked_seats TO authenticated;
GRANT ALL ON TABLE public.booked_seats TO service_role;
GRANT SELECT,INSERT ON TABLE public.booked_seats TO sandbox_exec;

GRANT ALL ON TABLE public.available_seats_view TO anon;
GRANT ALL ON TABLE public.available_seats_view TO authenticated;
GRANT ALL ON TABLE public.available_seats_view TO service_role;
GRANT SELECT,INSERT ON TABLE public.available_seats_view TO sandbox_exec;

GRANT ALL ON TABLE public.bookings TO anon;
GRANT ALL ON TABLE public.bookings TO authenticated;
GRANT ALL ON TABLE public.bookings TO service_role;
GRANT SELECT,INSERT ON TABLE public.bookings TO sandbox_exec;

GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.seat_holds TO anon;
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.seat_holds TO authenticated;
GRANT ALL ON TABLE public.seat_holds TO service_role;
GRANT SELECT,INSERT ON TABLE public.seat_holds TO sandbox_exec;

GRANT ALL ON TABLE public.departure_taken_seats TO anon;
GRANT ALL ON TABLE public.departure_taken_seats TO authenticated;
GRANT ALL ON TABLE public.departure_taken_seats TO service_role;
GRANT SELECT,INSERT ON TABLE public.departure_taken_seats TO sandbox_exec;

GRANT ALL ON TABLE public.departures TO anon;
GRANT ALL ON TABLE public.departures TO authenticated;
GRANT ALL ON TABLE public.departures TO service_role;
GRANT SELECT,INSERT ON TABLE public.departures TO sandbox_exec;

GRANT ALL ON TABLE public.driver_applications TO anon;
GRANT ALL ON TABLE public.driver_applications TO authenticated;
GRANT ALL ON TABLE public.driver_applications TO service_role;
GRANT SELECT,INSERT ON TABLE public.driver_applications TO sandbox_exec;

GRANT ALL ON TABLE public.driver_earnings TO anon;
GRANT ALL ON TABLE public.driver_earnings TO authenticated;
GRANT ALL ON TABLE public.driver_earnings TO service_role;
GRANT SELECT,INSERT ON TABLE public.driver_earnings TO sandbox_exec;

GRANT ALL ON TABLE public.driver_notifications TO anon;
GRANT ALL ON TABLE public.driver_notifications TO authenticated;
GRANT ALL ON TABLE public.driver_notifications TO service_role;
GRANT SELECT,INSERT ON TABLE public.driver_notifications TO sandbox_exec;

GRANT ALL ON TABLE public.driver_trips TO anon;
GRANT ALL ON TABLE public.driver_trips TO authenticated;
GRANT ALL ON TABLE public.driver_trips TO service_role;
GRANT SELECT,INSERT ON TABLE public.driver_trips TO sandbox_exec;

GRANT ALL ON TABLE public.drivers TO anon;
GRANT ALL ON TABLE public.drivers TO authenticated;
GRANT ALL ON TABLE public.drivers TO service_role;
GRANT SELECT,INSERT ON TABLE public.drivers TO sandbox_exec;

GRANT ALL ON TABLE public.parks TO anon;
GRANT ALL ON TABLE public.parks TO authenticated;
GRANT ALL ON TABLE public.parks TO service_role;
GRANT SELECT,INSERT ON TABLE public.parks TO sandbox_exec;

GRANT ALL ON TABLE public.platform_settings TO anon;
GRANT ALL ON TABLE public.platform_settings TO authenticated;
GRANT ALL ON TABLE public.platform_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.platform_settings TO sandbox_exec;

GRANT ALL ON TABLE public.routes TO anon;
GRANT ALL ON TABLE public.routes TO authenticated;
GRANT ALL ON TABLE public.routes TO service_role;
GRANT SELECT,INSERT ON TABLE public.routes TO sandbox_exec;

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_roles TO sandbox_exec;

GRANT ALL ON TABLE public.vehicles TO anon;
GRANT ALL ON TABLE public.vehicles TO authenticated;
GRANT ALL ON TABLE public.vehicles TO service_role;
GRANT SELECT,INSERT ON TABLE public.vehicles TO sandbox_exec;

GRANT ALL ON TABLE public.wallet_transactions TO anon;
GRANT ALL ON TABLE public.wallet_transactions TO authenticated;
GRANT ALL ON TABLE public.wallet_transactions TO service_role;
GRANT SELECT,INSERT ON TABLE public.wallet_transactions TO sandbox_exec;

GRANT ALL ON TABLE public.wallets TO anon;
GRANT ALL ON TABLE public.wallets TO authenticated;
GRANT ALL ON TABLE public.wallets TO service_role;
GRANT SELECT,INSERT ON TABLE public.wallets TO sandbox_exec;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO sandbox_exec;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT ON TABLES TO sandbox_exec;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;

\unrestrict 0oX7TsFiJFmKuvCl0vljPqB5jV4mqcW0XabyeHzmLAeqgJsrgSjxwpVgZF4Qsa6


-- =========================================================
-- Storage: driver-documents bucket (private) + policies
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Applicants can upload to unique application folder" ON storage.objects;
CREATE POLICY "Applicants can upload to unique application folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = 'applications'
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND array_length(storage.foldername(name), 1) = 2
);

DROP POLICY IF EXISTS "Admins can view driver documents" ON storage.objects;
CREATE POLICY "Admins can view driver documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-documents' AND app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update driver documents" ON storage.objects;
CREATE POLICY "Admins can update driver documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'driver-documents' AND app_private.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'driver-documents' AND app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete driver documents" ON storage.objects;
CREATE POLICY "Admins can delete driver documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'driver-documents' AND app_private.is_admin(auth.uid()));
