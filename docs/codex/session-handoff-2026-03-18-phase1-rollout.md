# Session Handoff: Phase 1 Rollout / March 19, 2026

## Start Here

This is the only handoff the next chat should trust.

Use it before making changes.

It is intentionally explicit about:
- which worktree is canonical
- what is actually verified
- what was intentionally disabled
- what local changes are still dirty and unsynced
- what should **not** be redone

---

## Canonical Repo State

Canonical worktree:
- `/Users/vinay/dev/InOutHub-Events-main`

Historical rollout worktree:
- `/Users/vinay/dev/InOutHub-Events`

Canonical branch:
- `main`

Do **not** continue work on:
- `codex/mobile-readiness-redesign`

Important git/worktree note:
- this repo uses multiple git worktrees
- `main` is already checked out in `/Users/vinay/dev/InOutHub-Events-main`
- trying to switch the historical worktree to `main` will fail with the normal git worktree error

Node/tooling note:
- `/Users/vinay/dev/InOutHub-Events-main/node_modules` is a symlink to `/Users/vinay/dev/InOutHub-Events/node_modules`
- this is intentional to avoid duplicate installs / disk bloat

---

## Authority Order

1. `database_schema.sql`
2. `AGENTS.md`
3. `task.md`
4. `SPEC.md`
5. `.agents/skills/`
6. runtime code in `src/` and `supabase/functions/`
7. `docs/`

External agent notes or “brain” files are not authoritative.

---

## What Is Actually Verified

### Core rollout state

Phase 1 operator app is the active path on `main`.

This includes:
- login / access
- org / event selection
- dashboard
- participants
- performances
- show flow
- console
- participant / performance profile workspaces

### Gate 15

Gate 15 is verified.

Verified loop:
- Reset Demo Event
- Prepare Performance Intro
- Preview
- Approve for Stage
- Stage Console reflects approved intro state

Known good deterministic act:
- `The strong Solo Singer`

### Build

`npm run build` passes on the canonical `main` worktree.

### PWA / install surface

Already completed and synced:
- app icon refresh
- install name aligned to `InOutHub Events`
- dev-PWA stability fixes for localhost

### OTP-first auth

Already completed and synced:
- email OTP is primary login path
- Google is secondary and collapsed
- mobile auth screen was heavily simplified for phone use
- install hint / `How to add it` exists
- `Already have a code?` exists for browser-to-PWA continuity

---

## What Was Intentionally Disabled

The signed-in account profile confirmation / update flow was intentionally disabled from the live UI.

Reason:
- it created too much friction
- it was interrupting testing
- repeated confirmation was not solved fast enough to justify more time right now

Currently disabled in synced `main`:
- automatic `Confirm your details` gate
- `Update Profile` action in the header menu

Relevant synced commit:
- `0a3ade9` `Disable profile confirmation flow`

Interpretation:
- do **not** assume profile confirmation is live
- do **not** keep debugging it unless explicitly asked

---

## What Is Still Dirty Locally Right Now

Current unsynced local changes in the canonical worktree:
- `database_schema.sql`
- `src/components/auth/ProfileConfirmationGate.tsx`
- `supabase/migrations/20260319_add_update_own_profile_rpc.sql`

Also still untracked locally:
- `public/icon-source.jpeg`

Meaning:
- there is partially implemented follow-up work for a profile RPC path
- it is **not live**
- it is **not pushed**
- it should be treated as parked / unfinished unless the user explicitly wants to resume it

Do not assume that local dirty profile work is production intent.

---

## What Was Learned About The Profile Attempt

There are two different data domains and they must stay separate:

### Signed-in account profile

Source of truth:
- `user_profiles`

Purpose:
- support
- troubleshooting
- operator contact details
- auth/session context

### Org/Event admin-managed operational records

Source of truth:
- participants / assignments / roster / event access structures

Purpose:
- cast / crew operations
- readiness
- staffing
- act membership

Rule:
- do **not** silently blend roster/cast records into signed-in account profile
- do **not** imply the user profile and roster profile are the same thing

This distinction matters and must be preserved in future work.

---

## Auth / Telemetry State

Synced on `main`:
- OTP-first auth UI
- auth telemetry expansion for:
  - `email_code_requested`
  - `email_code_verified`
  - `google_login_started`
  - `google_login_completed`
  - `install_help_opened`
  - `profile_check_shown`
  - `profile_check_completed`
  - `login_completed`
  - `logout`
  - `session_timeout`

Important:
- telemetry code was added and synced
- but the new `auth_events.metadata` backend support depends on applying the migration below

Pending backend migration to apply in Supabase:
- `/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260319_expand_auth_events_metadata.sql`

Do not claim telemetry metadata is fully live until that migration is applied.

Privacy/trust direction agreed with the user:
- coarse troubleshooting context is acceptable
- exact GPS-style location is not desired
- visible timezone in profile confirmation was considered a trust issue and should not be surfaced casually

---

## Highest-Value Next Work

The next chat should avoid low-value churn and work on one of these only if the user wants it:

1. Finish OTP pilot validation end to end
- Supabase OTP template / email flow
- mobile/PWA install path
- actual operator entry reliability

2. Apply pending Supabase auth telemetry migration
- only if telemetry inspection is needed now

3. Gate 17 polish
- cinematic storyboard / playback refinement
- only if user wants intro premium polish next

4. Operational UX issues surfaced by live testing
- only when there is a real reproducible operator pain point

Do **not** restart profile-confirmation work unless explicitly requested.

---

## Things The Next Chat Should Not Redo

Do not redo:
- Gate 15 verification
- branch-model cleanup
- icon/name install work
- OTP-first login redesign from scratch
- stale worktree confusion analysis

Do not assume:
- `codex/mobile-readiness-redesign` is the active branch
- the profile/update flow is currently enabled
- local dirty files are already shipped

---

## Recommended First Commands For The Next Chat

In `/Users/vinay/dev/InOutHub-Events-main`:

1. `git status --short`
2. confirm branch/worktree context
3. check whether the user wants:
- sync / cleanup of dirty local profile files
- OTP testing
- telemetry migration application
- or a different Phase 1 pilot issue

---

## Recommended First Prompt For The Next Chat

Read `/Users/vinay/dev/InOutHub-Events-main/docs/codex/session-handoff-2026-03-18-phase1-rollout.md` first, then inspect `git status --short` in `/Users/vinay/dev/InOutHub-Events-main` and continue from the highest-value open item on `main`. Do not redo Gate 15, branch/worktree cleanup, or the disabled profile-confirmation flow unless explicitly asked.
