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

## Manual required step (Auth warning)

Enable leaked password protection in Supabase Dashboard:

1. `Authentication` -> `Settings` -> `Password Security`
2. Turn on `Leaked password protection (HaveIBeenPwned)`
3. Save changes
4. Capture screenshot evidence for deployment records
