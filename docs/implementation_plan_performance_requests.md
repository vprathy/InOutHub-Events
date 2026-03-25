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
