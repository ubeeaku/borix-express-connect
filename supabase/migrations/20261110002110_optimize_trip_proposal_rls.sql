DROP POLICY "Drivers view own trip proposals" ON public.driver_trip_proposals;
CREATE POLICY "Drivers view own trip proposals" ON public.driver_trip_proposals FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id=driver_id AND d.user_id=(SELECT auth.uid()))
  OR (SELECT public.is_admin((SELECT auth.uid())))
);

DROP POLICY "Drivers submit own trip proposals" ON public.driver_trip_proposals;
CREATE POLICY "Drivers submit own trip proposals" ON public.driver_trip_proposals FOR INSERT TO authenticated
WITH CHECK (
  status='pending' AND fare IS NULL AND departure_id IS NULL
  AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id=driver_id AND d.user_id=(SELECT auth.uid()) AND d.status='active')
  AND EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id=vehicle_id AND v.driver_id=driver_id AND v.status='active' AND v.approval_status='approved' AND v.capacity=vehicle_capacity)
  AND EXISTS (SELECT 1 FROM public.parks p WHERE p.id=departure_park_id AND p.status='active')
  AND EXISTS (SELECT 1 FROM public.parks p WHERE p.id=destination_park_id AND p.status='active')
);

DROP POLICY "Admins review trip proposals" ON public.driver_trip_proposals;
CREATE POLICY "Admins review trip proposals" ON public.driver_trip_proposals FOR UPDATE TO authenticated
USING ((SELECT public.is_admin((SELECT auth.uid()))))
WITH CHECK ((SELECT public.is_admin((SELECT auth.uid()))));
