# Supabase Edge Functions

## Scope
This document focuses on the core edge functions explicitly tied to discovery and job workflows:

- `swipe-stack`
- `record-swipe`
- `ingest-partner-offers`
- `janitor`

Additional functions exist in the repo for AI, payments, embeddings, and account utilities, but they are not the primary discovery pipeline covered here.

## `swipe-stack`

### Purpose
Returns the student discovery feed in standardized shape, mixing internal offers and external jobs while enforcing premium rules, filtering, and scoring.

### Request
Method:
- `POST`

Auth:
- bearer token required

Body:
```json
{
  "mode": "standard",
  "limit": 20,
  "cursor": null
}
```

Accepted modes:
- `standard`
- `premium`

### Response
Successful response shape:
```json
{
  "items": [],
  "next_cursor": "base64-encoded-offset",
  "meta": {
    "mode": "standard",
    "effective_plan": "standard",
    "count": 20
  }
}
```

Error patterns:
- `UNAUTHORIZED`
- `BAD_REQUEST`
- `PAYWALL`
- `NO_PROFILE`
- generic internal errors

### Database reads
- `user_profiles`
- `profiles`
- `students`
- `student_swipes`
- `offers`
- `external_jobs`

### Main behavior
- confirms requester is a student
- resolves premium entitlement
- excludes already swiped internal offers
- fetches internal offers and external jobs
- normalizes both into one response shape
- ranks items using skills, preferences, remote and visa fit, and recency
- returns cursor-based pagination

### Important business rule
- external jobs are included in the feed but remain external redirect items

## `record-swipe`

### Purpose
Records a student swipe safely through the database RPC that enforces daily limits.

### Request
Method:
- `POST`

Auth:
- bearer token required

Body:
```json
{
  "student_id": "uuid",
  "offer_id": "uuid",
  "direction": "left"
}
```

Accepted directions:
- `left`
- `right`
- `super` which is normalized to `right`

### Response
Success shape:
```json
{
  "success": true,
  "code": "OK",
  "message": "Swipe recorded",
  "usage": {}
}
```

Special error responses:
- `LIMIT_REACHED` with HTTP 429
- `ALREADY_SWIPED` with HTTP 409

### Database interaction
- RPC `record_student_swipe_with_limit`
- indirect writes to `student_swipes`
- indirect reads and writes to `swipe_usage`

### Main behavior
- validates auth
- normalizes direction
- delegates to RPC
- surfaces usage state back to the frontend

## `ingest-partner-offers`

### Purpose
Allows verified API partners to ingest jobs into MatchOp-owned `offers`.

This is not the external scraper path. It is a separate internal partner-ingest path.

### Request
Method:
- `POST`

Headers:
- `X-Partner-Key`

Body:
```json
{
  "offers": [
    {
      "title": "Backend Engineer",
      "company": "Partner Inc",
      "location": "Remote"
    }
  ]
}
```

### Response
Success response includes:
- `success`
- partner name
- inserted count
- rejected count
- validation errors when present

### Database reads
- `partners`

### Database writes
- `offers`

### Main behavior
- hashes `X-Partner-Key`
- validates partner and partner status
- validates and sanitizes payload
- inserts into `offers` with `partner_id`

### Important boundary
- this function writes to `offers`, not `external_jobs`
- it is a partner API, not the standalone external scraper

## `janitor`

### Purpose
Runs scheduled maintenance for the intro-based handshake system.

### Request
Method:
- `POST`

Auth:
- intended for service role and scheduler usage

Body:
- no structured request body required for normal execution

### Response
Typical response shape:
```json
{
  "success": true,
  "janitor": {},
  "digest": {
    "companies_with_pending_intros": 3,
    "details": []
  },
  "run_at": "timestamp"
}
```

### Database reads
- `intros`
- `companies`

### Database writes
- via RPC `run_daily_janitor`

### Main behavior
- invokes `run_daily_janitor()`
- expires stale pending intros
- recalculates `elo_score`
- builds a digest of pending intros grouped by company

## Related Non-Core Functions
Other functions in the repo that affect behavior but are not fully documented here:

- `get-matched-jobs`
- `create-d17-payment-request`
- `admin-review-payment`
- `generate-embedding`
- `ai-job-description`
- `ai-profile-polisher`
- `secure-password-reset`
- `suggest-icebreakers`

For future changes, treat `swipe-stack` and `record-swipe` as the most critical job-discovery edges.