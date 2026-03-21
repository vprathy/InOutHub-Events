# Antigravity Prompt: Phase 1 Requirements Workflow Review

Use this prompt when handing the current repo and local app state to Antigravity for an exhaustive phase-1 workflow validation pass.

## Goal

Validate the end-to-end requirements workflow across roles, admin setup, participant profiles, performance profiles, dashboard impacts, and seeded demo data.

This is a verification task, not a redesign task.

## Execution Rules

1. Prefer backend / local repo / Supabase validation first.
2. Use browser automation only as the last option when a behavior cannot be proven from backend data or local code/runtime checks.
3. Conserve AI/browser credits.
4. Use the local repo at:
   - `/Users/vinay/dev/InOutHub-Events-main`
5. Use the app’s dev login path for any UI validation:
   - `/dev/login`
6. Do not invent product behavior.
7. Treat the following product rules as binding:
   - Participant requirements are admin-defined obligations only.
   - Special requests are not participant requirements.
   - Participant phase-1 requirements are:
     - `Guardian Contact`
     - `Waiver`
     - `Participant Photo`
     - optional `Identity Check`
   - Performance phase-1 requirements are only:
     - `Music File`
     - `Intro Approved`
     - `Team Manager Assigned`
8. If you find drift between code, database state, seeded data, and UI behavior, call it out explicitly.

## Current Expected State

Current remote baseline:
- branch: `main`
- expected recent commits include:
  - `5124cb8` `Narrow phase one requirement model`
  - `aa00b28` `Add participant photo requirement`
  - `7a17653` `Bridge participant file requirements into profiles`

Current phase-1 expectations:
- Requirements admin page is preset-driven.
- Participant profile should show:
  - a visible requirement checklist
  - file-backed requirements in `Files & Approvals`
- Performance profile should only reflect the 3 approved act requirements listed above.
- Dashboard and related readiness surfaces should not treat special requests as requirements.

## Preferred Validation Order

### 1. Repo / Code Contract Review

Review these files first:
- `/Users/vinay/dev/InOutHub-Events-main/AGENTS.md`
- `/Users/vinay/dev/InOutHub-Events-main/task.md`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/RequirementsPage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/lib/requirementsPrototype.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useParticipants.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/ParticipantProfilePage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/PerformanceProfilePage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/DashboardPage.tsx`
- `/Users/vinay/dev/InOutHub-Events-main/src/hooks/useDashboardRadar.ts`
- `/Users/vinay/dev/InOutHub-Events-main/src/pages/dev/DevQuickLogin.tsx`

Confirm:
- `special_request_reviewed` is not part of the active participant requirement UI model
- participant presets include waiver and participant photo
- act presets include only music, intro, and team manager
- participant file-upload policies bridge into profile file tasks
- requirement updates invalidate dependent participant/profile/dashboard queries

### 2. Backend / Data Validation

Use local repo scripts, Supabase queries, and direct inspection where possible.

Validate:
- the seeded event exists and is selectable after `/dev/login`
- resolved requirement policies for the seeded event match the current product contract
- participant data has enough seeded assets/notes/assignments to test:
  - waiver present / absent
  - photo present / absent
  - minor with guardian complete / incomplete
  - identity verified / not verified
  - participant with special request
- performance data has enough seeded records to test:
  - music present / absent
  - intro approved / not approved
  - manager assigned / not assigned

If the seed is insufficient:
- first use `/dev/login` -> `Reset Demo Event`
- if still insufficient, create only the minimum extra records needed
- list every extra test mutation you make

### 3. Role / Access Validation via `/dev/login`

Validate with these dev roles:
- `Super Admin`
- `Org Owner`
- `Event Admin`
- `Stage Manager`
- `Act Admin`

For each role, verify:
- whether `Manage Requirements` is accessible
- whether participant requirements can be toggled
- whether performance requirements can be toggled
- whether participant profile actions are editable or view-only
- whether performance profile media / cast actions are editable or view-only
- whether dashboard metrics / queue items still render without errors

### 4. UI Workflow Validation

Use browser automation only after the backend/data checks above.

#### A. Requirements Admin Workflow

On `/dev/login`, sign in as `Event Admin`.

In `Manage Requirements`, validate:
- participant tab:
  - `Guardian Contact`
  - `Waiver`
  - `Participant Photo`
  - optional `Identity Check`
- act tab:
  - `Music File`
  - `Intro Approved`
  - `Team Manager Assigned`

Verify for each preset:
- toggle on
- toggle off
- persistence after refresh
- correct event/org inheritance behavior
- no stale state after toggling

Specifically confirm:
- no `Special Request Review` requirement is shown
- no technical / cast-clearance requirement is shown as a phase-1 act requirement

#### B. Participant Profile Workflow

Open multiple seeded participant profiles that cover:
- minor with missing guardian data
- participant missing waiver
- participant missing photo
- participant with approved photo
- participant with approved waiver
- participant with identity verified
- participant with special request

Verify:
- `Requirement Checklist` matches active participant policies only
- `Files & Approvals` contains waiver/photo when those policies are active
- turning `Identity Check` off removes it from the profile after refresh/refetch
- turning `Waiver` off removes waiver from checklist and file task lane
- turning `Participant Photo` off removes photo from checklist and file task lane
- special request remains visible only as participant/operator workflow, not as a requirement row

#### C. Performance Profile Workflow

Open multiple seeded performance profiles that cover:
- music present
- music missing
- intro approved
- intro missing or pending
- manager assigned
- manager missing

Verify the requirement surface only includes:
- `Music File`
- `Intro Approved`
- `Team Manager Assigned`

Explicitly verify these do not appear as act requirements:
- `Cast Clearance`
- `Stage Tech Confirmed`
- any legacy technical requirement rows

Confirm the actions route correctly:
- `Music File` -> media workspace
- `Intro Approved` -> intro builder / intro review surface
- `Team Manager Assigned` -> cast/team management area

#### D. Dashboard / Cross-Surface Validation

Validate that:
- dashboard loads without runtime errors
- special requests remain in the response queue / ops workflow, not in participant requirements
- participant metrics and queues react consistently after requirements toggles
- turning `Identity Check` on/off changes identity-related dashboard behavior only when the policy is active

### 5. Regression Validation

Run:
- `npm run build`

If possible also validate:
- any targeted local checks or queries that prove the requirement toggles changed the expected records

## Proof Requirements

Do not claim success without proof.

For every major assertion, provide one of:
- exact file reference
- exact query result summary
- exact route + role + UI observation
- exact mutation performed

For browser/UI proof, include:
- role used
- route visited
- control interacted with
- before state
- action taken
- after state

For backend proof, include:
- table(s) checked
- scoped event or participant/act identifier
- what rows or fields proved the conclusion

## Required Structured Output

Return the result in this structure exactly.

### 1. Findings

List findings first, ordered by severity.

For each finding include:
- `Severity`: Critical / High / Medium / Low
- `Area`: Requirements / Participant Profile / Performance Profile / Dashboard / RBAC / Data / Other
- `Summary`
- `Proof`
- `Reproduction`
- `Expected`
- `Actual`
- `Suggested Fix`

If there are no findings, say:
- `No functional findings discovered in the tested workflow.`

### 2. Validation Matrix

Provide a compact matrix covering:
- role
- screen
- scenario
- result
- proof

### 3. Data Coverage

List:
- which seeded participants were used
- which seeded performances were used
- any extra data created
- any resets performed through `/dev/login`

### 4. Product Contract Check

Answer explicitly:
- Is special request correctly treated as non-requirement workflow?
- Do participant requirements match the approved phase-1 set?
- Do performance requirements match the approved phase-1 set?
- Are there any remaining hybrid-model inconsistencies between `requirement_policies`, `requirement_assignments`, and `asset_templates`?

### 5. Residual Gaps For Phase 2

List only true remaining workflow gaps that should stay on the roadmap.

### 6. Recommended Next Actions

Give a short prioritized list of the next concrete fixes, if any.

## Important Constraints

- Do not broaden scope into redesign ideas.
- Do not use browser automation when backend inspection can answer the question.
- Use `/dev/login` rather than manual auth setup.
- Preserve seeded/demo data unless a reset or minimal mutation is required for proof.
