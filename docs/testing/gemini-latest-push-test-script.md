# Gemini Test Script

## Objective
Execute an end-to-end MVP hardening validation against the latest pushed build with minimal wasted browser-agent spend.

Use this script in order. Do not skip the backend-fast setup gates.

## Mode Selection Rules

Use backend-fast when you need to:

- verify data exists
- create fixtures
- inspect DB state
- reset stage state
- confirm query results
- compare counts before and after a mutation
- validate role access or row presence

Use browser-agent when you need to:

- validate redirects
- click buttons, links, menus, tabs
- inspect labels and empty states
- validate mobile layout and touch flows
- verify modal behavior
- verify navigation continuity
- confirm list/workspace/console trust visually

Never spend browser time discovering missing seed data that could have been checked with backend-fast first.

## Pre-Run Setup

1. Confirm target URL:
   - `https://events.inouthub.ziffyvolve.com`

2. Confirm target build behavior:
   - login page renders customer-facing magic link copy
   - roster freshness is source-based
   - acts list intro state shows `Needs intro` when no intro exists

3. Confirm personas available:
   - EventAdmin email
   - StageManager email

4. Confirm or create fixture event:
   - org exists
   - event exists
   - two stages exist

## Backend-Fast Fixture Checklist

Before any serious browser run, verify or create:

1. Participants
   - at least 10 participants
   - at least 1 minor missing guardian phone
   - at least 1 participant with no act assignment

2. Participant assets
   - at least 1 participant fully approved
   - at least 1 participant pending or missing approval

3. Acts
   - at least 5 acts
   - at least 1 act with no cast
   - at least 1 act with cast
   - at least 1 act with audio asset
   - at least 1 act without audio asset
   - at least 1 act with `IntroComposition` requirement pending
   - at least 1 act with `IntroComposition` fulfilled

4. Event sources
   - at least 1 `google_sheet` source for the event
   - at least 1 file-upload source or ability to create one in browser

5. Lineup
   - at least 2 lineup items on `Main Stage`
   - stage state can be reset to `Idle`

If any item is missing, create the smallest safe fixture before browser testing.

## Browser Pass A: Signed-Out and Redirects

### Case A1
- Route: `/participants`
- Expect redirect to `/login?next=/participants`
- Sign in
- Select org
- Select event
- Expect return to `/participants`, not `/dashboard`

### Case A2
- Route: `/acts`
- Sign out from header
- Expect return to `/login`
- Sign in again
- Re-select org/event if needed
- Verify route continuity remains correct

### Case A3
- Route: `/stage-console`
- Repeat protected deep-link test

## Browser Pass B: EventAdmin Full Run

### B1 Login and Selection
- Visit `/login`
- Verify:
  - email input works
  - `Send Sign-In Link` button works
  - success copy appears
- Complete auth
- On `/select-org`, test:
  - org card click
  - action menu opens
  - sign out button visible
- On `/select-event`, test:
  - event card click
  - refresh button
  - switch organization button

### B2 Header and Bottom Nav
- On any protected page, verify header breadcrumb buttons
- Verify signout icon works
- Verify bottom nav routes:
  - Dashboard
  - Roster
  - Performances
  - Show Flow
  - Console

### B3 Dashboard
- Open `/dashboard`
- Click radar cards:
  - `Needs Placement` -> `/participants?filter=unassigned`
  - `Approvals` -> `/participants?filter=missing`
  - `Safety` -> `/participants?filter=at_risk`
- Return to dashboard
- Click operational link cards:
  - Participants
  - Performances
  - Show Flow
  - Stage Console

### B4 Participants / Roster
- Open `/participants`
- Verify:
  - `Add Participant`
  - `Open Sync Tools`
  - sync freshness badge
  - search
  - sort dropdown
  - all filter chips
- Click each filter chip at least once and confirm list meaningfully changes or empty-state remains coherent
- Expand at least 2 participant cards
- Use:
  - `Open`
  - `Place`
  - note button
  - phone link when present
  - `Details`

### B5 Sync Board
- From roster, click `Open Sync Tools`
- In modal, test:
  - close
  - reopen
  - add-source chooser
  - spreadsheet upload path
  - Google Sheet link path
  - setup guide expand/collapse
- If at least 2 sources exist, click `Sync All Sources`
- Confirm after sync:
  - modal success state appears
  - per-source last synced stamps update
  - roster freshness badge updates
  - participant count or updated state changes if new data was synced

### B6 Participant Profile
- Open one participant detail page
- Test all tabs:
  - overview
  - acts
  - assets
  - source
  - audit
- If controls are available, test:
  - add note
  - assign to act
  - upload asset
  - update asset status
  - remove from act
- Return to roster and confirm continuity

### B7 Acts List
- Open `/acts`
- Verify:
  - `Add Performance`
  - search
  - all filter chips
- Open one act that is missing intro
- Open one act that has intro approved
- Verify list labels for intro trust:
  - `Approved`
  - `Pending`
  - `Needs intro`

### B8 Performance Workspace
- Open `/acts/:actId`
- Verify status picker labels:
  - `Not Here`
  - `Checked In`
  - `Backstage`
  - `On Deck`
- Click all tabs:
  - Overview
  - Readiness
  - Team
  - Activity
  - Media & Intro
- Change arrival status
- Return to `/acts`
- Confirm list reflects the update
- If possible, mutate child data such as cast/media/readiness and confirm list refreshes

### B9 Show Flow
- Open `/lineup`
- Verify first stage auto-selects
- Switch stages
- Test:
  - `Run Flow Review`
  - `Hide Flow Review`
  - `Add Performance`
- For at least one lineup item, test:
  - move to top
  - remove
- If drag-and-drop is available in browser agent, reorder at least one item

### B10 Stage Console
- Open `/stage-console`
- If no lineup, use `Open Show Flow` to add one, then return
- On active lineup stage, test:
  - `START SHOW`
  - `PAUSE`
  - `RESUME`
  - `NEXT PERFORMANCE`
  - reset button
- Refresh while live
- Confirm current item recovers
- If intro-ready act exists, test `PLAY INTRO`

## Browser Pass C: StageManager Run

Repeat the high-value subset as StageManager:

1. login and selection
2. dashboard navigation
3. roster page
4. verify sync tools are disabled or access-limited
5. acts list
6. performance workspace status change
7. lineup view
8. live console controls

Critical assertion:

- StageManager must not get EventAdmin-only sync mutation path

## Backend-Fast Freshness Checks

Use backend-fast for these exact trust checks:

1. After workspace status change:
   - verify `acts.arrival_status` updated
   - verify acts list query would now return new status

2. After child readiness mutation:
   - verify child rows changed
   - refresh list and confirm invalidation happened

3. After `Sync All`:
   - verify every touched `event_sources.last_synced_at` updated

4. After console actions:
   - verify `stage_state.status`
   - verify `stage_state.current_lineup_item_id`

## Multi-Session Trust Check

If Gemini can run parallel sessions:

1. Session 1: open `/acts`
2. Session 2: open the same act workspace
3. In Session 2 change status or readiness-driving child data
4. Confirm Session 1 list updates without full manual reload

Do the same pattern for:

- roster after sync
- lineup after reorder
- stage console after state change

## Signout and Re-Entry

1. Sign out from header on:
   - `/participants`
   - `/acts/:actId`
2. Sign back in as same user
3. Confirm selection continuity is clean
4. Sign out again
5. Sign back in as different user
6. Confirm stale org/event selection does not leak across users

## Output Contract

Gemini must produce:

1. Executive summary
2. Environment and fixture summary
3. Case-by-case results
4. Defect list ordered by operator risk
5. Recommended next actions

Defects must include:

- title
- severity
- route
- persona
- reproduction steps
- expected
- actual
- likely source area if inferable
