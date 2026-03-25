# Dev Thread Transition Document

Repo:
- `/Users/vinay/dev/InOutHub-Events-main`

Purpose:
- handoff for a new implementation-focused Codex thread
- preserve current product, schema, intake, and validation context
- avoid repeating earlier design arguments or re-opening already settled decisions

Last known remote baseline before current local work:
- `5cb087d` `Refine performances list for mobile ops`

Current local state:
- significant accepted local work exists beyond `5cb087d`
- this includes intake foundations, admin intake surfaces, import lineage/audit, and partial visibility work
- do not assume the local work is already committed or pushed

## 1. Product Direction Already Agreed

### Core operator backbone to protect
- ingest people
- assemble performances
- readiness
- lineup
- console

This backbone must not be destabilized by new intake or security work.

### Performance intake model
We agreed that external performance intake must be separated into 2 layers:

1. `Request to Approval`
- upstream request/review layer
- request is not yet a live operational performance

2. `Approval to Operations`
- approved request converts into a real operational performance
- only then enters:
  - `Performances`
  - readiness
  - lineup
  - console

### Three intake origins
1. participant-based intake
2. external request / partner submission intake
3. manual emergency intake

All 3 should converge into one operational model eventually.

### User-facing naming direction
- `Admin > Import Data`
- `Admin > Performance Requests`

Avoid system-heavy naming like `Sources` or `Performance Intake` in the UI.

### Event scope vs org scope
For Phase 1, intake is event-specific.
- current event imports only
- not an org-wide shared import board

Potential Phase 2 convenience:
- reuse mapping from prior event
- not a shared org-wide intake workspace

## 2. Intake Decisions Already Made

### Canonical intake home
- `Admin > Import Data` is the canonical intake workspace
- `Participants` should not conceptually own a second full source/import workspace

### `Performance Requests`
- separate admin lane for review / approve / reject / convert
- sparse requests must not appear as live operational performances until converted

### Wrong-file protection
The agreed safe contract is:
1. explicit target selection
2. preflight validation
3. import-run tracking
4. dependency-aware rollback

### Import lineage model
This is already agreed and should not be re-litigated:
- every import run gets an `import_run_id`
- imported/updated records keep lineage to that run
- downstream records reference the normal participant/performance entities
- rollback checks dependencies before destructive undo
- full rollback only when there is no downstream usage
- otherwise move into selective correction

### Audit/history model
Audit must be structured and timeline-friendly:
- date/time
- action
- user
- optional note
- optional before/after detail

UI pattern:
- secondary side panel / side sheet / history panel
- not the main workflow surface

## 3. Intake Work Implemented Locally

### Admin intake surfaces
Files:
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/ImportDataPage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/PerformanceRequestsPage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/AdminPage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/router/AppRouter.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/components/layout/sectionIdentity.tsx`

What is true:
- `Import Data` exists as the canonical intake workspace
- `Performance Requests` page exists as a structural placeholder / staging lane
- admin navigation was updated to include both

### Participant intake UI and import workflow
Files:
- `/Users/vinay/dev/InOutHub-Events-main/src/components/participants/ImportParticipantsModal.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useEventSources.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/lib/participantImportMapping.ts`
- `/Users/vinay/dev/InOutHub-Events-main/supabase/functions/import-participants/index.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/types/intake.ts`

Implemented:
- event-specific `Import Data` surface
- participant import lane
- performance-request import lane as a separate visible lane
- explicit intake target metadata on sources
- wrong-target preflight blocking for participant imports
- browser upload row hard limit: `2000`
- Google Sheet interactive sync hard limit: `5000`
- duplicate-row warning heuristic
- `src_raw` truncation guardrail
- import run visibility:
  - `useImportRuns`
  - recent sync activity UI
  - stale-run indication
  - backend `blocking_issues` / `error_message` surfaced

Important:
- current UI visibility batch is read-only
- restart / destructive recovery was intentionally excluded

### Database/intake lineage foundations
Files:
- `/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260324_add_import_lineage_and_audit.sql`
- `/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260325_performance_intake_model.sql`
- `/Users/vinay/dev/InOutHub-Events-main/database_schema.sql`
- `/Users/vinay/dev/InOutHub-Events-main/src/types/database.types.ts`

Implemented:
- `event_sources`
- `import_runs`
- `import_run_records`
- `intake_audit_events`
- participant lineage columns
- dependency-check helper functions
- `performance_requests` staging table
- `performance_requests` uniqueness aligned to:
  - `UNIQUE(event_id, event_source_id, source_anchor)`
- `performance_requests.updated_at` trigger
- runtime types updated to include new intake tables

## 4. Performance Intake Status

Backend foundation exists:
- `performance_requests` schema is present
- runtime types exist
- staging model is in place

Still not implemented:
- real `Performance Requests` review list/workflow
- approve / reject
- convert to operational act
- timeline side panel
- request import mapping flow

Do not claim performance intake is complete.

## 5. Security / RBAC Findings From Testing

Confirmed by testing and code review:
1. P0 guardian PII is exposed too broadly on participant profiles
2. P1 `ActAdmin` can currently access participant data event-wide instead of only for their own act(s)
3. dev-login role labeling/mapping contributed to testing drift

Key evidence in current code:
- `/Users/vinay/dev/InOutHub-Events-main/database_schema.sql`
  - `participants_select` currently allows any non-null event role
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
  - guardian fields are selected and mapped directly
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantsPage.tsx`
  - guardian phone `tel:` affordance exists
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantProfilePage.tsx`
  - guardian phone `tel:` affordance exists

Policy decisions already locked:
- `EventAdmin`, effective `Org Admin/Owner`, and `Super Admin` should still see guardian PII
- `StageManager` should not see guardian PII
- `StageManager` should instead see an operational contact stack:
  1. performance manager / act participant with role `Manager`
  2. act admin contact
  3. event admin contact fallback
- `ActAdmin` should only access participant/profile detail for participants linked to their own act(s)
- `ActAdmin` may still see lineup and console status informationally
- fixes must be backend-enforced, not only UI-hidden

## 6. Current Highest-Priority Next Work

Next best step is not more intake polish.

Next best step:
- PII / RBAC hardening for participant visibility and participant profile access

Why:
- real tested P0/P1 issues exist
- those are higher risk than continuing `Performance Requests` UI

Suggested implementation scope:
- DB helper functions for participant row access and guardian PII access
- RLS / query-layer enforcement
- StageManager contact stack behavior
- ActAdmin scoping to own act participants only
- dev login cleanup to match real seeded authority

Antigravity is currently working this implementation from a focused prompt.

## 7. Antigravity Work Already Accepted

Accepted in practical terms:
- Batch 1: schema + migration alignment
- Batch 2: runtime DB types aligned / no additional diff needed
- Batch 3: read-only sync-history visibility accepted functionally

We intentionally did not keep expanding docs-only batches.

## 8. Documents Worth Trusting vs Treating Carefully

Useful:
- `/Users/vinay/dev/InOutHub-Events-main/docs/testing_thread_transition.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/participant_performance_profile_test_script.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/implementation_plan_performance_requests.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/intake_architecture_review.md`

But:
- planning docs were partially cleaned up to better distinguish:
  - implemented now
  - recommended later
- always verify against code/schema before trusting a doc conclusion

## 9. Current Guardrails For New Work

1. protect the operator backbone
2. avoid widening scope
3. prefer backend/RLS/query-layer enforcement over cosmetic masking
4. do not redesign unrelated screens while fixing RBAC/PII
5. separate:
- implemented truth
- recommended future work
6. avoid mixed “Accept all / Reject all” style batching going forward
7. if using Antigravity again, use narrow implementation prompts, not open-ended review loops

## 10. Residual Open Work After PII/RBAC Hardening

After the current security batch, likely next priorities:
1. `Performance Requests` review list / approve / reject / convert flow
2. intake timeline/history panel
3. selective correction / safe rollback UX
4. any needed cleanup in dev login / seeded role UX

## 11. Practical Workspace Notes

Important local files currently relevant:
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/components/participants/ImportParticipantsModal.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/lib/participantImportMapping.ts`
- `/Users/vinay/dev/InOutHub-Events-main/supabase/functions/import-participants/index.ts`
- `/Users/vinay/dev/InOutHub-Events-main/database_schema.sql`
- `/Users/vinay/dev/InOutHub-Events-main/src/types/database.types.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/types/intake.ts`

Known supporting docs:
- `/Users/vinay/dev/InOutHub-Events-main/docs/testing_thread_transition.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/participant_performance_profile_test_script.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/implementation_plan_performance_requests.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/intake_architecture_review.md`

## 12. What A New Dev Thread Should Do First

1. read this transition document
2. inspect the current PII/RBAC enforcement points:
- `database_schema.sql`
- `src/hooks/useParticipants.ts`
- `src/pages/ParticipantProfilePage.tsx`
- `src/pages/ParticipantsPage.tsx`
- `src/hooks/useEventCapabilities.ts`
- `src/pages/dev/DevQuickLogin.tsx`
- `src/lib/dev/config.ts`
3. verify whether Antigravity’s current RBAC/PII patch has landed or is still pending
4. if not landed, continue the minimum complete security fix
5. if landed, review it strictly before moving to `Performance Requests`
