DROP POLICY "Drivers view own trip proposals" ON public.driver_trip_proposals;
CREATE POLICY "Drivers view own trip proposals" ON public.driver_trip_proposals FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id=driver_id AND d.user_id=(SELECT auth.uid()))
  OR (SELECT app_private.is_admin((SELECT auth.uid())))
);

DROP POLICY "Admins review trip proposals" ON public.driver_trip_proposals;
CREATE POLICY "Admins review trip proposals" ON public.driver_trip_proposals FOR UPDATE TO authenticated
USING ((SELECT app_private.is_admin((SELECT auth.uid()))))
WITH CHECK ((SELECT app_private.is_admin((SELECT auth.uid()))));

CREATE OR REPLACE FUNCTION public.approve_driver_trip_proposal(proposal_id uuid, approved_fare integer, approved_commission integer DEFAULT 2000)
RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p public.driver_trip_proposals%ROWTYPE; new_departure_id uuid; v public.vehicles%ROWTYPE;
BEGIN
 IF NOT app_private.is_admin((SELECT auth.uid())) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
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
REVOKE ALL ON FUNCTION public.approve_driver_trip_proposal(uuid,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_driver_trip_proposal(uuid,integer,integer) TO authenticated;
