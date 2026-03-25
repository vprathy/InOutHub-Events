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

## 2026-03-25 Reconciliation

This section records what has now been implemented versus what remains open, so this plan can continue to function as product roadmap truth instead of a stale intent document.

### Covered Now

The following parts of this plan are now materially implemented:

- `Request-to-Approval` exists as a distinct workspace for external performance intake and review.
- `Approval-to-Operations` remains a separate downstream path through performance creation and the existing operator spine.
- request status and conversion status are modeled separately instead of being collapsed into one generic status.
- approved requests convert into real operational performance records rather than a parallel guest/request object universe.
- the review workspace remains separate from the main operator dashboard, preserving the dashboard as an operations-first surface.
- Google Sheet sync and spreadsheet upload now go through one backend-led intake path, reducing split-brain import logic.
- request/contact PII and intake lineage access are now hardened for admin-scoped visibility.
- request queue filtering, search, count stats, and large-list behavior are now substantially more scalable than the original client-heavy approach.

### Still Open

The following items are still open and should remain on the roadmap:

#### 1. Mapping Review / Confirm / Lock

This is still the biggest product gap for generalizable intake.

Detailed implementation plan:
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-mapping-review-and-lock.md`

Needed behavior:
- show what the system detected
- show what fields were actually used
- show what columns were ignored or preserved only in raw payload
- surface ambiguities, warnings, and duplicate-collapse behavior
- require operator confirmation for new or materially changed source shapes
- save the confirmed mapping to the source so future syncs are faster and more trustworthy

Why it belongs next:
- we proved the intake backbone against a real customer sheet
- we have not yet proved it is broadly trustworthy across many tenant sheet shapes
- this is the right bridge between a brittle template-only importer and an opaque “AI guessed it” importer

Roadmap placement:
- next product hardening batch before broad new-tenant onboarding

#### 2. Participant-Side Requirement Bridge

Post-approval intake still does not fully converge into participant-level readiness work.

Needed behavior:
- once approved requests are converted and roster data exists, participant-side operational obligations should connect into the requirements/readiness model
- this should not happen pre-approval

Roadmap placement:
- after mapping review/lock
- before calling performance-intake onboarding fully complete

#### 3. Performance-Side Requirement-Backed Consolidation

Conversion creates the operational shell, but it does not yet seed readiness and requirement work as intentionally as it should.

Needed behavior:
- approved and converted requests should bootstrap the right operational requirement posture
- imported fields like music/roster/duration should influence the downstream readiness picture where appropriate

Roadmap placement:
- same phase as the participant-side requirement bridge

#### 4. Manual Emergency Intake

The plan calls this out correctly, but it is not yet a deliberate shipped workflow.

Needed behavior:
- fast operator/admin quick-add
- minimal friction during live-event exception handling
- guaranteed convergence into the same operational model after creation

Roadmap placement:
- after the external request path is trusted
- before expanding live-event day-of-show workflows more broadly

#### 5. Performance Deletion / Post-Conversion Rollback Rules

We now have `Move Back to Pending` for approved, not-yet-converted requests in the roadmap and repo.
What is still open is the post-conversion side:

- what happens if a converted performance is deleted later
- whether the originating request should reopen, relink, or remain historically converted
- which roles can perform destructive deletion
- what audit trail and safeguards are required

Roadmap placement:
- separate from approval reversal
- treat as a distinct lifecycle-governance problem, not a simple undo button

### New Recommended Build Order

Based on what is already shipped, the roadmap should now read:

1. Apply any still-pending live Supabase migrations for the shipped request workflow improvements.
2. Build mapping review / confirm / lock for intake sources.
3. Validate one additional tenant/source shape through that confirmation flow.
4. Add participant-side requirement bridge for post-approval operational work.
5. Add performance-side requirement-backed consolidation after conversion.
6. Selectively recover the highest-value proactive operator patterns from the old mobile-readiness branch via the operator-screen and intro plans, not by reviving that branch wholesale.
7. Define and then build manual emergency intake.
8. Define performance deletion / post-conversion rollback rules before adding destructive delete paths.

### Pivot Rule For New-Tenant Onboarding

We can treat performance intake as stable enough to shift primary effort toward broader new-tenant onboarding once all of the following are true:

- Google Sheet source sync works through the shared backend path
- spreadsheet upload works through the same backend path
- request review, approval, rejection, and conversion work cleanly
- request/contact PII and intake lineage are correctly admin-scoped
- one additional real tenant/source shape succeeds without one-off alias surgery
- mapping review / confirm / lock exists so operators can trust what the importer understood

Until then, new-tenant onboarding should be treated as partially unblocked but still dependent on intake hardening.
