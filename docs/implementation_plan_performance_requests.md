# Implementation Plan: InOutHub Events Performance Intake Backend

## Overview
Advance the InOutHub backend by implementing the **Performance Requests** staging model. This allows operators to intake, review, and approve external performance requests before they impact active event execution.

Current state:
- the staging schema foundation now exists in the repo
- participant import lineage/audit foundations also exist
- the review / approve / convert UI flow is still not implemented
- this document is a planning brief for the remaining work, not a claim that the full workflow is complete

## 1. Database Model (`SUPABASE`)

### New Entity: `performance_requests`
This table stages intake data from spreadsheets, forms, or Google Sheets.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `organization_id`| UUID | Lineage (Ref: `organizations`) |
| `event_id` | UUID | Scope (Ref: `events`) |
| `import_run_id` | UUID | Lineage (Ref: `import_runs`) |
| `event_source_id`| UUID | Lineage (Ref: `event_sources`) |
| `source_anchor` | TEXT | Unique ID from source (e.g., Row ID, Row Hash) |
| `title` | TEXT | **Performance Name** |
| `lead_name` | TEXT | Organizer/Lead Performer |
| `lead_email` | TEXT | Contact Email |
| `lead_phone` | TEXT | Contact Phone |
| `duration_estimate_minutes` | INT | In minutes |
| `music_supplied` | BOOL | Status flag |
| `roster_supplied` | BOOL | Status flag |
| `notes` | TEXT | Raw notes / instructions |
| `raw_payload` | JSONB | Complete row data snapshot |
| `request_status` | TEXT | `pending`, `reviewed`, `approved`, `rejected` |
| `conversion_status`| TEXT | `not_started`, `converted`, `failed` |
| `converted_act_id`| UUID | Operational result (Ref: `acts`) |
| `reviewed_by/at` | UUID/TZ | Accountability |
| `approved_by/at` | UUID/TZ | Accountability |
| `converted_by/at` | UUID/TZ | Accountability |

### Uniqueness Guardrail
- `UNIQUE(event_id, event_source_id, source_anchor)`: Ensures that a single source row cannot be imported as multiple requests in the same event context.

## 2. Risk Handling Strategy

### A. Connection Strength / Interrupted Import
- **Idempotency Strategy:** Use `ON CONFLICT (event_id, event_source_id, source_anchor) DO UPDATE` in the future intake logic.
- **Run Status:** Phase 1 currently uses the existing `import_runs.status` contract (`running`, `succeeded`, `failed`, `blocked`, `rolled_back`). Any expansion beyond that is still a later decision.
- **Retry Model:** If a network drop occurs, the operator should re-trigger the import from the UI. The database should skip/update existing rows without doubling data.
- **Note:** True resumability/checkpointing is not implemented yet.

### B. Massive Files / Scalability
- **Current interactive limits:** participant intake currently enforces:
  - browser upload limit: 2,000 rows
  - interactive Google Sheet sync limit: 5,000 rows
- **Future scale path:** For very large datasets, the intake function should move to a background queue / staging architecture rather than the current synchronous interactive flow.

### D. Wide but Sparse Customer Sheets
- Customer intake sources may be **wide** (for example, Google Form exports spanning many columns such as `A` through `AG`) while still being **small** in row count.
- The import workflow must treat this as a normal supported shape, not as a pathological case.
- Import logic should prioritize:
  - identifying the true request identity fields
  - extracting the limited set of operationally relevant columns
  - preserving all extra columns in `raw_payload`
- Import logic should **not**:
  - penalize the operator because the source is wide
  - require manual attention to every source column
  - confuse source width with source size or scalability risk
- Operational rule: width-heavy, row-light Google Sheets must remain eligible for the interactive intake workflow as long as row counts stay within interactive limits.

### C. Source Poisoning & Integrity
- **Sanitization:** All `raw_payload` and `title` fields should be treated as untrusted.
- **Rollback:** Full destructive rollback should only be allowed when there is no downstream usage. Once downstream usage exists, the system should move into selective correction instead of blind deletion.

## 3. Workflow Implementation
1. **Migration:** Add `supabase/migrations/20260325_performance_intake_model.sql`.
2. **Schema Update:** Keep the table and RLS policies aligned with `database_schema.sql`.
3. **Audit Integration:** Use `intake_audit_events` for status transitions.
4. **Frontend:** Build review / approve / reject / convert flows only after runtime types and read models are aligned.

## 4. Guardrails (Physical Truth Check)
- Maintain `Tarangini` org's Google Sheet compatibility.
- No direct writes to `acts` during intake.
- `performance_requests` is a staging layer; approval is not the same thing as readiness.
- Sparse request records must not appear in the live `Performances` workflow until converted.

## 5. Phase 2 Internal Diagnostics Agent

### Purpose
Add an internal-only diagnostics agent that helps the team detect, classify, and troubleshoot customer-facing failures across intake and adjacent operator workflows without exposing backend details to customers.

This agent is not a customer chatbot and it is not an autonomous operator. Its job is to reduce time-to-diagnosis when the app fails in the field.

### Problems This Should Solve
- customer sees a generic or customer-safe error state, but the team still needs technical detail quickly
- screenshots alone are not enough to identify whether the issue is frontend, Edge Function, RLS, schema drift, source access, or bad input
- repeated issues across orgs/events should be grouped so the team can spot real patterns instead of investigating one-off reports in isolation
- support should be able to move from a visible support code to likely root cause and next action in one step

### Inputs The Agent Must Correlate
The agent should consume and correlate the following data sources:

1. `client_error_events`
- support code
- feature area
- route
- org / event scope
- user / role context
- app version
- error message
- captured structured context

2. `import_runs`
- run status
- import target
- source name / source instance
- blocking issues
- error message
- timestamps
- operator identity

3. `import_run_records`
- row-level create / update / skip / blocked activity
- entity type and entity ids

4. `intake_audit_events`
- request approval / rejection / conversion actions
- actor and timestamps
- before / after payload snapshots

5. Edge Function execution logs
- `import-participants`
- future intake or workflow functions added later
- raw runtime exceptions
- payload shape / response code / console output

6. Auth / session context where relevant
- current org / event role
- PWA version
- session timing / stale session indicators if those become relevant to failures

### First Supported Feature Areas
The first release of the diagnostics agent should only support these areas:
- `Import Data`
- `Performance Requests`
- participant RBAC / PII access failures only when those failures are tied to the operator flow

Do not expand it yet into:
- onboarding
- general account recovery
- media generation debugging
- intro composition debugging

### What The Agent Should Actually Produce
For each support code or grouped issue cluster, the agent should return:

1. Scope
- organization
- event
- feature area
- affected user role
- app version

2. Symptom
- what the customer saw
- when it started
- whether it is isolated or repeated

3. Probable Root Cause
Examples:
- Google Sheet not shared with the importer service account
- Edge Function runtime exception
- live DB missing migration
- RLS rejection on insert / select
- invalid source shape or missing expected columns
- request conversion function failure

4. Confidence Level
- high / medium / low

5. Recommended Next Action
Examples:
- ask operator to share the sheet with the service account
- re-run migration `X`
- inspect function `import-participants`
- check policy `performance_requests_select`
- refresh source after fixing sharing

6. Escalation Flag
- whether the issue should be escalated to engineering immediately
- whether the issue is customer-blocking
- whether the issue is affecting multiple tenants

### Required Guardrails
- internal use only; never expose raw backend details or stack traces to customers
- never auto-modify customer data in v1
- never auto-run destructive fixes
- never bypass RBAC or impersonate users
- support suggestions must include uncertainty when confidence is not high
- all diagnostics outputs should be traceable back to actual stored events/logs, not hidden chain-of-thought guesses

### Minimum Technical Design

#### A. Collection Layer
Already in progress / now available:
- `client_error_events`
- support codes shown in `Import Data`
- support codes shown in `Performance Requests`

Still needed for the full diagnostics agent:
- consistent correlation IDs across:
  - frontend support code
  - `client_error_events`
  - Edge Function execution context
  - `import_runs`
  - `intake_audit_events` where applicable

#### B. Correlation Layer
Build a server-side internal diagnostics service that:
- receives a support code or scans recent events
- looks up related `client_error_events`
- joins related `import_runs` by event / time / source context
- looks up nearby Edge Function logs
- evaluates a ruleset before using any model reasoning

The ruleset should cover deterministic cases first:
- import source exists but no successful run exists
- `import_runs.status = failed` with known message
- no matching DB object exists after deploy
- Google API / sheet-permission failure signatures
- common Postgres / RLS / missing relation errors

Only after deterministic checks should the model produce a probable cause summary.

#### C. Review Surface
Create an internal support surface that can:
- search by support code
- show latest grouped incidents
- filter by feature area, org, event, app version, severity
- open the correlated timeline:
  - client error event
  - import run
  - import run records
  - intake audit events
  - linked Edge Function error excerpt

This can begin as an internal admin page or a Supabase-backed support workspace.

### Suggested Delivery Sequence

#### Batch A: Telemetry Foundations
- ensure every critical operator workflow emits support codes
- ensure `client_error_events` is deployed everywhere
- add correlation-id propagation into `import-participants`
- add version and route consistency checks

#### Batch B: Deterministic Triage
- build a support lookup tool for support code -> related records
- add rule-based diagnosis for the most common intake failures
- add basic issue grouping by normalized signature

#### Batch C: Internal Agent Summary
- add model-generated summaries on top of the correlated evidence
- include probable cause, confidence, and next action
- keep outputs internal-only

#### Batch D: Proactive Alerting
- detect repeated failure spikes by feature area / version / tenant
- notify internal support when:
  - multiple failures share the same signature
  - a customer-blocking path is repeatedly failing
  - a new app version introduces a new issue cluster

### Definition of Done for the Diagnostics Agent v1
- a support code from `Import Data` or `Performance Requests` can be entered into an internal tool
- the tool returns correlated evidence within one screen
- the tool proposes a likely cause and next action for common intake failures
- the tool clearly marks low-confidence cases for engineering review
- no customer-facing screen exposes raw backend jargon while still giving support a usable reference code

## Follow-up Workflow Guardrails

### Approval Reversal
Add a controlled pre-conversion reversal path for performance requests.

Required behavior:
- available only when a request is `approved`
- hidden once a request is `converted`
- restricted to `EventAdmin`
- explicit operator confirmation required
- write a durable audit event with actor, timestamp, and optional note

Expected result:
- move the request back to `pending`
- clear `approved_at` and `approved_by`
- preserve imported source data, source identity, import lineage, and contact fields

Do not:
- treat this as a destructive undo system
- allow it to delete or alter a converted performance
- rewrite imported request payload fields

Preferred operator label:
- `Move Back to Pending`

### Performance Deletion / Post-Conversion Rollback
There is currently no visible delete-performance path in the app. Keep this explicitly tracked as a separate product decision from approval reversal.

Why this matters:
- if a converted performance ever needs to be removed, the system needs a defined rule for what happens to the originating request
- post-conversion rollback is materially different from pre-conversion approval reversal

Questions to resolve before implementation:
- should `EventAdmin` be able to delete a performance at all in v1?
- if a converted performance is deleted, should the originating request:
  - stay `converted`
  - move back to `approved`
  - move back to `pending`
- should deletion be blocked when the act already has lineup state, console state, or uploaded assets?

Recommendation for now:
- implement approval reversal first
- defer performance deletion / rollback until the act lifecycle rules are defined clearly enough to avoid orphaned or misleading request state
