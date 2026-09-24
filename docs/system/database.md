# MatchOp Database Schema

## Scope and Sources
This document reflects the schema as reconstructed from:

- `database/refactor_v2.sql`
- `database/matching_engine.sql`
- `database/handshake_system.sql`
- `database/multi_profile_migration.sql`
- admin/support SQL in `database/*.sql`
- Supabase migrations in `supabase/migrations/`

Important: the repository also contains older legacy schema files such as `database/schema.sql` that still use names like `job_offers` and `student_profiles`. Those are not the active model used by the SPA.

## Core Tables

### `profiles`
Purpose:
- Account-level row for each `auth.users` record
- Holds shared account metadata, premium status, verification, and high-level preferences

Confirmed columns:
- `id uuid` primary key, references `auth.users(id)`
- `email text`
- `role user_role`
- `created_at timestamptz`
- `updated_at timestamptz`
- `last_active_at timestamptz`
- `active_profile_id uuid`
- `suspended boolean`
- `verified boolean`
- `verification_method text`
- `verification_data jsonb`
- `verified_at timestamptz`
- `is_premium boolean`
- `premium_expires_at timestamptz`
- `preferences jsonb`
- `elo_score int` is still referenced by janitor logic and older matching SQL

Relationships:
- One-to-one with `auth.users`
- Parent for `students`, `companies`, `messages.sender_id`, `payment_requests.user_id`, `reports.*`, and admin audit records
- Linked to persona rows through `user_profiles`

Confirmed indexes:
- `idx_profiles_preferences_gin`
- `idx_profiles_role`
- `idx_profiles_suspended`
- `idx_profiles_verified`

RLS / access pattern:
- Authenticated users can insert and update their own row
- Read access is broadly allowed for authenticated app usage
- Admin SQL adds broader read/update powers for admins

### `user_profiles`
Purpose:
- Persona link table for the “one account, multiple profiles” model
- Decouples auth account from student/company persona identity

Confirmed columns:
- `id uuid` primary key
- `user_id uuid` references `auth.users(id)`
- `profile_type profile_type`
- `is_default boolean`
- `created_at timestamptz`
- `elo_score int`

Relationships:
- `user_id` points to account owner
- `profiles.active_profile_id` points back to one `user_profiles.id`

Confirmed indexes:
- `idx_user_profiles_user`
- `idx_user_profiles_type`
- `idx_user_profiles_default`

RLS / access pattern:
- Authenticated users can select, insert, and update their own `user_profiles`
- `20260220021000_user_profiles_access_fix.sql` broadens the ownership condition to cover both `user_id` and legacy `id`

### `students`
Purpose:
- Student persona profile used for discovery, intros, matches, and profile editing

Confirmed columns:
- `id uuid` primary key, references `profiles(id)`
- `display_name text`
- `bio text`
- `location text`
- `skills text[]`
- `avatar_url text`
- `headline text`
- `open_to_work boolean`
- `cv_url text`
- `location_point gis.geography(Point)`
- `embedding vector(384)`

Relationships:
- One-to-one with `profiles`
- Referenced by `student_swipes`, `company_swipes`, `intros`, `matches`, `experiences`, `student_education`

Confirmed indexes:
- `idx_students_location`
- `idx_students_skills`
- `students_embedding_idx`

RLS / access pattern:
- Readable to authenticated users
- Insert/update allowed to owner or owned persona via `my_profile_ids()`
- Admin SQL adds read visibility

### `companies`
Purpose:
- Company persona profile used by company dashboards and offer ownership

Confirmed columns:
- `id uuid` primary key, references `profiles(id)`
- `company_name text`
- `industry text`
- `website text`
- `description text`
- `logo_url text`
- `location text`
- `location_point gis.geography(Point)`
- `verified boolean`

Relationships:
- One-to-one with `profiles`
- Parent for `offers`, `company_swipes`, `intros`, `matches`

RLS / access pattern:
- Readable to authenticated users
- Insert/update allowed to the company owner or owned persona
- Admin SQL adds broader management rights

Notes:
- Current admin pages assume a `created_at` column on `companies`, but that field was not confirmed in the canonical SQL reviewed here

### `offers`
Purpose:
- Internal MatchOp opportunity table
- This is the core job model used for swipes, intros, matches, and chat

Confirmed columns:
- `id uuid` primary key
- `company_id uuid`
- `title text`
- `description text`
- `req_skills text[]`
- `location text`
- `salary_range text`
- `status offer_status`
- `created_at timestamptz`
- `updated_at timestamptz`
- `location_point gis.geography(Point)`
- `embedding vector(384)`
- `is_global boolean`
- `is_exclusive boolean`
- `is_leak boolean`
- `bounty_value numeric(10,2)`
- `partner_id uuid`

Relationships:
- Belongs to `companies`
- Referenced by `student_swipes`, `company_swipes`, `intros`, `matches`

Confirmed indexes:
- `idx_offers_location`
- `idx_offers_req_skills`
- `offers_embedding_idx`
- `idx_offers_is_global`
- one of `idx_offers_is_global_status_created_at`, `idx_offers_is_global_status`, or `idx_offers_is_global_created_at`
- `idx_offers_exclusive`
- `idx_offers_leak`
- `idx_offers_bounty`
- `idx_offers_partner`
- `idx_offers_status`

RLS / access pattern:
- Owners can insert/update/delete their own offers
- Students can read active offers
- Restrictive premium policy gates global offers for students
- Admin SQL adds broader management rights

Notes:
- Current UI and some functions still refer to optional fields such as `type`, `department`, `duration`, `salary`, and `url`
- `PostOffer.jsx` collects more fields than it persists

### `external_jobs`
Purpose:
- External discovery-only job store
- Holds scraped or imported jobs that redirect out to the original source

Confirmed columns:
- `id uuid`
- `source_website text`
- `original_url text` unique
- `title text`
- `company_name text`
- `location text`
- `contact_email text`
- `description text`
- `salary_range text`
- `job_type text`
- `logo_url text`
- `posted_at timestamptz`
- `created_at timestamptz`
- `tags text[]`
- `is_global boolean`
- `source_job_id text`
- `content_hash text`
- `first_seen_at timestamptz`
- `last_seen_at timestamptz`
- `scraped_at timestamptz`

Relationships:
- Standalone table, not linked into intros or matches

Confirmed indexes:
- `idx_external_jobs_source`
- `idx_external_jobs_title`
- `idx_external_jobs_is_global`
- one of `idx_external_jobs_is_global_posted_at` or `idx_external_jobs_is_global_created_at`
- `idx_external_jobs_source_job_id`
- `idx_external_jobs_content_hash`
- `idx_external_jobs_last_seen_at`

RLS / access pattern:
- Direct base-table access has been tightened over time
- Safe public consumption is now intended through `external_jobs_public`
- `swipe-stack` uses the base table with authenticated server-side access

Related view:
- `external_jobs_public`
  - exposes a safe projection of external job fields
  - grants `SELECT` to `anon` and `authenticated`
  - includes aliases `source` and `url`
  - configured with `security_invoker = true`

### `student_swipes`
Purpose:
- Records each student’s left/right swipe on an internal offer

Confirmed columns:
- `student_id uuid`
- `offer_id uuid`
- `direction text`
- `created_at timestamptz`

Relationships:
- `student_id -> students.id`
- `offer_id -> offers.id`

Confirmed indexes:
- primary key on `(student_id, offer_id)`

RLS / access pattern:
- Students can read and insert their own swipes
- Inserts are guarded by DB-side daily-limit enforcement through trigger/RPC

### `company_swipes`
Purpose:
- Legacy company-side left/right evaluation table for candidates

Confirmed columns:
- `company_id uuid`
- `student_id uuid`
- `offer_id uuid`
- `direction text`
- `created_at timestamptz`

Relationships:
- Links company, student, and offer

Confirmed indexes:
- primary key on `(company_id, student_id, offer_id)`

RLS / access pattern:
- Company owner can read and insert their own rows

Notes:
- A legacy trigger on this table can still create matches when both sides swipe right
- The current routed company UX primarily uses `intros`, not this table

### `intros`
Purpose:
- Handshake-stage candidate queue created from student right swipes on internal offers

Confirmed columns:
- `id uuid`
- `student_id uuid`
- `offer_id uuid`
- `company_id uuid`
- `icebreaker text`
- `match_score int`
- `status text` with `pending | accepted | declined | expired`
- `expires_at timestamptz`
- `created_at timestamptz`
- `reviewed_at timestamptz`

Relationships:
- Belongs to student, offer, and company
- Accepted intros promote into `matches`

Confirmed indexes:
- `idx_intros_company`
- `idx_intros_student`
- `idx_intros_status`
- `idx_intros_expires`

RLS / access pattern:
- Students can read their own intros and may insert their own
- Companies can read and update intros for their offers

### `matches`
Purpose:
- Match record created after company acceptance of an intro, and still potentially by older swipe-to-match triggers

Confirmed columns:
- `id uuid`
- `student_id uuid`
- `offer_id uuid`
- `company_id uuid`
- `status match_status`
- `matched_at timestamptz`

Relationships:
- Links a student, offer, and company
- Parent for `messages`

Confirmed indexes:
- unique constraint on `(student_id, offer_id)`

RLS / access pattern:
- Both participants can select
- Participants can update in current RLS policy set

Notes:
- Current frontend queries also expect optional `created_at` and `last_message` fields in some environments, but those were not confirmed in the reviewed canonical SQL chain

### `messages`
Purpose:
- Chat messages inside a match thread

Confirmed columns:
- `id uuid`
- `match_id uuid`
- `sender_id uuid`
- `content text`
- `is_read boolean`
- `created_at timestamptz`

Relationships:
- Belongs to a `matches` row
- `sender_id` references `profiles(id)`

RLS / access pattern:
- Match participants can read and write messages tied to their matches
- Participants can update read state

## Auxiliary Tables Used by Current Code

### `swipe_usage`
- Tracks per-user per-day swipe counts
- Primary key: `(user_id, usage_day)`
- Used by `get_swipe_limit_status` and `record_student_swipe_with_limit`

### `experiences`
- Student work history
- Used by `useStudentProfile`
- Visible to owners and to matched companies

### `student_education`
- Student education history
- Used by `useStudentProfile`

### `payment_requests`
- Manual D17 premium-upgrade requests
- Stores reference, proof path, review status, reviewer metadata

### `payment_requests_audit`
- Audit trail of payment-request lifecycle events

### `partners`
- Verified API-ingest partners for `ingest-partner-offers`

### `reports`
- User reporting and moderation queue

### `admin_audit_logs`
- Audit log for admin actions in the SPA

### `app_settings`
- Single-row JSON settings table used by the admin settings page

## Important RPC Functions

### `create_intro_from_swipe(p_student_id, p_offer_id, p_icebreaker)`
Purpose:
- Converts a student right swipe on an internal offer into an `intros` row

Behavior:
- validates the offer is active
- calculates match score using `calculate_match_score`
- inserts intro if one does not already exist
- returns JSON with success state, intro id, and score

### `get_company_intros(p_company_id, p_status, p_limit, p_offset)`
Purpose:
- Returns company-facing intro queue with joined student and offer details

Behavior:
- reads from `intros`, `students`, and `offers`
- sorts by `match_score` and creation time
- used by `useIntros`

### `match_jobs_for_student(student_embedding, excluded_ids, match_count)`
Purpose:
- Semantic vector search for internal offers

Behavior:
- reads `offers.embedding`
- excludes already swiped offer ids
- returns ranked internal offer rows with similarity score

### `get_swipe_limit_status(p_user_id)`
Purpose:
- Returns daily swipe entitlement for a student profile

Behavior:
- resolves premium status
- reads `swipe_usage`
- returns JSON with `allowed`, `daily_count`, `limit_count`, `remaining`, and plan metadata

### `record_student_swipe_with_limit(p_student_id, p_offer_id, p_direction)`
Purpose:
- Safely inserts into `student_swipes` with DB-enforced daily limits

Behavior:
- validates ownership
- normalizes direction
- inserts swipe
- returns JSON with success/error code and updated usage state

### `run_daily_janitor()`
Purpose:
- Scheduled maintenance for the handshake system

Behavior:
- expires stale pending intros
- recalculates `elo_score`
- used by the `janitor` edge function

## Schema Drift to Keep in Mind
- Some current frontend code expects fields not confirmed in the canonical SQL reviewed here:
  - `companies.created_at`
  - `matches.created_at`
  - `matches.last_message`
  - `offers.type`
  - `offers.required_skills`
  - `offers.salary_min`
  - `offers.salary_max`
- The active application model still clearly centers on `offers`, `intros`, `matches`, and `messages`
- Future work should preserve these tables and flows even when cleaning up legacy assumptions
