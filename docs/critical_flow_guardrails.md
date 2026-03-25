# Critical Flow Guardrails

Purpose:
- prevent lockout incidents and silent regressions in the app-entry and operator-entry flows
- make auth/selection/onboarding changes follow a stricter bar than ordinary feature work

These flows are protected:
- login
- auth completion / first session establishment
- org selection
- event selection
- founder onboarding
- invite-based entry
- dashboard entry
- stage console entry
- dev login for seeded/local operator workflows

## Core Rules

1. Treat app-entry flows as protected flows
- Any change touching auth, selection, onboarding, redirect logic, or dashboard-entry behavior requires explicit regression verification.
- Empty-state copy, auto-select rules, and capability gating count as protected-flow changes.

2. Do not hard-couple protected flows to unapplied schema
- Frontend must not require new DB columns, functions, or policies in protected flows unless those backend changes are already confirmed live in the target environment.
- If a new backend field is planned but not guaranteed live, protected-flow queries must remain backward-compatible.

3. Never fail silent into a false empty state
- If org/event lookup fails, do not present “no organizations” or “no events” unless the query actually succeeded with zero rows.
- Protected flows must distinguish:
  - true empty state
  - permission/access issue
  - backend/schema/query failure

4. Preserve seeded and real-customer paths
- A fix for first-time onboarding must not break:
  - seeded dev-login users
  - existing invited users
  - existing org/event members
  - real customer workspaces already in the DB

5. Auto-select logic must be conservative
- Auto-select is allowed only when it reduces friction without skipping an explicit selection step the user is currently performing.
- If the user is already on `/select-org` or `/select-event`, auto-select must not override an intentional chooser interaction unless that behavior is explicitly designed and tested.

## Required Regression Checks

Run these checks for any protected-flow change:

1. Existing seeded super admin
- login succeeds
- org list loads
- clicking an org reaches event selection
- clicking an event reaches dashboard

2. Existing member / invited path
- invited user can sign in
- pending-access path does not show founder onboarding
- fulfilled access reaches the correct workspace

3. Founder onboarding path
- new user with no orgs and no pending access sees founder onboarding
- can create first org
- can create first event
- lands in dashboard

4. Single-selection auto-paths
- one org only auto-selects correctly
- one event only auto-selects correctly
- explicit chooser screens are not skipped when the user is already on them unless intentionally designed

5. Stage-console safety
- existing operator can still enter the stage console path without auth/selection regressions caused by unrelated onboarding work

## Schema and Compatibility Rules

Before landing a protected-flow change that depends on backend changes:

1. Verify active backend truth
- confirm the DB function/column/policy exists in the actual environment being tested
- do not assume repo migration presence means runtime availability

2. Keep protected-flow queries tolerant
- prefer additive reads with fallbacks
- if compatibility is uncertain, do not read the new field in the protected flow yet

3. Surface real errors
- if a protected-flow query fails, log it and show an operational error state instead of a misleading empty state

## Minimum Smoke Test Plan

At minimum, run this sequence manually or in automation:

1. Login as seeded super admin
2. Verify org selection renders existing orgs
3. Select org
4. Verify event selection renders existing events
5. Select event
6. Verify dashboard renders

Recommended additional smoke tests:
- invited user pending access
- founder onboarding no-org flow
- dev login with seeded DB
- dev login with empty DB bootstrap

## Implementation Guidance

When changing protected flows:
- prefer isolated changes over broad auth/selection refactors
- avoid swallowing fetch/query errors in chooser screens
- keep redirect rules centralized and easy to trace
- document any new auto-select behavior explicitly
- if backend work is pending, gate new UX behind compatibility-safe reads

## Definition of Done for Protected Flows

A protected-flow change is complete only when:
- build passes
- the required regression checks above were run
- no protected-flow query silently degrades into a false empty state
- seeded and existing-customer entry paths remain functional
