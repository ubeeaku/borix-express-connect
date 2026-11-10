# Borix Express — pointing the app at your own Supabase project

Everything is env-var driven; there are **no hardcoded credentials** anywhere in the code.

## 1. Create the schema in your project

In your Supabase dashboard → **SQL Editor**, run in this order:

1. `supabase/export/01_schema.sql` — all tables, enums, functions, triggers, RLS policies, grants, and the private `driver-documents` storage bucket.
2. `supabase/export/02_seed.sql` — routes (Jos ⇄ Abuja @ ₦13,000), parks, platform settings.

Then create your admin user: **Authentication → Users → Add user**, then run

```sql
insert into public.user_roles (user_id, role)
values ('<the-new-user-uuid>', 'admin');
```

Departures are created from the admin dashboard (**Admin → Trips**).

## 2. Vercel environment variables

Project → Settings → Environment Variables (Production **and** Preview):

| Name | Value | Exposed to browser |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<your-ref>.supabase.co` | yes (safe) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your anon / publishable key | yes (safe) |
| `VITE_SUPABASE_PROJECT_ID` | your project ref | yes (safe) |
| `SUPABASE_URL` | same URL as above | no |
| `SUPABASE_ANON_KEY` | same anon key as above | no |
| `SUPABASE_SERVICE_ROLE_KEY` | your **service role** key | no — keep secret |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` / `sk_test_...` | no |
| `PAYSTACK_WEBHOOK_SECRET` | webhook secret (optional, falls back to the secret key) | no |
| `SITE_DOMAIN` | `borixexpress.com` (your live domain) | no |
| `VITE_API_ORIGIN` | `https://borixexpress.com` (optional; only if the API lives on a different origin) | yes |

The `VITE_*` values are read at build time — **redeploy** after changing them.
The Vercel-provided values take precedence over the repo `.env`, so the deployed
site uses your project even though `.env` still points at the Lovable Cloud backend
used by the in-editor preview.

## 3. Supabase auth settings (your project)

**Authentication → URL Configuration**:

- Site URL: `https://borixexpress.com`
- Redirect URLs: `https://borixexpress.com/**`, plus your `*.vercel.app` preview URL and
  `https://borixexpress.com/reset-password`

## 4. Paystack

Dashboard → Settings → API Keys & Webhooks → Webhook URL:

```
https://borixexpress.com/api/paystack/webhook
```

## 5. Sanity check

- `/routes` shows Jos ⇄ Abuja with the seeded price → frontend keys are good.
- A test booking reaching Paystack checkout → `SUPABASE_SERVICE_ROLE_KEY` +
  `PAYSTACK_SECRET_KEY` are good. If a payment returns 500, the API route now
  reports exactly which env var is missing in the Vercel function logs.
