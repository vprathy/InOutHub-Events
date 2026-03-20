# Session Handoff: Manage Requirements MVP / March 20, 2026

## Start Here

This handoff supersedes ad hoc chat memory for the work completed on March 19-20, 2026.

Use it before making changes.

It is intentionally explicit about:
- canonical repo/worktree and branch
- current git cleanliness
- what is live in Supabase
- what is implemented in the app
- what is verified versus still open
- what should not be restarted

---

## Canonical Repo State

Canonical worktree:
- `/Users/vinay/dev/InOutHub-Events-main`

Canonical branch:
- `main`

Current HEAD:
- `270c8e1d3d742e7cc92681b31b96671408c4af1e`
- `270c8e1 Tighten admin mobile surfaces and refresh handoff`

Current git status:
- clean working tree

Remote sync:
- `origin/main` includes commit `270c8e1`

Local dev server:
- Vite was observed listening on `http://localhost:5173`

---

## Authority Order

1. `database_schema.sql`
2. `AGENTS.md`
3. `task.md`
4. `SPEC.md`
5. `.agents/skills/`
6. runtime code in `src/` and `supabase/functions/`
7. `docs/`

External chat memory is not authoritative.

---

## Product North Star

InOutHub is a live event operations platform.

Core loop:
- `Ingest -> Assemble Acts -> Schedule -> Execute`

Primary operational object:
- the `Act`

Product priority:
- live-event reliability over creative flexibility

Phase 1 active operator path on `main` includes:
- login / access
- org / event selection
- dashboard
- participants
- performances
- show flow
- console
- participant / performance profile workspaces
- Manage Requirements MVP
- Admin module
- event access lifecycle and pending pre-sign-in access

The product is explicitly not trying to become:
- ticketing
- payments
- seating
- general attendee management

The current product emphasis is:
- readiness
- operator workflows
- stage execution reliability
- mobile/PWA practicality in real event environments

---

## Remaining Roadmap

The remaining roadmap should be interpreted from [task.md](/Users/vinay/dev/InOutHub-Events-main/task.md), but in practical product terms the highest-value remaining areas are:

### Immediate

- manually validate mobile usability for:
  - `Admin > Access`
  - `Admin > Requirements`
- decide whether further chrome reduction is still needed after the shipped compaction pass
- mobile review of the page-identity pass:
  - verify Participants vs Performances distinction on a real phone
  - verify sticky section strip does not feel noisy on long-scroll screens
- patch repo-side backend drift identified by Antigravity:
  - fix ambiguous `id` reference in `assign_event_role` SQL source if repo still differs from live DB
  - restore/replace act requirement sync path so legacy `act_requirements` updates feed readiness assignments
  - backfill act-side `requirement_assignments` for live data if missing
- launch access lifecycle smoke tests:
  - manual quick grant for existing user
  - pending access for not-yet-signed-in email
  - first-sign-in fulfillment
  - automated baseline access on active participant
  - automated baseline removal on inactive participant
  - manual elevated role survives source churn
- Manage Requirements workflow validation:
  - verify org scope
  - verify event scope
  - verify inherited org rules
  - verify event-specific additive rules
  - verify supported requirement codes surface correctly in participant/performance workflows
- Gate 17 revalidation:
  - confirm cinematic storyboard / playback timing polish on the approved intro path

### Near-term operational hardening

- continue readiness / requirement workflow maturation for real client operations
- close remaining operational UX gaps surfaced by live usage
- bulk access workflows:
  - selection-based bulk role changes for known people
  - upload-based bulk grant / pending creation from email list
- participant-side automatic assignment alignment if product still wants source-managed participant requirement assignment beyond the current bridges
- keep auth/profile friction out of the operator path unless explicitly reprioritized

### Deferred architecture

These were intentionally deferred and should not block current MVP delivery:
- requirement snapshot/versioning
- future-only policy inheritance
- full generic custom-rule builder
- richer invitation/voucher model beyond the minimal pending-email table

Interpretation:
- the app is now in a “working MVP with hardening” phase
- the next work should optimize for client-usable workflows first, architectural refinement second

---

## What Was Completed In This Session

### 1. OTP-first auth telemetry is fully hardened and verified

Frontend fix shipped:
- [LoginPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/auth/LoginPage.tsx)

What changed:
- after successful OTP verification, pending auth events are flushed before logging `email_code_verified` and `login_completed`

Reason:
- `email_code_requested` was previously queued in `sessionStorage` but never persisted on the single-page OTP flow

Verification outcome:
- actual browser-based OTP flow was re-run
- full event chain now lands:
  - `email_code_requested`
  - `email_code_verified`
  - `login_completed`
- `user_sessions` also verified
- metadata confirmed populated (`displayMode`, `deviceType`, `pwaVersion`, `viewport`, `screen`, etc.)

Support script added:
- [verify-auth-telemetry.ts](/Users/vinay/dev/InOutHub-Events-main/scripts/verify-auth-telemetry.ts)

Task ledger updated:
- OTP-first pilot validation marked complete in [task.md](/Users/vinay/dev/InOutHub-Events-main/task.md)

### 2. Auth telemetry backend migration is live in Supabase

Live migration already applied and verified:
- [20260319_expand_auth_events_metadata.sql](/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260319_expand_auth_events_metadata.sql)

Confirmed live:
- `public.auth_events.metadata` exists as `jsonb`
- expanded `auth_events_event_type_check` is live

RLS / policy validation also confirmed live:
- `public.auth_events`
- `public.user_sessions`
- RLS enabled
- policies matched repo expectations exactly at the time of verification

### 3. Manage Requirements MVP is now real, not just a brochure page

Main app surface:
- [RequirementsPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/RequirementsPage.tsx)

What is now true:
- the page reads real `requirement_policies` from Supabase
- it distinguishes:
  - org baseline rules
  - event-specific rules
  - inherited org rules at event scope
- org/event admins can turn recommended presets on or off
- event scope treats org rules as inherited and additive-only in the UI

Important limitation:
- this is a **Phase 1 MVP**
- it is not a full custom policy builder or snapshot/versioned requirement system
- requirement surfaces were later expanded beyond the initial bridge set; see section 7 below

### 4. RBAC hierarchy was corrected to match operational reality

Repo contract updated in:
- [database_schema.sql](/Users/vinay/dev/InOutHub-Events-main/database_schema.sql)
- [types/domain.ts](/Users/vinay/dev/InOutHub-Events-main/src/types/domain.ts)

Resulting intended hierarchy:
- org roles: `Owner`, `Admin`, `Member`
- event roles: `EventAdmin`, `StageManager`, `ActAdmin`, `Member`

Rationale:
- `StageManager` and `ActAdmin` are event-scoped operational roles, not tenant-wide org roles

UI updated:
- [ManageOrgAccessModal.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/selection/ManageOrgAccessModal.tsx)
- [ManageEventAccessModal.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/selection/ManageEventAccessModal.tsx)

Dev seed adjusted:
- [seed.ts](/Users/vinay/dev/InOutHub-Events-main/src/lib/dev/seed.ts)

### 5. Requirement inheritance is enforced in live Supabase

Migration file:
- [20260319_role_scope_and_requirement_inheritance.sql](/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260319_role_scope_and_requirement_inheritance.sql)

This migration was applied and verified live by Antigravity.

Live outcome:
- org-level legacy `StageManager` / `ActAdmin` memberships were remapped to `Member`
- `organization_members` now effectively allows only:
  - `Owner`
  - `Admin`
  - `Member`
- `event_members` now allows:
  - `EventAdmin`
  - `StageManager`
  - `ActAdmin`
  - `Member`
- trigger `trg_enforce_requirement_policy_scope` is active
- org-level requirement codes cannot be overridden by event-level policies with the same `code`

Important product decision made:
- for Phase 1, requirements are treated as a **live baseline model**
- org rules are the baseline
- event rules may add, not override
- snapshot/versioned future-only inheritance was explicitly **deferred**

Reason:
- first client is waiting on a working admin/ops workflow now
- 80 participants already registered and 200+ more expected shortly
- perfect versioning was deprioritized in favor of a working MVP

### 6. Gate 17 storyboard/playback polish is implemented but not revalidated

Studio/player work updated in:
- [IntroVideoBuilder.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/acts/IntroVideoBuilder.tsx)

What changed:
- full storyboard timeline surfaced
- total playback runtime shown
- cue offsets and hold durations surfaced in the review surface
- preview surface better matches actual playback timing

Status:
- code shipped
- build passes
- **task remains open until explicit revalidation**

### 7. Manage Requirements now drives participant and performance workspaces

Core supporting files:
- [requirementPolicies.ts](/Users/vinay/dev/InOutHub-Events-main/src/lib/requirementPolicies.ts)
- [requirementsPrototype.ts](/Users/vinay/dev/InOutHub-Events-main/src/lib/requirementsPrototype.ts)
- [useParticipants.ts](/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts)
- [useActs.ts](/Users/vinay/dev/InOutHub-Events-main/src/hooks/useActs.ts)
- [ParticipantProfilePage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantProfilePage.tsx)
- [PerformanceProfilePage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/PerformanceProfilePage.tsx)
- [domain.ts](/Users/vinay/dev/InOutHub-Events-main/src/types/domain.ts)

What is now true:
- participant and performance workflows resolve active org baseline plus additive event requirement policies
- requirement rows are built from live active policy state instead of only older hardcoded bridge assumptions
- next-action routing uses requirement targets instead of fragile legacy key branching
- supported participant policy codes now include:
  - `guardian_contact_complete`
  - `special_request_reviewed`
  - `participant_waiver`
  - `identity_check`
- supported act policy codes now include:
  - `ACT_AUDIO`
  - `ACT_INTRO`
  - `ACT_LIGHTING`
  - `ACT_MICROPHONE`
  - `ACT_VIDEO`
  - `ACT_SUPPORT_TEAM`
  - media/generative policy variants mapped through the active policy layer

Current reality:
- the requirements admin page and operator workspaces are now materially connected
- remaining work here is validation against live data, not basic feature existence

### 8. Launch access lifecycle is implemented in app and Supabase

Key product decision:
- baseline access is source-managed
- elevated roles remain admin-managed
- inactive source state only removes automated baseline event access

Supabase migration applied live by Antigravity:
- [20260320_launch_access_lifecycle.sql](/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260320_launch_access_lifecycle.sql)

Confirmed live:
- `event_members.grant_type`
- `pending_event_access`
- one-step `assign_event_role` behavior
- participant-triggered access reconciliation
- first-sign-in fulfillment via `handle_new_user()`

App surfaces:
- [AccessPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/AccessPage.tsx)
- [ManageEventAccessModal.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/selection/ManageEventAccessModal.tsx)
- [useAccess.ts](/Users/vinay/dev/InOutHub-Events-main/src/hooks/useAccess.ts)

What is now true:
- event access grant auto-creates org membership if missing
- if target email has not signed in yet, access becomes pending instead of hard-failing
- participant-linked source automation is the active launch scope
- crew remains lifecycle-compatible in the model but is not yet first-class automated source scope

Important operational truth:
- the old org-screen-then-event-screen staffing workflow is no longer the intended default
- the event-scoped quick-grant path is now the primary manual access workflow

### 9. Admin module consolidation is shipped

Navigation outcome:
- `Dashboard` remains the default landing page
- `Admin` is the right-most bottom-nav item
- `Access` and `Requirements` live under:
  - `/admin`
  - `/admin/access`
  - `/admin/requirements`
- old `/access` and `/requirements` paths redirect
- top-bar access/requirements shortcuts were removed

Key files:
- [AppRouter.tsx](/Users/vinay/dev/InOutHub-Events-main/src/router/AppRouter.tsx)
- [BottomNav.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/BottomNav.tsx)
- [Header.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/Header.tsx)
- [AdminPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/AdminPage.tsx)

Visibility rule:
- `Admin` is visible only to:
  - super admin
  - org `Owner`
  - org `Admin`
  - event `EventAdmin`

### 10. Event-role model is now operationally coherent

Live Supabase assessment and follow-up changes were completed with Antigravity.

Current DB truth:
- `Member` = read-only baseline
- `StageManager` = real execution role
- `ActAdmin` = now real act-prep role
- `EventAdmin` = full event admin
- org `Owner` / `Admin` inherit effective `EventAdmin`

ActAdmin DB-side implementation now includes write access to:
- `acts` (`UPDATE` only, not `INSERT` / `DELETE`)
- `act_participants`
- `act_assets`
- `act_requirements`
- `act_readiness_practices`
- `act_readiness_items`
- `act_readiness_issues`

ActAdmin remains blocked from:
- `participants`
- `stages`
- `lineup_items`
- `stage_state`
- access management tables
- requirement policy admin

UI capability model was then aligned in app:
- [useEventCapabilities.ts](/Users/vinay/dev/InOutHub-Events-main/src/hooks/useEventCapabilities.ts)
- [ParticipantsPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantsPage.tsx)
- [ActsPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/ActsPage.tsx)
- [LineupPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/LineupPage.tsx)
- [StageConsolePage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/StageConsolePage.tsx)
- [ParticipantProfilePage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantProfilePage.tsx)
- [PerformanceProfilePage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/PerformanceProfilePage.tsx)

Practical role model now:
- `Member` = read
- `ActAdmin` = act prep
- `StageManager` = execution
- `EventAdmin` = full event admin

### 11. App-wide page identity pass is shipped

Why this happened:
- Participants and Performances had become too visually similar, especially after the page header scrolled away on mobile

What shipped:
- persistent route-aware identity strip in the app shell
- shared page-header identity treatment
- section-tinted top surfaces for major screens
- participant/performance workspace carry-through so detail screens inherit the same section identity

Key files:
- [sectionIdentity.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/sectionIdentity.tsx)
- [AppShell.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/AppShell.tsx)
- [PageHeader.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/PageHeader.tsx)
- [index.css](/Users/vinay/dev/InOutHub-Events-main/src/index.css)

Touched surfaces:
- dashboard
- participants
- participant profile
- performances
- performance profile
- show flow
- console
- admin
- access
- requirements

Important constraint:
- this pass intentionally did **not** change the info shown on screens or related cards
- it was a differentiation and orientation pass, not a content redesign

### 12. Morning follow-up: Access and Requirements need mobile compaction

Friday morning review found:
- `Access` and `Requirements` were not practical to use on mobile in their current form
- the previous identity pass introduced too many stacked orientation layers at the top of the screen
- some of that chrome was useful for distinction, but not MECE; it consumed space that should have gone to the actual working rows

Current local-only correction in progress:
- [AccessPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/AccessPage.tsx)
- [RequirementsPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/RequirementsPage.tsx)
- [PageHeader.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/PageHeader.tsx)
- [sectionIdentity.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/sectionIdentity.tsx)

What that local pass does:
- trims the sticky section strip to be smaller and quieter
- simplifies `PageHeader` so it stops behaving like another large boxed panel
- collapses `Access` into one compact top control block
- collapses `Requirements` into one compact top control block combining:
  - scope toggle
  - subject toggle
  - summary
  - workspace jump

Important status:
- this compaction pass **was pushed** in:
  - `270c8e1 Tighten admin mobile surfaces and refresh handoff`
- local/remote are currently aligned
- next chat should start with mobile validation on a real device, not another blind UI iteration

Guardrail:
- do not re-expand header chrome while fixing mobile usability
- preserve screen distinction, but make the distinction lighter and subordinate to the actual work content

### 13. Antigravity validation results changed the priority

Antigravity ran a backend-first validation sweep and brief UI RBAC checks.

Access management result:
- **READY WITH CAVEATS**, but functionally strong
- verified:
  - manual quick grant for existing user
  - pending access for not-yet-signed-in email
  - pending fulfillment on login
  - automated baseline creation from active participant
  - automated baseline revoke on inactive participant
  - manual elevated role survival through source churn
  - reactivation behavior without duplicate role creation

Requirements result:
- structurally sound, but **act-side sync is not fully trustworthy yet**

Critical backend caveat:
- act-side readiness assignments are not being kept in sync from the legacy `act_requirements` path
- symptom:
  - `requirement_assignments` for acts can be `NULL`
  - readiness dashboard/workspace may show missing follow-up even when legacy act requirement data exists
- likely cause identified by Antigravity:
  - disabled or missing bridge/sync trigger from legacy `act_requirements` into assignment/readiness state

Additional repo/live drift caveat:
- Antigravity hit an ambiguous column reference in `assign_event_role`
- it was fixed live for testing
- repo SQL should be checked and patched so source control matches live behavior

Antigravity UI RBAC conclusions:
- `EventAdmin`: full access
- `ActAdmin`: correct prep-scope access
- `StageManager`: correct execution-context access, prep edits blocked

Priority implication:
- backend is no longer the main unknown for access lifecycle
- UI polish is still needed, but blind redesign is lower leverage than:
  - real-device validation
  - fixing the act requirement sync gap
  - syncing repo SQL with live DB where drift was found

Recommended next-chat order:
1. verify current mobile `Access` and `Requirements` on device
2. patch repo-side SQL drift:
   - `assign_event_role`
   - act requirement sync/backfill path
3. only then do another narrow UI pass if still needed

---

## Current Product Position

The product owner call that was taken:

- do **not** block Manage Requirements on snapshot/versioning
- ship a working requirements/admin MVP now
- org requirements are the baseline
- event requirements are additive only
- event admins cannot weaken org requirements
- if org admins change live baseline rules during an active event, that is an operational discipline issue for Phase 1, not yet a versioned system behavior

This is deliberate and should not be “corrected” back toward a deferred architecture unless the user explicitly reprioritizes it.

---

## What Is Verified

### Live Supabase

Verified live:
- `auth_events.metadata` migration
- auth telemetry event type expansion
- RLS/policies for auth telemetry/session tables
- RBAC / role-scope migration
- requirement inheritance trigger

### OTP Flow

Verified live:
- OTP login succeeds
- auth telemetry chain complete
- session creation/update works
- metadata payload is populated

### Build

`npm run build` passed after all local changes.

---

## What Is Still Open

### Highest-value open item

`Gate 17: verify cinematic storyboard / playback timing polish for the approved intro path.`

This is still open in:
- [task.md](/Users/vinay/dev/InOutHub-Events-main/task.md)

Meaning:
- the code changes exist
- but the explicit verification loop has not yet been rerun and re-recorded

### Secondary follow-up

Manage Requirements still needs practical UI sanity verification:
- org scope
- event scope
- enabling recommended rules
- inherited org rule behavior at event scope
- participant/performance profile visibility for supported requirement codes

This is not a DB/schema blocker now. It is a workflow validation task.

---

## Important Limits / Truths About Manage Requirements

Do not overclaim the current feature.

It **is**:
- a real policy management MVP for baseline requirement presets
- wired to real `requirement_policies`
- enforced for org-vs-event override behavior

It is **not yet**:
- a generic custom rule builder
- a full policy versioning/snapshot engine
- a system where any arbitrary new requirement code automatically shows in all profile/workspace surfaces

Participant/performance profiles still depend on existing readiness/rendering logic in:
- [requirementsPrototype.ts](/Users/vinay/dev/InOutHub-Events-main/src/lib/requirementsPrototype.ts)

So use supported/recommended codes if you want reliable downstream surface behavior today.

---

## Things The Next Chat Should Not Redo

Do not redo:
- Gate 15 verification
- branch/worktree cleanup
- disabled profile-confirmation flow work
- stale worktree analysis
- auth telemetry backend migration
- auth RLS verification
- OTP telemetry forensic debugging from scratch

Do not assume:
- Manage Requirements is still only a mock page
- org roles should still include `StageManager` or `ActAdmin`
- event admins can override org requirement codes

Do not restart:
- snapshot/versioned inheritance architecture discussion
unless the user explicitly asks to revisit the product strategy

---

## Recommended Next Move

Best next move for the next chat:

1. Read this file
2. Confirm `git status --short`
3. Continue with one of:
- quick live UI sanity pass for Manage Requirements
- or Gate 17 revalidation if the user wants intro polish next

Given the client pressure, the likely best sequence is:
- short Manage Requirements UI sanity pass
- then Gate 17 revalidation

---

## Suggested Starting Prompt For The Next Chat

Use this exact prompt:

> Read `/Users/vinay/dev/InOutHub-Events-main/docs/codex/session-handoff-2026-03-20-manage-reqs-mvp.md` first, then inspect `git status --short` in `/Users/vinay/dev/InOutHub-Events-main` and continue from the highest-value open item on `main`. Do not redo Gate 15, branch/worktree cleanup, the disabled profile-confirmation flow, or the completed auth telemetry / Supabase migration work unless explicitly asked.
