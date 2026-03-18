# V1 Requirements & Readiness Execution Package

This is the execution-safe phase-1 package for the requirements engine. It is intentionally narrower than the target architecture:

- add the new admin/policy tables
- backfill act-level readiness only
- keep all current participant asset/template flows untouched
- keep `act_requirements` as the runtime source of truth for existing live screens
- do not enable live bridge triggers in the migration itself

## Phase 1 Scope

Included:
- `requirement_policies`
- `requirement_assignments`
- admin/event RLS for those tables
- deterministic act-requirement code mapping
- manual runbook for starter-policy seeding
- manual runbook for act-side assignment backfill
- optional later cutover trigger for `act_requirements`

Explicitly deferred:
- participant-side bridge from `asset_templates` + `participant_assets`
- any attempt to retire `asset_templates`
- any attempt to retire `act_requirements`
- writing new app screens directly to `requirement_assignments`

## Table Roles In Phase 1

`participant_assets`
- Keep.
- Remains the participant evidence source of truth.
- No schema change and no bridge in phase 1.

`asset_templates`
- Keep.
- Remains the participant/admin template source of truth for the current app.
- Replacement by `requirement_policies` is phase 2 work, not phase 1.

`act_assets`
- Keep.
- Remains act media/evidence storage.
- Not bridged in phase 1.

`act_requirements`
- Keep.
- Remains the live runtime/write source for current act-intro/media workflows.
- Phase 1 only mirrors its readiness state into `requirement_assignments` after manual trigger enablement.

`requirement_policies`
- New admin mandate layer.
- Phase 1 starter catalog is org-scoped and act-only.

`requirement_assignments`
- New readiness/read-review layer.
- Phase 1 is fed by one-time backfill and optional later `act_requirements` trigger.

## Migration Sequence

### Step 1. Apply Schema Migration
Apply:
- `/Users/vinay/dev/InOutHub-Events/supabase/migrations/20240318000000_requirements_and_readiness_v1.sql`

This creates:
- `requirement_policies`
- `requirement_assignments`
- indexes
- RLS policies
- deterministic helper `map_legacy_act_requirement_code`
- bridge function `bridge_act_requirements_sync`

Important:
- this migration does **not** create or enable the live trigger
- phase 1 remains zero-impact on current app writes after migration

### Step 2. Seed Canonical Act Policies
Use the commented seed block in the migration file.

Starter act policy catalog:
- `ACT_AUDIO`
- `ACT_INTRO`
- `ACT_LIGHTING`
- `ACT_MICROPHONE`
- `ACT_VIDEO`
- `ACT_POSTER`
- `ACT_GENERATIVE`
- `ACT_GENERATIVE_AUDIO`
- `ACT_GENERATIVE_VIDEO`
- `ACT_WAIVER`

These are org-scoped on purpose so we do not create one policy row per legacy runtime record.

### Step 3. Backfill Existing Act Readiness
Use the commented backfill block in the migration file.

Backfill rule:
- map `act_requirements.requirement_type` through `map_legacy_act_requirement_code`
- join `acts -> events -> organizations`
- write one assignment per `(policy_id, act_id)`
- `fulfilled = true` becomes `approved`
- `fulfilled = false` becomes `missing`

### Step 4. Verify Before Any Trigger Cutover
Check:
- policies exist for target orgs
- assignment counts are plausible
- sample approved/missing rows match `act_requirements`
- no current UI has been switched to depend on `requirement_assignments`

### Step 5. Optional Trigger Cutover
Only after verification, create the trigger manually using the commented block in the migration.

This is intentionally separate from migration execution because:
- it is the first point where legacy writes start dual-writing
- it is the only place where a trigger fault could surface during live operator activity

## Why Participant Scope Is Deferred

The participant side is not safe enough for phase 1 because:
- `participant_assets.template_id` still depends on live `asset_templates`
- current participant/admin UI reads `asset_templates` directly
- repo schema truth does not define `asset_templates`, even though runtime code relies on it
- there is no clean canonical mapping yet from participant template semantics into `requirement_policies`

So phase 1 deliberately avoids pretending that bridge is ready.

## Regression Safeguards

- no participant behavior changes in phase 1
- no live act workflow reads switch in phase 1
- no trigger is activated by the migration itself
- deterministic mapping is centralized in one function, not duplicated as loose string concatenation
- backfill and trigger use the same mapping logic

## Remaining Risk

The main remaining risk in phase 1 is the optional act trigger cutover:
- if enabled too early, it introduces dual-write complexity
- if starter policies are missing for an org, the trigger becomes a no-op for those rows
- if the app never migrates its reads in phase 2, we will carry legacy and new readiness structures longer than ideal

## Final Call

Status: `READY FOR PHASE 1 EXECUTION`

Meaning:
- safe to apply as additive schema
- safe to seed/backfill for act readiness
- not yet a participant-requirements migration
- not yet a legacy-table retirement plan
