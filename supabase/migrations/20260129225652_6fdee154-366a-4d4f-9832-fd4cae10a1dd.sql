-- Add RLS policy to available_seats_view
-- Views inherit RLS from underlying tables, but we add explicit policy for clarity
ALTER VIEW public.available_seats_view SET (security_invoker = true);

-- Improve the has_role function with explicit null handling
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Improve the is_admin function with explicit null handling
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE public.has_role(_user_id, 'admin')
  END
$$;

-- Add comment documenting security model
COMMENT ON FUNCTION public.has_role IS 'Security-critical: Checks if user has specified role. Uses SECURITY DEFINER to bypass RLS. Null user_id always returns false.';
COMMENT ON FUNCTION public.is_admin IS 'Security-critical: Checks if user is admin. Uses SECURITY DEFINER to bypass RLS. Null user_id always returns false.';