
DROP POLICY IF EXISTS "Anyone can submit driver application" ON public.driver_applications;
CREATE POLICY "Anyone can submit driver application"
  ON public.driver_applications
  FOR INSERT
  WITH CHECK (
    length(coalesce(full_name, '')) BETWEEN 2 AND 200
    AND length(coalesce(phone, '')) BETWEEN 6 AND 20
  );

DROP POLICY IF EXISTS "Anyone can create seat holds" ON public.seat_holds;
CREATE POLICY "Anyone can create seat holds"
  ON public.seat_holds
  FOR INSERT
  WITH CHECK (
    length(coalesce(session_id, '')) BETWEEN 8 AND 128
    AND expires_at > now()
    AND expires_at < now() + interval '30 minutes'
  );
