# Point Borix Express at your own Supabase project

Goal: switch the app from the managed Lovable Cloud backend to your Supabase project (`tqixowqmgpgbltfazbpq`) and the live domain `borixexpress.com`, while keeping all credentials out of the code.

## What will change

- `.env` will be updated to your project URL/ref so the in-editor preview and local dev point at the same backend as production.
- `supabase/export/README.md` will be pre-filled with your actual project ref and domain.
- No source-code logic changes are required: `api/_lib/supabase.ts` and `src/lib/apiBase.ts` already read everything from environment variables.

## Steps

### 1. Provide the publishable key

The project ref and live domain are already known. To complete the local `.env` I need the **publishable (anon) key** for project `tqixowqmgpgbltfazbpq`. This value is safe to paste — it ships in the browser bundle. The **service role key** must NOT be pasted in chat; it goes in Vercel only.

### 2. Update `.env`

Replace the Lovable Cloud values with:

```
VITE_SUPABASE_PROJECT_ID="tqixowqmgpgbltfazbpq"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-publishable-key>"
VITE_SUPABASE_URL="https://tqixowqmgpgbltfazbpq.supabase.co"
```

### 3. Pre-fill the migration guide

Update `supabase/export/README.md` so all examples use:

- Project ref: `tqixowqmgpgbltfazbpq`
- Project URL: `https://tqixowqmgpgbltfazbpq.supabase.co`
- Live domain: `borixexpress.com`

### 4. Recreate the backend in your project

In your Supabase dashboard → SQL Editor, run:

1. `supabase/export/01_schema.sql`
2. `supabase/export/02_seed.sql`

Then add your admin user:

```sql
insert into public.user_roles (user_id, role)
values ('<new-admin-user-uuid>', 'admin');
```

### 5. Configure Vercel environment variables

Production **and** Preview environment variables:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://tqixowqmgpgbltfazbpq.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your anon key |
| `VITE_SUPABASE_PROJECT_ID` | `tqixowqmgpgbltfazbpq` |
| `SUPABASE_URL` | same URL |
| `SUPABASE_ANON_KEY` | same anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` / `sk_test_...` |
| `PAYSTACK_WEBHOOK_SECRET` | webhook secret (optional) |
| `SITE_DOMAIN` | `borixexpress.com` |
| `VITE_API_ORIGIN` | `https://borixexpress.com` |

Redeploy after setting them.

### 6. Configure Supabase auth URLs

In your Supabase project → Authentication → URL Configuration:

- Site URL: `https://borixexpress.com`
- Redirect URLs: `https://borixexpress.com/**`, `https://borixexpress.com/reset-password`, and your `*.vercel.app` preview URL

### 7. Configure Paystack webhook

Paystack Dashboard → Settings → API Keys & Webhooks:

```
https://borixexpress.com/api/paystack/webhook
```

### 8. Sanity checks

- `/routes` shows Jos ⇄ Abuja with the seeded fare.
- Admin login persists after the redirect.
- A test booking reaches Paystack checkout and, after payment, the booking appears in the admin dashboard.

## Out of scope

- No framework or routing changes.
- No new tables or API routes.
