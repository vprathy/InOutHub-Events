# Antigravity Prompt: Performance Request Intake Validation

Use this prompt when handing the current repo and local/live app state to Antigravity for an exhaustive validation pass of the Performance Request intake workflow.

## Goal

Validate the end-to-end `Import Data` and `Performance Requests` workflow across:
- source sync and spreadsheet upload
- request review / approval / rejection / conversion
- contact PII hardening
- intake lineage hardening
- role-based access behavior
- scale/readiness for pivot to new-tenant onboarding

This is a verification task, not a redesign task.

## Primary Script To Execute

Use this file as the source of truth for scenarios and reporting:
- `/Users/vinay/dev/InOutHub-Events-main/docs/performance_request_intake_test_script.md`

You should work through that script directly and fill in outcomes or produce a companion findings report that references each scenario ID.

## Execution Rules

1. Prefer backend / local repo / Supabase validation first.
2. Use `/dev/login` as the default authenticated test path.
3. Use browser automation only as the last option when backend, schema, direct route, or local authenticated checks cannot prove the behavior.
4. Conserve browser/agent credits.
5. Use the local repo at:
   - `/Users/vinay/dev/InOutHub-Events-main`
6. Do not invent product behavior.
7. Do not change application code, schema, or seed logic while running the test pass unless explicitly asked.
8. If you find drift between code, schema, live Supabase state, seeded data, and rendered behavior, call it out explicitly.
9. Mark uncertain cases as `UNPROVEN` or `MANUAL CONFIRMATION`, not `PASS`.

## Use This Login Approach First

For UI/access validation, use:
- `/dev/login`

Available dev roles should include:
- `Super Admin`
- `Org Owner`
- `Event Admin`
- `Stage Manager`
- `Act Admin`

Use `Reset Demo Event` first unless you are intentionally validating against a customer-like source already present in the environment.

## Current Expected State

Current remote baseline should include recent commits:
- `8db699a` `Unify intake profiling through edge function`
- `452faa3` `Harden intake request and lineage access`

Current expected product behavior:
- Google Sheet and spreadsheet upload both route through the backend-led intake contract.
- `Performance Requests` is the staging/review queue, not the final operational performance list.
- Admin can review, approve, reject, and convert requests.
- Request contact PII is visible only to `EventAdmin` / `Org Owner` / `Org Admin` / `Super Admin` as allowed by effective role logic.
- Intake lineage (`import_runs`, `import_run_records`, `intake_audit_events`) is admin-scoped.

## Required Validation Order

### 1. Repo / Schema Contract Review

Read first:
- `/Users/vinay/dev/InOutHub-Events-main/AGENTS.md`
- `/Users/vinay/dev/InOutHub-Events-main/task.md`
- `/Users/vinay/dev/InOutHub-Events-main/database_schema.sql`
- `/Users/vinay/dev/InOutHub-Events-main/supabase/migrations/20260325_harden_intake_security.sql`
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/usePerformanceRequests.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/PerformanceRequestsPage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/components/participants/ImportParticipantsModal.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/dev/DevQuickLogin.tsx`

Confirm from code/schema first:
- request workflow contract is still staged review before conversion
- intake hardening migration exists in repo
- request reads now use `v_performance_requests_hardened`
- upload and Google Sheet paths are converging on the same backend import contract

### 2. Live Supabase / Backend Validation

Validate live objects before browser/UI work:
- `performance_requests`
- `v_performance_requests_hardened`
- `import_runs`
- `import_run_records`
- `intake_audit_events`
- `set_performance_request_status`
- `convert_performance_request_to_act`

Specifically confirm:
- contact PII is admin-scoped
- intake lineage is admin-scoped
- at least one event/source exists for workflow testing

### 3. `/dev/login` Role Validation

Use `/dev/login` next:
- confirm dev login works
- use `Reset Demo Event` if needed
- validate access behavior with:
  - `Event Admin`
  - `Stage Manager`
  - `Act Admin`
  - `Org Owner`
  - `Super Admin`

### 4. Browser / UI Validation Only As Needed

Use browser automation last to prove:
- rendered queue behavior
- sync progress/result visibility
- row expansion / actions
- approval / rejection / conversion interactions
- PII masking or denial for lower-privilege roles

## Must-Cover Scenario Groups

You must cover all scenario groups in:
- `/Users/vinay/dev/InOutHub-Events-main/docs/performance_request_intake_test_script.md`

At minimum:
- Section A: repo / contract review
- Section B: live backend validation
- Section C: `/dev/login` setup and role switching
- Section D: Import Data workflow
- Section E: Performance Requests queue
- Section F: review / approval / conversion flow
- Section G: security / role matrix
- Section H: scale / stability

## Output Requirements

Provide:

1. baseline commit actually tested
2. roles tested
3. source modes tested
4. scenario outcome summary by ID
5. findings ordered by severity with exact evidence:
   - file path references
   - query summaries
   - route + role + observed result
6. explicit answer to:
   - `Ready to pivot primary effort to new-tenant onboarding`
   - or
   - `Not ready to pivot`
7. if not ready, list the exact blocking scenarios

## Guardrails

- Do not redesign UI during validation.
- Do not patch issues mid-test unless explicitly instructed.
- If a scenario depends on missing seed data, note that clearly and use the minimum safe setup.
- Prefer deterministic proof over narrative summary.
