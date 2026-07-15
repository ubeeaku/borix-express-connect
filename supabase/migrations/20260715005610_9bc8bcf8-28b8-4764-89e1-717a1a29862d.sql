
-- Drop the overly permissive upload policy
DROP POLICY IF EXISTS "Anyone can upload driver documents" ON storage.objects;

-- Restrict inserts to applications/<uuid>/<file> paths in the driver-documents bucket
CREATE POLICY "Applicants can upload to unique application folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = 'applications'
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND array_length(storage.foldername(name), 1) = 2
);

-- Explicit admin-only update policy
CREATE POLICY "Admins can update driver documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'driver-documents' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'driver-documents' AND public.is_admin(auth.uid()));

-- Explicit admin-only delete policy
CREATE POLICY "Admins can delete driver documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'driver-documents' AND public.is_admin(auth.uid()));
