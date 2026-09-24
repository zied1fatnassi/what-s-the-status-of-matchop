# PREMIUM MATCHING DISCOVERY

Date: 2026-02-24

## Scope inspected
- `src/lib/supabase.js`
- Swipe/offers/jobs flow:
  - `src/hooks/useJobOffers.js`
  - `src/pages/student/StudentSwipe.jsx`
  - `src/hooks/useGlobalOffers.js`
  - `src/hooks/useExternalJobs.js`
- Match/chat flow:
  - `src/hooks/useMatches.js`
  - `src/hooks/useMessages.js`
  - `src/hooks/useMatchListener.js`
  - `src/pages/student/StudentChat.jsx`
  - `src/pages/company/CompanyChat.jsx`
  - `src/hooks/useIntros.js`
  - `src/hooks/useCandidates.js`
- Edge Functions: `supabase/functions/*`
- SQL model + RLS:
  - `supabase/migrations/*`
  - `database/*.sql` (focused on schema/matching/handshake/RLS scripts)

---

## 1) Which table represents opportunities?

### Current model used by frontend
- Internal opportunities: `offers`
  - Used for swipe/match flows (`useJobOffers`, `useMatches`, `useCandidates`, `PostOffer`).
- External opportunities: `external_jobs`
  - Used for aggregated listings (`useJobOffers`, `useGlobalOffers`, `useExternalJobs`).
  - Not persisted as swipes in DB (current code treats them as external links only).

### Legacy model still present in SQL scripts
- `job_offers` (and `swipes`, `student_profiles`) appears in older scripts (`database/schema.sql`, `database/complete_setup.sql`, `database/schema_enhancements.sql`).
- Current app code does not query `job_offers`; it queries `offers`.

### Small SQL snippets
Path: `database/refactor_v2.sql`
```sql
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    req_skills TEXT[] DEFAULT '{}',
    status offer_status DEFAULT 'active'
);
```

Path: `database/create_external_jobs.sql`
```sql
CREATE TABLE IF NOT EXISTS external_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_website TEXT NOT NULL,
    original_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL
);
```

---

## 2) What is the current student swipe query?

### Frontend flow (`src/hooks/useJobOffers.js`)
1. Load already-swiped internal offer IDs:
   - `from('student_swipes').select('offer_id').eq('student_id', user.id)`
2. Try semantic stack via Edge Function:
   - `supabase.functions.invoke('get-matched-jobs')`
3. Fallback internal query when function fails/empty:
   - `from('offers').select('*, companies!company_id(...)').eq('status','active').limit(20)`
4. Fetch external jobs separately:
   - `from('external_jobs').select('*').order('posted_at', { ascending: false }).limit(20)`
5. Final swipe stack = internal first, then external.

### Server-side semantic query
Path: `supabase/functions/get-matched-jobs/index.ts` + `supabase/migrations/20251222010100_vector_matching.sql`
```sql
SELECT o.id, o.title, o.company_id, o.req_skills, 1 - (o.embedding <=> student_embedding) as similarity
FROM public.offers o
WHERE o.status = 'active'
  AND o.embedding IS NOT NULL
  AND (array_length(excluded_ids, 1) IS NULL OR o.id != ALL(excluded_ids))
ORDER BY o.embedding <=> student_embedding
LIMIT match_count;
```

### Swipe write path
- Internal swipe write:
  - `insert into student_swipes(student_id, offer_id, direction)`
- On right swipe, frontend also calls:
  - `rpc('create_intro_from_swipe', { p_student_id, p_offer_id })`

---

## 3) Where is swipe limit handled today?

No quota-style swipe limit was found.

What exists today:
- Feed size cap only (`limit(20)` on offers and external jobs fetches).
- Dedup/exclusion by previously swiped IDs.

What was not found:
- No daily/weekly swipe quota in frontend logic.
- No SQL trigger/RPC/RLS policy enforcing per-user swipe counts.
- No premium-vs-standard swipe cap logic in inspected code.

---

## 4) How chat/matches work (tables + access patterns)

### Core tables
Path: `database/refactor_v2.sql`
```sql
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id),
    offer_id UUID NOT NULL REFERENCES offers(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    status match_status DEFAULT 'matched',
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, offer_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE
);
```

### Match creation paths observed
1. Legacy symmetric swipe triggers:
   - `database/refactor_v2.sql`: company swipe can create match when student already right-swiped.
   - `database/symmetric_swipes.sql`: student swipe can create match when company already right-swiped.
2. Handshake/intros path:
   - `database/handshake_system.sql`: `create_intro_from_swipe(...)` creates `intros`.
   - Company accepting intro triggers match creation (`handle_intro_accepted`).

### Runtime access patterns
- `useMatches`:
  - Reads `matches` with joins to `offers -> companies` and `students`.
  - Filters by role (`student_id = user.id` or `company_id = user.id`).
- `useMessages`:
  - Reads `messages` by `match_id`, ordered by `created_at`.
  - Inserts new message rows with `sender_id = auth user`.
  - Realtime subscription on `messages` INSERT.
- `useMatchListener`:
  - Realtime subscription on `matches` INSERT for current student.
- `StudentChat` / `CompanyChat`:
  - Fetches match detail context, then uses `useMessages` for chat stream.

---

## 5) Existing RLS approach (canonical scripts + patterns)

### Scripts that look canonical/current for policy model
1. `database/000_canonical_rls.sql`
   - Explicitly labeled as the single authoritative RLS policy file.
   - Defines canonical policy names (`profiles_select`, `offers_select_active`, `messages_insert_match_member`, etc.).
2. `database/step2c_part2.sql` and `database/step2c_contract.sql`
   - Move ownership checks to `user_profiles` via `my_profile_ids()`.
   - Drop `profiles.role` / `profiles.elo_score`; add `active_profile_id`.
3. `supabase/migrations/20260220021000_user_profiles_access_fix.sql`
   - Hardens/fixes `user_profiles_*` policies in deployed projects.
4. `supabase/migrations/20251222010200_external_jobs_rls.sql`
   - Authenticated + anon read policies on `external_jobs`.

### Policy pattern
- Naming style:
  - `<table>_<operation>_<scope>` (ex: `student_swipes_insert_own`, `matches_select_participant`, `messages_select_match_member`).
- Guard style:
  - `USING (...)` for row visibility/update eligibility.
  - `WITH CHECK (...)` for row creation/update ownership.
- Membership checks for chat:
  - `messages` policies reference `matches` subqueries to enforce participant-only access.
- Admin/service patterns:
  - Admin policies use `is_admin()` in Step2 scripts.
  - Service-role-only policy pattern exists for `partners` (`supabase/migrations/20260213010100_partner_ingest_model.sql`).

### Small SQL snippet
Path: `database/step2c_part2.sql`
```sql
CREATE POLICY "messages_insert_match_member"
    ON messages FOR INSERT TO authenticated
    WITH CHECK (
        sender_id IN (SELECT my_profile_ids())
        AND match_id IN (
            SELECT id FROM matches
            WHERE student_id IN (SELECT my_profile_ids())
               OR company_id IN (SELECT my_profile_ids())
        )
    );
```

---

## Edge Function auth/error handling patterns

### Most common pattern
- `corsHeaders` + `OPTIONS` preflight.
- Read `Authorization` header.
- Create anon-key client with forwarded auth header.
- `auth.getUser()` to verify user.
- Create service-role client when privileged reads/writes needed.

Examples:
- `supabase/functions/get-matched-jobs/index.ts`
- `supabase/functions/suggest-icebreakers/index.ts`
- `supabase/functions/generate-embedding/index.ts`

### Other patterns used
- Service-role/admin function (no end-user auth token):
  - `janitor`, `generate-pdf`, `secure-password-reset`.
- API-key header auth (partner ingestion):
  - `ingest-partner-offers` uses `X-Partner-Key` -> SHA-256 hash lookup in `partners`.

### Error handling style
- Broad `try/catch` with JSON error payloads.
- Status codes vary by function (401/403/404/500 in some, 400 in others).
- Several functions return fallback success payloads when upstream AI provider fails.

---

## Notes on schema drift

There are parallel SQL eras in `database/`:
- Current app-aligned era: `offers`, `student_swipes`, `company_swipes`, `matches`, `messages`, `intros`, `user_profiles`.
- Legacy era: `job_offers`, `swipes`, `student_profiles`.

Frontend is aligned with the first era.
