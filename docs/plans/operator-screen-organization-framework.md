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
