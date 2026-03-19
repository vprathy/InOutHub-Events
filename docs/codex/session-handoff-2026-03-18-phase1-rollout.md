# Session Handoff: 2026-03-18 Phase 1 Rollout

## Purpose

This file is the fastest way to bring a new chat up to speed on the current InOutHub operator rollout state.

It captures:
- what is now true in the repo
- what has been verified
- what still needs deployment or follow-through
- what suggestions surfaced in recent chats but were not all executed yet

Use this before starting new implementation work.

## Canonical Reminders

Authority order:
1. `database_schema.sql`
2. `AGENTS.md`
3. `task.md`
4. `SPEC.md`
5. `.agents/skills/`
6. runtime code in `src/` and `supabase/functions/`
7. `docs/`

External Antigravity brain files are not authoritative.

## Repo / Branch State

Current active repo:
- `/Users/vinay/dev/InOutHub-Events`

Git intent:
- new app is now the forward path
- old app is preserved as pilot/fallback

Expected git markers:
- branch: `main` should represent the new Phase 1 operator app
- preserved branch: `pilot-v1`
- tags:
  - `pilot-freeze-2026-03-18`
  - `phase1-operator-rollout-2026-03-18`

## Phase 1 Rollout Status In Plain English

Phase 1 operator rollout is ready enough to use as the primary app.

That statement covers:
- login / access
- org / event selection
- dashboard
- participants
- performances
- show flow
- console
- participant and performance detail screens
- Phase 1 act and fixed participant readiness bridges

That statement does **not** mean these are complete:
- external request / LT review workflow
- waitlist / triage workflow
- compliance template library / distribution / collection
- dynamic participant template-backed requirement unification
- live dual-write triggers for legacy readiness tables

## What Was Verified

### Local App Verification

Most recent local verification:
- `npm run build` passes

### Supabase Verification Already Confirmed Via Antigravity

Act-side:
- `requirement_policies` exists
- `requirement_assignments` exists
- `map_legacy_act_requirement_code` exists
- `bridge_act_requirements_sync` exists
- starter act policies were seeded
- act-side assignments were backfilled
- no live trigger was enabled on `act_requirements`

Participant fixed-policy bridge:
- participant-side policies exist / were inserted as needed:
  - `guardian_contact_complete`
  - `identity_verified`
  - `special_request_reviewed`
- participant-side requirement assignments were backfilled
- no participant-side bridge trigger was created

Important nuance:
- identity exists in the backend bridge, but Phase 1 UI was intentionally decluttered so identity does not dominate the default operator flow

## Current Product Shape

### Shared UI Structure

The app now follows one main visual grammar:
- metric cards = stable truth
- response cards = what needs action
- work lane = where the operator does the work

Reference:
- `/Users/vinay/dev/InOutHub-Events/docs/plans/operator-screen-organization-framework.md`

### Screen-Level State

Dashboard:
- calm operational snapshot
- separate `Needs Response`
- MECE cleanup largely done

Participants:
- lighter controls
- shared snapshot / response language
- profile screens simplified

Performances:
- lighter top-level list
- event-admin batch intro action now present
- performance profile restructured around operator tasks

Show Flow:
- calmer run summary
- aligned visual language

Console:
- more human copy
- less engineering-shaped surface language

Profiles:
- nested-navigation problem was removed
- participant tabs are simplified
- performance tabs are simplified
- history/admin metadata is demoted instead of competing with the active work lane

## Important Feature Work Completed In This Chat

### 1. Screen Polish / Structural Simplification

Major Phase 1 screens were reworked to feel like one app:
- dashboard
- participants
- performances
- show flow
- console
- participant profile
- performance profile
- login / org selection / event selection

Profiles were the main clutter hotspot and received the deepest cleanup.

### 2. Shared Operational Card Language

Dashboard `Show Snapshot` and `Needs Response` styles were generalized and reused across the app.

Shared component:
- `/Users/vinay/dev/InOutHub-Events/src/components/ui/OperationalCards.tsx`

### 3. Theme / Background Coherence

Main operator surfaces were normalized for light and dark mode.

Intent:
- consistent shell backgrounds
- fewer hardcoded colors
- no hidden text/buttons from theme drift on the main operator spine

### 4. Participant / Performance Asset Preview

In-app asset preview now works in the main profile workspaces for file-backed assets.

Shared preview:
- `/Users/vinay/dev/InOutHub-Events/src/components/ui/AssetPreviewModal.tsx`

Important boundary:
- metadata-only records still do not preview, because there is no file URL to show

### 5. Crew / People Relationship Model

Crew was added without creating a second object model.

Current direction:
- one event-level person record
- many-to-many act assignment
- role lives on the act membership

Supported realities:
- same person can be a performer in one performance and crew/support in another
- crew can also be minors
- quick-add from the performance screen exists
- bulk team upload template exists

### 6. Intro Workflow Simplification

The intro system moved away from an obvious 5-step wizard.

Current operator flow:
- `Prepare Performance Intro`
- `Preview`
- `Approve for Stage`

Manual controls still exist, but they are de-emphasized.

### 7. Intro Audio Source Correction

The intro path was corrected to prefer uploaded performance audio instead of AI TTS.

Important:
- older generated audio can still exist as legacy fallback
- the active intended path is uploaded performance music first

### 8. Intro Autopilot Guardrails

The repo now includes server-side intro-generation guardrails:
- deterministic fingerprinting
- cooldown
- daily cap
- no auto-regeneration after approval
- persistent generation status

### 9. Intro Telemetry / Confidence Layer

Intro prep now has an optional confidence view instead of a permanently noisy status block.

What it supports:
- rolling event-level average build duration
- a simple “usually ready in ~X sec” estimate
- event success rate with sample size
- per-act attempt count and failure rate
- live elapsed time while preparing
- last successful build duration

Important:
- this is intentionally secondary information
- not a full-time diagnostics dashboard

### 10. Batch Intro Prep For Event Admin

Event admins can now trigger a batch action on the performances screen to prepare intros for eligible performances.

Current eligibility shape:
- cast assigned
- approved participant photos exist
- uploaded performance audio exists
- no intro yet

## Critical Deployment Follow-Through

### Required Before Production Uses The New Intro System

The updated edge function still needs deployment:
- `/Users/vinay/dev/InOutHub-Events/supabase/functions/intro-capabilities/index.ts`

Repo code is ready, but live production will not get the new intro autopilot / telemetry behavior until that function is deployed.

### Live Config Checks

After promoting the new app:
- Vercel production branch should be `main`
- production env vars must still exist:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - optional `VITE_APP_VARIANT_LABEL`
- Supabase Auth redirect allowlist must include the live domain and `/auth/complete`

## Suggestions Raised In This Chat That Were Intentionally Deferred Or Not Fully Executed

These are worth revisiting in a future chat.

### High-Value Next Suggestions

#### A. Make Batch Intro Prep More Production-Grade

Current batch prep is useful, but still basic.

Suggested next layer:
- show richer progress:
  - eligible
  - prepared
  - skipped
  - failed
- optionally move to controlled concurrency instead of strict sequential execution
- persist batch job summaries if admins need a durable audit trail

#### B. Add Org/Event-Level Intro Credit Label Overrides

Current credit order is deterministic, but labels are fixed.

Potential next step:
- allow presenter/lead/choreography/support labels to be overridden per org/event

Current default credit order:
- Presented By
- Performance
- Lead
- Choreography
- Support
- Performers

Still open:
- a clean source and rule for `Special Thanks`

#### C. Rename More Participant-Facing Language To People Where Appropriate

This was suggested once crew became a first-class relationship in the same registry.

Why it matters:
- `Participants` can feel too performer-only once crew, leads, choreographers, and support all live in the same event-level registry

Potential approach:
- keep current Phase 1 wording stable now
- evaluate a gradual move toward `People` in admin/operator contexts later

#### D. Dynamic Participant Template / Document Bridge

Still open by design.

What remains unresolved:
- dynamic template-backed participant requirements
- document-based participant requirement assignments beyond the fixed participant policies

This is still one of the biggest architectural follow-through items after Phase 1.

### Phase 2 Suggestions

#### E. External Request / LT Review Workflow

Still not implemented.

Model already discussed:
- Request-to-Approval
- Approval-to-Operations

Must remain separate from operational readiness.

#### F. Waitlist / Triage For Sparse External Performance Requests

Still planning only.

Desired shape:
- external request arrives sparse
- leadership reviews / approves / rejects
- only approved items convert into operational records

#### G. Compliance Template Library / Distribution / Collection

Still Phase 2.

Target capability:
- org/event admins can add and organize one or many standard compliance documents
- distribute them to participants/guardians
- collect returned files/signatures
- tie evidence back to requirement assignments

This is not a fully live end-to-end capability yet.

## Suggestions That Surfaced And Were Addressed

These do not need to be rediscovered in the next chat unless further refinement is desired:
- unify visible vocabulary around `Dashboard`, `Performances`, `Show Flow`
- preserve legacy route aliases instead of breaking older links
- move `Preview` header badge to env-controlled only
- reduce profile clutter and nested tab/subtab behavior
- remove participant-side poster/generative-media leakage
- make telemetry optional rather than always-on
- add crew support without inventing a separate crew object model
- support minor crew with guardian fields

## Good Next-Chat Starting Points

Choose one depending on intent:

### If the next chat is about rollout hardening
- verify/deploy the updated `intro-capabilities` edge function
- test intro autopilot and batch prep against live data
- verify mobile phone / tablet behavior after production deploy

### If the next chat is about post-rollout product expansion
- dynamic participant document bridge
- external request / LT-review workflow
- compliance template library / distribution / collection

### If the next chat is about polish refinement
- decide whether `Participants` should gradually become `People`
- improve batch intro feedback and queue visibility
- add org/event intro credit label controls

## Recommended First Prompt For A New Chat

Use something like:

> Read `/Users/vinay/dev/InOutHub-Events/docs/codex/session-handoff-2026-03-18-phase1-rollout.md` first, then inspect git status and continue from the highest-value open item without redoing completed Phase 1 cleanup.

