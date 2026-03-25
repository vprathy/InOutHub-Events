# New-Tenant Onboarding Go / No-Go Rubric

Date: 2026-03-25

## Purpose

Provide a short decision rubric for whether InOutHub should shift primary effort toward broader new-tenant onboarding.

This exists so the decision is based on explicit operational gates, not optimism after one strong subsystem batch.

## Decision Rule

New-tenant onboarding is:
- `GO` when the live event spine is operationally trustworthy for Phase 1
- `NO-GO` when intake is strong but roster, performance, show-flow, or console execution still carry meaningful pilot risk

## What Is Already Strong Enough

The following are now materially de-risked:
- performance-request intake and review
- request approval / rejection / conversion
- request/contact PII hardening
- intake lineage hardening
- intake stats and scaling improvements for the request queue

These should no longer be treated as the primary blocker.

## Mandatory GO Criteria

All of the following should be true before broad new-tenant onboarding becomes the main delivery lane.

### 1. Intake Is Stable

- Google Sheet intake works through the shared backend path
- spreadsheet upload works through the same backend path
- request review / approve / reject / convert works
- contact PII and intake lineage are admin-scoped

### 2. One Additional Tenant Shape Works

- at least one additional real tenant/source shape succeeds
- no one-off alias surgery is required
- mapping review / confirm / lock exists for source trust

### 3. Show Flow Is Rehearsal-Ready

- stage setup is usable
- add/remove/reorder works
- risk visibility is understandable
- lineup editing is stable on mobile/tablet

### 4. Live Console Is Rehearsal-Ready

- current / next / upcoming are clear
- start / advance / pause flow works
- refresh / reconnect recovery works
- stage execution roles behave correctly
- console does not feel like a fragile demo lane

### 5. Cross-Surface Readiness Is Coherent

- participant and performance profiles reflect the same policy truth
- lineup status language does not falsely imply readiness that is not supported by requirements/readiness truth
- approved intro behavior remains consistent through console playback

### 6. Phase 1 Operator Rehearsal Passes

The following path must be workable as one continuous operator story:
- access
- requirements
- participant / performance profiles
- show flow
- live console

## NO-GO Conditions

Do not pivot primary effort to broad onboarding if any of the following remain true:

- Show Flow and Live Console still feel redundant or structurally confused
- lineup “ready” language conflicts with actual readiness truth
- console recovery or stage-calling flow is fragile
- mobile operator flow is still dense or error-prone in rehearsal-critical screens
- mapping review / confirm / lock does not exist yet
- onboarding would require engineering supervision for each tenant source shape

## How To Use This Rubric

When a validation batch finishes:

1. mark each criterion as:
   - `pass`
   - `pass with caution`
   - `fail`
2. if any mandatory area is `fail`, the decision is `NO-GO`
3. if only caution items remain, onboarding can begin in a controlled way while hardening continues in parallel

## Current Provisional Stance

As of 2026-03-25:
- intake is materially strong
- `Show Flow + Live Console` validation has returned strong
- broader onboarding should no longer be blocked on intake or execution-spine uncertainty alone

## Strategy Shift After Rehearsal Validation

Now that intake and the rehearsal spine both validate, the product should shift from pure stabilization to controlled tenant velocity.

### What This Means

- stop treating intake hardening as the primary narrative
- treat mapping review / confirm / lock as the last major intake trust gate before broader source variability
- shift product attention toward onboarding automation and first-tenant repeatability
- preserve a smaller parallel lane for execution/readiness hardening instead of reopening broad architecture churn

### Resource Guidance

Recommended allocation for the next batch:
- `~70%` onboarding automation, source trust, and tenant enablement
- `~30%` readiness/workflow hardening and targeted dashboard/operator polish

### Product Narrative Guidance

The roadmap should now emphasize three claims:

1. `Tenant Velocity`
- how fast a new customer can connect a source and reach first trusted sync

2. `Operational Resilience`
- refresh recovery
- live pointer recovery
- protected live window
- role-safe execution

3. `Readiness Insights`
- move beyond tools alone
- explain participant/performance prep risk, blocked work, and unresolved readiness
- keep operator workflows intact underneath
- treat execution pace as a later or secondary signal, not the first story

So the current product stance is:
- `begin controlled onboarding preparation`
- complete mapping review / confirm / lock as the final intake trust gate
- treat the first additional tenant as the proving ground for repeatability, not as a bespoke support exercise
