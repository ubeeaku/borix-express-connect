
ALTER TABLE public.drivers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_user_id_key;
-- partial unique index: still one driver per real user, but many NULLs allowed
CREATE UNIQUE INDEX IF NOT EXISTS drivers_user_id_unique_when_set
  ON public.drivers (user_id) WHERE user_id IS NOT NULL;
