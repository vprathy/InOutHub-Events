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
- intake looks close to `GO`
- broader onboarding is still provisional until `Show Flow + Live Console` validation returns

So the current product stance is:
- `pause broad onboarding decision`
- finish execution-spine validation first
