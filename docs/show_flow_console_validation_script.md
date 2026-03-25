# Show Flow And Live Console Validation Script

Date: 2026-03-25
Repo: `/Users/vinay/dev/InOutHub-Events-main`

## Purpose

Validate that `Show Flow` and `Live Console` are both:
- operationally distinct
- mobile-usable
- stable enough for live-event rehearsal

This script exists because intake readiness is no longer the main uncertainty.
The next gating question is whether the actual rehearsal and execution spine is trustworthy.

## Method Order

Use this order unless blocked:

1. repo and contract review
2. local app behavior with `/dev/login`
3. Supabase inspection only if a runtime mismatch appears
4. browser automation as the last option

Do **not** use `Reset Demo Event` unless a scenario explicitly requires reseeding the canonical dev fixture.

## Core Product Contract

### Show Flow
- planning and repair workspace
- stage setup
- lineup ordering
- risk visibility

### Live Console
- execution workspace
- current/next/upcoming visibility
- live state controls
- recovery after refresh/reconnect

Pass condition:
- the two screens feel meaningfully different in job and interaction
- not like duplicated lineup pages

## Test Setup

### Event Context
- Use the active working event already under validation when possible.
- If role switching is needed, use `/dev/login`.
- Avoid destructive dev reseeding during the run.

### Roles

At minimum test:
- `EventAdmin`
- `StageManager`

Optional:
- lower-privilege role for visibility/denial checks

## Section A: Repo / Contract Review

### SFC-001: Two-Screen Contract Exists In Repo

Objective:
- confirm product intent is still explicit

Check:
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/operator-screen-organization-framework.md`
- `/Users/vinay/dev/InOutHub-Events-main/task.md`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/LineupPage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/StageConsolePage.tsx`

Pass if:
- Show Flow and Live Console have distinct jobs
- no recent code change appears to collapse them into one workflow

## Section B: Show Flow Validation

### SFC-010: Stage Setup Exists And Is Usable

Objective:
- confirm operators can set up stages without leaving the flow

Steps:
1. Open `Show Flow`.
2. Confirm a stage picker is present.
3. Open stage management/setup.
4. Verify operators can:
   - create a stage
   - rename a stage
   - identify the active stage

Pass if:
- stage setup is discoverable
- stage setup can be completed without hidden admin detours

### SFC-011: Add Performance To Lineup

Objective:
- confirm a performance can be added to the selected stage lineup

Steps:
1. In `Show Flow`, choose a stage.
2. Use the add-to-flow path.
3. Add a performance that is not already in the lineup.

Pass if:
- the new lineup item appears in the selected stage
- sort order remains coherent

### SFC-012: Reorder Lineup

Objective:
- confirm reorder works in the normal non-live state

Steps:
1. Reorder at least two lineup items.
2. Refresh the page.

Pass if:
- the new order persists
- no duplicate or missing lineup entries appear

### SFC-013: Remove From Lineup

Objective:
- confirm removal is safe and deterministic

Steps:
1. Remove one lineup item.
2. Refresh.

Pass if:
- the item is removed from that stage lineup only
- no unrelated lineup corruption appears

### SFC-014: Risk / Insight Visibility

Objective:
- confirm Show Flow surfaces pre-live risk signal

Look for:
- schedule/risk scanning
- warnings around lineup problems
- operator-readable next fix hints

Pass if:
- Show Flow tells the operator what is risky before going live

## Section C: Live Console Validation

### SFC-020: Stage Selection Is Remembered

Objective:
- confirm console restores the stage context for the same event

Steps:
1. Open `Live Console`.
2. Select a stage.
3. Leave and return to the console.

Pass if:
- the same stage is restored for the same event

### SFC-021: No-Lineup Empty State Is Clear

Objective:
- ensure console handles empty stage state correctly

Steps:
1. Select a stage with no lineup if available.

Pass if:
- console shows a clear empty state
- action to open `Show Flow` is available

### SFC-022: Current / Next / Upcoming Are Clear

Objective:
- confirm console is execution-first, not edit-first

Steps:
1. Open a stage with lineup.
2. Confirm current, next, and upcoming are understandable at a glance.

Pass if:
- the operator can tell what is live now and what is next without interpretation work

### SFC-023: Start / Advance / Pause Flow

Objective:
- verify basic live-calling controls

Steps:
1. Start or resume the console flow if applicable.
2. Advance to the next act.
3. Pause and resume if supported.

Pass if:
- transitions are reflected in the UI
- current/next/upcoming update coherently
- no stuck state appears

### SFC-024: Refresh / Reconnect Recovery

Objective:
- confirm live pointer survives refresh/reconnect conditions

Steps:
1. Put the console into a non-idle state.
2. Refresh the page.
3. Re-open the console.

Pass if:
- console restores or clearly recovers the live position
- if the pointer is out of sync, operator gets a clear repair message

### SFC-025: Drift / Overtime Signal

Objective:
- ensure execution warnings are visible when timing slips

Pass if:
- drift or overtime state is surfaced clearly when conditions trigger it
- warning language remains operator-readable

### SFC-026: Intro Playback Visibility

Objective:
- verify approved intro state is reflected in live execution when applicable

Steps:
1. Use a performance with an approved intro if available.
2. Open the console for the stage containing that performance.

Pass if:
- approved intro is visible or playable in the execution context
- draft/unapproved intro is not treated as live-ready

## Section D: Role / Access Validation

### SFC-030: EventAdmin Can Operate

Objective:
- confirm admins can use both surfaces fully

Pass if:
- `EventAdmin` can open `Show Flow`
- `EventAdmin` can open `Live Console`
- `EventAdmin` can perform lineup and live-state actions

### SFC-031: StageManager Console Rights

Objective:
- confirm StageManager can operate the console as intended

Pass if:
- `StageManager` can open `Live Console`
- console is not wrongly blocked
- stage execution controls behave correctly

### SFC-032: Lower Privilege Limitation

Objective:
- ensure non-operator roles do not gain unsafe execution control

Pass if:
- lower-privilege roles are denied or view-limited as intended
- no hidden write path appears

## Section E: Product Distinction Check

### SFC-040: Show Flow And Console Are Not Redundant

Objective:
- explicitly test the product distinction

Questions to answer:
- is `Show Flow` clearly where you edit/fix the run order?
- is `Live Console` clearly where you run the live show?
- do they avoid duplicating the same controls in two places?

Pass if:
- the answer to all three is yes

Fail if:
- the two screens read like the same lineup screen with small wording differences

## Section F: Mobile Readiness Check

### SFC-050: One-Handed Usability

Objective:
- confirm these surfaces work under live mobile/tablet conditions

Check:
- stage buttons
- primary actions
- spacing/density
- accidental-tap risk
- readability under pressure

Pass if:
- a stage caller can operate them without hunting through dense UI

## Final Decision

At the end, report one of:

- `Show Flow and Live Console are rehearsal-ready for Phase 1`
- `Not rehearsal-ready`

If not ready, separate findings into:
- must fix now
- next hardening batch
- later polish
