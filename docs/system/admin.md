# MatchOp Admin System

## Overview
The admin area is a client-side management console under `/admin/*`.

Primary pages:
- `AdminDashboard.jsx`
- `AdminUsers.jsx`
- `AdminOffers.jsx`
- `AdminCompanies.jsx`
- `AdminReports.jsx`
- `AdminAnalytics.jsx`
- `AdminSettings.jsx`
- `AdminPayments.jsx`

Admin route access is enforced in `src/components/RouteGuards.jsx` through `AdminRoute`.

## Admin Dashboard
Page:
- `src/pages/admin/AdminDashboard.jsx`

Reads:
- `profiles`
- `students`
- `companies`
- `offers`
- `matches`
- `reports`
- `admin_audit_logs`

Purpose:
- top-level stats
- quick navigation
- recent admin activity feed

## User Management
Page:
- `src/pages/admin/AdminUsers.jsx`

Reads:
- `profiles`
- joined `students`
- joined `companies`
- joined `user_profiles`

Actions:
- suspend and activate users through `profiles.suspended`
- edit default persona type through `user_profiles.profile_type`
- log actions to `admin_audit_logs`

## Company Management
Page:
- `src/pages/admin/AdminCompanies.jsx`

Reads:
- `companies`
- counts `offers` per company

Actions:
- verify and unverify companies through `companies.verified`
- delete company records and their offers
- log actions to `admin_audit_logs`

## Offer Management
Page:
- `src/pages/admin/AdminOffers.jsx`

Reads:
- `offers`
- joined `companies`

Actions:
- activate and deactivate offers
- delete offers
- inspect offer detail
- log actions to `admin_audit_logs`

Important note:
- this page still assumes some older offer fields such as `salary_min` and `salary_max`

## Reports and Moderation
Page:
- `src/pages/admin/AdminReports.jsx`

Primary table:
- `reports`

Supporting reads:
- `profiles` for reporter and reported emails

Actions:
- resolve or dismiss reports
- optionally suspend the reported user by updating `profiles.suspended`
- log actions to `admin_audit_logs`

Report fields observed:
- `reporter_id`
- `reported_id`
- `reason`
- `description`
- `status`
- `resolution`
- `resolved_at`

## Analytics
Page:
- `src/pages/admin/AdminAnalytics.jsx`

Reads:
- `profiles`
- `offers`
- `matches`
- `companies`
- `user_profiles`

Outputs:
- user growth
- offer counts
- match counts
- top companies by offer count
- top skills
- location distribution

Important note:
- this page still queries `offers.required_skills`, which appears to be a legacy field assumption rather than the canonical `req_skills`

## Settings
Page:
- `src/pages/admin/AdminSettings.jsx`

Primary table:
- `app_settings`

Behavior:
- loads a single settings JSON payload
- upserts row `id = 1`
- logs changes to `admin_audit_logs`

Settings include:
- site name and description
- contact email
- limits and rules
- notification toggles
- maintenance mode
- allow-new-signups toggle

## Payments
Pages and helpers:
- `src/pages/admin/AdminPayments.jsx`
- `src/lib/payments/admin.js`
- edge function `admin-review-payment`

Primary tables:
- `payment_requests`
- `payment_requests_audit`

Storage bucket:
- `payment_proofs`

Behavior:
- review pending D17 payment requests
- approve, reject, or revert through `admin-review-payment`
- fetch audit history
- preview proof uploads with signed URLs

Approval effect:
- approving a payment request updates `profiles.is_premium` and `profiles.premium_expires_at` through the payment RPC chain

## Verification Workflows

### User verification badge
Handled in:
- `src/lib/verification.js`

Writes to:
- `profiles.verified`
- `profiles.verification_method`
- `profiles.verification_data`
- `profiles.verified_at`

Supported flows in current code:
- email auto-verification
- LinkedIn URL verification

### Company verification
Handled in:
- admin company management UI

Writes to:
- `companies.verified`

### Premium verification and review
Handled in:
- checkout and payment review flow

Writes to:
- `payment_requests`
- `payment_requests_audit`
- `profiles.is_premium`
- `profiles.premium_expires_at`

## Support and Audit Tables

### `reports`
Used for moderation and abuse reporting.

### `admin_audit_logs`
Stores admin action history.

### `payment_requests_audit`
Stores payment-review history.

### `app_settings`
Stores system-level settings.

## Admin Boundary
The admin system is broad enough to affect core platform state, but it is not the runtime job-discovery engine itself. Future work should keep admin writes explicit and auditable, especially when touching:

- `profiles`
- `companies`
- `offers`
- `payment_requests`
- `reports`