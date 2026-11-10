CREATE OR REPLACE FUNCTION public.get_own_driver_wallet_summary()
RETURNS TABLE (
  available_amount bigint,
  pending_amount bigint,
  paid_amount bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  own_driver_id uuid;
BEGIN
  SELECT d.id INTO own_driver_id
  FROM public.drivers d
  WHERE d.user_id = (SELECT auth.uid())
    AND d.status = 'active'
  LIMIT 1;

  IF own_driver_id IS NULL THEN
    RAISE EXCEPTION 'Active driver profile not found';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(e.amount)::bigint
      FROM public.driver_earnings e
      WHERE e.driver_id = own_driver_id
        AND e.type = 'trip'
        AND e.departure_id IS NOT NULL
        AND COALESCE(e.paid, false) = false
        AND NOT EXISTS (
          SELECT 1
          FROM public.driver_payout_request_items i
          WHERE i.driver_earning_id = e.id
            AND i.released_at IS NULL
        )
    ), 0),
    COALESCE((
      SELECT SUM(pr.amount)::bigint
      FROM public.driver_payout_requests pr
      WHERE pr.driver_id = own_driver_id
        AND pr.status IN ('queued', 'otp', 'processing')
    ), 0),
    COALESCE((
      SELECT SUM(e.amount)::bigint
      FROM public.driver_earnings e
      WHERE e.driver_id = own_driver_id
        AND e.type = 'trip'
        AND e.departure_id IS NOT NULL
        AND e.paid = true
    ), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_driver_wallet_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_driver_wallet_summary() TO authenticated;

