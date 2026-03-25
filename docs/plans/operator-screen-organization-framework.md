# Operator Screen Organization Framework

## Purpose
This framework defines how InOutHub screens should organize information, actions, updates, status, and metrics for live-event operators. It exists to prevent database-shaped UI, nested navigation, and repeated status storytelling across the app.

The goal is not visual uniformity for its own sake. The goal is operational clarity under pressure.

## Source Guardrails
- `AGENTS.md`: live-event reliability, mobile-first, high-contrast, no speculative scope
- `.agents/skills/mobile-tablet-ux/SKILL.md`: 44px targets, thumb-zone, progressive disclosure, tablet dashboard mode
- `.agents/skills/product-north-star/SKILL.md`: Act-centered workflow, operator clarity over feature breadth

## Core Principles

### 1. One Screen, One Job
Each screen should answer one operator question:
- Dashboard: what needs attention now?
- Participants: who needs follow-up?
- Performances: which acts need prep?
- Show Flow: what is the running order?
- Console: what is live now?
- Profile pages: what needs action for this specific record?

If a screen starts answering multiple different questions, split the concerns or demote secondary information.

### 2. No Navigation Inside Navigation
Top-level tabs are the only primary router inside a screen.

Do not stack:
- header strip acting like navigation
- summary card acting like navigation
- tab bar acting like navigation
- first card inside the tab acting like navigation

The correct pattern is:
1. page header
2. optional compact snapshot
3. one tab bar
4. direct content

### 3. Status Is Not Action
Status tells the operator what is true.
Action tells the operator what to do next.

These should not be mixed into the same repeated badges everywhere.

Use:
- metrics for stable counts or state summaries
- one response card for the next action
- workspace sections for actual work

### 4. MECE Screen Structure
Each screen should divide into mutually exclusive, collectively exhaustive zones:

#### A. Identity
What record is this?
- title
- subtitle
- current state badge

#### B. Snapshot
What is the current state at a glance?
- 2-4 metric cards max
- counts, readiness state, progress

#### C. Next Action
What is the single most important thing to do now?
- one response card
- one primary action

#### D. Work Lane
Where does the operator do the work?
- editable details
- task lists
- uploads
- notes
- assignment actions

#### E. History / Traceability
What changed and where did it come from?
- source metadata
- audit trail
- hidden behind a secondary action unless the screen is explicitly about history

### 5. Metrics vs Updates vs History
These are different information classes and should not be mixed.

#### Metrics
Durable counts or progress:
- approved assets
- open issues
- assigned performances
- next practice scheduled

#### Updates
New information or active follow-up:
- coordination notes
- unresolved issues
- rejected uploads
- special request review

#### History
Administrative traceability:
- source system
- sync anchor
- audit log

Metrics belong near the top.
Updates belong in the active work lane.
History belongs behind secondary disclosure.

### 6. Progressive Disclosure Rules
- Lists stay compact.
- Detail screens hold the work.
- History and raw metadata stay out of the main operator lane.
- “Advanced” and “Record History” are valid escape hatches.
- Avoid exposing raw schema concepts unless they map to real operator jobs.

### 7. Action Hierarchy
Every screen should have at most:
- one primary action
- one or two secondary actions
- overflow for tertiary/admin actions

If a screen needs more than that on first view, the structure is too dense.

### 8. Mobile / Tablet Layout Rules
- minimum 44px touch targets
- primary actions should sit low or be easy to reach on mobile
- dense metadata should never crowd the thumb path
- tablet layouts may widen into two columns, but must still preserve one dominant reading order

### 9. Labeling Rules
Use task language, not database language.

Prefer:
- `Profile`, `Documents`, `Prep`, `Cast`, `Media`

Avoid:
- `Overview`
- `Assets` when the real job is documents/compliance
- `Activity` for audit feeds
- labels that require the operator to understand the underlying data model

### 10. Reuse the Dashboard Language
Across the app:
- snapshot metrics should use the dashboard metric-card pattern
- next-action states should use the dashboard response-card pattern
- empty states should use the dashboard empty-response pattern

This gives the product one readable visual grammar:
- `metrics = what is true`
- `response = what to do`
- `work lane = where to do it`

## Canonical Profile Patterns

### Participant Profile
Purpose: resolve participant-level readiness and coordination.

Recommended order:
1. identity
2. snapshot
3. tabs
4. profile tab
   - next action
   - identity/contact
   - coordination updates
   - assignments
   - supporting links
5. documents tab
   - required documents
   - other files
6. history behind overflow

### Performance Profile
Purpose: clear one performance for launch.

Recommended order:
1. identity
2. snapshot
3. tabs
4. prep tab
   - next launch action
   - readiness metrics
   - prep work
   - issues
   - notes
   - timing
5. cast tab
   - team
   - performers
6. media tab
   - next media action
   - media metrics
   - uploaded files
   - intro builder

## Review Checklist
When auditing a screen, ask:
1. Is there a single dominant job?
2. Are status and action separated?
3. Is there only one navigation layer?
4. Are metrics, updates, and history clearly separated?
5. Is the first visible action obvious?
6. Can a mobile operator use it one-handed without hunting?
7. Is any section duplicating what another section already says?

## Current Application
This framework should govern:
- Dashboard
- Participants
- Performances
- Show Flow
- Stage Console
- Participant Profile
- Performance Profile

It is especially important for detail screens, because that is where drift and clutter accumulate fastest.

## Dashboard Evolution Rule

The dashboard should evolve from a generic tool launcher into an insight-led command surface.

That means:
- the first question should be `what is not ready yet?`
- the second question should be `what should I open next?`

For InOutHub specifically, this should stay anchored to the journey toward show readiness:
- which participants need follow-up?
- which performances are blocked on prep?
- which teams have missing contact, media, or special-request resolution?
- what is most likely to cause a problem before or during the show?

Do not interpret this as license to remove operator tools or bury workflows.

Correct product order:
1. insight
2. next action
3. workspace entry

Wrong product order:
1. giant tool menu
2. decorative counts
3. no explanation of risk or drift

### First Readiness Insight Set

The first insight layer should focus on explainable readiness signals:
- blocked performances
- missing participant follow-up
- intro / media not ready
- unresolved contact or special-request gaps
- readiness risk rollups by event

Execution pace variance can exist, but it should be a later or secondary signal unless the current workflow is explicitly rehearsal- or show-day-focused.

These should be explainable and tied to actions, not just rendered as generic analytics.

### Resilience Must Be Visible

The product should make resilience legible, not just implemented:
- live refresh recovery
- live pointer recovery
- protected live window
- role-safe execution controls

These are not just engineering details. They are part of the product contract and should shape how Dashboard, Show Flow, and Live Console describe their trustworthiness.

## Show Flow vs Live Console Contract

These two screens must both exist, but they must not do the same job.

### Show Flow

Purpose:
- shape the running order
- repair the running order
- manage stage setup before or around live execution

Operator questions:
- what is the running order?
- what should be moved, added, or fixed?
- which stage is this on?
- where are the risk points before we go live?

Allowed emphasis:
- stage selection
- stage setup
- add/remove from lineup
- reorder
- scheduling/risk insight

Guardrail:
- this is the planning and repair workspace, not the live calling workspace

### Live Console

Purpose:
- run the show
- protect the live pointer
- keep the next cue visible

Operator questions:
- what is live now?
- what is next?
- what do I press to keep the show moving?
- are we drifting, paused, or overtime?

Allowed emphasis:
- current / next / upcoming
- start / advance / pause
- live recovery after refresh/reconnect
- approved intro playback visibility

Guardrail:
- this is the execution workspace, not the lineup editing workspace

### Handoff Rule

The handoff between the two screens must stay explicit:
- plan or fix in `Show Flow`
- run in `Live Console`

If both screens start showing the same lineup with only minor button differences, the product has drifted.

## 2026-03-25 Selective Recovery From `codex/mobile-readiness-redesign`

The older `codex/mobile-readiness-redesign` branch should not be merged wholesale back into `main`.
It does, however, contain a few useful operator-first patterns that should stay on the roadmap as selective recovery items.

### Recovery Item 1: Stage Setup Flow In Show Flow

Why it is worth recovering:
- Lineup operators benefit from a fast pre-show stage setup lane instead of assuming stages already exist and are named correctly.
- This reduces setup friction before lineup and console work begin.

Recommended placement:
- Show Flow / Lineup workspace
- admin/operator setup path, not hidden in general settings

Recommended behavior:
- create stage
- rename stage
- show the currently active stage clearly
- keep stage setup lightweight and mobile-safe

Roadmap timing:
- after intake mapping review / lock hardening
- before broader new-tenant onboarding polish

### Recovery Item 2: Deterministic Next-Action Guidance On Profile Screens

Why it is worth recovering:
- Participant and Performance detail screens should proactively surface the next operational step instead of forcing operators to infer it from scattered badges and counts.
- This matches the product's original smart-assistant intent without turning the app into an opaque AI chatbot.

Recommended surfaces:
- Participant Profile
- Performance Profile

Recommended behavior:
- one primary next-action card near the top
- clearer follow-up language for missing guardian/contact/media/readiness gaps
- concise operator wording tied to actual blockers

Guardrail:
- keep guidance deterministic and contract-backed
- do not invent recommendations from vague heuristics

Roadmap timing:
- after intake mapping review / lock hardening
- in parallel with readiness/requirements convergence work

### Recovery Item 3: Team / Media Labeling Cleanup On Performance Screens

Why it is worth recovering:
- The old branch had a clearer distinction between prep tasks, team management, and intro/media work.
- That improves one-handed mobile scanning and reduces database-shaped language.

Recommended behavior:
- clearer labels such as `Prep Tasks`, `Team`, and `Intro & Media`
- media/introduction actions grouped in one operator lane
- remove low-signal duplicate status storytelling

Roadmap timing:
- fold into the next Performance Profile structural cleanup

### Recovery Rule

Treat the old branch as an idea source only.

Do not revive or merge the branch as a single unit.
Any recovery work should be:
- file-by-file
- contract-checked against `database_schema.sql`
- validated against mobile-first operator flow
