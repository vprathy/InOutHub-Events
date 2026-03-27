# Dashboard And Surface Metrics Validation Script

**Purpose:** Exhaustive validation script for metric fidelity across Dashboard and other metric-bearing surfaces. This script is designed for live Supabase truth first, frontend code second, and final rendered UI proof last.

**Repo:** `/Users/vinay/dev/InOutHub-Events-main`

**Recommended Baseline Under Test:** `6ae15b0` `Fix dashboard queue count fidelity`

## Execution Rules

- Testing and validation only.
- Do not edit application code, schema, seed logic, or live data while executing this script unless explicitly instructed.
- Prefer Supabase/live DB truth first.
- Reconcile code logic second.
- Use browser or device screenshots only to prove final rendered behavior.
- If a scenario cannot be proven, mark it `UNPROVEN` or `MANUAL CONFIRMATION`, not `PASS`.
- When a metric appears on multiple surfaces, verify that the label and count contract are either identical or intentionally different.
- Distinguish between:
  - full population count
  - unresolved operational count
  - preview-row count
  - historical/audit count

## Status Values

- `PASS`
- `FAIL`
- `UNPROVEN`
- `MANUAL CONFIRMATION`

## Severity Values

- `P0` Operator-trust or rollout-blocking mismatch
- `P1` High-value metric drift or misleading operational count
- `P2` Count/label mismatch with workaround
- `P3` Minor wording or display issue
- `N/A`

## Preferred Validation Order

1. Resolve target organization/event.
2. Capture live DB truth for all base counts.
3. Inspect hook/page code that derives each metric.
4. Compare expected frontend result against rendered UI.
5. Record exact mismatch cause:
   - wrong query
   - wrong filter
   - wrong label
   - preview count used as total
   - stale/unresolved state logic
   - overlapping category definition

## Global Preconditions

- Local app/dev server is reachable if UI proof is needed.
- Supabase MCP or equivalent live DB access is available.
- Tester can resolve the exact org/event from the screenshot or route context.
- Do not reset or mutate data during validation unless the test explicitly calls for it.

## Record Under Test Inventory

Complete before scenario execution:

- Organization:
- Event:
- Event ID:
- Dev user(s) used:
- Screenshot/device context:
- Baseline commit verified:
- Test date:

---

## Section A: Repo / Contract Review

### MSM-001
- Screen/Area: Dashboard metric contract
- Objective: Confirm Dashboard metric definitions are explicit and do not use preview-card truncation as total count.
- Backend/code truth to inspect first:
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useDashboardRadar.ts`
- Expected result: Dashboard metrics and queue card counts are based on full underlying totals, while only detail previews are capped.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### MSM-002
- Screen/Area: Shared participant metric contract
- Objective: Confirm `Participants`, `Files Waiting`, and assignment-gap metrics use a consistent subject definition across Dashboard and Participants.
- Backend/code truth to inspect first:
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantsPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
- Expected result: Reused labels count the same thing across surfaces or use clearly different labels if the underlying subject differs.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### MSM-003
- Screen/Area: Shared act/performance metric contract
- Objective: Confirm `Performances`, `Acts At Risk`, and related risk/prep counters use consistent logic across Dashboard and Performances.
- Backend/code truth to inspect first:
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/ActsPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useActs.ts`
  - `/Users/vinay/dev/InOutHub-Events-main/src/lib/actReadiness.ts`
- Expected result: Counts either match exactly or are intentionally labeled as different concepts.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### MSM-004
- Screen/Area: Import/admin metric contract
- Objective: Confirm request/import/admin counts are scoped correctly and only appear as urgent when the underlying state is truly urgent.
- Backend/code truth to inspect first:
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/PerformanceRequestsPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/ImportDataPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/usePerformanceRequests.ts`
- Expected result: Pending backlog is not mislabeled as critical failure; failed/blocked import runs remain distinct.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section B: Live DB Truth Capture

### MSM-010
- Screen/Area: Event resolution
- Objective: Resolve the exact event and organization under test from live data.
- Backend truth to inspect first:
  - `organizations`
  - `events`
- Expected result: Event name, org name, and ids are recorded before metric validation begins.
- Actual result:
- Evidence:
- Status:
- Severity: N/A
- Notes:

### MSM-011
- Screen/Area: Participant scope truth
- Objective: Capture live participant base counts.
- Backend truth to inspect first:
  - `participants`
  - `act_participants`
  - `participant_assets`
  - `participant_notes`
- Required counts:
  - total participants
  - operational participants
  - assigned participants
  - unassigned participants
  - minors
  - minors missing guardian data
  - participants with unresolved special requests
  - participants with missing/pending files
  - participants pending identity verification
- Expected result: All participant-facing metric bases are captured from DB truth before UI comparison.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### MSM-012
- Screen/Area: Performance scope truth
- Objective: Capture live act/performance base counts.
- Backend truth to inspect first:
  - `acts`
  - `act_participants`
  - `act_requirements`
  - `act_readiness_issues`
- Required counts:
  - total acts
  - acts with `arrival_status = 'Not Arrived'`
  - acts with blocked/high-severity readiness issues
  - acts with intro requirements not fulfilled
  - acts missing team coverage
  - acts missing performer coverage if derivable
- Expected result: All act/performance-facing metric bases are captured from DB truth before UI comparison.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### MSM-013
- Screen/Area: Intake/admin truth
- Objective: Capture live intake and import admin counts.
- Backend truth to inspect first:
  - `performance_requests`
  - `import_runs`
  - `event_sources`
  - `intake_audit_events`
- Required counts:
  - pending performance requests
  - approved performance requests
  - rejected performance requests
  - failed/blocked import runs
  - active/running request syncs
  - connected request sources
- Expected result: Intake/admin metrics are grounded before UI comparison.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

---

## Section C: Dashboard Validation

### MSM-020
- Screen/Area: Dashboard Show Snapshot
- Objective: Confirm each top metric matches live DB truth and code contract.
- Backend/code truth to inspect first:
  - DB counts from MSM-011/012/013
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useDashboardRadar.ts`
- Exact validation steps:
  1. Record rendered values for the four Show Snapshot cards.
  2. Compare each against live DB count and code derivation.
  3. Confirm labels match what is actually being counted.
- Expected result: No preview cap or stale state logic affects top metrics.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### MSM-021
- Screen/Area: Dashboard Response Queue
- Objective: Confirm each queue card header count matches the full unresolved total, not the preview row cap.
- Backend/code truth to inspect first:
  - DB counts from MSM-011/012/013
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx`
- Exact validation steps:
  1. Record each visible queue card label and header count.
  2. Expand each queue card if needed.
  3. Confirm header count equals the full unresolved total.
  4. Confirm preview rows may be capped without affecting the header count.
- Expected result: Header count reflects total unresolved work; expanded list may preview only a subset.
- Actual result:
- Evidence:
- Status:
- Severity: P0
- Notes:

### MSM-022
- Screen/Area: Dashboard category exclusivity
- Objective: Confirm queue categories are MECE enough for operator trust.
- Backend/code truth to inspect first:
  - category logic in `/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx`
  - live records contributing to each category
- Expected result: A single unresolved record should not inflate multiple categories unless that overlap is explicitly intentional and documented.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section D: Participants Surface Validation

### MSM-030
- Screen/Area: Participants top metrics
- Objective: Confirm Participants surface counts match participant DB truth and do not drift from Dashboard labels.
- Backend/code truth to inspect first:
  - DB counts from MSM-011
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantsPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
- Expected result: Participant totals, file-waiting counts, and blocker counts match their label definitions.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### MSM-031
- Screen/Area: Participants filtered list vs header stats
- Objective: Confirm Participants list filters do not make the top metrics misleading.
- Backend/code truth to inspect first:
  - filter logic in `/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantsPage.tsx`
- Expected result: Either metrics reflect the filtered list, or they are clearly event-wide stats and not mislabeled.
- Actual result:
- Evidence:
- Status:
- Severity: P2
- Notes:

---

## Section E: Performances Surface Validation

### MSM-040
- Screen/Area: Performances top metrics
- Objective: Confirm Performances surface counts match act DB truth and do not drift from Dashboard labels.
- Backend/code truth to inspect first:
  - DB counts from MSM-012
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/ActsPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useActs.ts`
  - `/Users/vinay/dev/InOutHub-Events-main/src/lib/actReadiness.ts`
- Expected result: Total performances and attention/risk counts match their exact derivation.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### MSM-041
- Screen/Area: Performances risk label fidelity
- Objective: Confirm `Acts At Risk`, `Need Attention`, or similar labels do not count a different concept than the label implies.
- Backend/code truth to inspect first:
  - readiness derivation in `/Users/vinay/dev/InOutHub-Events-main/src/lib/actReadiness.ts`
  - metric labels in `/Users/vinay/dev/InOutHub-Events-main/src/pages/ActsPage.tsx`
- Expected result: Different concepts are either merged intentionally or labeled distinctly.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section F: Intake/Admin Surfaces Validation

### MSM-050
- Screen/Area: Performance Requests metrics
- Objective: Confirm workflow metrics on the Performance Requests page match live request status counts.
- Backend/code truth to inspect first:
  - `performance_requests`
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/PerformanceRequestsPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/hooks/usePerformanceRequests.ts`
- Expected result: Pending/Approved/Rejected/All counts match live DB truth.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

### MSM-051
- Screen/Area: Import Data metrics
- Objective: Confirm Import Data source trust metrics match `event_sources` and `import_runs` truth.
- Backend/code truth to inspect first:
  - `event_sources`
  - `import_runs`
  - `/Users/vinay/dev/InOutHub-Events-main/src/pages/ImportDataPage.tsx`
  - `/Users/vinay/dev/InOutHub-Events-main/src/components/participants/ImportParticipantsModal.tsx`
- Expected result: Connected imports, locked sources, mapping review, and trusted sync counts match source truth.
- Actual result:
- Evidence:
- Status:
- Severity: P1
- Notes:

---

## Section G: Summary Output

At the end of execution, produce:

### Metric Contract Summary
- list each metric-bearing surface tested
- list each metric label
- list the live DB truth
- list the rendered UI value
- mark `Aligned` / `Drifted`

### Root Cause Summary
For each mismatch, classify one root cause:
- preview-cap bug
- stale unresolved logic
- wrong label
- different subject counted
- overlapping category design
- frontend-only filter drift
- backend truth missing

### Recommended Smallest Fixes
- only include the smallest corrections needed to restore trust in the numbers
- do not redesign the screen unless the metric contract itself is broken
