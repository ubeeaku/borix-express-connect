
ALTER TABLE public.driver_notifications
  ADD COLUMN IF NOT EXISTS booking_id uuid
  REFERENCES public.bookings(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS driver_notifications_booking_id_key
  ON public.driver_notifications (booking_id)
  WHERE booking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION app_private.notify_driver_of_confirmed_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.payment_status <> 'completed' OR NEW.departure_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'completed' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.driver_notifications (
    driver_id,
    booking_id,
    title,
    message,
    type
  )
  SELECT
    departures.driver_id,
    NEW.id,
    'New passenger booking',
    format(
      '%s booked %s seat(s) for your %s %s trip. Booking reference: %s.',
      NEW.passenger_name,
      NEW.number_of_seats,
      NEW.travel_date,
      NEW.departure_time,
      NEW.booking_reference
    ),
    'booking'
  FROM public.departures
  WHERE departures.id = NEW.departure_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.notify_driver_of_confirmed_booking()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_driver_of_confirmed_booking
  ON public.bookings;

CREATE TRIGGER notify_driver_of_confirmed_booking
  AFTER INSERT OR UPDATE OF payment_status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION app_private.notify_driver_of_confirmed_booking();
