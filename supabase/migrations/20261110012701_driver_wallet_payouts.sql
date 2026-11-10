ALTER TABLE public.driver_earnings
  ADD COLUMN IF NOT EXISTS departure_id uuid
  REFERENCES public.departures(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS driver_earnings_one_trip_credit_per_departure
  ON public.driver_earnings (departure_id)
  WHERE departure_id IS NOT NULL AND type = 'trip';

CREATE TABLE public.driver_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE REFERENCES public.drivers(id) ON DELETE CASCADE,
  recipient_code text NOT NULL,
  bank_code text NOT NULL,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number_last4 text NOT NULL CHECK (account_number_last4 ~ '^[0-9]{4}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.driver_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  reference text NOT NULL UNIQUE,
  recipient_code text NOT NULL,
  paystack_transfer_code text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'otp', 'processing', 'success', 'failed', 'reversed')),
  status_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX driver_payout_requests_driver_created_idx
  ON public.driver_payout_requests (driver_id, created_at DESC);

CREATE INDEX driver_payout_requests_active_idx
  ON public.driver_payout_requests (driver_id, status)
  WHERE status IN ('queued', 'otp', 'processing');

CREATE TABLE public.driver_payout_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id uuid NOT NULL REFERENCES public.driver_payout_requests(id) ON DELETE RESTRICT,
  driver_earning_id uuid NOT NULL REFERENCES public.driver_earnings(id) ON DELETE RESTRICT,
  amount integer NOT NULL CHECK (amount > 0),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX driver_payout_items_one_active_reservation
  ON public.driver_payout_request_items (driver_earning_id)
  WHERE released_at IS NULL;

CREATE INDEX driver_payout_items_request_idx
  ON public.driver_payout_request_items (payout_request_id);

ALTER TABLE public.driver_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payout_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own payout account"
  ON public.driver_payout_accounts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = driver_payout_accounts.driver_id
      AND d.user_id = (SELECT auth.uid())
      AND d.status = 'active'
  ));

CREATE POLICY "Drivers view own payout requests"
  ON public.driver_payout_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = driver_payout_requests.driver_id
      AND d.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Admins view all payout requests"
  ON public.driver_payout_requests
  FOR SELECT TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

CREATE POLICY "Drivers view own payout request items"
  ON public.driver_payout_request_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.driver_payout_requests pr
    JOIN public.drivers d ON d.id = pr.driver_id
    WHERE pr.id = driver_payout_request_items.payout_request_id
      AND d.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Admins view all payout request items"
  ON public.driver_payout_request_items
  FOR SELECT TO authenticated
  USING (app_private.is_admin((SELECT auth.uid())));

GRANT SELECT ON public.driver_payout_accounts TO authenticated;
GRANT SELECT ON public.driver_payout_requests TO authenticated;
GRANT SELECT ON public.driver_payout_request_items TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_driver_trip_earning()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  departure_driver_id uuid;
  departure_status text;
BEGIN
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Driver earnings must be greater than zero';
  END IF;

  IF NEW.departure_id IS NOT NULL AND NEW.type = 'trip' THEN
    SELECT d.driver_id, d.status
    INTO departure_driver_id, departure_status
    FROM public.departures d
    WHERE d.id = NEW.departure_id;

    IF departure_driver_id IS NULL THEN
      RAISE EXCEPTION 'Departure not found';
    END IF;

    IF departure_status <> 'completed' THEN
      RAISE EXCEPTION 'Driver earnings can only be credited for completed departures';
    END IF;

    IF NEW.driver_id <> departure_driver_id THEN
      RAISE EXCEPTION 'Earning driver must match the completed departure driver';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_driver_trip_earning_before_write
  BEFORE INSERT OR UPDATE OF driver_id, departure_id, amount, type
  ON public.driver_earnings
  FOR EACH ROW EXECUTE FUNCTION public.validate_driver_trip_earning();

CREATE OR REPLACE FUNCTION public.get_own_driver_wallet_summary()
RETURNS TABLE (
  available_amount bigint,
  pending_amount bigint,
  paid_amount bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.reserve_driver_payout(p_user_id uuid)
RETURNS TABLE (
  request_id uuid,
  reference text,
  amount integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  own_driver_id uuid;
  bank_recipient_code text;
  earning record;
  earning_id uuid;
  earning_ids uuid[] := ARRAY[]::uuid[];
  total_amount bigint := 0;
  new_request_id uuid;
  new_reference text;
  existing_request public.driver_payout_requests;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated driver required';
  END IF;

  SELECT d.id INTO own_driver_id
  FROM public.drivers d
  WHERE d.user_id = p_user_id
    AND d.status = 'active'
  LIMIT 1
  FOR UPDATE;

  IF own_driver_id IS NULL THEN
    RAISE EXCEPTION 'Active driver profile not found';
  END IF;

  SELECT pr.* INTO existing_request
  FROM public.driver_payout_requests pr
  WHERE pr.driver_id = own_driver_id
    AND pr.status IN ('queued', 'otp', 'processing')
  ORDER BY pr.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY SELECT existing_request.id, existing_request.reference, existing_request.amount;
    RETURN;
  END IF;

  SELECT a.recipient_code INTO bank_recipient_code
  FROM public.driver_payout_accounts a
  WHERE a.driver_id = own_driver_id;

  IF bank_recipient_code IS NULL THEN
    RAISE EXCEPTION 'Add and verify a bank account before withdrawing';
  END IF;

  FOR earning IN
    SELECT e.id, e.amount
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
    ORDER BY e.created_at, e.id
    FOR UPDATE OF e
  LOOP
    earning_ids := array_append(earning_ids, earning.id);
    total_amount := total_amount + earning.amount;
  END LOOP;

  IF total_amount <= 0 OR total_amount > 2147483647 THEN
    RAISE EXCEPTION 'There are no earnings available to withdraw';
  END IF;

  new_request_id := gen_random_uuid();
  new_reference := 'brx_dp_' || replace(new_request_id::text, '-', '');

  INSERT INTO public.driver_payout_requests (
    id, driver_id, amount, reference, recipient_code, status
  )
  VALUES (
    new_request_id, own_driver_id, total_amount::integer,
    new_reference, bank_recipient_code, 'queued'
  );

  FOREACH earning_id IN ARRAY earning_ids
  LOOP
    INSERT INTO public.driver_payout_request_items (
      payout_request_id, driver_earning_id, amount
    )
    SELECT new_request_id, e.id, e.amount
    FROM public.driver_earnings e
    WHERE e.id = earning_id;
  END LOOP;

  RETURN QUERY SELECT new_request_id, new_reference, total_amount::integer;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_driver_payout(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_driver_payout(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.update_driver_payout_initiation(
  p_reference text,
  p_transfer_code text,
  p_status text,
  p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('otp', 'processing') THEN
    RAISE EXCEPTION 'Invalid transfer initiation status';
  END IF;

  UPDATE public.driver_payout_requests pr
  SET paystack_transfer_code = COALESCE(p_transfer_code, pr.paystack_transfer_code),
      status = CASE
        WHEN pr.status IN ('success', 'failed', 'reversed') THEN pr.status
        ELSE p_status
      END,
      status_message = COALESCE(p_message, pr.status_message),
      updated_at = now()
  WHERE pr.reference = p_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.update_driver_payout_initiation(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_driver_payout_initiation(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_driver_payout(
  p_reference text,
  p_event text,
  p_transfer_code text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payout_request_id uuid;
  next_status text;
  current_status text;
BEGIN
  next_status := CASE p_event
    WHEN 'transfer.success' THEN 'success'
    WHEN 'transfer.failed' THEN 'failed'
    WHEN 'transfer.reversed' THEN 'reversed'
    ELSE NULL
  END;

  IF next_status IS NULL THEN
    RAISE EXCEPTION 'Unsupported payout event';
  END IF;

  SELECT pr.id, pr.status INTO payout_request_id, current_status
  FROM public.driver_payout_requests pr
  WHERE pr.reference = p_reference
  FOR UPDATE;

  IF payout_request_id IS NULL THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;

  IF (current_status IN ('failed', 'reversed') AND next_status = 'success')
    OR (current_status IN ('success', 'reversed') AND next_status = 'failed') THEN
    RETURN;
  END IF;

  UPDATE public.driver_payout_requests pr
  SET paystack_transfer_code = COALESCE(p_transfer_code, pr.paystack_transfer_code),
      status = next_status,
      status_message = p_message,
      completed_at = CASE WHEN next_status IN ('success', 'failed', 'reversed') THEN now() ELSE pr.completed_at END,
      updated_at = now()
  WHERE pr.id = payout_request_id;

  IF next_status = 'success' THEN
    UPDATE public.driver_earnings e
    SET paid = true, paid_at = COALESCE(e.paid_at, now())
    FROM public.driver_payout_request_items i
    WHERE i.payout_request_id = payout_request_id
      AND i.driver_earning_id = e.id
      AND i.released_at IS NULL;
  ELSE
    UPDATE public.driver_earnings e
    SET paid = false, paid_at = NULL
    FROM public.driver_payout_request_items i
    WHERE i.payout_request_id = payout_request_id
      AND i.driver_earning_id = e.id
      AND i.released_at IS NULL;

    UPDATE public.driver_payout_request_items i
    SET released_at = now()
    WHERE i.payout_request_id = payout_request_id
      AND i.released_at IS NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_driver_payout(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_driver_payout(text, text, text, text) TO service_role;

