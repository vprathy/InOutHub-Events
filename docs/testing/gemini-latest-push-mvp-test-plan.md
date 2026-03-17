# Gemini MVP Test Plan

## Purpose
Validate the latest pushed MVP hardening slice on the real app spine:

1. Login and session continuity
2. Organization and event selection
3. Dashboard
4. Participants / roster
5. Sync Board
6. Participant profile
7. Acts list
8. Performance workspace
9. Show Flow / lineup
10. Stage Console
11. Header / bottom navigation / signout / re-entry

This plan is optimized for Gemini to combine:

- fast backend checks for data/setup/state verification
- browser-agent checks for routing, controls, labels, tabs, buttons, and trust-critical UX

## Build Under Test

- Repo: `InOutHub-Events`
- Branch expected in deploy: `main`
- Commit expected in deploy: `f355c66`
- Domain: `https://events.inouthub.ziffyvolve.com`

## Route Inventory

Primary MVP routes:

- `/login`
- `/select-org`
- `/select-event`
- `/dashboard`
- `/participants`
- `/participants/:participantId`
- `/acts`
- `/acts/:actId`
- `/lineup`
- `/stage-console`

Secondary / non-production-only routes:

- `/dev/login` only when dev login is enabled
- `/prototype/intro` smoke-only, not part of MVP acceptance

## Seed and Fixture Truth

Current seed command:

- `npm run seed`

Current seeded baseline from `src/lib/dev/seed.ts` and `src/lib/dev/seedDemoEvent.ts`:

- organization: `ZiffyVolve Productions`
- event: `ZiffyVolve Talent Showcase MVP 2026`
- seeded event members if profiles already exist:
  - `owner@ziffyvolve.com` -> `EventAdmin`
  - `eventadmin@ziffyvolve.com` -> `EventAdmin`
  - `stagemanager@ziffyvolve.com` -> `StageManager`
- stages:
  - `Main Stage`
  - `Side Stage / Acoustic`
- participants: 50 total
- deterministic participants:
  - `Victor Barrows`
  - `Fatima Kulas`
  - `Lester Wintheiser`
  - `Buddy Ondricka`
  - `Margarita Ankunding`
  - `Penny Fisher`
- acts: 15 total
- deterministic act:
  - `The strong Solo Singer`

## Important Seed Gaps

The current seed does **not** fully facilitate all browser tests by itself. Gemini must cheaply create or verify the following fixtures before full browser testing:

- at least 1 `event_sources` row for Google Sheets path
- at least 1 file-upload source path exercise
- at least 2 participants with `participant_assets`
  - one fully approved
  - one pending or missing
- at least 1 participant with missing guardian info while `is_minor = true`
- at least 1 lineup on `Main Stage`
- stage state transitions on a stage with lineup
- at least 1 act with:
  - no cast
  - no music
  - intro requirement pending
  - approved intro

## Required Test Personas

1. EventAdmin
   - can access sync tools
   - can manage lineup
   - can use live console

2. StageManager
   - can access event surfaces
   - cannot use EventAdmin-only sync tools
   - can use stage console

3. Signed-out user
   - used for redirect, access gate, and re-entry checks

## Mandatory Pre-Flight Checks

Gemini must verify before browser testing:

1. Deployed app resolves and loads the expected commit build behavior.
2. Authed user has org and event access.
3. Baseline fixture counts exist:
   - organizations >= 1
   - events >= 1
   - stages >= 2
   - participants >= 10
   - acts >= 5
4. Test fixture augmentation is completed for missing seed gaps.

## Full Coverage Matrix

### 1. Login and Redirect

Screen: `/login`

Controls to test:

- email input
- `Send Sign-In Link`
- success state message
- error state message

Scenarios:

- direct visit while signed out
- deep-link redirect from protected route to `/login?next=...`
- login as EventAdmin
- login as StageManager
- reused / expired magic link copy visible

### 2. Organization Selection

Screen: `/select-org`

Controls to test:

- org cards
- org card action menu
- `Create New Organization`
- page-level sign out
- refresh/back controls when no orgs exist

Scenarios:

- select org
- org selection with redirect state preserved
- sign out from selection screen
- no-org state messaging

### 3. Event Selection

Screen: `/select-event`

Controls to test:

- event cards
- event card action menu
- `Create New Event`
- `Refresh`
- `Switch Organization`

Scenarios:

- select event and land on `/dashboard`
- select event after protected deep link and return to intended route
- no-event state
- switch organization path

### 4. Header and Nav Shell

Surfaces:

- sticky header
- org breadcrumb
- event breadcrumb
- signout icon
- bottom nav items

Controls to test:

- org breadcrumb button
- event breadcrumb button
- signout button
- bottom nav:
  - `Dashboard`
  - `Roster`
  - `Performances`
  - `Show Flow`
  - `Console`

### 5. Dashboard

Screen: `/dashboard`

Controls to test:

- radar cards:
  - `Needs Placement`
  - `Approvals`
  - `Safety`
- operational link cards:
  - `Participants`
  - `Performances`
  - `Show Flow`
  - `Stage Console`

Scenarios:

- cards render counts
- cards deep-link to filtered routes
- operational links route correctly

### 6. Participants / Roster

Screen: `/participants`

Controls to test:

- `Add Participant`
- `Open Sync Tools`
- sync freshness badge
- search input
- sort select
- filter chips:
  - `All`
  - `Cleared`
  - `Approvals Pending`
  - `Needs Placement`
  - `Special Requests`
  - `No Phone`
  - `Identity Verification Needed`
  - `Minor Info Missing`
- participant card expand/collapse
- participant card inline actions:
  - `Open`
  - `Place`
  - phone link
  - note button
  - `Details`

Scenarios:

- EventAdmin sees enabled sync tools
- StageManager sees disabled sync tools and access copy
- roster freshness reflects latest `event_sources.last_synced_at`
- filter URL sync works
- search narrows list
- sorting changes order
- participant expand/collapse works

### 7. Sync Board

Surface: modal from `/participants?action=import`

Controls to test:

- dashboard state
- `Sync All Sources`
- single-source sync button on Google Sheet source
- `Add Source`
- add-source chooser:
  - spreadsheet upload
  - Google Sheet link
- `Setup Guide`
- `Link & Sync`
- `Upload & Sync`
- source action menu `Remove Source`
- close button

Scenarios:

- open from roster button
- open from query param
- Google Sheet single sync updates roster and source timestamp
- `Sync All Sources` updates each source timestamp
- file upload path succeeds
- stale badge becomes fresh after sync
- StageManager cannot open usable sync tools

### 8. Participant Profile

Screen: `/participants/:participantId`

Tabs to test:

- `overview`
- `acts`
- `assets`
- `source`
- `audit`

Controls to test:

- back link
- edit modal trigger
- assignment flow
- note add flow
- asset upload flow
- asset approve/reject/delete actions if visible
- status update controls if visible
- linked act navigation links

Scenarios:

- open from roster card
- all tabs render without crash
- source and audit tabs show meaningful data or empty-state clarity
- asset actions persist and refresh counts

### 9. Acts List

Screen: `/acts`

Controls to test:

- `Add Performance`
- search input
- triage filter chips:
  - `All`
  - `Needs Cast`
  - `Docs`
  - `Intro Ready`
  - `On Deck`
- every act card action:
  - status button
  - open/details path

Readiness trust scenarios:

- list shows `Approved`, `Pending`, or `Needs intro` correctly
- list reflects cast/no-cast state
- list reflects missing participant approval state
- list reflects music/no-music state
- list refreshes when workspace child data changes

### 10. Performance Workspace

Screen: `/acts/:actId`

Controls to test:

- back to performances
- status picker:
  - `Not Here`
  - `Checked In`
  - `Backstage`
  - `On Deck`
- `Review Media & Intro`
- tabs:
  - `Overview`
  - `Readiness`
  - `Team`
  - `Activity`
  - `Media & Intro`

Scenarios:

- workspace opens from acts list
- status changes persist and reflect back to acts list
- readiness summary does not overstate readiness when cast/music/intro/approvals are missing
- activity tab loads or fails gracefully
- media tab shows intro state correctly

### 11. Show Flow / Lineup

Screen: `/lineup`

Controls to test:

- stage selector buttons
- `Run Flow Review`
- `Hide Flow Review`
- `Add Performance`
- lineup item drag handle
- lineup item `Top`
- lineup item remove button
- add-to-lineup modal

Scenarios:

- first stage auto-selected
- review insights show when lineup risks exist
- adding act to lineup works
- reorder works
- remove works
- locked reorder behavior during live run is respected

### 12. Stage Console

Screen: `/stage-console`

Controls to test:

- stage selector buttons
- `Open Show Flow` empty-state action
- `Fix in Lineup`
- `START SHOW`
- `PAUSE`
- `RESUME`
- `NEXT PERFORMANCE`
- reset button
- `PLAY INTRO` when intro is ready
- current-act status picker if visible in controller

Scenarios:

- stage selection persists per event
- empty lineup state is clear
- start/pause/resume/advance/reset all work
- refresh while active recovers current position
- drift banner shows when pointer mismatch is forced
- next/upcoming trust is correct

### 13. Signout and Re-entry

Scenarios:

- sign out from header on protected route
- sign back in as same user
- sign back in as different user
- stale org/event selection is cleared on user switch
- deep link after re-entry returns to intended route

## Execution Order

1. backend fixture verification and augmentation
2. signed-out auth and redirect checks
3. EventAdmin browser pass
4. StageManager browser pass
5. multi-session freshness checks
6. signout / re-entry / user-switch checks

## Failure Severity

Severity 1:

- cannot log in
- cannot select org or event
- protected route loops or lands incorrectly
- roster or acts list cannot load
- lineup or console cannot load

Severity 2:

- sync says success but roster freshness does not update
- workspace update does not reflect in acts list
- console cannot recover from refresh
- StageManager wrongly gets EventAdmin sync mutation access

Severity 3:

- wrong label, stale badge, minor empty-state defects, or one-off visual defects

## Reporting Format Gemini Must Use

For every case:

- Case ID
- Persona
- Route
- Setup
- Steps
- Expected
- Actual
- Result: Pass / Fail / Blocked
- Severity if failed
- Screenshot or evidence reference
- If backend-fast was used, include exact query or API path used

Final summary must include:

- total cases run
- passed
- failed
- blocked
- top 5 operator-risk defects
- recommendation: ship / fix then retest / blocked
