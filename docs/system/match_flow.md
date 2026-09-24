# MatchOp Core Workflow

## Canonical Internal Flow
The current internal MatchOp job workflow is:

```text
Company creates offer
  -> offers
Student discovery
  -> swipe-stack or get-matched-jobs
Student swipes
  -> student_swipes
Student right-swipe on internal offer
  -> create_intro_from_swipe()
  -> intros
Company accepts intro
  -> intros.status = accepted
  -> handle_intro_accepted trigger
  -> matches
Chat opens
  -> messages + Supabase Realtime
```

This is the workflow future features must preserve.

## Step 1: Company Creates an Offer
Primary frontend:
- `src/pages/company/PostOffer.jsx`

Write path:
- inserts directly into `offers`

Persisted fields from the current form:
- `company_id`
- `title`
- `description`
- `req_skills`
- `location`
- `salary_range`
- `status = active`

Follow-up processing:
- invokes edge function `generate-embedding` to populate `offers.embedding`

Important mismatch:
- the form collects `type`, `department`, `duration`, `requirements`, and location mode
- the current insert only persists a smaller subset of those values

## Step 2: Student Discovery
Primary frontend:
- `src/pages/student/StudentSwipe.jsx`
- `src/hooks/useJobOffers.js`

Primary backend path:
- `supabase/functions/swipe-stack/index.ts`

Legacy fallback path:
- `supabase/functions/get-matched-jobs/index.ts`
- direct reads from `offers` and `external_jobs_public`

What discovery returns:
- internal MatchOp offers from `offers`
- external jobs from `external_jobs`

Only internal offers continue into intros, matches, and chat.

## Step 3: Student Swipe Recording
Primary frontend:
- `useJobOffers().swipe(...)`
- `src/lib/swipeActionApi.js`

Primary backend:
- edge function `record-swipe`
- RPC `record_student_swipe_with_limit`

Write path:
- inserts into `student_swipes`

Limit enforcement:
- the DB trigger `enforce_student_swipe_daily_limit`
- RPCs `get_swipe_limit_status` and `increment_swipe_count`
- backing table `swipe_usage`

Important rule:
- external jobs are rendered in the same feed but do not write a swipe row when the item is treated as external redirect content

## Step 4: Intro Creation
Triggering event:
- student swipes right on an internal MatchOp offer

Frontend call:
- `useJobOffers` invokes RPC `create_intro_from_swipe`

DB behavior:
- validates the offer
- calculates a match score
- inserts into `intros`
- prevents duplicate intro creation with unique `(student_id, offer_id)`

Result:
- company now sees the candidate in the intro queue

## Step 5: Company Reviews Intros
Primary frontend:
- `src/pages/company/CompanyIntros.jsx`
- `src/hooks/useIntros.js`

Read path:
- RPC `get_company_intros`
- direct stats read from `intros`

Actions:
- accept intro: `intros.status = accepted`
- decline intro: `intros.status = declined`

Pending intro expiration:
- `run_daily_janitor()` later marks overdue pending intros as `expired`

## Step 6: Match Creation
Match creation path:
- DB trigger `handle_intro_accepted`

Trigger condition:
- `intros.status` changes to `accepted`

DB write:
- inserts into `matches`

Result:
- a chat thread can now exist for that pair and offer

## Step 7: Chat Opens
Primary frontend:
- `src/features/conversations/ConversationHubPage.jsx`
- `src/pages/student/StudentChat.jsx`
- `src/pages/company/CompanyChat.jsx`
- `src/hooks/useMessages.js`
- `src/features/conversations/useConversationThreads.js`

Read path:
- `matches`
- `messages`

Write path:
- inserts into `messages`

Realtime:
- Supabase Realtime subscription on `messages` inserts for the current `match_id`

## Tables and Functions by Stage

### Offer creation
- tables: `offers`
- functions: `generate-embedding`

### Discovery
- tables: `offers`, `external_jobs`, `student_swipes`, `profiles`, `students`
- functions: `swipe-stack`, `get-matched-jobs`, `match_jobs_for_student`

### Swipe
- tables: `student_swipes`, `swipe_usage`
- functions: `record-swipe`, `record_student_swipe_with_limit`, `get_swipe_limit_status`

### Intro creation and triage
- tables: `intros`, `offers`, `students`
- functions: `create_intro_from_swipe`, `get_company_intros`, `run_daily_janitor`

### Match and chat
- tables: `matches`, `messages`
- functions: `handle_intro_accepted` trigger, Supabase Realtime subscriptions

## Legacy Parallel Logic
The schema still contains an older swipe-to-match path:

- `company_swipes`
- trigger `handle_new_match`

That older logic can still create a `matches` row if both student and company swipes are present. The current routed company UI, however, is centered on `intros` and `matches`, not on a live candidate-swiping screen. Future work should treat the intro-based flow as canonical and avoid accidentally reactivating or rewriting the legacy path without a deliberate migration plan.
