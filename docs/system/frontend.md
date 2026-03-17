# MatchOp Frontend Structure

## Application Shape
The frontend is a React single-page application rooted at `src/main.jsx` and routed in `src/App.jsx`.

Boot sequence:
- create React root
- mount `BrowserRouter`
- mount `AuthProvider`
- mount `ApplicationProvider`
- mount `ThemeProvider`
- render `App`

If required Supabase environment variables are missing, the app shows a configuration screen instead of the main product.

## Route Structure

### Shared and root
- landing page
- auth callback
- dashboard redirector
- checkout and payment history
- premium-related pages
- legal pages

### Student routes
- `/student/profile`
- `/student/swipe`
- `/student/matches`
- `/student/chat/:matchId?`
- referrals and notifications

### Company routes
- `/company/profile`
- `/company/offers`
- `/company/post-offer`
- `/company/intros`
- `/company/matches`
- `/company/chat/:matchId?`
- `/company/archived`

### Admin routes
- `/admin/dashboard`
- `/admin/users`
- `/admin/offers`
- `/admin/companies`
- `/admin/reports`
- `/admin/analytics`
- `/admin/settings`
- `/admin/payments`

## Key Folders

### `src/pages`
Route-level screens.

Important groups:
- `student/`: profile, swipe, matches, chat
- `company/`: profile, offers, posting, intros, matches, archived
- `admin/`: dashboards, moderation, settings, payments

### `src/hooks`
Reusable data and state orchestration.

Important hooks:
- `useJobOffers`
- `useExternalJobs`
- `useMatches`
- `useMessages`
- `useCandidates`
- `useStudentProfile`
- `useIntros`
- `useCompanyOffers`

### `src/context`
Top-level global state providers.

Files:
- `AuthContext.jsx`
- `ApplicationContext.jsx`
- `ThemeContext.jsx`

### `src/lib`
Service wrappers and utilities.

Important modules:
- `supabase.js`
- `swipeStackApi.js`
- `swipeActionApi.js`
- `storage.js`
- `verification.js`
- `premiumEntitlements.js`
- `notifications.js`
- payment helpers under `src/lib/payments/`

### `src/components`
Reusable interface components.

Important discovery components:
- `SwipeCard.jsx`
- `OfferDetailModal.jsx`
- `MatchModal.jsx`
- `ApplicationToast.jsx`
- `MatchToast.jsx`
- `offers/OfferScopeToggle.jsx`
- `offers/PreferencesButton.jsx`
- `offers/PreferencesDrawerOrModal.jsx`

### `src/features`
Larger feature modules that bundle multiple hooks and UI pieces.

Important example:
- `features/conversations/` for the conversation hub

## Important Context Providers

### `AuthContext`
Responsibilities:
- reads Supabase Auth session
- fetches `profiles`, `students`, `companies`, and `user_profiles`
- bootstraps missing rows after auth events
- derives `isStudent`, `isCompany`, and `isAdmin`
- exposes signup, login, logout, password reset, and profile refresh methods

### `ApplicationContext`
Current responsibility:
- premium upsell modal state

### `ThemeContext`
Theme selection and UI theme state.

## Important Hooks

### `useJobOffers`
Purpose:
- main student discovery hook

Behavior:
- fetches internal and external opportunities
- uses `swipe-stack` when enabled
- falls back to `get-matched-jobs` and direct table reads otherwise
- records swipes through `record-swipe`
- creates intros through `create_intro_from_swipe` on internal right swipes
- tracks daily swipe usage

### `useExternalJobs`
Purpose:
- paginated direct reader for `external_jobs_public`

Behavior:
- applies search and location filters
- returns 24 items per page

### `useMatches`
Purpose:
- loads student or company matches

Behavior:
- queries `matches` with joined `offers`, `companies`, and `students`
- enriches company-side rows with student premium flags
- supports archiving by setting `matches.status = archived`

### `useMessages`
Purpose:
- loads and sends chat messages for a match thread

Behavior:
- queries `messages`
- subscribes to realtime inserts
- sanitizes outgoing content and runs spam detection
- marks messages as read

### `useCandidates`
Purpose:
- legacy or auxiliary candidate-pipeline hook for `company_swipes`

Behavior:
- reads students who swiped right on company offers
- excludes already evaluated candidates
- can write to `company_swipes`

Current status:
- present in the codebase, but not mounted on the current routed company flow

### `useStudentProfile`
Purpose:
- active student profile hook

Behavior:
- reads and updates `students`
- manages `experiences`
- manages `student_education`
- triggers `generate-embedding` after important profile updates

Note:
- there is no generic `useProfile` hook in the current codebase
- `useStudentProfile` is the active student-profile hook, and company profile logic is page-local in `CompanyProfile.jsx`

## Swipe UI Stack

### Primary page
- `src/pages/student/StudentSwipe.jsx`

### Main card component
- `src/components/SwipeCard.jsx`

What `SwipeCard` handles:
- current top card rendering
- drag and swipe gestures
- source badges for external jobs
- imperative swipe triggers for action buttons

### Supporting modals and toasts
- `OfferDetailModal.jsx` for full job details
- `MatchModal.jsx` for match celebration
- `ApplicationToast.jsx` and `MatchToast.jsx` for feedback

## Conversation UI
Conversation screens share one feature module:

- `src/features/conversations/ConversationHubPage.jsx`
- `src/features/conversations/useConversationThreads.js`

Student and company pages are thin wrappers that provide role and route prefixes.

## Frontend Drift Notes
- Some admin pages and analytics pages still query fields that do not clearly exist in the canonical SQL reviewed here
- Current route guards redirect `/company/candidates` to `/company/intros`
- `useCandidates` still exists, so future refactors should verify whether it is intentionally dormant or meant to be reintroduced