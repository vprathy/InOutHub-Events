# Requirements And Readiness Mobile V1

## Purpose
Define a mobile-first requirement system for InOutHub so org/event admins can mandate key participant and act requirements, operators can resolve them quickly on phones and tablets, and readiness at the participant and performance levels becomes explicit instead of inferred.

## Why This Is Needed
Today the app has pieces of the problem:
- participant evidence in `participant_assets`
- act-level records in `act_requirements`
- operational follow-up in readiness items/issues

What it does not have is a canonical admin-owned policy layer that answers:
- what is mandatory
- for whom
- what counts as acceptable
- whether approval is needed
- whether the gap blocks readiness

Without that layer, the app is inferring readiness from uploads and booleans instead of tracking explicit obligations.

## Product Guardrails
- Mobile-first: admin configuration and operator resolution must work one-handed on a phone.
- Act remains the primary operational object.
- Team/support staff details are modeled as act-scoped requirements or assignments, not as a new core workflow object.
- Requirement UX should be preset-driven, not a general-purpose rules builder.
- AI may assist with content safety flags, but final acceptance remains an operator/admin decision.

## Core Model

### 1. Requirement Policy
Admin-owned rule defined at org or event level.

Purpose:
- declare what is required
- define review/approval behavior
- define who the rule applies to
- define whether the rule blocks readiness

Recommended fields:
- `id`
- `org_id` nullable
- `event_id` nullable
- `subject_type` = `participant | act`
- `category` = `identity | safety | waiver | media | technical | readiness | admin`
- `code`
- `label`
- `description`
- `is_required`
- `input_type`
- `input_config jsonb`
- `review_mode` = `system_derived | no_review | submission_only | review_required`
- `allow_bulk_approve`
- `blocking_level` = `none | warning | blocking`
- `applies_when jsonb`
- `sort_order`
- `is_active`
- `created_at`
- `updated_at`

### 2. Requirement Assignment
Concrete owed work for a specific participant or act.

Purpose:
- drive dashboard counts
- drive readiness rollups
- power review queues
- preserve accountability

Recommended fields:
- `id`
- `policy_id`
- `subject_type`
- `participant_id` nullable
- `act_id` nullable
- `status` = `missing | submitted | pending_review | approved | rejected | waived | auto_complete`
- `due_at`
- `owner_user_id` nullable
- `submitted_at`
- `reviewed_at`
- `reviewed_by` nullable
- `waived_at`
- `waived_by` nullable
- `notes`
- `evidence_summary jsonb`
- `created_at`
- `updated_at`

Constraints:
- exactly one of `participant_id` or `act_id` must be set
- `subject_type = participant` requires `participant_id`
- `subject_type = act` requires `act_id`
- unique active assignment per `policy_id + subject`

### 3. Evidence / Fulfillment
Actual uploaded file, boolean confirmation, notes, or system-derived data that may satisfy an assignment.

Important distinction:
- upload does not equal acceptance
- acceptance does not equal readiness unless the assignment is cleared

Current repo mapping:
- `participant_assets` should become participant evidence
- parts of `act_requirements` should become act evidence or system-driven status, not policy definition

## Review And Acceptance Model

### Review Modes
- `system_derived`
  - completion comes from existing data
  - example: guardian contact complete, participant assigned, intro approved by system workflow
- `no_review`
  - operator marks complete directly
  - example: stage tech confirmed
- `submission_only`
  - evidence submitted, no formal approval queue
  - example: music submitted
- `review_required`
  - explicit review required before requirement clears
  - example: waiver, identity review, child-safe media review

### Acceptance States
- `missing`
- `submitted`
- `pending_review`
- `approved`
- `rejected`
- `waived`
- `auto_complete`

### Rejection And Review Reasons
V1 should prefer reason chips over freeform typing.

Suggested media/document reasons:
- `wrong_file`
- `unreadable`
- `missing_signature`
- `wrong_participant`
- `wrong_act`
- `explicit_audio`
- `inappropriate_image`
- `unsafe_for_minors`
- `needs_final_version`
- `other`

## Input Types
Input type drives capture UX and determines which fields appear on screen.

### Participant Input Types
- `guardian_contact`
- `identity_check`
- `file_upload`
- `text_note`
- `boolean_confirm`
- `media_review`

### Act Input Types
- `audio_record`
- `media_set`
- `team_contact`
- `technical_notes`
- `boolean_confirm`
- `approval_gate`

### Input Config Examples
Guardian contact:
```json
{
  "fields": ["guardian_name", "guardian_phone", "guardian_relationship"]
}
```

Audio submission:
```json
{
  "fields": ["track_title", "runtime_seconds", "source_type"],
  "accept": ["audio/*"],
  "max_files": 1
}
```

Media review:
```json
{
  "accept": ["image/*", "video/*", "audio/*"],
  "requires_content_safety_review": true,
  "child_safe_required": true
}
```

## Applicability Rules
Use `applies_when jsonb` with a very small V1 rule catalog.

### Participant V1 Applicability
- all participants
- minors only
- participants with special requests
- participants assigned to any act

### Act V1 Applicability
- all acts
- acts requiring intro/media
- acts with performers under 18 later if needed

Examples:
```json
{ "all_participants": true }
```

```json
{ "minor_only": true }
```

```json
{ "has_special_requests": true }
```

```json
{ "requires_intro_media": true }
```

## Starter Policy Catalog

### Participant Policies
- `guardian_contact_complete`
  - `input_type = guardian_contact`
  - `review_mode = system_derived`
  - `blocking_level = blocking`
- `waiver_signed`
  - `input_type = file_upload`
  - `review_mode = review_required`
  - `allow_bulk_approve = true`
  - `blocking_level = blocking`
- `identity_verified`
  - `input_type = identity_check`
  - `review_mode = review_required`
  - `allow_bulk_approve = true`
  - `blocking_level = warning` or `blocking` depending on event policy
- `special_request_reviewed`
  - `input_type = text_note`
  - `review_mode = no_review`
  - `blocking_level = warning`

### Act Policies
- `music_submitted`
  - `input_type = audio_record`
  - `review_mode = submission_only`
  - `blocking_level = warning`
- `intro_approved`
  - `input_type = approval_gate`
  - `review_mode = system_derived` or `review_required` via intro workflow
  - `blocking_level = blocking`
- `stage_requirements_confirmed`
  - `input_type = technical_notes`
  - `review_mode = no_review`
  - `blocking_level = warning`
- `support_staff_confirmed`
  - `input_type = team_contact`
  - `review_mode = no_review`
  - `blocking_level = warning`
- `cast_ready`
  - `input_type = boolean_confirm`
  - `review_mode = system_derived`
  - `blocking_level = blocking`

## Readiness Rollups

### Participant Readiness
Derived from participant assignments.

Suggested states:
- `Ready`
  - all blocking assignments are `approved`, `auto_complete`, or `waived`
- `Needs Review`
  - one or more required items are `pending_review`
- `Needs Follow-up`
  - one or more required items are `missing`, `submitted`, or `rejected`
- `Blocked`
  - one or more blocking assignments are unresolved

Display guidance:
- lead with status, not percentage
- show 1-2 reasons under the headline
- example: `Needs Review • Waiver pending, identity check pending`

### Performance Readiness
Derived from:
- act-scoped assignments
- blocking participant assignment rollup across cast members

Suggested states:
- `Ready`
- `At Risk`
- `Blocked`

Suggested reason buckets:
- cast clearance
- intro/media
- music
- tech/stage

Display guidance:
- lead with one overall readiness state
- show compact blocker reasons
- example: `Blocked • Intro approval missing • 3 cast members not cleared`

## Mobile-First UX

### Admin Setup Surface
Do not expose a generic policy builder first.

Use a compact `Manage Requirements` workspace with:
1. Scope picker
   - `This Event`
   - `All Events In Org`
2. Subject tabs
   - `Participants`
   - `Acts`
3. Preset chips
   - `Waiver`
   - `Guardian Contact`
   - `Identity Check`
   - `Music`
   - `Intro`
   - `Tech`
4. Compact behavior row
   - `Required`
   - `Needs Review`
   - `Blocks Readiness`
   - `Bulk Approve`
5. Applies-to selector
   - `All`
   - `Minors`
   - `Special Requests`
   - `Acts With Intro`

Interaction rules:
- no nested cards inside cards
- actions live in bottom sheets or full-width footer actions
- every tappable element must meet the 44px minimum target

### Participant Workspace
Replace generic approval/doc sections with `Required Items`.

Each row should show:
- label
- status
- one short reason
- one explicit action on the right

Examples:
- `Waiver Signed • Pending Review • Review`
- `Guardian Contact • Missing • Update`
- `Identity Verified • Approved • View`

### Performance Workspace
Add a compact `Required For This Performance` strip.

Rows:
- `Music Submitted`
- `Intro Approved`
- `Tech Confirmed`
- `Cast Cleared`

Actions:
- `Open Music`
- `Open Intro`
- `Confirm Tech`
- `Review Cast`

### Bulk Review UX
Use bulk mode only where policy allows it.

Preferred pattern:
- filter list
- multi-select
- fixed bottom action bar
- `Approve Selected`
- `Reject Selected`
- `Waive Selected`

Avoid:
- giant desktop grids
- inline checkboxes on every row by default
- deep multistep review dialogs

## Dashboard Impact
Dashboard should stop inferring readiness from raw uploads.

Instead, use assignments to show:
- participant blockers
- items pending review
- safety-critical unresolved items
- act/performance blockers

Recommended dashboard sections:
- compact metrics from assignment counts
- `Needs Response` queue driven by blocking assignments and pending review work

## Schema Drift To Resolve First
There is already drift in the repo:
- app code references `asset_templates`
- app code references `assign_asset_template_bulk`
- checked-in `database_schema.sql` does not define those objects

Recommendation:
- do not keep a second parallel template system
- replace the template concept with `requirement_policies`
- keep `participant_assets` and act media records as evidence/fulfillment only

## Recommended Rollout Order
1. Add `requirement_policies`
2. Add `requirement_assignments`
3. Backfill participant document/safety requirements first
4. Backfill act intro/music/tech requirements second
5. Update dashboard, roster, participant profile, and performance workspace to read assignments
6. Add mobile-first admin setup and bulk review surfaces

## V1 Non-Goals
- fully generic rules engine
- arbitrary nested requirement logic
- desktop-heavy admin builder
- automated AI moderation as final authority
- new core `team` object

## Decision Standard
Any requirement feature is correct only if:
- an admin can mandate it quickly on a phone
- an operator can see why readiness is blocked in one glance
- a reviewer can clear or reject it in 1-2 taps
- dashboard counts come from explicit assignments, not guesswork
