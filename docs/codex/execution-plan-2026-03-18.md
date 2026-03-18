# Execution Plan: Operator Spine Hardening And Intake Separation

Date: 2026-03-18

## Objective

Ship the strongest possible Phase 1 operator product without regressing the app, while setting up the confirmed Phase 2 intake/review lane cleanly.

This plan assumes:
- local app work stays in Codex
- only precise Supabase apply/verify tasks go to Antigravity
- execution should continue independently without waiting after every small step

## Current Status

As of 2026-03-18, this plan is partially executed.

Completed:
- dashboard MECE cleanup for the phase-1 operations lens
- Sync Board mapping review and mapping lock-in UI
- active operator-surface copy/style consistency cleanup
- intake/review separation documentation
- Supabase phase-1 readiness backend verification via Antigravity
- read-only act-side UI integration of `requirement_assignments`
- first local participant-side bridge cut using assignment-shaped view models from current evidence, notes, and safety state
- participants workspace alignment to the shared readiness summary contract
- participant-side fixed-policy backend bridge via Antigravity
- participant list/detail reads updated to prefer live `requirement_assignments`
- participant and performance profile workflow simplification
- performance media/readiness surface aligned to the shared assignment-backed readiness contract

In progress:
- requirements/readiness unification for dynamic participant document/template requirements only

Not started:
- upstream request/LT-review product workflow
- compliance template library / distribution / collection loop
- trigger enablement for live act dual-write

## Non-Negotiables

1. No regression of the current operator spine:
   - login / access
   - org / event context
   - participants
   - acts / performance workspace
   - readiness
   - show flow
   - console
2. No brand/style drift:
   - preserve the current InOutHub visual language
   - keep surfaces calm, mobile-first, and operational
   - do not introduce a second visual system for new admin/intake work
3. Do not collapse:
   - request approval state
   - operational readiness state
4. Do not create new parallel readiness/intake subsystems if the existing requirements backbone can own the behavior.

## Phase Split

## Phase 1: Ship The Clean Operator Spine

Primary goals:
- finish dashboard cleanup as an operations dashboard
- improve Sync Board source confidence and reviewability
- keep participant and performance readiness coherent
- protect the requirements/assignments backbone direction

Included:
- dashboard MECE cleanup
- Sync Board mapping review and mapping lock-in
- participant/performance readiness consistency
- mobile-first UX tightening
- intro/readiness/operator polish where it supports live execution

Explicitly excluded:
- LT review workflow in core operator surfaces
- external request triage queue in the main dashboard
- org/event compliance-template distribution loop

## Phase 2: Upstream Intake And Admin Review

Primary goals:
- model external sparse requests cleanly
- keep LT review and decision state distinct from readiness
- convert approved requests into operational records
- add behind-the-curtain admin workflows without polluting the main operator command surfaces

Included:
- external request intake
- LT review queue
- waitlist / triage state
- approved-request conversion
- template library / compliance distribution loop

## Workstreams

## Workstream A: Dashboard And Operator Triage

Status:
- completed for the current phase-1 scope

Goal:
- dashboard remains a calm, MECE operations surface in phase 1

Tasks:
- remove remaining overlap between `Show Snapshot` and `Needs Response`
- ensure snapshot metrics are state totals only
- ensure response queue is escalation/review only
- keep upstream request-review concepts out of the main dashboard for now

Success criteria:
- operator can scan dashboard and know what to act on immediately
- no duplicate signal appears in two sections under different wording

## Workstream B: Sync Board Mapping Review

Status:
- completed for the first operational cut
- source cards now expose mapping review, mapping state, and mapping lock-in

Goal:
- source ingestion is confident, auditable, and admin-correctable

Tasks:
- add `Review Mapping` UI to Sync Board
- show inferred mapping, detected headers, and mapping gaps
- allow admins to override mappings
- persist locked mappings in `event_sources.config`

Success criteria:
- messy external sources can be normalized without code edits
- approved-request conversion later can reuse this shell

## Workstream C: Requirements And Readiness Unification

Status:
- substantially completed for phase 1
- act-side read integration is in place
- participant-side fixed-policy bridge is in place
- dynamic template/document participant requirements remain open by design

Goal:
- keep one canonical backbone for operational owed work

Tasks:
- document intake/review separation
- avoid new UI paths that bypass `requirement_policies` / `requirement_assignments`
- phase participant-side bridge carefully
- fixed participant policy rows now moved into Supabase:
  - `guardian_contact_complete`
  - `identity_verified`
  - `special_request_reviewed`
- keep templated document/evidence distribution and collection out of this backend cut
- move performance-side review paths toward assignment-backed rows

Success criteria:
- new readiness work reduces drift instead of adding one more subsystem
- phase-1 operator surfaces no longer speak different readiness dialects

## Workstream D: Upstream Intake Model

Status:
- planning/documentation only
- not yet implemented in product surfaces

Goal:
- define the future Phase 2 workflow without contaminating Phase 1

Tasks:
- keep `Request-to-Approval` separate from `Approval-to-Operations`
- define request status, conversion status, readiness status, and live stage status separately
- define the request-to-operations handoff point

Success criteria:
- LT approval never gets mistaken for stage readiness

## Antigravity Boundary

Antigravity should receive only:
- exact migration apply tasks
- exact seed/backfill tasks
- exact verification queries

Antigravity should not receive:
- design decisions
- app UX refactors
- dashboard conceptual cleanup
- open-ended architecture exploration

## Antigravity Prompt Template

Use this prompt when Supabase execution or verification is needed:

```text
Work only on precise Supabase execution/verification for InOutHub.

Repo context:
- Workspace: /Users/vinay/dev/InOutHub-Events
- Branch: codex/mobile-readiness-redesign

Rules:
- Do not redesign app UX.
- Do not propose architecture changes unless the SQL contract blocks execution.
- Execute only the requested database-side work and report exact results.

Task:
1. Apply or verify the specific migration / seed / backfill / query listed below.
2. Return:
   - exact commands/SQL executed
   - affected row counts
   - any schema or policy errors
   - any mismatch against repo files
3. Do not continue beyond the requested scope.

Requested work:
- <fill in exact migration, seed, verification, or query task here>
```

## Immediate Local Execution Order

Completed:
1. finish dashboard MECE cleanup
2. build Sync Board mapping review/lock UI
3. verify no operator-surface regressions
4. send the fixed participant-policy backend bridge task to Antigravity
5. verify the returned row counts and live data shape against the app read path
6. simplify participant/performance workflow structure for mobile operators

Next:
7. keep templated compliance/document loops in the phase-2 lane
8. hold upstream request/LT-review implementation for the phase-2 lane

## Verification Loop

Each local tranche should end with:
- `npm run build`
- targeted code-path review for touched surfaces
- explicit regression check against:
  - dashboard
  - participants
  - performance workspace
  - lineup
  - console

When a tranche touches schema-backed behavior:
- verify local code assumptions against `database_schema.sql`
- send only the exact DB-side verification/apply task to Antigravity

Latest verification completed:
- local `npm run build` passes after the dashboard, Sync Board, participant/act readiness bridge work, workflow simplification, and performance media/readiness consolidation
- live Supabase phase-1 backend verification is captured in:
  - [readiness-backend-verification-2026-03-18.md](/Users/vinay/dev/InOutHub-Events/docs/codex/readiness-backend-verification-2026-03-18.md)
- live Supabase participant fixed-policy bridge execution is captured in:
  - [antigravity-participant-bridge-2026-03-18.md](/Users/vinay/dev/InOutHub-Events/docs/codex/antigravity-participant-bridge-2026-03-18.md)

## Brand And Style Guardrail

Every new surface or adjustment must preserve:
- current InOutHub shell language
- mobile-first touch sizing
- calm operational hierarchy
- compact but readable density
- consistent button, card, chip, and accent treatment

No new screen should feel like it belongs to a different product.
