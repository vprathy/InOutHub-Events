# Unresolved Suggestions Backlog

Date: 2026-03-18
Purpose: durable capture of prior-session suggestions so future chats do not lose product follow-through items.

## Suggested And Already Implemented

- Event-admin batch intro prep action is present on the performances surface.
- Shared operator-facing vocabulary was aligned around `Dashboard`, `Performances`, and `Show Flow`.
- Legacy route aliases were preserved instead of breaking old links.
- `Preview` header badge behavior was moved to env-controlled display.
- Major profile clutter and nested tab/subtab issues were reduced.
- Intro telemetry/confidence was demoted to optional instead of always-on.
- Crew support was added without creating a separate crew object model.
- Minor crew support with guardian fields is present.
- Core operator/admin language drift on the main Phase 1 spine was substantially reduced.

## Suggested And Intentionally Deferred

- Dynamic participant template/document bridge.
- External request / LT-review workflow.
- Waitlist / triage flow for sparse external performance requests.
- Compliance template library / distribution / collection.
- Upstream request-review complexity beyond the current Phase 1 operator spine.
- Additional participant/admin terminology migration beyond the current stabilized Phase 1 surfaces.

## Suggested And Still Awaiting Product Decision

- Make batch intro prep more production-grade.
- Add stronger batch intro progress and queue visibility.
- Add org/event-level intro credit label overrides.
- Define the source/rule for `Special Thanks` in intro credits.
- Decide whether `Participants` should gradually become `People` in some admin/operator contexts.
- Decide how far remaining operator/admin language drift should be corrected outside the core Phase 1 spine.

## Notes

Batch intro production-grade follow-through may include:
- richer progress states:
  - eligible
  - prepared
  - skipped
  - failed
- controlled concurrency instead of strict sequential processing
- durable batch job summaries or audit records

Intro credit follow-through remains open on:
- label overrides by org/event
- clean sourcing/rules for `Special Thanks`

Phase 2 workflow follow-through remains open on:
- request-to-approval vs approval-to-operations separation
- waitlist handling
- compliance collection loop
- dynamic participant requirement/document mapping
