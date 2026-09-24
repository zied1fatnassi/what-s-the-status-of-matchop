# MatchOp External Jobs

## Role in the Platform
External jobs are the discovery-only opportunity system in MatchOp.

They are stored in:
- `external_jobs`

They are exposed to client reads through:
- `external_jobs_public`

They are intentionally different from internal MatchOp offers in `offers`.

## Current Population Path
The active repository contains a standalone Python ingestion worker under `scraper/`.

Current ingestion architecture (Scrapling + Groq AI):
```text
Python worker (scraper/matchop_scraper)
  -> Scrapling fetches ATS pages (Greenhouse, Lever, Workable)
  -> Groq AI extracts structured fields (skills, experience, summary)
  -> normalisation (title, location, company, salary cleaning)
  -> deduplication by URL / source_job_id / content_hash
  -> external_jobs upsert
```

Observed behavior:
- writes only to `external_jobs`
- uses source metadata such as `source_website` and `original_url`
- does not create `offers`
- does not touch `student_swipes`, `intros`, `matches`, or `messages`

## How External Jobs Appear in Discovery

### Server-side discovery path
`swipe-stack` reads from `external_jobs` and normalizes rows into the same opportunity shape used by internal offers.

Relevant normalized fields:
- `isExternal`
- `externalUrl`
- `sourceWebsite`
- `isGlobal`

### Client-side fallback path
When the legacy discovery path is used, `useJobOffers` reads:
- `offers`
- `external_jobs_public`

It then merges the two lists in the client.

### Direct external job hook
`useExternalJobs.js` provides a separate paginated reader for `external_jobs_public`, although the current main student experience is the swipe feed.

### Feed and card rendering
`src/components/discovery/VerticalOpportunityItem.jsx` (within `VerticalOpportunityFeed.jsx`)

Behavior:
- displays an external source badge when `offer.isExternal === true`
- shows `sourceWebsite` badge and custom external apply CTA on the card

### Detail modal
`src/components/OfferDetailModal.jsx`

Behavior:
- if `offer.isExternal` is true, the primary CTA is an external link
- CTA target is `offer.externalUrl`
- opens in a new tab with `noopener noreferrer`

That means the current external-job apply action is:

```text
click card or details
  -> open external detail modal
  -> "Visit Website"
  -> redirect to original source page
```

No MatchOp-native apply pipeline is created for these jobs.

## `offers` vs `external_jobs`

### `offers`
- owned by registered MatchOp companies
- belongs to `company_id`
- participates in `student_swipes`
- can produce `intros`
- can produce `matches`
- unlocks chat through `messages`

### `external_jobs`
- imported from third-party boards or company ATS pages
- not linked to a MatchOp company owner
- discovery-only
- redirect users out to `original_url`
- must not create intros, matches, or chat

## External Job Schema Highlights
Confirmed fields used by the product:
- `source_website`
- `original_url`
- `title`
- `company_name`
- `location`
- `description`
- `salary_range`
- `job_type`
- `logo_url`
- `posted_at`
- `tags`
- `is_global`

Scraper metadata fields:
- `source_job_id`
- `content_hash`
- `first_seen_at`
- `last_seen_at`
- `scraped_at`

## Safe Public View
`external_jobs_public` exists to avoid exposing the raw base table directly.

It exposes:
- standard job display fields
- `source` as alias of `source_website`
- `url` as alias of `original_url`

This lets client code use a stable public projection while server-side edge functions can still read the base table.

## Important Guardrail
External jobs share the student discovery UI with internal offers, but they are not part of the MatchOp handshake system.

Future work must keep the boundary explicit:
- allowed: read and display
- allowed: redirect to `original_url`
- not allowed: create intro
- not allowed: create match
- not allowed: create chat