# Device-Fit Surface Matrix

## Purpose
This matrix defines which InOutHub surfaces should be mobile-first, tablet-enhanced, or desktop-first. The goal is to keep phone usage focused on live operations while reserving dense setup, audit, and configuration work for larger screens.

This is not permission to break core workflows on mobile. Critical event operations must remain usable on phone. The split is about how much detail and tooling should be exposed by default on each device class.

## Device Roles

### Mobile
Best for fast execution, one-handed review, and live-event operations.

Use mobile for:
- checking what needs attention now
- taking quick participant or performance actions
- running lineup and console workflows
- performing light triage on requests and imports

Avoid exposing on phone by default:
- heavy configuration
- deep mapping editors
- audit-heavy history
- bulk administration

### Tablet
Best for event-floor admin work that needs more context without becoming desktop-dense.

Use tablet for:
- moderate-density review and reconciliation
- mapping review and source management
- richer requirement and access administration
- side-by-side operational context where useful

### Desktop
Best for setup, audit, policy, bulk work, and advanced admin tooling.

Use desktop for:
- configuration-heavy workflows
- bulk review and editing
- export and writeback setup
- audit/history deep dives
- future advanced insights and reconciliation

## Surface Matrix

### Auth & Workspace Selection
- Login: mobile-first
- Auth complete: mobile-first
- Workspace selection: mobile-first
- Org/event creation modals: tablet-enhanced, desktop-first for fuller management
- Org/event access management: tablet-enhanced, desktop-first

### Dashboard
- Device fit: mobile-first
- Mobile job: see readiness, open the next workspace quickly
- Tablet enhancement: richer side-by-side insight blocks
- Desktop enhancement: broader readiness panel density and future insight drilldowns

### Participants
- Participant list: mobile-first
- Participant profile: mobile-first
- Mobile job: resolve blockers, contact guardian, upload/check documents, review readiness
- Tablet enhancement: more visible requirement context and assignment context
- Desktop enhancement: broader history, reconciliation, and bulk follow-up support

### Performances
- Performance list: mobile-first
- Performance profile: mobile-first
- Mobile job: review prep state, cast, media, timing, and launch readiness
- Tablet enhancement: more context visible at once for prep coordination
- Desktop enhancement: richer prep analysis, intro/media review, and future bulk workflows

### Show Flow
- Device fit: mobile-first
- Mobile job: adjust running order and keep the queue clean
- Tablet enhancement: more stage and queue context visible at once
- Desktop enhancement: expanded planning density, but not required for core use

### Stage Console
- Device fit: mobile-first
- Mobile job: operate the show under pressure
- Tablet enhancement: more peripheral signals and wider current/next context
- Desktop enhancement: useful for oversight, but should not become the primary execution assumption

### Admin Landing
- Device fit: mobile-first as a launcher only
- Mobile job: navigate to the right admin workflow
- Tablet enhancement: small summary context is acceptable
- Desktop enhancement: broader admin overview if needed

### Performance Requests
- Device fit: mobile-first for triage, tablet-enhanced for denser review
- Mobile job: review, contact, reject, approve/create safely
- Tablet enhancement: more request context, easier comparison, denser review throughput
- Desktop enhancement: future bulk review, richer audit, and wider side-by-side context

### Import Data
- Device fit: mobile-capable but tablet/desktop-weighted
- Mobile job: confirm source state, trigger sync, review the next required action, inspect minimal recent history
- Tablet enhancement: mapping review, richer source management, better troubleshooting context
- Desktop enhancement: advanced mapping, calculations, export/writeback setup, historical audit, and future source interpretation tooling

### Requirements
- Device fit: tablet-enhanced, desktop-first for authoring
- Mobile job: light review only
- Tablet enhancement: edit and inspect policy with enough space to stay readable
- Desktop enhancement: full authoring and cleanup

### Access
- Device fit: tablet-enhanced, desktop-first for heavier management
- Mobile job: quick review or one-off correction
- Tablet enhancement: routine event-floor access management
- Desktop enhancement: org-scale role administration and audit

## Product Rules

### 1. Mobile keeps execution
The following must remain usable on mobile:
- workspace selection
- dashboard
- participants and participant profiles
- performances and performance profiles
- show flow
- stage console
- performance request triage
- light import status and sync actions

### 2. Tablet expands operational admin
Tablet is the preferred bridge device for:
- intake mapping review
- source management
- requirement editing
- access management
- denser performance request review

### 3. Desktop owns heavy admin
Desktop should carry:
- advanced import mapping
- future formulas and event-level calculations
- export and source writeback setup
- audit/history deep dives
- bulk tools
- org-scale policy and role management

### 4. Hide density, not capability
If a workflow is needed on phone in an emergency, it must still be reachable. The device-fit split should mostly change:
- default disclosure
- density
- secondary tooling visibility

Do not create hard platform lockouts unless the workflow is genuinely unusable or unsafe on mobile.

## Near-Term Application
This matrix implies a practical pivot sequence:

1. Keep the current mobile operator shell intact.
2. Continue compacting dense mobile surfaces so phone remains calm and usable.
3. Introduce breakpoint-based expansion for admin-heavy screens:
   - Import Data
   - Performance Requests
   - Requirements
   - Access
4. Keep advanced source interpretation, export, writeback, formulas, and audit tooling off the phone-default experience.

## Delivery Standard
Every new screen or major refactor should be labeled internally as one of:
- mobile-first
- tablet-enhanced
- desktop-first admin

If no label is chosen, default to mobile-first operator usage.
