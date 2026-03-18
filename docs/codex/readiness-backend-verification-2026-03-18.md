# Readiness Backend Verification: 2026-03-18

Source:
- Antigravity Supabase verification against live project `qnucfdnjmcaklbwohnuj`

## Verified

The phase-1 requirements/readiness backend package is present in live Supabase and remains in the intended additive state.

Verified objects:
- `requirement_policies`
- `requirement_assignments`
- `map_legacy_act_requirement_code(text)`
- `bridge_act_requirements_sync()`

## Seed / Backfill State

Starter act policy rows exist as expected.

Reported counts:
- one row per starter policy code per organization
- two organizations currently present in the project

Backfill state:
- `requirement_assignments` total: `12`
- statuses:
  - `approved`: `8`
  - `missing`: `4`

Reported populated policy codes:
- `ACT_MICROPHONE`
- `ACT_GENERATIVE`
- `ACT_GENERATIVE_AUDIO`
- `ACT_INTRO`

## Trigger State

Important:
- no live trigger currently calls `bridge_act_requirements_sync()` from `act_requirements`
- this matches the intended safe rollout state
- current phase remains additive and read-safe, without dual-write activation

## RLS State

Verified:
- `requirement_policies` RLS enabled with select/manage policies
- `requirement_assignments` RLS enabled with select/manage policies

## Spot Check Result

Reported sample comparison found:
- `0` mismatches between legacy `act_requirements.fulfilled` state and mapped `requirement_assignments.status`

## Practical Implication

What is now safe:
- phase-1 read-only UI integration for act-side readiness

What remains deferred:
- participant-side bridge from template/evidence semantics into requirements
- enabling live dual-write trigger on `act_requirements`
- write-path cutover away from current legacy runtime tables

## Current Local Follow-Up

Based on this verification, the local app can safely:
- read act-side `requirement_assignments`
- use assignment-backed state in performance readiness surfaces
- keep all current write paths unchanged
