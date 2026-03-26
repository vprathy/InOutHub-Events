# Session Handoff: Intake, Readiness, Onboarding

Date: 2026-03-25

## Current Repo State

- Canonical repo: `/Users/vinay/dev/InOutHub-Events-main`
- Current branch: `main`
- Latest pushed commit at handoff:
  - `987ca46` `Fix intake sync fast path and schema drift`
- Current untracked local artifact:
  - `supabase/.temp/`
- Important rule:
  - do **not** commit `supabase/.temp/`

## Executive Summary

This session materially stabilized the `Performance Requests` intake/review flow, validated `Show Flow + Live Console`, and repositioned the roadmap toward:

1. onboarding automation / source trust
2. readiness-first insights
3. operational resilience as a product pillar

The main functional intake hardening that is now shipped:
- new/untrusted sources profile first
- operator must review mapping before trust is granted
- locked/unchanged sources can direct-sync
- request/contact PII and lineage are admin-scoped
- request queue is mobile-first and server-backed

The main remaining ambiguity at handoff:
- live `import-participants` JWT gateway posture

Antigravity is actively working the final reconciliation prompt for that.

## Most Important Product Conclusions

### 1. Core Product Thesis

The strongest product value is still:
- reduce participant and performance prep risk before show day
- then run the live show reliably under pressure

Do **not** drift the product toward generic analytics or FOH scope.

### 2. Show Flow vs Live Console

These should both remain:
- `Show Flow` = planning / repair workspace
- `Live Console` = execution workspace

This distinction was validated and should stay explicit in product planning.

### 3. Intake Model

Keep the two-layer model:
- `Request-to-Approval`
- `Approval-to-Operations`

Do not collapse approval, conversion, and readiness into one flat status.

### 4. Performance Request UX

Visible operator path should stay simplified:
- primary happy path: `Create Performance`
- pending requests implicitly approve then create
- already approved requests create directly

Avoid reintroducing:
- `Approve Only`
- `Approve & Create`
as competing peer actions in the main mobile workflow.

### 5. Readiness Insights, Not Generic BI

The roadmap has been corrected to emphasize:
- blocked performances
- missing participant follow-up
- intro/media not ready
- unresolved contact/special-request gaps
- readiness risk rollups

Execution pace exists, but it is a secondary/later insight, not the core insight layer.

## Key Validation Outcomes

### Intake / Performance Requests

Validated as strong enough that intake is no longer the main blocker.

Confirmed/implemented:
- request review / approve / reject / convert
- `Move Back to Pending` for approved, not-yet-converted requests
- source sync visibility
- requestor/contact mapping improvements
- source-level sync summary and mapping understanding
- server-backed search/filter/load-more
- stats RPC support
- source trust flow with mapping review / confirm / lock

### Show Flow + Live Console

Antigravity validated:
- workspace distinction
- stage setup
- lineup add/reorder with live protections
- conflict visibility
- execution controls
- refresh / reconnect recovery
- RBAC view-only guard

Conclusion:
- Show Flow + Live Console are no longer the main blocker

## Important Live / Supabase State

Project:
- `qnucfdnjmcaklbwohnuj`

Previously confirmed live:
- intake security hardening migration
- request reopen action
- request stats RPC
- intake validation complete

Live environment facts observed earlier:
- organization: `Demo Productions`
- active event: `Demo Showcase 2026`
- `performance_requests`: 20 rows for that event
- one Google Sheet source:
  - `2026 Ugadi Program Registrations`
  - target: `performance_requests`

Important dev-fixture correction already shipped:
- `/dev/login` now uses `Reset Dev Fixture`
- it targets only the dedicated fixture event `Demo Event`
- this was made explicit/safe in commit `2a12f31`

## Edge Function / Intake Trust Work

### Shipped Repo Truth

Commit:
- `1990b2f` `Add intake mapping review and lock flow`

Files:
- `/Users/vinay/dev/InOutHub-Events-main/src/components/participants/ImportParticipantsModal.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useEventSources.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/components/layout/sectionIdentity.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/ImportDataPage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/supabase/functions/import-participants/index.ts`

Behavior:
- backend supports `mode: profile_only | confirm_and_sync`
- UI routes new/untrusted sources to `Review Mapping`
- source config tracks:
  - `lockedMapping`
  - `profileHash`
  - `lockedProfileHash`
  - `reviewRequired`
  - `driftSummary`
  - related mapping metadata

### Later Safe Fixes Also Shipped

Commit:
- `987ca46` `Fix intake sync fast path and schema drift`

Included:
1. locked + unchanged sources bypass review again
2. removed writes to non-existent participant lineage columns

### Current Open Hardening Question

Tracked in:
- `/Users/vinay/dev/InOutHub-Events-main/task.md`

Open item:
- reconcile `import-participants` JWT gateway posture so live deploy configuration matches repo truth

Reason:
- Antigravity deployed live with `--no-verify-jwt`
- this may be operationally acceptable short-term
- but it is not yet encoded as durable repo truth

This is the main unresolved technical governance question at handoff.

## Roadmap / Plan Documents Updated This Session

### Strategic / Structural
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-and-review-unification.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/new-tenant-onboarding-go-no-go-rubric.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/operator-screen-organization-framework.md`

### Tactical / Next Batches
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-mapping-review-and-lock.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/post-approval-readiness-convergence.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/readiness-insights-layer.md`

### Validation Assets
- `/Users/vinay/dev/InOutHub-Events-main/docs/performance_request_intake_test_script.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/performance_request_intake_validation_report_2026_03_25.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/show_flow_console_validation_script.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/codex/antigravity-performance-request-intake-test-prompt-2026-03-25.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/codex/antigravity-show-flow-console-test-prompt-2026-03-25.md`

### Tactical Ledger
- `/Users/vinay/dev/InOutHub-Events-main/task.md`

## Current Roadmap Shape

### Primary Direction
- onboarding automation and source trust
- readiness-first insight layer
- operational resilience

### Still Important
- post-approval readiness convergence
- participant/performance readiness coherence
- mapping review / lock proof on another real tenant/source shape

### Explicitly De-emphasized
- generic UI polish as a main narrative
- generic analytics
- FOH/ticketing/attendee scope

## Recommended Next Build Order

Assuming Antigravity closes the JWT question cleanly:

1. Define / implement onboarding automation around first trusted sync
2. Implement post-approval readiness convergence
3. Start the first readiness-insight slice on Dashboard
4. Validate one additional real tenant/source shape through the mapping-review flow

If Antigravity reports the JWT posture is still unresolved:

1. decide whether `--no-verify-jwt` is an intentional near-term configuration
2. encode/document that decision
3. only then close the intake batch formally

## Files Most Worth Opening First In A New Chat

1. `/Users/vinay/dev/InOutHub-Events-main/task.md`
2. `/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-and-review-unification.md`
3. `/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-mapping-review-and-lock.md`
4. `/Users/vinay/dev/InOutHub-Events-main/docs/plans/post-approval-readiness-convergence.md`
5. `/Users/vinay/dev/InOutHub-Events-main/docs/plans/readiness-insights-layer.md`
6. `/Users/vinay/dev/InOutHub-Events-main/supabase/functions/import-participants/index.ts`

## Cautions / Don’t Regress

- Do not reintroduce duplicate page headers below the sticky bar.
- Do not surface `Super Admin` wording in customer-facing UI.
- Do not reintroduce `Approve Only` vs `Approve & Create` confusion in the main request flow.
- Do not treat `Reset Dev Fixture` as a harmless refresh.
- Do not commit `supabase/.temp/`.
- Do not silently substitute different UX decisions when the user gave explicit interaction instructions.

## Starting Prompt For A New Chat

Use this exactly or with minor edits:

```text
Resume from this handoff:
`/Users/vinay/dev/InOutHub-Events-main/docs/codex/session-handoff-2026-03-25-intake-onboarding-readiness.md`

Context:
- repo: `/Users/vinay/dev/InOutHub-Events-main`
- branch: `main`
- latest known commit at handoff: `987ca46`
- Antigravity may still be finishing the final `import-participants` JWT posture reconciliation

First do a fact-first checkpoint:
1. inspect `git status`
2. inspect latest `git log -5 --oneline`
3. read:
   - `/Users/vinay/dev/InOutHub-Events-main/task.md`
   - `/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-and-review-unification.md`
   - `/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-mapping-review-and-lock.md`
   - `/Users/vinay/dev/InOutHub-Events-main/docs/plans/post-approval-readiness-convergence.md`
   - `/Users/vinay/dev/InOutHub-Events-main/docs/plans/readiness-insights-layer.md`
4. sense check whether Antigravity’s final result changed local repo state

Working rules:
- follow AGENTS.md strictly
- do not commit `supabase/.temp/`
- keep the product centered on readiness + execution, not generic analytics
- preserve explicit user instructions rather than silently substituting alternatives

Immediate decision order:
1. resolve whether the intake batch is fully closed after Antigravity’s final JWT-gateway report
2. if closed, recommend whether the next main implementation lane should be:
   - onboarding automation around source trust
   - post-approval readiness convergence
   - or the first readiness-insight slice
3. if not closed, fix only the smallest remaining blocker

Deliverable:
- current repo state
- whether intake is truly closed
- recommended next build lane
- exact next steps
```
