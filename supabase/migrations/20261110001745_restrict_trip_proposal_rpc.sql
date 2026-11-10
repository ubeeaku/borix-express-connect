-- Do not expose the admin-only approval function to unauthenticated callers.
REVOKE ALL ON FUNCTION public.approve_driver_trip_proposal(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_driver_trip_proposal(uuid, integer, integer) TO authenticated;
