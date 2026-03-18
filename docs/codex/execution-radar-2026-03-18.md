# Execution Radar: Recovered Suggestions And Priorities

Date: 2026-03-18

Purpose:
- recover concrete follow-up items that were discussed across recent fast-moving chats
- de-duplicate them against current repo truth
- prioritize them so execution does not depend on chat memory

This is a planning artifact. If it conflicts with `database_schema.sql`, `AGENTS.md`, `task.md`, or current runtime behavior, update this file.

## What Was Reviewed

Primary repo-side sources reviewed:
- [session-handoff-2026-03-17.md](/Users/vinay/dev/InOutHub-Events/docs/codex/session-handoff-2026-03-17.md)
- [session-handoff-2026-03-18-checkpoint.md](/Users/vinay/dev/InOutHub-Events/docs/codex/session-handoff-2026-03-18-checkpoint.md)
- [requirements-and-readiness-mobile-v1.md](/Users/vinay/dev/InOutHub-Events/docs/plans/requirements-and-readiness-mobile-v1.md)
- [db-contract-v1-proposal-readiness.md](/Users/vinay/dev/InOutHub-Events/docs/codex/db-contract-v1-proposal-readiness.md)
- [current-live-mvp-workflow.md](/Users/vinay/dev/InOutHub-Events/docs/codex/current-live-mvp-workflow.md)
- [tarangini-rehearsal-readiness.md](/Users/vinay/dev/InOutHub-Events/docs/audits/tarangini-rehearsal-readiness.md)
- [knowledge-report.md](/Users/vinay/dev/InOutHub-Events/docs/audits/knowledge-report.md)
- current redesign lane code in `src/` and `supabase/`

## Recovery Summary

Recovered themes from the recent chats:
- dashboard simplification and strict MECE separation
- dashboard must distinguish upstream intake/review from downstream operational readiness
- mobile-first tightening on `/requirements`, participant profile, performance profile, dashboard
- requirement/readiness unification instead of parallel template/doc/issue systems
- flexible source ingestion for multi-tenant orgs
- explicit operator review for uncertain source mappings
- intake/review workflows need to be made durable in repo docs, not left implicit in chat

## Priority Stack

### P0. Add Sync Board Mapping Review

Why it is back on the radar:
- recent work made import mapping header-tolerant, value-aware, and source-sticky
- the missing control surface is operator confirmation when inference is still uncertain
- this was explicitly identified as the strongest next step after the mapping upgrade

Execution target:
- add a lightweight `Review Mapping` surface inside Sync Board
- show detected columns, inferred field targets, and unresolved gaps
- let admins override and lock the mapping for a source
- persist locked mappings to `event_sources.config`

Why priority is high:
- multi-tenant onboarding quality depends on this
- it prevents silent data drift
- it reduces support burden without inventing a new subsystem

Related files:
- [ImportParticipantsModal.tsx](/Users/vinay/dev/InOutHub-Events/src/components/participants/ImportParticipantsModal.tsx)
- [useParticipants.ts](/Users/vinay/dev/InOutHub-Events/src/hooks/useParticipants.ts)
- [useEventSources.ts](/Users/vinay/dev/InOutHub-Events/src/hooks/useEventSources.ts)
- [participantImportMapping.ts](/Users/vinay/dev/InOutHub-Events/src/lib/participantImportMapping.ts)
- [import-participants/index.ts](/Users/vinay/dev/InOutHub-Events/supabase/functions/import-participants/index.ts)

### P0. Finish Dashboard MECE Cleanup

Why it is back on the radar:
- the dashboard has been simplified heavily, but one known overlap remains
- `Show Snapshot` still includes `Special Requests` while `Needs Response` includes `Special Request Review`
- new intake context adds another risk: collapsing request approval and operational readiness into one dashboard model

Execution target:
- remove duplicate/overlapping concepts between `Show Snapshot` and `Needs Response`
- keep snapshot as stable state totals only
- keep response queue as review/escalation work only
- choose a replacement snapshot metric only if it is a true state metric
- keep the phase-1 dashboard primarily operational
- do not mix LT-review intake complexity into the main operator dashboard until the upstream workflow is explicitly built

Why priority is high:
- the user repeatedly emphasized MECE as non-negotiable
- dashboard is still the highest-visibility operator surface
- dashboard is now the main place where model confusion could leak into the product first

Related files:
- [DashboardPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/DashboardPage.tsx)
- [useDashboardRadar.ts](/Users/vinay/dev/InOutHub-Events/src/hooks/useDashboardRadar.ts)

### P0. Protect The Common Requirements Backbone

Why it is back on the radar:
- the checked-in docs explicitly say not to keep parallel systems
- runtime code still mixes `participant_assets`, `asset_templates`, `participant_notes`, `act_requirements`, and `act_readiness_issues`
- current prototype rows are unified visually, but the data model is still partially fragmented

Execution target:
- keep `requirement_policies` + `requirement_assignments` as the canonical direction
- avoid adding any new readiness/intake UI that bypasses this backbone
- use current legacy systems only as evidence sources or bridge inputs

Why priority is high:
- this is the main architectural guardrail that prevents more drift
- it directly affects participant requirements, act approvals, and intake workflows

Related files:
- [requirements-and-readiness-mobile-v1.md](/Users/vinay/dev/InOutHub-Events/docs/plans/requirements-and-readiness-mobile-v1.md)
- [db-contract-v1-proposal-readiness.md](/Users/vinay/dev/InOutHub-Events/docs/codex/db-contract-v1-proposal-readiness.md)
- [database_schema.sql](/Users/vinay/dev/InOutHub-Events/database_schema.sql)
- [requirementsPrototype.ts](/Users/vinay/dev/InOutHub-Events/src/lib/requirementsPrototype.ts)

### P1. Write The Missing Intake/Review Unification Doc

Why it is back on the radar:
- repo docs clearly support shared requirement/review modes
- repo docs do not yet durably capture the discussed intake lanes, waitlist handling, and performance-level request review behavior
- this gap makes it easy to drift back into ad hoc UI work

Execution target:
- add a short plan doc that defines:
  - the intake lanes
  - waitlist behavior
  - participant-level request review
  - performance-level request review/approval
  - how these all route into common requirement assignments

Why priority is medium-high:
- this is the missing bridge between user intent and current repo truth
- it should come before more structural UI work in this area

Suggested output file:
- `docs/plans/intake-and-review-unification.md`

Status:
- now created as [intake-and-review-unification.md](/Users/vinay/dev/InOutHub-Events/docs/plans/intake-and-review-unification.md)

### P1. Separate Upstream Request Model From Operations

Why it is back on the radar:
- launch-customer workflow confirms that some performances begin as sparse external requests
- LT approval is upstream of participant detail and operational readiness
- this has direct implications for dashboard design, status modeling, and intake UX

Execution target:
- model `Request-to-Approval` separately from `Approval-to-Operations`
- keep request status distinct from readiness status
- define the conversion handoff from approved request into operational records
- decide where the upstream queue lives without polluting the main operator spine

Why priority is medium-high:
- this is now a confirmed product reality, not a hypothetical edge case
- if we blur it early, the dashboard and status system will get harder to unwind later

Primary reference:
- [intake-and-review-unification.md](/Users/vinay/dev/InOutHub-Events/docs/plans/intake-and-review-unification.md)

### P1. Participant-Side Requirement Bridge

Why it is back on the radar:
- phase-1 readiness package deliberately deferred participant-side mapping
- current repo still has no canonical bridge from `asset_templates` semantics into `requirement_policies`
- participant profile and dashboard still rely on mixed heuristics

Execution target:
- define deterministic mapping from participant template/evidence semantics into requirement policies and assignments
- move participant readiness reads toward assignments without breaking current live flows

Why priority is medium-high:
- it unlocks real unification for participant docs, identity, special-request review, and guardian/safety work
- it is higher risk than the Sync Board mapping review and should not be rushed ahead of the doc/planning alignment

Related files:
- [db-contract-v1-proposal-readiness.md](/Users/vinay/dev/InOutHub-Events/docs/codex/db-contract-v1-proposal-readiness.md)
- [ParticipantProfilePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ParticipantProfilePage.tsx)
- [ParticipantsPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ParticipantsPage.tsx)

Status:
- fixed participant policies are now live and wired into the UI:
  - `guardian_contact_complete`
  - `identity_verified`
  - `special_request_reviewed`
- the remaining open work is the dynamic template/document side only

### P1. Replace Bespoke Performance Request Paths With Assignment-Backed Review

Why it is back on the radar:
- act-level request types such as intro approval, support confirmation, music submission, and stage-tech confirmation already match the requirement model
- performance-level review should not become another special-case subsystem

Execution target:
- move performance-level requests toward assignment-backed rows with explicit review modes
- use the same row/action model already prototyped in the performance profile

Why priority is medium-high:
- it reduces duplicated logic
- it makes performance readiness more explainable and consistent

Related files:
- [requirementsPrototype.ts](/Users/vinay/dev/InOutHub-Events/src/lib/requirementsPrototype.ts)
- [PerformanceProfilePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/PerformanceProfilePage.tsx)

Status:
- substantially addressed for the phase-1 operator surfaces
- remaining work is broader schema/process unification, not the current mobile redesign lane

### P2. Copy And Language Consistency

Why it is back on the radar:
- some `Roster` language still remains even after dashboard cleanup
- the user has already pushed for clearer, less internal language

Execution target:
- finish renaming operator-facing remnants where `Participants` is clearer than `Roster`
- align dashboard, participants list, profile headers, and helper copy

Why priority is lower:
- valuable, but less foundational than MECE cleanup and intake/review structure

Status:
- mostly cleared on active operator surfaces
- remaining drift is mostly in planning/docs and non-phase-1 admin lanes

## Already Addressed Recently

These were recovered but are no longer active asks:
- dashboard visual calm-down and bottom-accent status pattern
- admin requirements discoverability in the header
- operational participant counts instead of counting inactive/test records
- explicit team-role choice in add-team-member flow
- flexible import mapping with value-aware fallback and saved inferred mappings

## Suggested Execution Order

1. Separate upstream request model design and handoff definition
2. Dynamic participant template/document bridge design
3. Compliance template library / distribution / collection planning
4. Phase-2 upstream request workflow implementation

## Operating Rule

Before any new intake, requirement, special-request, approval, or readiness UI is added, check:
- can this be represented as a `requirement_policy`?
- can the actual owed work be represented as a `requirement_assignment`?
- is the current legacy table only being used as evidence/runtime bridge?

If the answer is no, stop and document why before adding another parallel path.
