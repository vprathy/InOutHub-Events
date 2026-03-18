# Intake And Review Unification

Date: 2026-03-18

## Purpose

Capture the agreed intake and review model so future implementation does not collapse upstream request approval into downstream operational readiness.

This plan is intentionally product-structural. It should guide status modeling, dashboard behavior, intake UX, and reuse of existing modules.

## Core Principle

Do not model all inbound performances as one flat pipe.

Use two linked layers:

1. `Request-to-Approval`
2. `Approval-to-Operations`

These layers are related, but they are not the same workflow and should not share one generic status field.

Important distinction:
- LT approval does not mean stage ready
- approved request does not mean operationally complete

## The Three-Origin Intake Model

There are three valid intake origins for performances.

### 1. Participant-Based Intake

The normal path.

Flow:
- participants enter through sync/import/manual participant management
- operators assemble them into acts
- act readiness and participant readiness are then managed in the existing operator spine

Characteristics:
- participant detail exists early
- this is already close to the current operator workflow

### 2. External Request / Partner Submission Intake

The upstream sparse path.

Flow:
- external request arrives with only high-level performance/program information
- customer LT evaluates the request
- LT approves or rejects
- only after approval are fuller participant details shared
- after that, the request is converted into operational records

Characteristics:
- request exists before roster completeness
- request approval is upstream of readiness
- this is not a live-operations dashboard concern in phase 1

### 3. Manual Emergency Intake

The day-of-show override path.

Flow:
- operator/admin quick-adds a performance directly
- the item is created fast for operational continuity
- enrichment and readiness work happen after creation

Characteristics:
- used for exception handling
- should still converge into the same operational model after creation

## The Two Layers

## Layer A: Request-to-Approval

Scope:
- sparse request-level workflow
- not yet full participant/roster operations
- admin / leadership / behind-the-curtain

Suggested states:
- `submitted`
- `under_review`
- `approved`
- `rejected`

Characteristics:
- applies mainly to external requests
- may exist before any participant records are created
- should not be confused with act readiness

## Layer B: Approval-to-Operations

Scope:
- begins after approval or direct operational creation
- this is where participant, act, readiness, and show execution begin

Flow:
- participant details shared or collected
- participant records created or synced
- act relationships created
- requirements and readiness tracked
- lineup, show flow, and console become relevant

Characteristics:
- this is the current operator spine
- this is where `requirement_assignments` should eventually become canonical

## Operator Spine Guardrail

Keep the phase-1 operator spine clean:
- login / access
- org / event context
- participants
- acts
- readiness
- show flow
- console

Do not inject upstream LT-review complexity into these core surfaces unless there is an explicit operational need.

In phase 1, the dashboard should remain primarily an operations surface, not a mixed approval-and-operations surface.

## Dashboard Implications

The dashboard now has two distinct future responsibilities, but they should be phased.

### Phase 1 Dashboard Role

Dashboard remains an operational command surface.

It should answer:
- what is operationally blocked
- what needs review/follow-up now
- what participant/act readiness work is unresolved
- what the operator should open next

It should not become the primary home of upstream LT review in phase 1.

### Phase 2 Dashboard / Admin Layer Role

A separate admin/leadership lens can track upstream request intake:
- new external requests
- under-review requests
- approved-but-not-yet-converted requests
- rejected requests

This may live as:
- an admin-only dashboard section
- a separate intake queue
- or a behind-the-curtain intake workspace

But it should remain visually and conceptually separate from readiness and stage-execution concerns.

## Reuse Strategy

Avoid parallel subsystem sprawl.

### Reuse For External Approved Requests

Once an external request is approved, reuse existing or emerging common modules:
- Sync Board as the intake normalization shell
- source mapping/inference
- participant import/sync
- act creation/editing
- team assignment
- requirement assignments
- readiness rows

### Reuse For Manual Emergency Intake

Manual quick-add should also converge into the same operational backbone:
- create act fast
- enrich cast/team/media/readiness afterward
- do not create a separate “emergency performance universe”

## Status Modeling Guidance

Do not overload a single status field to mean:
- request approved
- participant data complete
- readiness approved
- stage ready

These belong to different layers.

Suggested conceptual separation:
- request status
- conversion status
- readiness status
- live arrival/stage status

## Relation To Requirements Engine

The requirements engine belongs in Layer B: Approval-to-Operations.

Why:
- requirements and readiness track owed operational work
- they assume actual participants and/or acts exist
- they should not be used to represent pre-approval leadership triage

So:
- upstream request approval should not be forced into `requirement_assignments`
- but post-approval operational work should converge toward `requirement_assignments`

## Phasing

### Phase 1: Ship The Operator MVP Cleanly

Priorities:
- stable auth/session continuity
- event context
- participant flow
- act/performance workspace
- readiness
- dashboard simplification
- show flow
- console
- mobile-first cleanup

Guardrail:
- do not pollute these surfaces with upstream request-review complexity

### Phase 2: Complete Before 2026-03-28

Priorities:
- external request intake
- LT review/decision flow
- approved-request conversion
- admin-only / behind-the-curtain workflows
- explicit link from approved request into operational onboarding

## Immediate Execution Consequences

1. Finish the current dashboard as an operations dashboard, not an upstream-intake dashboard.
2. Add Sync Board mapping review because approved requests will often enter through messy external data.
3. Keep requirement/readiness work focused on post-approval operations.
4. Design the external-request queue separately before mixing it into main operator surfaces.

## Anti-Patterns To Avoid

- one flat intake status for all origins
- mixing LT approval state with readiness state
- creating a parallel guest-act object model
- forcing pre-approval requests into roster/acts too early
- making the operator dashboard do leadership-triage and readiness at equal weight in phase 1

## Current Recommended Build Order

1. Sync Board mapping review/lock UI
2. Final dashboard MECE cleanup for operations
3. Separate upstream request model design
4. Participant-side requirement bridge
5. Performance-side requirement-backed review consolidation
