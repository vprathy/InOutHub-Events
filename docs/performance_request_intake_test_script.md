# Performance Request Intake Test Script

**Purpose:** Exhaustive validation script for the `Import Data` and `Performance Requests` workflows, including intake security, review/approval/conversion flow, and role-scoped behavior.

**Repo:** `/Users/vinay/dev/InOutHub-Events-main`

**Recommended Baseline Under Test:** `452faa3` `Harden intake request and lineage access`

## Execution Rules

- Testing and validation only.
- Do not edit application code, schema, or seed logic while executing this script.
- Prefer backend truth, local repo truth, query truth, and Supabase truth first.
- Use `/dev/login` for authenticated validation whenever UI proof is needed.
- Use browser automation only as the last option when backend/data checks and direct route verification are insufficient.
- Record every scenario outcome directly in this file or in a companion findings file.
- If a scenario cannot be completed, mark it `UNPROVEN` or `MANUAL CONFIRMATION`, not `PASS`.

## Status Values

- `PASS`
- `FAIL`
- `UNPROVEN`
- `MANUAL CONFIRMATION`

## Severity Values

- `P0` Critical security or operator-blocking failure
- `P1` High-value workflow defect
- `P2` Functional issue with workaround
- `P3` Minor/cosmetic issue
- `N/A`

## Preferred Validation Order

1. Review code/schema/migration truth.
2. Validate live/backend data and policies.
3. Use `/dev/login` and local authenticated flows.
4. Use browser automation only to prove final rendered behavior or interaction.

## Global Preconditions

- Local app/dev server is running and reachable.
- `/dev/login` is enabled.
- Supabase project under test is the active live project.
- At least one event exists with a connected `performance_requests` source.
- Ideally use `Reset Demo Event` in `/dev/login` unless a known customer-like sheet is intentionally under test.

## Roles Under Test

- `Super Admin`
- `Org Owner`
- `Event Admin`
- `Stage Manager`
- `Act Admin`

## Data / Source Modes Under Test

- Google Sheet import source
- Spreadsheet upload source
- Existing imported request rows
- Approved but not converted request
- Converted request linked to a live performance

## Record Under Test Inventory

Complete before scenario execution:

- Organization:
- Event:
- Source name(s):
- Source mode(s):
- Dev user(s) used:
- Request IDs tested:
- Converted Act IDs tested:
- Baseline commit verified:
- Test date:

---

## Section A: Repo / Contract Review

### PRI-001
- Screen/Area: Repo contract
- Objective: Confirm the request workflow still uses the staged model `Import -> Review -> Approve -> Convert`.
- Backend/code truth to inspect first:
  - `/Users/vinay/dev/InOutHub-Events-main/AGENTS.md`
  - `/Users/vinay/dev/InOutHub-Events-main/database_schema.sql`
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/PerformanceRequestsPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/usePerformanceRequests.ts`
- Expected result: Requests are staged in `performance_requests`; converted performances are separate `acts`.
- Actual result:
- Evidence:
- Status:
- Severity: N/A
- Notes:

### PRI-002
- Screen/Area: Import architecture
- Objective: Confirm both spreadsheet uploads and Google Sheets now use backend-led intake profiling.
- Backend/code truth to inspect first:
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
  - `/Users/vinay/dev/InOutHub-Events-main/supabase/functions/import-participants/index.ts`
- Expected result: Browser uploads only parse file bytes locally, then send rows to the Edge Function; backend performs authoritative profiling/import.
- Actual result:
- Evidence:
- Status:
- Severity: N/A
- Notes:

### PRI-003
- Screen/Area: Security contract
- Objective: Confirm request contact PII and intake lineage are admin-scoped in repo truth.
- Backend/code truth to inspect first:
  - `/Users/vinay/dev/InOutHub-Events-main/database_schema.sql`
  - `/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260325_harden_intake_security.sql`
- Expected result:
  - `performance_requests` base table select is admin-only
  - `v_performance_requests_hardened` exists
  - `import_runs` / `import_run_records` RLS is enabled and admin-only
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

---

## Section B: Backend / Live Supabase Validation

### PRI-010
- Screen/Area: Live migration state
- Objective: Confirm the live database contains the hardened request-contact and intake-lineage objects.
- Backend truth to inspect first:
  - function `can_view_performance_request_contact_pii`
  - view `v_performance_requests_hardened`
  - policies on `performance_requests`, `import_runs`, `import_run_records`, `intake_audit_events`
- Expected result: Live project matches repo/migration truth.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### PRI-011
- Screen/Area: Existing intake records
- Objective: Confirm at least one event has imported request rows suitable for workflow testing.
- Backend truth to inspect first:
  - `performance_requests`
  - `import_runs`
  - `event_sources`
- Expected result: There is at least one source-linked event with imported requests and one recent successful import run.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-012
- Screen/Area: Workflow functions
- Objective: Confirm the status-change and conversion RPCs are present and callable by admin scope.
- Backend truth to inspect first:
  - `set_performance_request_status`
  - `convert_performance_request_to_act`
- Expected result: RPCs exist and are still aligned with admin-only request management.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-013
- Screen/Area: Import security
- Objective: Confirm only `EventAdmin`/super admin can read intake lineage data.
- Backend truth to inspect first:
  - RLS behavior for:
    - `import_runs`
    - `import_run_records`
    - `intake_audit_events`
- Expected result: lower-privilege event roles cannot read import lineage/source snapshots.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

---

## Section C: Dev Login / Seed / Access Setup

### PRI-020
- Screen/Area: `/dev/login`
- Objective: Confirm dev login works and is the preferred authenticated entry path for testing.
- Exact validation steps:
  1. Open `/dev/login`.
  2. Verify available roles include `Super Admin`, `Org Owner`, `Event Admin`, `Stage Manager`, and `Act Admin`.
  3. Verify `Reset Demo Event` control exists.
- Expected result: Dev login provides fast deterministic role switching.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-021
- Screen/Area: `/dev/login`
- Objective: Reset demo data before workflow validation unless intentionally testing a customer-like live source.
- Exact validation steps:
  1. Use `Reset Demo Event`.
  2. Note whether the reset succeeded.
  3. Note seeded org/event names afterward.
- Expected result: Clean deterministic seed state is available.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-022
- Screen/Area: Role switching
- Objective: Confirm role switching through `/dev/login` establishes usable sessions.
- Exact validation steps:
  1. Sign in as each listed role.
  2. Confirm session establishes and app routes correctly.
  3. Confirm event selection or dashboard entry works.
- Expected result: Role sessions are stable enough for validation.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section D: Import Data Workflow

### PRI-100
- Screen/Area: Import Data
- Objective: Validate Import Data loads for `EventAdmin`.
- Preconditions / seed assumptions: Admin session active.
- Exact validation steps:
  1. Navigate to `/admin/import-data`.
  2. Confirm workspace loads.
  3. Confirm participant/performance request source sections render.
- Expected result: Import workspace loads with no runtime error.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-101
- Screen/Area: Import Data
- Objective: Validate source-level latest sync summary renders after a successful run.
- Preconditions / seed assumptions: At least one completed import run exists.
- Exact validation steps:
  1. Open Import Data.
  2. Inspect latest sync summary.
  3. Confirm counts and target label render coherently.
- Expected result: Summary shows source name, target, and stats without ambiguity.
- Actual result:
- Evidence:
- Status:
- Severity: P2
- Notes:

### PRI-102
- Screen/Area: Import Data
- Objective: Validate `Sync Source` / source refresh runs successfully for an existing Google Sheet source.
- Preconditions / seed assumptions: Connected performance-request source exists and is valid.
- Exact validation steps:
  1. Trigger source refresh.
  2. Confirm inline progress state is visible.
  3. Confirm run succeeds.
  4. Confirm `Recent Sync Activity` updates.
- Expected result: Sync completes and operator sees a clear result.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-103
- Screen/Area: Import Data
- Objective: Validate failure reporting path for import errors.
- Preconditions / seed assumptions: Controlled failing source or known failure condition available.
- Exact validation steps:
  1. Trigger an intentional import failure if safe.
  2. Confirm an immediate error surface appears in-context.
  3. Confirm a support/reference code is shown.
  4. Confirm corresponding `client_error_events` record exists.
- Expected result: No silent failure; failure is operator-visible and supportable.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### PRI-104
- Screen/Area: Spreadsheet upload path
- Objective: Validate spreadsheet upload uses the same backend-led import profiling contract.
- Preconditions / seed assumptions: Safe spreadsheet test file available.
- Exact validation steps:
  1. Upload spreadsheet source.
  2. Confirm no browser-only import path assumptions remain.
  3. Confirm import run/source result behaves consistently with Google Sheet flow.
- Expected result: Upload and Google Sheet produce the same style of mapping/result semantics.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section E: Performance Requests Queue

### PRI-200
- Screen/Area: Performance Requests
- Objective: Validate page loads for `EventAdmin`.
- Preconditions / seed assumptions: Imported request rows exist.
- Exact validation steps:
  1. Navigate to `/admin/performance-requests`.
  2. Confirm the list loads.
  3. Confirm the workflow/status controls render.
- Expected result: Queue loads without runtime error.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-201
- Screen/Area: Performance Requests
- Objective: Validate segment filters (`Pending`, `Approved`, `Converted`, `Rejected`, `All`).
- Exact validation steps:
  1. Tap each workflow segment control.
  2. Confirm list contents and counts react consistently.
  3. Confirm search works within the current segment.
- Expected result: Server-backed filtering behaves correctly and does not over-fetch or miscount.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-202
- Screen/Area: Performance Requests
- Objective: Validate request cards remain compact and operational on mobile.
- Exact validation steps:
  1. Inspect a mobile-sized viewport.
  2. Confirm each row shows:
     - requestor
     - performance type/category if present
     - duration
     - status
     - performance name
     - request date
  3. Confirm row-2 contact buttons exist.
- Expected result: Cards remain two-line, readable, and operational.
- Actual result:
- Evidence:
- Status:
- Severity: P2
- Notes:

### PRI-203
- Screen/Area: Performance Requests
- Objective: Validate row expansion and quick actions.
- Exact validation steps:
  1. Tap a pending request row.
  2. Confirm inline tray expands.
  3. Confirm `Approve`, `Reject`, and `View Details` appear.
- Expected result: Quick-action tray is intuitive and does not expose stale jargon.
- Actual result:
- Evidence:
- Status:
- Severity: P2
- Notes:

### PRI-204
- Screen/Area: Performance Requests
- Objective: Validate source sync from the sticky-bar action.
- Exact validation steps:
  1. Trigger `Sync Source`.
  2. Confirm source-level sync status appears.
  3. Confirm queue updates after completion.
- Expected result: Source sync is visible and coherent from the queue workspace.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-205
- Screen/Area: Performance Requests
- Objective: Validate full request details view.
- Exact validation steps:
  1. Expand a row, open `View Details`.
  2. Confirm MECE structure:
     - summary/action
     - request summary
     - notes
     - imported intake
     - timeline
- Expected result: Detail panel is coherent and action-oriented.
- Actual result:
- Evidence:
- Status:
- Severity: P2
- Notes:

---

## Section F: Review / Approval / Conversion Flow

### PRI-300
- Screen/Area: Performance Requests
- Objective: Approve a pending request.
- Preconditions / seed assumptions: At least one pending request exists.
- Exact validation steps:
  1. Expand a pending request.
  2. Click `Approve`.
  3. Confirm status updates to approved.
  4. Confirm timeline/audit reflects the action.
- Expected result: Approval succeeds and request leaves the pending queue.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-301
- Screen/Area: Performance Requests
- Objective: Reject a pending request.
- Preconditions / seed assumptions: At least one pending request exists that is safe to reject.
- Exact validation steps:
  1. Expand a pending request.
  2. Click `Reject`.
  3. Confirm status updates to rejected.
  4. Confirm it appears in rejected segment.
- Expected result: Rejection is durable and visible.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-302
- Screen/Area: Performance Requests
- Objective: Convert an approved request into a performance.
- Preconditions / seed assumptions: At least one approved request exists.
- Exact validation steps:
  1. Open an approved request.
  2. Click `Convert to Performance`.
  3. Confirm redirect or open to created performance.
  4. Confirm request status reflects converted state.
- Expected result: Approved request converts once and links to a live act.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-303
- Screen/Area: Performance Profile
- Objective: Validate converted performance reflects imported request context.
- Preconditions / seed assumptions: Converted request exists.
- Exact validation steps:
  1. Open the created performance.
  2. Confirm imported-request card exists.
  3. Confirm imported requestor/contact/details are shown as expected.
- Expected result: Converted act preserves the intake context needed by operators.
- Actual result:
- Evidence:
- Status:
- Severity: P2
- Notes:

### PRI-304
- Screen/Area: Performance Requests
- Objective: Validate repeat source sync after conversion does not recreate or corrupt converted items.
- Preconditions / seed assumptions: At least one converted request exists.
- Exact validation steps:
  1. Sync source again.
  2. Confirm converted request remains converted.
  3. Confirm duplicate act is not created.
- Expected result: Sync is idempotent with respect to already-converted requests.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-305
- Screen/Area: Performance Requests
- Objective: Validate `Move Back to Pending` for approved, not-yet-converted requests.
- Preconditions / seed assumptions: At least one approved, not-yet-converted request exists.
- Exact validation steps:
  1. Open an approved request that has not been converted.
  2. Trigger `Move Back to Pending`.
  3. Confirm explicit confirmation appears.
  4. Confirm request returns to pending state.
  5. Confirm `approved_at` / `approved_by` are cleared.
  6. Confirm imported request data remains unchanged.
- Expected result: Approval reversal works only before conversion and preserves imported request/source data.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section G: Security / Role Matrix

### PRI-400
- Screen/Area: EventAdmin
- Objective: Confirm admin can see request contact details.
- Exact validation steps:
  1. Log in as `Event Admin`.
  2. Open `Performance Requests`.
  3. Confirm `lead_email` / `lead_phone` render where expected.
- Expected result: Admin sees contact PII.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### PRI-401
- Screen/Area: StageManager
- Objective: Confirm lower-privilege role cannot see request contact PII.
- Exact validation steps:
  1. Log in as `Stage Manager`.
  2. Attempt to open `Performance Requests`.
  3. If list is available, confirm contact fields are masked/null.
  4. If list is blocked, confirm blocking behavior is coherent.
- Expected result: No unauthorized contact PII exposure.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### PRI-402
- Screen/Area: StageManager / ActAdmin
- Objective: Confirm lower-privilege roles cannot read intake lineage.
- Exact validation steps:
  1. As a lower-privilege role, attempt access paths that expose import history, sync lineage, or audit details.
  2. Confirm denial or masking.
- Expected result: `import_runs`, `import_run_records`, and `intake_audit_events` are not readable inappropriately.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### PRI-403
- Screen/Area: Org Owner / Super Admin
- Objective: Confirm elevated roles retain expected admin-grade access.
- Exact validation steps:
  1. Log in as `Org Owner` and `Super Admin`.
  2. Verify admin-grade request/intake behavior still works.
- Expected result: Elevated roles preserve required access.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section H: Scale / Stability

### PRI-500
- Screen/Area: Performance Requests
- Objective: Confirm queue remains stable as list length grows.
- Preconditions / seed assumptions: Event with >25 requests, ideally >100 if available.
- Exact validation steps:
  1. Confirm first 25 load.
  2. Use `Load 25 More`.
  3. Confirm total count and list behavior remain correct.
  4. Confirm search and segment filters still operate without visible instability.
- Expected result: Page remains stable and does not attempt to render the entire dataset at once.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### PRI-501
- Screen/Area: Import source variety
- Objective: Validate wide-but-sparse request source shape is handled correctly.
- Preconditions / seed assumptions: A Google/Form-style sheet with many columns and relatively few rows is available.
- Exact validation steps:
  1. Confirm importer recognizes target and key mappings.
  2. Confirm extra columns do not break import.
  3. Confirm raw payload retains unused source detail.
- Expected result: Width alone does not degrade the workflow or force false errors.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section I: Open Follow-ups To Note During Testing

- Is `Move Back to Pending` needed immediately for approved/not-converted requests?
- Is any performance deletion path present in the UI?
- If a converted performance were deleted in the future, what should happen to the originating request?
- Does any lower-privilege role still surface contact PII or import lineage unexpectedly?
- Does a second tenant/source shape import without alias-specific surgery?

---

## Final Report Format

At the end of execution, provide:

1. Tested baseline commit
2. Roles tested
3. Source modes tested
4. PASS / FAIL / UNPROVEN summary by section
5. Findings ordered by severity with exact file/query/route evidence
6. Retest recommendations
7. Explicit statement:
   - `Ready to pivot primary effort to new-tenant onboarding`
   - or
   - `Not ready to pivot`, with the exact blocking scenarios
