-- Driver-declared trips are proposals until an administrator approves them.
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS destination_park_id uuid REFERENCES public.parks(id) ON DELETE RESTRICT, ADD COLUMN IF NOT EXISTS occupied_seats integer NOT NULL DEFAULT 0 CHECK (occupied_seats >= 0);
CREATE TABLE public.driver_trip_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
 route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE RESTRICT,
 departure_park_id uuid NOT NULL REFERENCES public.parks(id) ON DELETE RESTRICT,
 destination_park_id uuid NOT NULL REFERENCES public.parks(id) ON DELETE RESTRICT,
 vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
 travel_date date NOT NULL, departure_time text NOT NULL,
 vehicle_capacity integer NOT NULL CHECK(vehicle_capacity BETWEEN 1 AND 60),
 driver_occupied_seats integer NOT NULL CHECK(driver_occupied_seats >= 0 AND driver_occupied_seats < vehicle_capacity),
 fare integer CHECK(fare IS NULL OR fare > 0), commission_amount integer NOT NULL DEFAULT 2000 CHECK(commission_amount >= 0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), admin_note text,
 departure_id uuid REFERENCES public.departures(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
 CHECK(departure_park_id <> destination_park_id)
);
CREATE INDEX driver_trip_proposals_status_created_idx ON public.driver_trip_proposals(status, created_at DESC);
ALTER TABLE public.driver_trip_proposals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.driver_trip_proposals TO authenticated;
CREATE POLICY "Drivers view own trip proposals" ON public.driver_trip_proposals FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.drivers d WHERE d.id=driver_id AND d.user_id=auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Drivers submit own trip proposals" ON public.driver_trip_proposals FOR INSERT TO authenticated WITH CHECK(status='pending' AND fare IS NULL AND departure_id IS NULL AND EXISTS(SELECT 1 FROM public.drivers d WHERE d.id=driver_id AND d.user_id=auth.uid() AND d.status='active') AND EXISTS(SELECT 1 FROM public.vehicles v WHERE v.id=vehicle_id AND v.driver_id=driver_id AND v.status='active' AND v.approval_status='approved' AND v.capacity=vehicle_capacity) AND EXISTS(SELECT 1 FROM public.parks p WHERE p.id=departure_park_id AND p.status='active') AND EXISTS(SELECT 1 FROM public.parks p WHERE p.id=destination_park_id AND p.status='active'));
CREATE POLICY "Admins review trip proposals" ON public.driver_trip_proposals FOR UPDATE TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.approve_driver_trip_proposal(proposal_id uuid, approved_fare integer, approved_commission integer DEFAULT 2000) RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p public.driver_trip_proposals%ROWTYPE; new_departure_id uuid; v public.vehicles%ROWTYPE;
BEGIN
 IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF approved_fare<=0 OR approved_commission<0 THEN RAISE EXCEPTION 'Invalid fare or commission'; END IF;
 SELECT * INTO p FROM public.driver_trip_proposals WHERE id=proposal_id FOR UPDATE;
 IF NOT FOUND OR p.status<>'pending' THEN RAISE EXCEPTION 'Proposal is no longer pending'; END IF;
 SELECT * INTO v FROM public.vehicles WHERE id=p.vehicle_id AND driver_id=p.driver_id AND status='active' AND approval_status='approved';
 IF v.id IS NULL OR v.capacity<>p.vehicle_capacity THEN RAISE EXCEPTION 'Registered vehicle changed, unapproved or inactive'; END IF;
 INSERT INTO public.departures(route_id,park_id,destination_park_id,driver_id,vehicle_id,travel_date,departure_time,total_seats,occupied_seats,price,commission_amount,status,vehicle_type,vehicle_model,vehicle_year,vehicle_plate_number,vehicle_color,vehicle_capacity)
 VALUES(p.route_id,p.departure_park_id,p.destination_park_id,p.driver_id,p.vehicle_id,p.travel_date,p.departure_time,v.capacity-p.driver_occupied_seats,p.driver_occupied_seats,approved_fare,approved_commission,'scheduled',v.vehicle_type,NULL,v.year,v.plate_number,v.color,v.capacity) RETURNING id INTO new_departure_id;
 UPDATE public.driver_trip_proposals SET status='approved',fare=approved_fare,commission_amount=approved_commission,departure_id=new_departure_id,reviewed_at=now() WHERE id=p.id;
 RETURN new_departure_id;
END; $$;
REVOKE ALL ON FUNCTION public.approve_driver_trip_proposal(uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_driver_trip_proposal(uuid,integer,integer) TO authenticated;
