# MatchOp Discovery System

## Overview
The discovery feed is the student-facing opportunity stream shown on `/student/swipe`.

It is assembled by `src/hooks/useJobOffers.js` and has two operating modes:

- V2 mode through the `swipe-stack` edge function
- Legacy fallback mode through `get-matched-jobs` plus direct table reads

The feed can include both:
- internal MatchOp offers from `offers`
- external redirect jobs from `external_jobs`

## Primary Feed Assembly Path

### Client entry point
- `src/pages/student/StudentSwipe.jsx`
- `src/hooks/useJobOffers.js`

### Server-side V2 path
- `src/lib/swipeStackApi.js`
- `supabase/functions/swipe-stack/index.ts`

The client calls:
```text
fetchSwipeStack({ mode, limit, cursor })
```

Expected response shape:
```json
{
  "items": [],
  "next_cursor": "base64-cursor-or-null",
  "meta": {
    "mode": "standard|premium",
    "effective_plan": "standard|premium",
    "count": 20
  }
}
```

## Swipe Stack Generation

### Inputs
`swipe-stack` reads:
- current auth user
- `user_profiles` to confirm student access
- `profiles` for:
  - `is_premium`
  - `premium_expires_at`
  - `preferences`
- `students` for skills and location
- `student_swipes` to exclude already swiped internal offers
- `offers`
- `external_jobs`

### Standard mode
Behavior:
- fetches only non-global opportunities
- excludes already swiped internal offers
- keeps local opportunities aligned with student location tokens
- allows remote opportunities even when local filters are used

### Premium mode
Behavior:
- requires active premium
- can include global opportunities
- applies server-side preference filters from `profiles.preferences`

If the user is not premium:
- the edge function returns a paywall-style error response

## Ranking Logic
The edge function scores each normalized opportunity with:

- skill overlap against student skills
- keyword overlap from premium preference keywords
- industry preference matches
- remote and visa-fit bonuses or penalties
- recency bonus based on `createdAt`

For external jobs, the feed still normalizes the job into the same card shape, but it remains external and redirect-only.

## Filtering Logic

### Server-side filters in `swipe-stack`
- mode: standard vs premium
- already swiped internal offers
- local vs global gating
- remote-only preference
- visa sponsorship preference
- preferred industries
- preferred skill keywords

### Client-side filters in `StudentSwipe`
After `useJobOffers` loads data, `StudentSwipe.jsx` applies local UI filters from `matchop_student_swipe_preferences`:

- `locationMode`
- `opportunityType`
- `category`
- `locationQuery`
- `radiusKm`

These are applied in `applySwipePreferences()`.

Important:
- this client-side filtering is separate from the server-side `profiles.preferences` filtering
- the two systems are not currently unified

## Pagination and Cursoring

### `swipe-stack`
- accepts `limit`
- accepts `cursor`
- returns `next_cursor`
- uses a base64-encoded offset cursor

### `useExternalJobs`
- separate hook for direct paginated external job listing
- uses 24 items per page from `external_jobs_public`

## Legacy Fallback Query Path
When `VITE_SWIPE_STACK_V2 !== true`, `useJobOffers` falls back to:

1. fetch swiped offer ids from `student_swipes`
2. call edge function `get-matched-jobs`
3. if that fails, query `offers` directly
4. independently fetch `external_jobs_public`
5. merge internal and external lists client-side

## Discovery Components

### Main page and controls
- `src/pages/student/StudentSwipe.jsx`
- `src/components/offers/OfferScopeToggle.jsx`
- `src/components/offers/PreferencesButton.jsx`
- `src/components/offers/PreferencesDrawerOrModal.jsx`

### Discovery feed & Card rendering
- `src/components/discovery/VerticalOpportunityFeed.jsx` (vertical gesture handling, wheel & drag events, keyboard shortcuts, Framer Motion spring transitions)
- `src/components/discovery/VerticalOpportunityItem.jsx` (opportunity card with ambient glow, tags, match score, quick actions)
- `src/components/OfferDetailModal.jsx` (expanded opportunity view)
- `src/components/MatchModal.jsx` (match celebration)

### UX states
- loading, empty state, toast notifications, undo, and match modal all live in the student discovery feed screen (`StudentSwipe.jsx`)

## Fallbacks and Failure Modes
- if the student profile is missing, the feed shows a “profile preparing” message
- if premium mode is requested without entitlement, the UI falls back to standard mode and opens premium upsell
- if swipe-limit RPC fails, the client falls back to a direct count on today’s `student_swipes`

## Important Behavior Boundaries
- external jobs may appear in the same feed, but they must not create intros or matches
- the discovery feed is one UI, but it is backed by two job systems with different downstream behavior