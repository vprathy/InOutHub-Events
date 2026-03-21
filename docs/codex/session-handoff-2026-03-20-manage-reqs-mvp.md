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
- `b4c1d16`
- `b4c1d16 Align March 20 migration and fix access delete refresh`

Current git status:
- dirty working tree
- large local UI/UX stabilization pass is in progress and not yet committed
- do not restart from clean-tree assumptions

Remote sync:
- `origin/main` includes commit `b4c1d16`

Local dev server:
- Vite was used locally on:
  - `http://127.0.0.1:5173`
  - `http://localhost:5173`

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
- apply and verify the corrective Supabase migration now present in repo:
  - [20260320_fix_access_role_ambiguity_and_enable_act_requirement_bridge.sql](/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260320_fix_access_role_ambiguity_and_enable_act_requirement_bridge.sql)
- confirm live DB now matches repo for:
  - `assign_event_role` ambiguous `id` fix
  - act requirement bridge trigger
  - act-side assignment backfill
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

## March 20 Late Session: UI/UX Stabilization & Lessons

This late-session work happened **after** the backend/access checkpoint at commit `b4c1d16`.

It is currently **local only** and mixed into the working tree.

### What changed

#### 1. Workspace selection was refactored toward one workspace concept

Main files:
- [WorkspaceSelectionSurface.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/selection/WorkspaceSelectionSurface.tsx)
- [OrgSelectionPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/selection/OrgSelectionPage.tsx)
- [EventSelectionPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/selection/EventSelectionPage.tsx)
- [CreateEventModal.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/selection/CreateEventModal.tsx)

What is now true locally:
- org/event selection was reworked into a shared workspace-selection surface
- the old route split still exists as plumbing, but the UX intent is one workspace-selection experience
- long org/event names are clamped to avoid creating a third row
- 3-dot edit affordances replaced simple chevrons on org/event cards
- create-event date selection now constrains invalid ranges and blocks past starts

#### 2. Shell / header / brand treatment was normalized

Main files:
- [BrandMark.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/branding/BrandMark.tsx)
- [Header.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/Header.tsx)
- [AppShell.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/AppShell.tsx)
- [BottomNav.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/BottomNav.tsx)
- [PageHeader.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/PageHeader.tsx)
- [sectionIdentity.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/sectionIdentity.tsx)
- [SplashScreen.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/ui/SplashScreen.tsx)

What is now true locally:
- the shared brand mark was tightened to the approved tile shape
- the icon/app-name gap was reduced
- splash screen now uses the shared brand mark
- selection routes suppress the standard section strip and bottom nav
- sticky section strip became the primary per-screen identity on main app surfaces
- header, sticky strip, main content, and bottom nav were aligned to the same outer container logic
- tapping the sticky strip scrolls to the top of the current surface

#### 3. Dashboard was reworked away from a flat 8-card wall

Main files:
- [DashboardPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx)
- [OperationalCards.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/ui/OperationalCards.tsx)

What is now true locally:
- top snapshot is phase-aware and always shows an even number of primary metrics
- current pre-show emphasis was shifted toward:
  - `Participants`
  - `Performances`
  - `Need Placement`
  - `Guardian Gaps`
- `Need Approval` was moved out of the top metric row
- `Identity Pending` now only appears when `identity_check` is active in resolved requirement policies
- Response Queue was rebuilt into category cards:
  - `Escalations`
  - `Risks`
  - `Next Actions`
  - `Special Requests`
- only one category expands at a time
- collapsed queue cards were repeatedly tightened toward a 2-row mobile rule
- queue rows were moved toward named participant/act records instead of vague aggregates
- special requests now open participant context directly; inline dashboard resolution was intentionally removed for Phase 1
- dashboard stores return-focus context so coming back from a participant profile can reopen `Special Requests` and scroll back to the same item

### Important lessons from this session

These are not optional. The next chat should follow them.

1. The source of truth is the **design we agreed on**, not whatever is easiest to code.
- Figma was used to express that agreement, but the agreement itself is binding.

2. Do not redesign while implementing.
- Lock one surface in words + design.
- List the exact deltas.
- Implement only those deltas.

3. Keep the UI MECE.
- Do not duplicate a concept in both top metrics and Response Queue.
- If a queue item is shown, it should be a named actionable record where possible, not a vague aggregate.

4. Respect compactness rules consistently.
- Response Queue, special-request rows, and owned dashboard copy were repeatedly corrected because 2-row constraints were not applied uniformly.

5. Do not improvise on approved shell details.
- This caused churn on the workspace flow and header/profile treatment.

### Current local risks / verification still needed

The late-session UI work is not yet fully flow-verified.

Highest-value next checks:
- validate the workspace-selection flow on device:
  - org stage
  - event stage
  - edit affordances
  - create org / create event affordances
- validate dashboard behavior on mobile:
  - phase-aware metric set
  - MECE queue behavior
  - single-open category expansion
  - 2-row queue compactness
  - profile return-focus from `Special Requests`
- verify RBAC on the dashboard:
  - admin
  - event ops roles
  - limited/member roles

### Current dirty UI files

The following areas were touched locally and should be treated as in-progress UI work rather than clean baseline:
- `src/components/branding/*`
- `src/components/layout/*`
- `src/components/selection/*`
- `src/components/ui/OperationalCards.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/selection/*`
- additional page-level polish in:
  - `src/pages/AccessPage.tsx`
  - `src/pages/ParticipantsPage.tsx`
  - `src/pages/RequirementsPage.tsx`
  - `src/pages/LineupPage.tsx`
  - `src/pages/StageConsolePage.tsx`

### New Chat Startup Contract

The next chat should **not** start by redesigning or broadly refactoring.

It should start by:
1. reading:
   - [AGENTS.md](/Users/vinay/dev/InOutHub-Events-main/AGENTS.md)
   - [task.md](/Users/vinay/dev/InOutHub-Events-main/task.md)
   - [session-handoff-2026-03-20-manage-reqs-mvp.md](/Users/vinay/dev/InOutHub-Events-main/docs/codex/session-handoff-2026-03-20-manage-reqs-mvp.md)
2. checking current git status before editing
3. treating the agreed surface design as binding
4. listing exact repo-vs-agreed-design deltas before making UI edits
5. implementing only those deltas

No-regression rules for the next chat:
- do not assume the tree is clean
- do not revert unrelated local UI work
- do not improvise on already-agreed shell or surface details
- do not duplicate concepts between top metrics and Response Queue
- do not let Response Queue or its rows exceed the agreed compactness rules
- do not broaden scope beyond the active surface without explicit approval

If dashboard work continues, validate all of:
- phase-aware top metrics
- MECE queue behavior
- RBAC visibility
- single-open category behavior
- return-focus from participant/profile workflows

If workspace-selection work continues, validate all of:
- single workspace concept
- long-name truncation
- edit/create affordances
- header/profile consistency
- route split remaining invisible to the user

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
- Access screen validation was run against the local app and confirmed:
  - authorized vs unauthorized gating
  - quick grant for signed-in and pending users
  - manual role updates
  - automated/source-managed rows remain non-removable
- the previously observed manual-delete UI sync bug was fixed in:
  - [useAccess.ts](/Users/vinay/dev/InOutHub-Events-main/src/hooks/useAccess.ts)
  - `useRemoveEventMember` now prunes the deleted row from the `event-members` React Query cache on successful delete, then invalidates the event-member and pending-access queries
- narrow revalidation passed for the delete flow:
  - success notice appears
  - deleted manual row disappears immediately without a manual refresh
  - deleted row stays gone after reload
  - backend row deletion was confirmed
- temporary pending/manual test records used for this validation were cleaned up

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

Shipped correction:
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
2. keep the March 20 corrective migration normalized between repo SQL and the already-fixed live Supabase state
3. only then do another narrow UI pass if still needed

### 14. Repo-side SQL drift patch is now shipped

Pushed in:
- `eef134a Patch access SQL drift and restore act requirement bridge`

Files:
- [database_schema.sql](/Users/vinay/dev/InOutHub-Events-main/database_schema.sql)
- [20260320_launch_access_lifecycle.sql](/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260320_launch_access_lifecycle.sql)
- [20260320_fix_access_role_ambiguity_and_enable_act_requirement_bridge.sql](/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260320_fix_access_role_ambiguity_and_enable_act_requirement_bridge.sql)

What changed:
- fixed ambiguous `id` select in `assign_event_role` source:
  - `SELECT em.id, em.role, em.grant_type`
- aligned `database_schema.sql` with that fix
- added corrective migration to:
  - replace `assign_event_role` with the fixed version
  - backfill act-side `requirement_assignments` from legacy `act_requirements`
  - enable `trg_bridge_act_requirements_sync` on `public.act_requirements`
- the repo migration was later normalized to match the exact live apply behavior:
  - `ON CONFLICT` now targets the partial unique index with `WHERE (act_id IS NOT NULL AND participant_id IS NULL)`
  - duplicate-safe backfill prefers `approved` when multiple legacy rows map to the same act/policy pair

Important status:
- live Supabase is already fixed
- the original repo migration needed follow-up normalization during live apply
- the repo migration is now aligned with the corrected live behavior for future environments

### 15. Antigravity prompt guidance

There was a risk that the earlier Antigravity prompt was too long/noisy and may have caused the agent to blank or crash.

If the next chat needs Antigravity again:
- prefer the shorter migration-apply prompt
- keep asks linear:
  1. apply migration
  2. verify fixed function snippet
  3. verify trigger exists
  4. verify backfill evidence
  5. run one or two focused checks

Do not restart with a giant all-in-one prompt unless necessary.

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
- March 20 corrective access / act-requirement migration behavior
- local Access-screen delete-sync fix is implemented and narrowly revalidated

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

The highest-value Phase 1 readiness task is now a mobile operator rehearsal across the actual operator path:
- `Admin > Access`
- `Admin > Requirements`
- participant/performance requirement visibility for supported codes
- `Show Flow`
- `Live Console`

Why this is next:
- the March 20 DB correction is complete
- the Access admin workflow has been functionally validated
- the known Access delete-sync bug is closed
- the remaining risk is cross-screen workflow coherence on a phone, not isolated CRUD behavior

Manage Requirements still needs practical workflow sanity verification within that rehearsal:
- org scope
- event scope
- enabling recommended rules
- inherited org rule behavior at event scope
- participant/performance profile visibility for supported requirement codes

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
- quick mobile operator rehearsal for the Phase 1 path
- or Gate 17 revalidation if the user wants intro polish next

Given the client pressure, the likely best sequence is:
- short Phase 1 operator rehearsal across admin -> readiness -> show-flow -> console
- then Gate 17 revalidation

---

## Suggested Starting Prompt For The Next Chat

Use this exact prompt:

> Read `/Users/vinay/dev/InOutHub-Events-main/docs/codex/session-handoff-2026-03-20-manage-reqs-mvp.md` first, then inspect `git status --short` in `/Users/vinay/dev/InOutHub-Events-main` and continue from the highest-value open item on `main`. Do not redo Gate 15, branch/worktree cleanup, the disabled profile-confirmation flow, or the completed auth telemetry / Supabase migration work unless explicitly asked.
