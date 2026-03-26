# Intake Mapping Review And Lock

Date: 2026-03-25

## Purpose

Define the next intake hardening batch that sits between raw source connection and trusted repeat sync.

This plan exists because the current intake backbone is now functional, but still too inference-heavy for broad new-tenant onboarding. Operators need a lightweight confirmation step that shows what the system understood, what it actually plans to use, and what remains ambiguous before that understanding is trusted and reused.

This is the bridge between:
- brittle template-only import
- and opaque “the system guessed your spreadsheet” import

## Product Problem

The current importer can now:
- detect likely intake target
- infer useful source columns
- block clearly invalid imports
- preserve extra columns in raw payload
- sync through one backend-led path for Google Sheets and spreadsheet uploads

What it still does not do well enough:
- explain its understanding before trust is granted
- persist operator-approved mapping decisions cleanly
- distinguish first-time exploratory import from trusted repeat import
- surface source drift when headers or structure materially change later

That means the system works for tested sources, but it is not yet trustworthy enough for broad tenant variability without engineering support.

## Goal

Add a mobile-first `Review Mapping` step that:
- profiles the source using the backend
- shows what the importer understood
- highlights gaps, warnings, and drift
- lets an operator confirm and lock the mapping
- makes later syncs faster and safer unless the source changes materially

## Non-Goals

This batch should not:
- add a full spreadsheet editor
- ask operators to manually map every column by default
- move the actual import execution back into the browser
- create a separate intake engine for uploads vs Google Sheets
- introduce destructive rollback flows
- hardcode one tenant's business vocabulary into the shared intake schema
- turn intake into a payment, membership, or billing product

## Multi-Tenant Product Rules

The intake model must remain multi-tenant.

That means:
- preserve imported source attributes generically, even when one tenant uses labels like `member` / `non-member`
- store tenant-specific meaning in source or event configuration, not in shared core fields
- support lightweight event-level calculations or reconciliation outputs without making them part of the core domain

Examples that should stay configuration-driven instead of schema-driven:
- member vs non-member
- solo vs duo vs group
- internal vs external
- premium vs standard

The reusable platform capability is:
- preserve source fields
- let operators interpret them for the current event
- optionally calculate derived values from them

Not:
- encode one tenant's pricing or membership model into product truth

## Preserve, Enrich, Return

Imported data should not get trapped inside InOutHub.

The generic pattern is:
1. Preserve
- keep source linkage
- keep raw imported attributes
- keep the approved mapping contract

2. Enrich
- allow operators to add operational meaning such as:
  - mapped classification
  - participant count
  - expected fee
  - reconciliation notes
  - created performance linkage

3. Return
- support export first
- support source writeback later
- let admins take enriched operational data back into their broader workflow

## Device-Fit Rule

The intake workspace should remain device-fit:
- phone/mobile: review, approve, create, sync checks, quick operational actions
- tablet/desktop: advanced mapping adjustment, formulas, reconciliation, export, and later writeback configuration

Do not force dense admin configuration work into the mobile surface by default.

## Operator Outcomes

After this batch, an operator should be able to answer:
- what kind of source is this?
- what fields will be used?
- what fields will be ignored?
- what is ambiguous or blocked?
- is this source now trusted for repeat sync?

## When The Mapping Review Step Appears

The `Review Mapping` step should appear when any of the following are true:

1. New Source
- the source has no saved locked mapping

2. Material Source Drift
- source headers changed since last confirmation
- source target inference changed
- previously locked fields can no longer be resolved

3. Low Or Medium Confidence Inference
- the backend reports confidence below the trusted threshold

4. Blocking Issues
- target mismatch
- title/name detection failed
- row count exceeds interactive limits

5. Duplicate / Warning Conditions Worth Operator Visibility
- duplicate source identities collapsed
- important fields inferred from fallback logic

The review step should not appear for every normal sync once a source is locked and the source shape remains materially unchanged.

## Source States

Each source should be in one of these states:

1. `inferred`
- system has a proposed understanding
- operator has not yet confirmed it

2. `locked`
- operator confirmed the mapping/profile
- safe for routine repeat sync unless drift is detected

3. `drifted`
- source was previously locked
- current profile no longer matches the last trusted profile
- review required before trust is restored

4. `blocked`
- backend detected a condition that makes import unsafe

## Mobile-First Operator Flow

### A. Add / Connect Source

Operator:
- connects Google Sheet or uploads spreadsheet

System:
- sends source data to backend profiling path
- does not immediately trust or finalize the source if review is required

### B. Review Mapping

Screen should show five sections only:

1. Detected Target
- `Participants` or `Performance Requests`
- confidence
- short explanation if target is ambiguous

2. Fields We Will Use
- request title / participant name
- requestor/contact
- duration
- date
- notes
- performance type/category
- source identity

3. Fields Preserved But Not Used
- compact count and expandable list
- these stay in `raw_payload`

4. Warnings
- duplicate identity collapse
- fallback-derived mappings
- missing recommended fields
- source drift vs last confirmed profile

5. Decision Bar
- `Confirm & Sync`
- `Save Mapping Only`
- `Cancel`

Advanced option:
- `Adjust Mapping`

### C. Routine Sync For Locked Source

If source is locked and no drift is detected:
- tapping `Sync Source` runs immediately
- no review interruption

### D. Drifted Source

If locked source changed materially:
- `Sync Source` routes into `Review Mapping`
- page explains what changed
- operator must reconfirm before trust is restored

## Mobile UI Guardrails

The mapping review UI must:
- fit comfortably on phone screens
- avoid giant tables
- use disclosure/accordion patterns
- show one primary action row at the bottom
- keep critical warnings above the fold
- preserve brand typography, color, and touch targets

Do not build:
- spreadsheet-like grids
- dense column-by-column editing as the default path
- multi-panel desktop-only layouts

## Data We Should Persist Per Source

We already have a partial shape in `event_sources.config`:
- `inferredMapping`
- `mappingGaps`
- `detectedHeaders`
- `mappingMode`
- `mappingUpdatedAt`

We should extend the source config with:

- `lockedMapping`
- `lockedTarget`
- `profileHash`
- `lockedProfileHash`
- `mappingWarnings`
- `lastConfirmedAt`
- `lastConfirmedBy`
- `reviewRequired`
- `driftSummary`

### Meaning

- `inferredMapping`: latest backend suggestion
- `lockedMapping`: operator-approved mapping contract
- `profileHash`: hash of current source profile
- `lockedProfileHash`: hash at time of operator confirmation
- `reviewRequired`: whether the source must go through review before trust
- `driftSummary`: compact explanation of what changed

## Backend Contract

The backend Edge Function should be the source of truth.

It should expose two explicit modes:

1. `profile_only`
- inspect source
- return target, mapping, confidence, warnings, drift summary, and preview
- do not write imported entities

2. `confirm_and_sync`
- accepts locked mapping / confirmation context
- writes import run and imported entities
- persists updated source config

This should still run through the same `import-participants` function or a direct successor. Do not split Google Sheet and upload profiling into separate logic stacks again.

## Required Backend Response Shape

The profile response should include:

- `probableTarget`
- `confidence`
- `mapping`
- `gaps`
- `warnings`
- `blockingIssues`
- `detectedHeaders`
- `usedFields`
- `preservedFieldCount`
- `previewRows`
- `profileHash`
- `reviewRequired`
- `driftSummary`

## Locking Rules

Operator confirmation should lock:
- target
- key mappings
- source identity basis

Operator confirmation should not lock:
- every optional field forever
- raw header order
- incidental extra columns

We care about material trust, not brittle exact-match source schemas.

## Drift Detection Rules

Trigger drift when:
- previously locked required field is missing
- probable target changed
- source identity basis changed
- title/name/contact fields can no longer be resolved
- important field now resolves only through weaker fallback logic

Do not trigger drift for:
- harmless extra columns
- column order changes
- width-heavy but still compatible form exports

## Suggested Delivery Sequence

### Batch 1: Profile Contract
- formalize backend `profile_only` response
- add `profileHash`, `reviewRequired`, and `driftSummary`
- persist richer source config

### Batch 2: Review UI
- build mobile-first review screen
- show detected target, used fields, ignored fields, warnings, and decision bar

### Batch 3: Lock And Repeat Sync
- save locked mapping
- allow direct sync for trusted sources
- reroute drifted sources back through review

### Batch 4: Adjust Mapping
- allow explicit operator correction when inference is wrong
- keep this behind progressive disclosure

## Acceptance Criteria

The batch is complete when:

1. A new Google Sheet source can be profiled without immediate blind trust.
2. A new spreadsheet upload can be profiled through the same backend contract.
3. The operator can see what fields will be used and what will be ignored.
4. The operator can confirm and lock the source.
5. A routine sync for the same unchanged source skips review.
6. A materially changed source is flagged as drifted and requires review again.
7. The UI remains usable on mobile.
8. The operator never has to map every source column manually just to proceed.

## Roadmap Placement

This should be the next product hardening batch before broader new-tenant onboarding.

Reason:
- we now have a working intake backbone
- we do not yet have a sufficiently trustworthy intake-confirmation loop for wide tenant variability

This batch is the point where intake shifts from “works with engineering support” toward “safe to scale across more customer source shapes.”
