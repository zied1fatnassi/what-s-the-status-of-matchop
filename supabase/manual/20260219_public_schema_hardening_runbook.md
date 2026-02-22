# Public Schema Hardening Runbook

## Scope
- Target zero advisor warnings for:
  - `RLS Disabled in Public` on `public.spatial_ref_sys`
  - Extensions installed in `public` for `postgis`, `pg_trgm`, `vector`
- Rollout order: staging, then production.
- SQL Editor rule: run only `.sql` files. Do not execute this `.md` file.

## 1) Prepare migration metadata
1. Run `supabase/manual/20260219_migration_metadata_repair.sql` in SQL Editor.
2. Confirm versions:
   - `20251222010100`
   - `20251222010200`
   - `20260213010100`
3. Apply `supabase/migrations/20260219005000_function_search_path_hardening.sql` first.
4. Keep `supabase/migrations/20260219010100_public_schema_hardening.sql` unapplied until PostGIS ownership/schema move is resolved.

## 2) Support request template (managed Supabase)
Use one ticket per environment:

```text
Subject: Move PostGIS extension from public to gis schema

Project ref: <project-ref>
Environment: <staging|production>

Issue:
- Database Advisor flags:
  - Extensions in public: postgis
  - RLS Disabled in Public: public.spatial_ref_sys
- We cannot alter extension-owned objects:
  - current_role = postgres
  - table_owner(public.spatial_ref_sys) = supabase_admin

Request:
- Move/reinstall PostGIS extension into schema `gis`
- Ensure extension-owned objects are no longer in `public`

Success criteria:
- postgis extnamespace = gis
- to_regclass('public.spatial_ref_sys') is NULL
- no postgis-owned extension objects remain in public
```

## 3) Apply migrations after support completes
1. Apply `supabase/migrations/20260219005000_function_search_path_hardening.sql`.
2. Apply `supabase/migrations/20260219010100_public_schema_hardening.sql`.
3. If hardening fails with `Extensions still installed in public schema`, re-run after support confirms schema move.

## 4) Verification SQL
```sql
SELECT e.extname, n.nspname
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('postgis', 'pg_trgm', 'vector')
ORDER BY e.extname;
```

Expected:
- `postgis -> gis`
- `pg_trgm -> extensions`
- `vector -> extensions`

```sql
SELECT to_regclass('public.spatial_ref_sys') AS public_spatial_ref_sys;
```

Expected:
- `NULL`

```sql
SELECT version, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

Expected:
- Unique migration versions, no collisions.

## 5) Functional smoke checks
- Vector similarity RPC (`public.match_jobs_for_student`) executes.
- Any geospatial RPC/query executes with `gis.ST_*` qualification.
- Any trigram-based query executes with `pg_trgm` available outside `public`.
