# Readiness Insights Layer

Date: 2026-03-25

## Purpose

Define the first insight layer for InOutHub in a way that stays faithful to the product's real value:
- reduce participant and performance prep risk before show day
- make the next operational follow-up obvious
- help admins understand where readiness is slipping without turning the app into a generic BI tool

This plan exists because the roadmap now calls for an `insight-led` command surface, but the insight story must remain anchored to readiness and execution risk, not abstract owner analytics.

## Product Thesis

InOutHub should answer:
- what is not ready yet?
- what is most likely to create downstream show risk?
- what should the operator open next?

Not:
- generic KPI dashboards disconnected from work
- decorative trend charts with no operational action

## Guardrails

- Keep the insight layer readiness-first.
- Insights must map to an operator action or admin follow-up.
- Use deterministic inputs before speculative AI summaries.
- Do not bury the underlying workspaces.
- Execution pace can exist, but it is secondary to prep/readiness for the initial insight layer.

## Primary Users

### 1. Event Admin / Org Admin

Needs:
- identify where prep is blocked
- identify which teams or performances need follow-up
- see whether the event is moving toward readiness or away from it

### 2. Operator / Event Ops

Needs:
- know what to open next
- know which unresolved issues are most likely to hurt the show
- avoid scanning multiple screens just to find the biggest risk

## Non-Goals

This batch should not:
- add a generic analytics suite
- create executive reporting detached from event operations
- introduce heavy charting as the primary value
- attempt AI prediction before deterministic readiness truth is clean

## First Insight Set

### 1. Blocked Performances

Question answered:
- which performances cannot be treated as ready because required prep is unresolved?

Data signals:
- performance readiness state
- missing blocking requirement assignments
- missing roster follow-up after request conversion
- missing required media / intro / music work

Action:
- open blocked performance profile or prep lane

### 2. Missing Participant Follow-Up

Question answered:
- which participant-side issues still need action before the show?

Data signals:
- missing documents / approvals
- guardian/contact gaps where relevant
- unresolved participant-side readiness assignments
- unresolved participant special-request consequences

Action:
- open participant profile or participant requirements lane

### 3. Intro / Media Not Ready

Question answered:
- which performances still have unresolved intro/media prep?

Data signals:
- no approved intro when one is expected
- no music file where one is expected
- media assets still pending review or missing

Action:
- open performance media tab or intro builder

### 4. Contact / Special-Request Risk

Question answered:
- which teams have unresolved contact, coordination, or special-request risk?

Data signals:
- missing primary contact data
- imported special requests not resolved into operational follow-up
- unresolved coordination notes or intake-derived flags

Action:
- open request/performance detail or participant detail depending on where the gap lives

### 5. Readiness Risk Rollup

Question answered:
- is this event moving toward readiness or accumulating risk?

Data signals:
- blocked performance count
- at-risk performance count
- unresolved participant follow-up count
- unresolved media/intro count
- unresolved contact/special-request count

Action:
- open the highest-risk lane first

## Secondary / Later Insight Set

These are valuable, but should come after the readiness-first layer:

- execution pace variance
- rehearsal drift
- stage-by-stage timing variance
- historical trend comparisons across venues/events

These belong more to rehearsal/show-day optimization and org-owner review than to the first readiness command surface.

## Screen Placement

### Dashboard

The Dashboard should become the primary home of readiness insights.

Order:
1. readiness snapshot
2. one or two highest-priority risk cards
3. direct path into the affected workspace

### Performance Profile

Should surface:
- why this performance is blocked or at risk
- what imported intake signals matter
- the next prep action

### Participant Profile

Should surface:
- what follow-up is still owed
- what special-request or document issue is unresolved
- whether the issue is participant-specific or inherited from broader readiness work

## Insight Rules

### Good Insight

A good insight:
- is explainable
- uses known system truth
- has a clear action
- helps the user avoid a real problem

Example:
- `3 performances are blocked because roster follow-up is still missing.`

### Bad Insight

A bad insight:
- is vague
- has no attached action
- duplicates what the user already sees elsewhere
- implies certainty where the system only has weak signals

Example:
- `Your event readiness score is 72.`

## Suggested Technical Approach

### Batch 1: Insight Definitions

- define exact inputs for each readiness insight
- define thresholds and status language
- map each insight to a destination workspace/action

### Batch 2: Dashboard Readiness Surface

- add a compact readiness-insight section to Dashboard
- keep it MECE with existing response cards and metrics

### Batch 3: Profile Deep Links

- ensure each insight opens to the right performance or participant context
- preserve mobile-first clarity

### Batch 4: Owner/Admin Rollups

- add event-level or org-level rollups once the event-level signals are trustworthy

## Acceptance Criteria

- Dashboard can explain the top readiness risks without forcing the operator to hunt across multiple workspaces
- each insight has a clear action path
- no insight is purely decorative
- the first insight layer remains prep/readiness focused
- execution pace remains secondary until show-day optimization becomes the active objective

## Roadmap Placement

This should come:
1. after mapping review / confirm / lock is proven on an additional tenant shape
2. in parallel with onboarding automation and post-approval readiness convergence
3. before any broader attempt at org-owner analytics or trend-heavy reporting
