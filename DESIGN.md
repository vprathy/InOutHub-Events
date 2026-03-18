# InOutHub Events Design System

## 1. Product Design Intent

InOutHub Events is a live-event command surface, not a generic admin dashboard.

The product should feel:
- calm under pressure
- high-contrast in low-light venues
- operational, not decorative
- premium but not precious
- phone-first and scan-friendly
- like backstage command software for real event operators, not office software for passive review

Simplification must come from hierarchy, progressive disclosure, and clearer action priority. It must not come from flattening the brand or draining the product of its command-center character.

## 2. Final North Star

**Premium dark command center outside, calm task clarity inside.**

This is the governing design principle for the product.

- The outside of the product can feel atmospheric, premium, and operational.
- The inside of each workflow must feel clear, direct, and easy to scan.
- Brand presence should frame the work, not compete with it.
- The app should feel like a backstage command desk: composed, confident, and ready for live use.

When a design decision is unclear, prefer the option that reduces cognitive load while preserving the existing InOutHub atmosphere.

## 3. Surface Roles

Every screen should clearly behave like one primary surface type.

### Overview Surface

**Purpose**
- help the operator decide where attention goes next

**Should show**
- top priorities
- event pulse
- next-work navigation

**Should hide or demote**
- deep editing controls
- overly detailed metrics
- duplicated status summaries

### List / Triage Surface

**Purpose**
- help the operator scan, compare, and choose what to open

**Should show**
- one title
- one state
- one reason
- one primary action or tap target

**Should hide or demote**
- secondary actions
- dense counters
- edit controls
- detailed operational panels

### Workspace Surface

**Purpose**
- help the operator perform focused coordination work on one object

**Should show**
- one status row
- one summary sentence
- one action cluster
- grouped detail that supports the current task

**Should hide or demote**
- duplicate page summary content
- secondary tools that are unrelated to the current task
- unnecessary list-style metrics

### Live Execution Surface

**Purpose**
- help the operator run the event in real time

**Should show**
- current state
- next state
- the safest next action
- high-contrast live information

**Should hide or demote**
- planning clutter
- setup/admin controls
- secondary details that slow down live execution

## 4. Global Mobile UI Grammar

The app should assume phone use first. Tablet refinement can follow, but the base interaction model must work cleanly on a handheld device.

### 4.1 App Shell Rules

- The shell should provide orientation, not duplicate page content.
- The top shell should stay compact.
- The middle surface should carry the task flow.
- Bottom navigation, when present, should stay stable and predictable.
- Context should remain visible enough that the operator always knows which org and event they are operating.
- The shell should feel like a live venue frame around the work, not a generic app chrome wrapper.

### 4.2 Top-of-Screen Structure

Use this order whenever possible:

1. `Context`
2. `Status`
3. `Primary action`
4. `Find / switch / tabs`
5. `Content`

Rules for this structure:
- each layer does one job only
- no duplication across layers
- top shell gives orientation, not page-content repetition
- content should begin as high on the screen as possible once orientation is established

### 4.3 Progressive Disclosure Rules

- Progressive disclosure should be the default.
- Collapsed card = triage.
- Expanded card = minimal intent confirmation.
- Detail screen = execution.
- If the deeper screen already handles the work well, keep the list surface lighter.
- Inline expansion is allowed when it stays minimal and does not recreate the dense detail screen.

### 4.4 Interaction Redundancy Rules

- If tapping a card and pressing a button do the same thing, the button is usually redundant.
- Default list interaction should favor one clear primary tap path.
- Secondary actions should appear only after intent, or move into the detail screen.
- Repeated navigation labels and duplicate CTAs should be removed.

### 4.5 Pills / Chips Restrictions

In any one screen region, pills and chips may serve only one role:
- filters
- lightweight status
- tags

Do not use pills simultaneously for status, counters, labels, and actions in the same cluster.

Rules:
- keep pill clusters narrow in purpose
- avoid mixing semantic status with navigation and count overload
- if a pill row is doing more than one job, split or simplify it

### 4.6 Edge-to-Edge Control Restrictions

- Full-width actions should be rare.
- They are acceptable when a screen has one dominant action that truly deserves the width.
- They should be avoided on list and triage surfaces.
- On mobile, compact or icon-led actions are often more appropriate than edge-to-edge controls once the user is already inside a workspace.

### 4.7 Mobile Interaction Baseline

- Minimum touch target: `44px`
- Primary actions should be easy to reach with one thumb
- Search, filters, and tabs should not consume more vertical space than the task itself
- Avoid pushing the actual working list below the fold with summary chrome

## 5. Brand / Atmosphere Guardrails

The current InOutHub identity should be preserved.

### Must preserve

- dark premium shell
- bright accent-driven hierarchy
- backstage / production atmosphere
- rounded touch-friendly controls
- crisp typography
- layered surfaces with restraint
- a sense of live-event seriousness without feeling cold or militarized
- visual confidence that reads well in rehearsal rooms, backstage corridors, and low-light stage environments

### Must avoid

- flattening the product into generic SaaS styling
- turning every screen into a sterile utility panel
- replacing the command-center mood with soft, generic dashboard language
- using simplification as an excuse to remove brand distinction
- over-romanticizing the stage aesthetic until it interferes with speed, legibility, or operator trust

The goal is not less character. The goal is better control of where character lives.

## 6. Visual System Rules

This section is semantic on purpose. It should guide the product language without turning into a token sheet.

### 6.1 Color Roles

Use color by role, not by decoration.

- **Command background**
  - anchors the product in a dark backstage operational environment
- **Surface**
  - holds cards, panels, grouped work areas, and command surfaces
- **Muted support**
  - supports nested regions and helper information
- **Primary accent**
  - identifies the main action, active path, or strongest emphasis with unmistakable InOutHub energy
- **Success**
  - signals ready, cleared, recovered, aligned
- **Attention**
  - signals incomplete, pending, at risk
- **Critical**
  - signals intervention required
- **Neutral text**
  - carries the main reading load
- **Secondary text**
  - supports context without competing

Rules:
- use accent color for priority, not everywhere
- use semantic colors for health and status only
- avoid too many strong status colors in one immediate viewport

### 6.2 Typography Hierarchy

Typography should feel direct, crisp, and operational.
Typography should feel like live production signage translated into a polished digital product.

- screen titles should establish the task immediately
- card titles should be bold and scannable
- section labels should be compact and supportive, not decorative
- body copy should stay plain and readable
- micro labels should only exist when they improve scanning

Copy should favor operator language over internal system language.

### 6.3 Shape / Geometry

- cards should feel generously rounded
- controls should feel touch-friendly
- filter controls may be pill-like when they serve one clear job
- geometry should feel intentional and modern, not soft for its own sake
- shapes should feel confident and stage-adjacent, not playful and not corporate-blunt

Use shape to support scanning and touch confidence, not to add noise.

### 6.4 Density Target

Target density:
- compact enough for operators
- breathable enough to scan on a phone

Density should increase only where the workflow truly requires it. Default surfaces should not feel like dashboards unless they are explicitly live execution surfaces.

### 6.5 Depth / Elevation

Depth should communicate hierarchy.

- use soft layering to separate major surfaces
- use subtle emphasis for active or important regions
- avoid making every card glow, tint, and shadow at the same time
- elevation is for structure, not decoration
- lighting cues should feel like restrained stage ambience, not glossy marketing effects

## 7. Component Guidelines

### 7.1 Buttons

Buttons must express priority clearly.

- one primary action per local region whenever possible
- secondary actions should be visually quieter
- tertiary actions should not compete with the main job

Rules:
- avoid multiple equal-weight buttons side by side on mobile
- do not use large buttons for actions that can be compact icons
- if a card tap already navigates, do not keep a duplicate navigation button by default

### 7.2 Cards

Cards must not become mini dashboards.

For list cards, preserve this rule:
- one title
- one state
- one reason
- one action or tap target

If a card needs more:
- reveal lightly after intent
- or move the detail into the workspace

### 7.3 Expanded Cards

Expanded cards are allowed when they stay small and useful.

Expanded cards should:
- confirm intent
- expose a little more context
- provide one clear next action

Expanded cards should not:
- recreate the full detail screen
- turn into stacked diagnostic panels
- reintroduce the clutter simplification was meant to remove

### 7.4 Inputs / Forms

Forms should feel deliberate and easy to complete on a phone.

- labels should be clear
- fields should have strong contrast
- sections should be grouped by task
- long forms should be chunked into meaningful groups
- helper copy should reduce hesitation, not add explanation burden

### 7.5 Tabs

Tabs should represent distinct jobs, not arbitrary content buckets.

Good tabs are:
- short
- concrete
- user-facing

Tabs should not:
- repeat content already summarized above
- become a dumping ground for miscellaneous sections

## 8. Product-Specific Screen Rules

These are product-facing standards for what good looks like on each major surface.

### Dashboard / Control Panel

- should emphasize top priorities first
- should guide the operator to the next work surface
- should demote secondary metrics
- should not feel like a wall of status cards
- should feel like a calm pre-show control readout, not an analytics homepage

### Roster / Participants

- should make placement and follow-up obvious
- default participant cards should stay scan-friendly
- assignment, clearance, and safety gaps should be understandable quickly
- detailed follow-up belongs in expansion or detail view, not all at once on the card face
- should feel like active floor coordination, not record administration

### Performances / Acts List

- should feel like a triage surface
- default act cards should stay short, scannable, and calm
- one overall state plus one reason is enough for the list surface
- deeper coordination belongs after intent, not on the collapsed card
- should feel like a running order scan for a producer or stage lead, not a mini workspace grid

### Act Detail Screen

- should behave like a coordination workspace
- should emphasize current state, summary, and work areas
- should reduce header clutter and repeated metrics over time
- secondary actions should be grouped, not scattered
- should feel like the backstage coordination table for one act

### Show Flow

- the lineup should be the hero
- supporting metrics should stay compact
- reordering and flow confidence should matter more than decorative summary panels
- should feel like cue-stack management, not spreadsheet scheduling

### Stage Console

- should prioritize current act, next act, and safe execution controls
- should tolerate high signal density better than other screens
- should still avoid non-live clutter
- should feel like the live show-running surface at the heart of the product

## 9. Status Language Rules

Status language should be understandable at a glance.

### Preferred list-facing labels

- Needs Attention
- At Risk
- On Track
- Stage Ready
- Needs Placement
- Cleared
- Approvals Pending

### Rules

- broad, friendly labels belong on list surfaces
- specific detail belongs in the reason line
- internal or system language should be hidden unless truly necessary

### Avoid when user-facing and unnecessary

- Blocked
- Workspace
- staged
- normalized
- mapped

Use simpler operator-facing wording unless the more technical term is necessary for correctness.

## 10. Simplification Heuristics

Use this checklist before shipping UI changes:

- can the user scan this on a phone in 3 seconds?
- are we exposing an action too early?
- is this card becoming a mini workspace?
- are we making the user parse too many statuses at once?
- could this detail move one step deeper?
- does this surface still know what job it is doing?
- are multiple layers repeating the same information?

If the answer suggests confusion, simplify.

## 11. Use With AI-Assisted UI Work

This document is the design rulebook for future UI refinement, including AI-assisted design and implementation loops.

When using design-generation or implementation agents such as Stitch-loop:
- treat this file as the semantic source of truth
- preserve the product identity and surface roles defined here
- prefer prompts and screen work that reinforce hierarchy, disclosure, and operator clarity
- do not convert this file into a token sheet or one-off prompt fragment
- preserve the specific InOutHub mood: premium backstage command, high-contrast live-event clarity, restrained depth, and non-generic operator language

This document should help both humans and agents make the same design decisions for the same reasons.
