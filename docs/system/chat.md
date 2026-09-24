# MatchOp Chat System

## Overview
Chat in MatchOp is unlocked only after a match exists.

Canonical path:
```text
student right-swipes internal offer
  -> intro created
company accepts intro
  -> match created
match exists
  -> messages table becomes the conversation thread
```

External jobs never enter this flow.

## Data Model

### `matches`
- one row per matched student and offer
- binds:
  - `student_id`
  - `company_id`
  - `offer_id`
- status can be archived from the UI

### `messages`
- one row per chat message
- contains:
  - `match_id`
  - `sender_id`
  - `content`
  - `is_read`
  - `created_at`

## How Threads Are Created

### Current primary path
1. Student creates an intro by right-swiping an internal offer.
2. Company accepts the intro.
3. Trigger `handle_intro_accepted` inserts into `matches`.
4. The chat UI can now open the match thread.

### Legacy path still present
- a trigger on `company_swipes` can also insert into `matches`
- this is not the primary routed company UX today

## Frontend Chat Components

### Entry pages
- `src/pages/student/StudentChat.jsx`
- `src/pages/company/CompanyChat.jsx`

Both wrap:
- `src/features/conversations/ConversationHubPage.jsx`

### Thread list
`useConversationThreads`:
- loads `matches`
- fetches message summaries
- builds participant metadata
- supports search and archive filtering

### Message view
`useMessages`:
- fetches `messages` for a selected `match_id`
- inserts new messages
- marks unread messages as read
- subscribes to realtime inserts

## Realtime Messaging

### Mechanism
Supabase Realtime subscription:
```text
channel("messages:{matchId}")
  -> postgres_changes
  -> event: INSERT
  -> table: messages
```

### Client behavior
When a new message arrives:
- it is appended to local thread state
- a local notification can be added when the sender is the other participant

## Read and Write Flow

### Load thread list
1. Query `matches`
2. Query `messages` for latest and unread state
3. Build display thread objects

### Open one thread
1. Select a `match_id`
2. Query `messages` by `match_id`
3. Mark non-self messages as read

### Send message
1. Sanitize content
2. Run spam checks
3. Insert into `messages`
4. Realtime pushes the insert event back to listeners

## Archiving
Archiving is done on the `matches` row:
- `useMatches().archiveMatch()` updates `matches.status = archived`

Conversation behavior:
- archived matches still exist
- the conversation hub can filter them
- the message composer is disabled for archived threads

## RLS and Access
The schema and canonical RLS files show:
- match participants can read their own `matches`
- match participants can read and insert `messages`
- message read-state updates are allowed for participants

This is the core authorization boundary for chat.

## Important Rule
Only matched internal opportunities can open chat.

Do not route external jobs, external applications, or discovery-only opportunities into `matches` or `messages`.