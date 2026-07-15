CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
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

CREATE OR REPLACE FUNCTION app_private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE app_private.has_role(_user_id, 'admin')
  END
$$;

GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO anon, authenticated, service_role;

DO $$
DECLARE
  pol record;
  role_list text;
  cmd_text text;
  qual_expr text;
  check_expr text;
  create_sql text;
BEGIN
  FOR pol IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      p.polname AS policy_name,
      p.polcmd,
      p.polpermissive,
      p.polroles,
      p.polrelid,
      p.polqual,
      p.polwithcheck,
      pg_get_expr(p.polqual, p.polrelid) AS qual_text,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_text
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'storage')
      AND (
        COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ~ '(^|[^a-zA-Z0-9_\.])(public\.)?is_admin[[:space:]]*\('
        OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '(^|[^a-zA-Z0-9_\.])(public\.)?is_admin[[:space:]]*\('
        OR COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ~ '(^|[^a-zA-Z0-9_\.])(public\.)?has_role[[:space:]]*\('
        OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '(^|[^a-zA-Z0-9_\.])(public\.)?has_role[[:space:]]*\('
      )
  LOOP
    SELECT string_agg(
      CASE WHEN role_oid = 0 THEN 'public' ELSE quote_ident(r.rolname) END,
      ', '
    )
    INTO role_list
    FROM unnest(pol.polroles) AS role_oid
    LEFT JOIN pg_roles r ON r.oid = role_oid;

    IF role_list IS NULL THEN
      role_list := 'public';
    END IF;

    cmd_text := CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END;

    qual_expr := regexp_replace(COALESCE(pol.qual_text, ''), '(^|[^a-zA-Z0-9_\.])(public\.)?is_admin[[:space:]]*\(', '\1app_private.is_admin(', 'g');
    qual_expr := regexp_replace(qual_expr, '(^|[^a-zA-Z0-9_\.])(public\.)?has_role[[:space:]]*\(', '\1app_private.has_role(', 'g');

    check_expr := regexp_replace(COALESCE(pol.check_text, ''), '(^|[^a-zA-Z0-9_\.])(public\.)?is_admin[[:space:]]*\(', '\1app_private.is_admin(', 'g');
    check_expr := regexp_replace(check_expr, '(^|[^a-zA-Z0-9_\.])(public\.)?has_role[[:space:]]*\(', '\1app_private.has_role(', 'g');

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policy_name, pol.schema_name, pol.table_name);

    create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      pol.policy_name,
      pol.schema_name,
      pol.table_name,
      CASE WHEN pol.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      cmd_text,
      role_list
    );

    IF pol.polcmd IN ('r', 'w', 'd', '*') AND pol.qual_text IS NOT NULL THEN
      create_sql := create_sql || format(' USING (%s)', qual_expr);
    END IF;

    IF pol.polcmd IN ('a', 'w', '*') AND pol.check_text IS NOT NULL THEN
      create_sql := create_sql || format(' WITH CHECK (%s)', check_expr);
    END IF;

    EXECUTE create_sql;
  END LOOP;
END $$;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;