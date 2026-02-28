# Supabase Advisor Remediation Notes

Date: 2026-02-27

## Status summary

| Issue | Status | Reason |
|---|---|---|
| A) `public.spatial_ref_sys` RLS disabled | Blocked | Table is extension-owned by `supabase_admin`; current migration role (`postgres`) cannot enable RLS or change effective public read ACL. |
| B) `postgis` extension in `public` | Blocked | `ALTER EXTENSION postgis SET SCHEMA ...` is not supported in this managed project context. |
| C) Mutable function `search_path` | Fixed | Target functions were recreated with explicit `SET search_path = pg_catalog, public`. |
| D) Leaked password protection disabled | Manual | Auth dashboard setting; not managed through these SQL migrations. |

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

## 2026-02-27 authoritative ownership/ACL evidence (migration 006)

Migration applied:

- `supabase/migrations/20260227220600_006_spatial_ref_sys_owner_evidence.sql`

Logged evidence from linked project:

- `current_user = postgres`
- `owner = supabase_admin`
- `relacl = {supabase_admin=arwdDxtm/supabase_admin,=r/supabase_admin}`
- `has_table_privilege('public','public.spatial_ref_sys','select') = true`
- `has_table_privilege('anon','public.spatial_ref_sys','select') = true`
- `has_table_privilege('authenticated','public.spatial_ref_sys','select') = true`
- Anon REST probe still returns data:
  - `GET /rest/v1/spatial_ref_sys?select=srid&limit=1` -> `200`, `[{\"srid\":2000}]`

## Privileged SQL Editor attempt (run as higher-privilege owner)

Paste this in Supabase Dashboard SQL Editor and execute:

```sql
SELECT current_user;

SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relowner::regrole AS owner_role,
  c.relacl
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'spatial_ref_sys';

REVOKE ALL ON TABLE public.spatial_ref_sys FROM PUBLIC;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;

SELECT
  has_table_privilege('public','public.spatial_ref_sys','select') AS public_select,
  has_table_privilege('anon','public.spatial_ref_sys','select') AS anon_select,
  has_table_privilege('authenticated','public.spatial_ref_sys','select') AS auth_select;

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_ref_sys FORCE ROW LEVEL SECURITY;
```

Expected success state:

- `public_select = false`
- `anon_select = false`
- `auth_select = false`
- RLS statements execute without privilege errors.

If revoke/alter fails with ownership or insufficient privilege:

- It confirms a platform-owned extension object constraint.
- Remediation must be completed by Supabase support/platform owner action.

## Supabase support request template

Use this ticket template verbatim:

```text
Subject: Managed owner action required for postgis public exposure (spatial_ref_sys)

Project ref: kedqldpdvycbnznejbbl
Environment: production

Issue:
- Security Advisor flags:
  A) RLS disabled on public.spatial_ref_sys (critical)
  B) postgis extension installed in public schema (warning)
- Our migration role evidence:
  current_user = postgres
  table owner = supabase_admin
  relacl = {supabase_admin=arwdDxtm/supabase_admin,=r/supabase_admin}
  has_table_privilege(public/anon/auth) = true/true/true
- Attempted REVOKE/ALTER from migration role does not change effective ACL.
- Anonymous REST still reads data:
  GET /rest/v1/spatial_ref_sys?select=srid&limit=1 -> 200 with rows

Request:
1) Remove PUBLIC read on public.spatial_ref_sys (and related PostGIS metadata relations exposed in public, if applicable).
2) Enable and force RLS on public.spatial_ref_sys if supported in your managed setup.
3) Confirm whether postgis can be relocated out of public for this project; if yes, perform or provide supported runbook.

Success criteria:
- has_table_privilege('public','public.spatial_ref_sys','select') = false
- has_table_privilege('anon','public.spatial_ref_sys','select') = false
- has_table_privilege('authenticated','public.spatial_ref_sys','select') = false
- GET /rest/v1/spatial_ref_sys?select=srid&limit=1 with anon no longer returns data
```

## Manual required step (Auth warning)

Enable leaked password protection in Supabase Dashboard:

1. `Authentication` -> `Settings` -> `Password Security`
2. Turn on `Leaked password protection (HaveIBeenPwned)`
3. Save changes
4. Capture screenshot evidence for deployment records
5. Expected impact: new/changed passwords will be checked against known breached-password corpus (HIBP).
