-- Restrict driver-documents SELECT to authenticated admins only
DROP POLICY IF EXISTS "Admins can view driver documents" ON storage.objects;
CREATE POLICY "Admins can view driver documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'driver-documents' AND app_private.is_admin(auth.uid()));

-- Explicit seat_holds DELETE policy scoped to session_id (must be provided via WHERE)
CREATE POLICY "Session owners can delete their seat holds"
ON public.seat_holds
FOR DELETE
TO public
USING (
  length(COALESCE(session_id, '')) >= 8
  AND session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
);