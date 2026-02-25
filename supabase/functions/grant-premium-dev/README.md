# grant-premium-dev

Dev-only edge function to grant premium to a profile for testing.

## Safety

- Keep this function **disabled by default**.
- Enable only in local/dev by setting:
  - `ALLOW_DEV_PREMIUM_GRANT=true`
- Uses `SUPABASE_SERVICE_ROLE_KEY` only inside function runtime secrets.
- Requires an authenticated **admin** requester:
  - `app_metadata.role` / `app_metadata.roles` / `user_metadata.role` includes `admin`, or
  - `user_profiles.profile_type = 'admin'`, or
  - legacy `profiles.role/type = 'admin'`.

## Local Usage

1. Set local function secret:
   - `supabase secrets set ALLOW_DEV_PREMIUM_GRANT=true`
2. Serve function locally:
   - `supabase functions serve grant-premium-dev`
3. Call:
   - `POST /functions/v1/grant-premium-dev`
   - Body: `{ "user_id": "<target-uuid>", "days": 30 }`
   - Include `Authorization: Bearer <admin-user-jwt>`

## Production Guidance

- Do not set `ALLOW_DEV_PREMIUM_GRANT=true` in production.
- Prefer audited admin tooling or direct SQL migrations for production-grade entitlement changes.
