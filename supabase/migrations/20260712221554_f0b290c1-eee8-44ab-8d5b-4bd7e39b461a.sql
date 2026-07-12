
-- 1. Storage: drop public read on driver-documents (bucket is private, keep admin-only SELECT)
DROP POLICY IF EXISTS "Public read for driver documents" ON storage.objects;

-- 2. seat_holds: remove permissive DELETE policy and revoke DELETE from public roles
DROP POLICY IF EXISTS "Anyone can delete own seat holds" ON public.seat_holds;
REVOKE DELETE ON public.seat_holds FROM anon, authenticated;
-- service_role still bypasses RLS for automated cleanup / edge functions

-- 3. driver_notifications: don't let anon (or driver_id IS NULL rows) leak to the public
DROP POLICY IF EXISTS "Drivers can view own notifications" ON public.driver_notifications;
CREATE POLICY "Drivers can view own notifications"
  ON public.driver_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = driver_notifications.driver_id
        AND drivers.user_id = auth.uid()
    )
    OR (
      driver_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.drivers WHERE drivers.user_id = auth.uid()
      )
    )
  );
