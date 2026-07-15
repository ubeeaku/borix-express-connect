GRANT SELECT ON public.routes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.routes TO authenticated;
GRANT ALL ON public.routes TO service_role;

GRANT SELECT ON public.departures TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.departures TO authenticated;
GRANT ALL ON public.departures TO service_role;

GRANT SELECT ON public.parks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.parks TO authenticated;
GRANT ALL ON public.parks TO service_role;

GRANT SELECT ON public.vehicles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

GRANT SELECT ON public.drivers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;