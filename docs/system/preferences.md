# MatchOp Preferences System

## Critical Overview
MatchOp currently has two different preference and filter systems affecting discovery:

1. Local UI swipe preferences stored in browser localStorage
2. Server-side premium discovery preferences stored in `profiles.preferences`

They are related, but they are not the same system.

Any future work on discovery must preserve this distinction or intentionally consolidate it with a migration plan.

## Local Swipe Preferences

### Storage location
Browser localStorage key:
- `matchop_student_swipe_preferences`

Defined in:
- `src/pages/student/StudentSwipe.jsx`

Default shape:
```json
{
  "locationMode": "all",
  "opportunityType": "all",
  "category": "all",
  "locationQuery": "",
  "radiusKm": "any"
}
```

### Fields used
- `locationMode`
  - `all`
  - `remote`
  - `onsite`
- `opportunityType`
  - `all`
  - `internship`
  - `full-time`
  - `part-time`
  - `contract`
- `category`
- `locationQuery`
- `radiusKm`

### How they affect the feed
`StudentSwipe.jsx` applies them client-side through `applySwipePreferences()` after data is already fetched.

This means:
- they do not change the SQL or edge-function query directly
- they only filter the already returned offer list in the browser

### Premium gating
Opening or changing these preferences is premium-gated in the current UI through `usePremiumGate`.

## Discovery Scope Preference
Separate localStorage keys also control local and global discovery mode:

- `matchop_discovery_scope`
- legacy fallback key `matchop_discovery_mode`

These keys drive whether `useJobOffers` asks for:
- `standard` mode
- `premium` mode

## Server-Side Preferences

### Storage location
Database column:
- `profiles.preferences jsonb`

Added by:
- `supabase/migrations/20260224010100_profiles_premium_preferences.sql`

### Fields read by the backend
`supabase/functions/swipe-stack/index.ts` reads these shapes:

- `remote_only` or `remoteOnly`
- `visa_sponsorship` or `visaSponsorship`
- `industries`
- `skills_keywords` or `skillsKeywords` or `skills`

Normalized shape inside the edge function:
```json
{
  "remoteOnly": false,
  "visaSponsorship": false,
  "industries": [],
  "skillKeywords": []
}
```

### How they affect discovery
Only the `swipe-stack` edge function uses them.

They influence:
- global vs local premium discovery filtering
- remote-only gating
- visa sponsorship gating
- industry matching
- skill-keyword matching
- part of the ranking score

## Which Queries Read Preferences

### Reads local UI preferences
- `src/pages/student/StudentSwipe.jsx`

### Reads server-side profile preferences
- `supabase/functions/swipe-stack/index.ts`

### Does not currently read `profiles.preferences`
- `supabase/functions/get-matched-jobs/index.ts`
- direct `offers` queries in the legacy fallback path
- `useExternalJobs.js`

## Practical Consequence
Today, a student can have:

- one set of browser-only filters shaping the cards they see in the current session
- another set of stored premium preferences used only by the server-side premium discovery function

These can diverge.

## Future-Safe Interpretation
Before changing discovery logic, treat the current system as:

- a local presentation filter layer
- plus a separate server-side premium preference layer

Do not assume there is a single authoritative preference model yet.