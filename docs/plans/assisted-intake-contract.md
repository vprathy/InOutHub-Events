# Assisted Intake Contract

## 1. Purpose and Scope

### Purpose
This contract defines the bounded MVP intake path for approved external team/program submissions so the product can support dual intake without turning roster onboarding into a heavy data-import system.

It translates the repo guardrails in `AGENTS.md` into an implementation-ready contract:
- keep direct participant intake and external team/program submissions separate upstream
- converge them only at the approved act/performance layer
- keep the visible workflow simple and business-oriented
- prefer assisted intake over template-only enforcement
- require operator confirmation before promotion into the live roster
- allow partial progress where safe
- keep intake complexity inside a bounded admin review surface

### Governs
This contract governs:
- the approved external submission to roster intake flow
- the internal participant intake model for imported roster rows
- staging and source provenance requirements
- assisted mapping/review rules
- row and batch promotion rules
- business-facing states and language
- where this flow should appear in the product

### Out of Scope for MVP
This contract does not include:
- changes to the direct participant registration path beyond provenance compatibility
- a public or partner-facing team portal
- chat, messaging, or reminder systems
- generic task/project workflow
- raw intake concepts in Lineup or Stage Console
- a universal ingest engine for arbitrary document structures
- deep readiness/logistics workflow
- broad redesign of current core ops screens

## 2. User-Facing Workflow

Visible Path B workflow must stay small and business-oriented.

The user-facing journey for an approved external team/program submission is:

1. **Approve Program**
   The LT or admin reviews the submitted team/program and approves it for the event.

2. **Add Roster**
   The approved team’s participant roster is added using an upload the customer already has, with a preferred template available as a helper option.

3. **Review Gaps**
   The system highlights only the rows or fields that need attention. The operator reviews flagged gaps, possible matches, and missing essentials.

4. **Continue**
   Clean rows move forward into the live participant roster after operator confirmation, and the approved performance continues through the normal operational flow.

User-facing language should not expose internal pipeline terms such as parsing, staging, normalization, mapping, or promotion.

## 3. Canonical Internal Model

### Goal
The system needs one canonical internal participant intake model for imported roster rows, regardless of what external file shape the customer uploads.

This is an internal target model, not a required customer template.

### Canonical Participant Intake Fields

#### Required for MVP Internal Record
- `event_id`
- `source_system`
- `source_instance`
- `source_anchor_type`
- `source_anchor_value`
- `first_name`
- `last_name`

#### Required for Promotion Into Live Roster
A row is promotable into the live roster when it has:
- event linkage
- submission/upload provenance
- a stable row identifier or source anchor for traceability
- participant name sufficient to create a participant record:
  - `first_name`
  - `last_name`

These fields are the minimum MVP promotion threshold, not the long-term quality standard.

Later org- or event-specific quality rules may still elevate a row to warning or blocked even when the minimum promotable fields are present.

MVP may still allow promotion of warning-state rows when core identity and provenance are intact.

#### Helpful but Non-Blocking
- `guardian_name`
- `guardian_phone`
- `notes`
- `team_name`
- `manager_name`
- `participant_role_label`
- `age_band`
- `email`
- `special_request_raw`
- any original source-side comments or labels

#### Optional Source Metadata to Preserve
- original row number
- original header names
- original raw values by column
- upload filename
- upload timestamp
- uploader identity

### MVP Rule
The internal model is canonical. External uploads are mapped into it through assisted review. MVP does not require customers to conform to one rigid file schema.

## 4. Staging Model

### Staging Purpose
Uploaded roster data must land in a staging layer before any participant records are created in the live roster.

The staging layer exists to:
- preserve source fidelity
- support assisted mapping/review
- protect the live roster from accidental or messy imports
- allow partial progress without losing unresolved work

### What Lands in Staging
Each uploaded roster should create:
- one upload-level staging record
- many row-level staging records

### Upload-Level Metadata
Each uploaded roster should preserve:
- `submission_id`
- `event_id`
- upload filename
- upload timestamp
- uploader user id
- source type
- template version if a preferred template was used
- mapping profile/version if applicable
- overall review summary counts

### Row-Level Metadata
Each staged row should preserve:
- `submission_id`
- upload id
- source row number
- original raw row payload
- mapped canonical values
- row issue summary
- operator decisions and overrides
- provenance fields for eventual participant creation

### Source Provenance
Every row must remain traceable to:
- the external submission
- the specific roster upload
- the specific source row

Recommended provenance pattern:
- `source_system = external_program_roster`
- `source_instance = submission/upload batch identifier`
- `source_anchor_type = uploaded_row`
- `source_anchor_value = stable row key`

### Submission Linkage
Staging rows must always attach to a single approved external submission. A roster upload cannot float independently of submission context in MVP.

### Row Status Before Promotion
Internal row status may exist in staging, but user-facing language should stay business-oriented.

The staging layer should at minimum support these internal review outcomes:
- row ready for promotion
- row needs operator review
- row blocked from promotion
- row already promoted

These are internal review mechanics, not required user-facing labels.

## 5. Assisted Mapping / Review Behavior

### MVP Support Scope
The MVP review flow should support common roster spreadsheet variations, not arbitrary document recovery.

MVP should support:
- CSV upload
- XLSX upload only if it is low-risk in the current stack; otherwise CSV-first is acceptable for the first implementation slice
- common header variation for participant names and guardian/contact fields
- extra non-critical columns that can be ignored
- columns appearing in different orders
- missing optional columns

MVP does not need to support:
- PDFs
- image-based tables
- highly irregular multi-table spreadsheets
- deeply nested workbook structures
- freeform document extraction

### What the System May Suggest Automatically
The system may:
- suggest header-to-field mappings
- combine simple split name fields or map common equivalents
- infer likely participant columns from common headers
- detect empty required values
- detect possible duplicate or possible-match rows against the live roster
- summarize clean rows vs rows needing attention

### What the Operator Must Confirm
The operator must confirm:
- final field mapping when confidence is not obvious
- any row with missing required promotable fields
- any possible duplicate/match decision
- any row edits or overrides before promotion
- final promotion of ready rows into the live roster

### Warnings vs Blocked Issues

#### Warning
A warning means the row is usable for live roster creation but needs awareness.

Examples:
- missing guardian contact
- unusual but acceptable header mapping
- partial metadata loss
- possible duplicate with low confidence

#### Blocked
A blocked issue means the row must not create a live participant record yet.

Examples:
- missing participant name
- unresolved duplicate/match conflict
- missing submission linkage
- invalid file row that cannot be mapped to canonical fields

### Duplicate / Possible-Match Handling
Possible duplicate rows must not auto-merge in MVP.

For possible matches, the system should offer bounded operator choices such as:
- use existing participant
- create new participant
- hold for later review

The review surface should support these decisions row-by-row without forcing the entire upload to fail.

## 6. Promotion Rules

### Ready
A row is ready when:
- required promotable fields are present
- provenance is intact
- submission linkage is intact
- no unresolved blocked issue remains
- any needed operator confirmation has been completed

### Warning
A row is warning when:
- it can safely create a live participant record
- non-blocking issues remain visible
- operator can still proceed with promotion

### Blocked
A row is blocked when:
- required promotable data is missing
- duplicate resolution is unresolved
- mapping remains unconfirmed where confirmation is required
- provenance or submission linkage is broken

### Batch Promotion
Batch promotion is allowed when:
- the operator explicitly confirms promotion
- all selected rows are either ready or warning
- blocked rows are excluded automatically or manually

### Row-Level Hold / Review
Row-level hold/review is required when:
- a row is blocked
- a duplicate decision is unresolved
- the operator intentionally defers a questionable row

### Recoverability
Unresolved rows must remain recoverable in the approved submission’s review surface with:
- preserved raw row data
- preserved mapped values
- preserved warnings/blocked reasons
- preserved operator notes or override decisions where applicable

Live roster creation must only affect rows actually promoted. Held or blocked rows must not create partial or corrupted live participant records.

## 7. Business States

### Submission States
Use business-facing submission states:
- `Submitted`
- `Approved`
- `Awaiting Roster`
- `Rejected`

### Roster Review Outcomes
Roster review outcomes should be summarized in operator language, for example:
- `24 participants ready, 3 need attention`
- `Roster added`
- `Roster needs attention`
- `Ready to continue`

### Act Business Labels
If an external submission has been approved into the common act/performance layer but roster work is incomplete, the act should show a clear business label such as:
- `Awaiting Roster`
- `Needs Attention`
- `Ready`

Important:
- approved does not mean ready
- the act may exist in the common performance layer while still being operationally incomplete

Avoid showing technical status labels such as:
- staged
- parsed
- normalized
- mapped
- promoted
- synced

## 8. Surface Placement

### LT / Admin Review Surface
This is where the LT/admin should:
- review external team/program submissions
- approve or reject the submission
- see whether roster collection is still pending

### Approved Submission Detail
This is where the operator should:
- see approved program details
- add roster upload
- view roster summary
- continue into review gaps

### Upload / Review / Mapping Surface
This is the bounded admin review surface where complexity is allowed to live.

This surface should contain:
- upload entry point
- suggested mapping
- warnings and blocked issues
- duplicate decisions
- promotion confirmation

This surface should not spread across core ops screens.

### Acts List
The Acts list should only show approved common-layer performances and their business status.

Allowed:
- `Awaiting Roster`
- `Needs Attention`
- `Ready`

Not allowed:
- raw upload mechanics
- field mapping UI
- row-by-row review controls
- parser/debug language

### Performance Workspace
The Performance Workspace may show business-level roster state after approval, such as:
- roster pending
- cast incomplete
- needs attention

It should not expose:
- upload internals
- raw staging rows
- mapping controls
- parser/debug states

### Participant Roster
The participant roster should show only live participant records that have been promoted into the real roster.

It should not show:
- unpromoted staged rows
- raw upload staging errors
- unresolved mapping artifacts

### Stage Console
The Stage Console must never expose intake or review complexity.

It should not show:
- submission review
- roster upload state
- mapping issues
- staging rows
- duplicate resolution controls

## 9. MVP Constraints / Anti-Scope

The MVP must not expand into a heavy intake platform.

Explicit anti-scope:
- no rigid template-only requirement
- no team portal
- no chat/comms
- no generic task management
- no raw intake leakage into Lineup or Stage Console
- no universal ingest engine for arbitrary document structures
- no magical support for every spreadsheet style
- no auto-creation of live participant records without operator confirmation
- no forced review of every clean row when only a few rows need attention

## 10. Recommended Implementation Sequence

1. **Lock the contract**
   Confirm this document as the intake behavior contract before schema or UI work begins.

2. **Define the minimal schema and provenance model**
   Add submission, upload, and staged-row structures needed to support approved external roster intake without altering the direct participant intake path.

3. **Implement the bounded admin review surface**
   Create the smallest review surface that can:
   - upload a roster
   - show suggested mapping
   - highlight warnings and blocked rows
   - support duplicate decisions
   - confirm promotion

4. **Implement promotion into the live roster**
   Support selective or batch promotion of ready/warning rows into real participant records with full provenance.

5. **Link approved submissions into the common act/performance layer**
   At approval time, create or link the approved external submission into the common act/performance layer with a business label such as `Awaiting Roster`.

6. **Run the roster workflow after approval-time act creation**
   The roster workflow then fills in participant records afterward through the bounded upload/review/promotion path.

7. **Run bounded verification**
   Verify:
   - the visible workflow still feels like `Approve Program -> Add Roster -> Review Gaps -> Continue`
   - clean rows can move forward quickly
   - blocked rows remain recoverable
   - intake complexity does not leak into Acts, Performance Workspace, or Stage Console beyond business-state signaling

8. **Stabilize only after flow verification**
   Perform a narrow UX cleanup pass only after the contract-backed implementation is working end-to-end.
