# MatchOp Data Flows

## 1. Signup -> Profile Creation
```text
User submits signup form
  -> Supabase Auth creates auth.users record
  -> AuthContext receives session
  -> AuthContext inserts profiles row if missing
  -> AuthContext inserts user_profiles row if missing
  -> AuthContext inserts students or companies row if missing
  -> route guards resolve user access
```

Key code paths:
- `src/context/AuthContext.jsx`
- `src/components/RouteGuards.jsx`

## 2. Company Posting Offer
```text
Company fills Post Offer form
  -> PostOffer.jsx inserts into offers
  -> generate-embedding edge function runs asynchronously
  -> company dashboard reads offer back through useCompanyOffers
```

Tables:
- `offers`

Functions:
- `generate-embedding`

## 3. Student Discovery Feed Generation
```text
Student opens /student/swipe
  -> useJobOffers checks feature flag
  -> if V2:
       swipe-stack edge function
         -> profiles
         -> students
         -> student_swipes
         -> offers
         -> external_jobs
         -> ranked unified feed
  -> else:
       get-matched-jobs
       + direct offers query
       + external_jobs_public query
  -> StudentSwipe applies local browser filters (scope toggle, preferences)
  -> VerticalOpportunityFeed & VerticalOpportunityItem render vertical feed
```

## 4. Student Action / Swipe Flow
```text
Student applies (right-swipe / apply button / A key) or passes (left-swipe / pass button / X key / drag up) on internal offer
  -> useJobOffers.swipe()
  -> record-swipe edge function
  -> record_student_swipe_with_limit RPC
  -> student_swipes insert
  -> swipe_usage update
```

Special case:
- apply (right-swipe) on internal offer also triggers intro creation

## 5. Intro Creation
```text
Student applies (right-swipe) to internal offer
  -> useJobOffers calls create_intro_from_swipe
  -> DB validates offer
  -> DB calculates match score
  -> intros row inserted
  -> company intro queue now contains the candidate
```

Tables:
- `intros`
- `offers`
- `students`

Functions:
- `create_intro_from_swipe`

## 6. Company Accepts Intro
```text
Company opens /company/intros
  -> useIntros calls get_company_intros
  -> company clicks accept
  -> intros.status becomes accepted
  -> handle_intro_accepted trigger fires
  -> matches row inserted
```

Tables:
- `intros`
- `matches`

Functions:
- `get_company_intros`
- trigger `handle_intro_accepted`

## 7. Match Creation
```text
Accepted intro
  -> matches row exists
  -> match becomes visible to student and company
  -> StudentMatches and CompanyMatches query matches
```

Tables:
- `matches`

Frontend:
- `src/hooks/useMatches.js`
- `src/pages/student/StudentMatches.jsx`
- `src/pages/company/CompanyMatches.jsx`

## 8. Chat Opening
```text
User opens /student/chat/:matchId or /company/chat/:matchId
  -> ConversationHubPage loads thread list from matches
  -> useMessages loads messages for selected match
  -> markAsRead updates unread messages
  -> sendMessage inserts into messages
  -> Supabase Realtime streams new inserts
```

Tables:
- `matches`
- `messages`

Realtime:
- channel per `match_id`

## 9. External Job Discovery
```text
Scrapling-powered Python scraper
  -> Scrapling fetches ATS pages (Greenhouse, Lever, Workable)
  -> Groq AI extracts structured fields (skills, experience, summary)
  -> normalisation (title, location, company, salary cleaning)
  -> deduplication by URL/source_job_id/content_hash
  -> external_jobs upsert
  -> swipe-stack or external_jobs_public read
  -> VerticalOpportunityItem renders external badge & source
  -> OfferDetailModal "Visit Website"
  -> browser opens original_url
```

No downstream writes to:
- `student_swipes`
- `intros`
- `matches`
- `messages`

## 10. Payments -> Premium Activation
```text
Student opens checkout
  -> create-d17-payment-request edge function
  -> payment_requests row created
  -> student uploads proof to payment_proofs
  -> admin reviews payment
  -> admin-review-payment edge function
  -> payment_requests_apply_admin_action RPC
  -> profiles.is_premium and premium_expires_at updated
```

## 11. Janitor Maintenance
```text
Scheduler invokes janitor edge function
  -> run_daily_janitor RPC
  -> pending intros older than expiry become expired
  -> elo_score recalculated
  -> janitor returns digest of pending intros by company
```

## Important Boundaries
- `offers` flow is the internal MatchOp workflow
- `external_jobs` flow is discovery-only
- student discovery merges the two visually, but downstream behavior is intentionally different