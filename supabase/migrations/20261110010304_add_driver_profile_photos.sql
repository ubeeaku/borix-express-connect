ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS profile_photo_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-profile-photos',
  'driver-profile-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Drivers upload own profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-profile-photos'
  AND (storage.foldername(name))[1] = 'drivers'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND array_length(storage.foldername(name), 1) = 2
  AND EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.user_id = (SELECT auth.uid())
      AND d.status = 'active'
  )
);

CREATE POLICY "Drivers delete own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-profile-photos'
  AND (storage.foldername(name))[1] = 'drivers'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND array_length(storage.foldername(name), 1) = 2
);

CREATE OR REPLACE FUNCTION public.update_own_driver_profile(
  p_phone text DEFAULT NULL,
  p_profile_photo_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  own_driver_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_phone IS NULL AND p_profile_photo_url IS NULL THEN
    RAISE EXCEPTION 'No profile changes supplied';
  END IF;

  IF p_phone IS NOT NULL AND (
    length(trim(p_phone)) < 6
    OR length(trim(p_phone)) > 20
    OR trim(p_phone) !~ '^\+?[0-9][0-9 ().-]{5,19}$'
  ) THEN
    RAISE EXCEPTION 'Enter a valid phone number';
  END IF;

  SELECT d.id INTO own_driver_id
  FROM public.drivers d
  WHERE d.user_id = (SELECT auth.uid())
    AND d.status = 'active'
  LIMIT 1;

  IF own_driver_id IS NULL THEN
    RAISE EXCEPTION 'Active driver profile not found';
  END IF;

  IF p_profile_photo_url IS NOT NULL AND p_profile_photo_url !~ (
    '^https://[^/]+/storage/v1/object/public/driver-profile-photos/drivers/'
    || (SELECT auth.uid())::text
    || '/[A-Fa-f0-9-]+\.(jpg|jpeg|png|webp)$'
  ) THEN
    RAISE EXCEPTION 'Profile photo must be uploaded to your driver profile';
  END IF;

  UPDATE public.drivers
  SET phone = COALESCE(trim(p_phone), phone),
      profile_photo_url = COALESCE(p_profile_photo_url, profile_photo_url),
      updated_at = now()
  WHERE id = own_driver_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_driver_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_driver_profile(text, text) TO authenticated;
