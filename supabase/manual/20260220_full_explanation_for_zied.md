# Full Explanation: What We Did, Why, and What To Do Next

This file explains everything in plain language.

## 1) Big picture first

You have **two different databases** in this project:

1. Local Supabase database (runs in Docker on your computer).
2. Hosted Supabase database (the real cloud project shown in Supabase Dashboard and Database Advisor).

They are not automatically the same thing.

When you run `supabase start`, you start the **local** stack.
When you run SQL in Supabase Dashboard SQL Editor, that hits the **hosted** database.

## 2) What the Supabase CLI is

`supabase` in terminal is the Supabase **Command Line Interface (CLI)**.

Think of it as a control panel you type commands into.
Examples:
$env:PATH += ";$env:USERPROFILE\scoop\shims"
- `supabase start` -> starts local Docker services (db, api, auth, studio, etc.).
- `supabase stop` -> stops local services.
- `supabase db reset` -> rebuilds local DB and re-runs migrations from `supabase/migrations`.
- `supabase db push` -> applies local migrations to the linked hosted project.

Important:
- Typing SQL directly in PowerShell (like `SELECT ...`) does not work.
- PowerShell is a shell, not a SQL engine.

## 3) Why you got those PowerShell errors

You typed:
- `SELECT ...`
- `FROM ...`
- `WHERE ...`

PowerShell tried to interpret those as shell commands and returned French parser errors.

Correct places to run SQL:
1. Supabase Dashboard -> SQL Editor (hosted DB).
2. `psql` client.
3. `docker exec ... psql ...` for local DB.

## 4) Original problem we were solving

You had critical advisor warnings:

1. `RLS Disabled in Public` on `public.spatial_ref_sys`.
2. `Extension in Public` for PostGIS.
3. Many `Function Search Path Mutable` warnings.

You also hit:
- `must be owner of table spatial_ref_sys`

That happened because:
- current role was `postgres`
- table owner was `supabase_admin`

So migrations could not run `ALTER TABLE public.spatial_ref_sys ...` on hosted DB.

## 5) What we changed in the repo

### A) Migration filenames normalized (14-digit versions)

Current migration files:

- `supabase/migrations/20251222010100_vector_matching.sql`
- `supabase/migrations/20251222010200_external_jobs_rls.sql`
- `supabase/migrations/20260213010100_partner_ingest_model.sql`
- `supabase/migrations/20260219005000_function_search_path_hardening.sql`
- `supabase/migrations/20260219010100_public_schema_hardening.sql`

### B) Metadata repair script

Created:
- `supabase/manual/20260219_migration_metadata_repair.sql`

Why:
- your `supabase_migrations.schema_migrations` table shape did not match expected columns.
- added/ensured `inserted_at`, `statements`, `name`.
- created `supabase_migrations.seed_files`.

### C) Function search_path hardening migration

- `supabase/migrations/20260219005000_function_search_path_hardening.sql`

Why:
- fixes `Function Search Path Mutable` warnings by setting explicit search path:
  `pg_catalog, public, extensions, gis`

### D) Public schema hardening migration

- `supabase/migrations/20260219010100_public_schema_hardening.sql`

What it does:
- ensures schemas `extensions` and `gis` exist
- tries moving:
  - `pg_trgm` -> `extensions`
  - `vector` -> `extensions`
  - `postgis` -> `gis`
- checks if any of `postgis`, `pg_trgm`, `vector` remain in `public` and raises exception if yes
- checks `public.spatial_ref_sys` is gone from public

### E) Local migration safety fixes

Some migrations assumed app tables already existed (`students`, `offers`, `external_jobs`).
On clean local reset, those tables may not exist yet.
So migrations were made guarded/idempotent with notices instead of hard failure.

## 6) Why some errors were expected

### Error: `must be owner of table spatial_ref_sys`
Expected on hosted when object owner is `supabase_admin`, not your migration role.

### Error: `Extensions still installed in public schema: postgis`
Expected on hosted until PostGIS is moved/reinstalled outside `public`.

### Error: `syntax error at or near #`
Happened because a `.md` markdown file was pasted into SQL Editor.
Only run `.sql` in SQL Editor.

### Error: `supabase start is not running` on `db reset`
Observed behavior in your CLI `2.75.0`:
- run `supabase start` first
- then `supabase db reset`

### Warning: `open supabase\.temp\profile: The system cannot find the file specified.`
Non-fatal in your logs.

## 7) What local state now shows

From your local checks:

- `vector` exists in schema `extensions`.
- `to_regclass('public.spatial_ref_sys')` returns `NULL`.

That means local hardening is working.

## 8) Why advisor may still show warnings

Advisor checks your **hosted** DB, not your local Docker DB.
So local success does not automatically clear hosted warnings.

## 9) Exact next steps (simple)

## Local (already good)

Use:

```powershell
supabase start
supabase db reset --debug
```

## Hosted (to clear advisor)

1. In Supabase Dashboard SQL Editor, run:

```sql
SELECT e.extname, n.nspname, pg_get_userbyid(e.extowner) AS owner
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('postgis', 'pg_trgm', 'vector')
ORDER BY e.extname;

SELECT to_regclass('public.spatial_ref_sys') AS public_spatial_ref_sys;
```

2. If `postgis` is still in `public`, open Supabase support ticket requesting move/reinstall PostGIS into schema `gis`.

3. After support confirms move, run:
- `supabase/migrations/20260219010100_public_schema_hardening.sql`

4. Re-run Database Advisor.

## 10) One-line mental model

Local CLI is your practice/test database.
Dashboard SQL Editor is your real hosted database.
Advisor warnings are about hosted.
