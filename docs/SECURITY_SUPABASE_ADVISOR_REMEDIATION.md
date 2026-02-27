# Supabase Advisor Remediation Notes

Date: 2026-02-27

## What changed

1. `public.spatial_ref_sys` hardening:
   - `ENABLE ROW LEVEL SECURITY`
   - `FORCE ROW LEVEL SECURITY`
   - `REVOKE ALL ... FROM anon, authenticated`
   - No RLS policies were added (default deny).

2. Function search path hardening:
   - `public.matchop_standard_daily_swipe_limit()`
   - `public.payment_requests_recent_pending_count(uuid, int)`
   - Both now have `SET search_path = pg_catalog, public`.

3. PostGIS handling:
   - PostGIS is retained because the app uses geography columns and geospatial RPC logic.
   - Migration attempts to move `postgis` from `public` to `gis` on a best-effort basis.
   - If move is blocked (owner/managed restriction), migration falls back to hardening `public.spatial_ref_sys`.

## Why PostGIS was not dropped

PostGIS is currently used by live schema/application logic (for example: `location_point` geography columns and distance-aware matching RPC). Dropping it would create production risk.

## Managed Supabase caveat

In some managed projects, extension ownership is not the migration role. In that case, extension relocation can fail safely and requires Supabase support intervention.

## 2026-02-27 exposure hardening pass (migration 004)

Migration applied:

- `supabase/migrations/20260227220400_004_harden_postgis_public_exposure.sql`

SQL diagnostics captured during apply:

- `PRECHECK spatial_ref_sys grants: <none>`
- `PRECHECK spatial_ref_sys RLS state: rowsecurity=f, force_rls=f`
- `PRECHECK app.settings.schemas: <NULL>`
- `PRECHECK anon/auth privileged memberships: <none>`
- `POSTCHECK spatial_ref_sys grants: <none>`

Observed behavior during migration:

- `REVOKE` commands on PostGIS metadata relations emitted `no privileges could be revoked` warnings.
- This indicates the migration role cannot revoke the effective access path currently allowing anon reads.

HTTP probe evidence:

- Before migration 004:
  - `GET /rest/v1/spatial_ref_sys?select=srid&limit=1` (anon): `200`, body `[{\"srid\":2000}]`
- After migration 004:
  - `GET /rest/v1/spatial_ref_sys?select=srid&limit=1` (anon): `200`, body `[{\"srid\":2000}]`
  - `GET /rest/v1/geography_columns?...` (anon): `200`, body `[]`

Conclusion:

- Exposure for `public.spatial_ref_sys` remains because extension-owned access could not be changed by the current role.
- Full remediation of advisor items A/B still requires privileged intervention on managed extension objects (owner-level change or provider support).

## 2026-02-27 lock-down pass (migration 005)

Migration applied:

- `supabase/migrations/20260227220500_005_lock_down_spatial_ref_sys_grants.sql`

SQL evidence captured in migration logs:

- Pre-fix ACL decode:
  - `relacl = {supabase_admin=arwdDxtm/supabase_admin,=r/supabase_admin}`
- Pre-fix privilege checks:
  - `has_table_privilege('anon', 'public.spatial_ref_sys', 'select') = true`
  - `has_table_privilege('authenticated', 'public.spatial_ref_sys', 'select') = true`
  - `has_table_privilege('public', 'public.spatial_ref_sys', 'select') = true`
- Post-fix ACL decode:
  - `relacl = {supabase_admin=arwdDxtm/supabase_admin,=r/supabase_admin}` (unchanged)
- Post-fix privilege checks:
  - `has_table_privilege('anon', 'public.spatial_ref_sys', 'select') = true`
  - `has_table_privilege('authenticated', 'public.spatial_ref_sys', 'select') = true`
  - `has_table_privilege('public', 'public.spatial_ref_sys', 'select') = true`

Interpretation:

- `information_schema.role_table_grants` showed `<none>`, but direct ACL (`relacl`) confirms `PUBLIC` retains `SELECT` via `=r`.
- Current migration role cannot remove that extension-owned ACL entry.

REST probe before/after migration 005:

- Before:
  - `GET /rest/v1/spatial_ref_sys?select=srid&limit=1` with anon key -> `200`, body `[{\"srid\":2000}]`
- After:
  - `GET /rest/v1/spatial_ref_sys?select=srid&limit=1` with anon key -> `200`, body `[{\"srid\":2000}]`

Result:

- Required end state ("anon cannot read spatial_ref_sys") is not achievable with current role permissions.
- Final remediation requires owner-level change by Supabase-managed owner (`supabase_admin`) to remove `PUBLIC` read and/or enable RLS on the extension table.

## Manual required step (Auth warning)

Enable leaked password protection in Supabase Dashboard:

1. `Authentication` -> `Settings` -> `Password Security`
2. Turn on `Leaked password protection (HaveIBeenPwned)`
3. Save changes
4. Capture screenshot evidence for deployment records
