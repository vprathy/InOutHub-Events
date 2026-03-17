# Current Live MVP Workflow

This document explains what the current live InOutHub Events app can do today from an operator perspective.

It is based on the current app routes and active screens in the repo, not on older plans or parked work.

It is meant to answer a practical question:

`If I am running an event in the current live version, what can I actually do in the product, screen by screen, button by button?`

---

## What this version is

The current live version is a working operator workflow for elevated users who need to:

1. sign in
2. choose the right organization and event
3. assess the event pulse
4. work the roster
5. sync participants from live sources
6. inspect participant detail
7. scan and manage performances
8. update readiness and media status
9. build and adjust show flow
10. run the live stage console
11. sign out and return cleanly

It is strongest today for Owner / Admin style operation.

It is not yet fully proven for lower-privilege role denial such as a true StageManager-only validation pass.

---

## Operator journey at a glance

The current app supports this full operator journey:

1. Open the app and request a magic link
2. Select the organization you are working under
3. Select the event you are operating
4. Land in the Control Panel and decide where attention is needed
5. Go to Roster to place people, fix missing approvals, and chase minor safety gaps
6. Open Sync Tools if you need to import or refresh participant data
7. Open a participant if you need detail, uploads, source context, or audit history
8. Go to Performances to scan which acts are blocked, under-cast, missing intro, or missing music
9. Open the Performance Workspace for one act and update readiness, cast, and media status
10. Go to Show Flow to arrange lineup per stage
11. Go to Live Console to run the stage during the actual event
12. Sign out and sign back in later without inheriting stale event context

---

## 1. Sign in

### Route

`/login`

### What the operator sees

- InOutHub branding
- `Secure Sign In`
- main heading:
  - `Sign in to InOutHub`
- supporting copy explaining that the email must already be linked to event access

### Inputs and actions

- text field:
  - `Email Address`
  - placeholder: `name@example.com`
- primary button:
  - `Send Sign-In Link`

### Helpful text on this screen

- one-time-use magic link explanation
- guidance that if access is not set up yet, the user should still sign in first and then contact an event or organization admin

### What this workflow actually does

- the operator enters the email address tied to their access
- the system sends a magic link
- the operator opens that magic link on the same device
- if the operator had originally tried to reach a protected page, the app now preserves the intended destination more cleanly than before

### What improved in the hardened build

- deep-link continuity through login is more reliable
- re-entry after signout is less likely to drop the operator into the wrong place

---

## 2. Select the organization

### Route

`/select-org`

### What the operator sees

- branded page header
- title:
  - `Select Organization`
- subtitle:
  - `Choose an organization to manage events`

### Main controls

- organization cards
- `Sign Out`

### What each organization card shows

- organization name
- visible role label on that organization, such as:
  - `Owner`
  - `Admin`
  - `Super Admin` when applicable

### What each organization card lets you do

Tap anywhere on the card to select it and continue to event selection.

Open the action menu on a card to reach:

- `Edit Name`
- `Manage Access`

### Create / admin actions on this screen

- `Create New Organization`

If there are no organizations available:

- `Refresh Organizations`
- `Create Organization` for super-admin situations

### What this means operationally

- this is the first context decision after login
- the operator chooses which organization they are working for today
- that organization choice is then carried into event selection

---

## 3. Select the event

### Route

`/select-event`

### What the operator sees

- branded page header
- title:
  - `Select Event`
- subtitle:
  - `Select an event to manage`
- section label:
  - `Available Events`

### Main controls

- event cards
- `Refresh`
- `Switch Organization`

### What each event card shows

- event name
- event date if present
- timezone hint if present

### What each event card lets you do

Tap anywhere on the card to select the event and enter the working app.

Open the action menu on a card to reach:

- `Edit Event`
- `Manage Access`

### Create / admin actions on this screen

- `Create New Event`

If there are no events:

- `Refresh Events`
- `Switch Organization`

### What this means operationally

- this is where the operator commits to the live event context
- after event selection, the app now does a better job restoring the intended deep link instead of always forcing a generic landing destination

---

## 4. The persistent shell: header and bottom navigation

Once the operator is inside the protected app, there are two constant navigation surfaces that matter every day.

### Header

The header is the session and context bar.

#### What the header shows

- organization breadcrumb
- event breadcrumb
- signout icon button
- theme toggle on larger screens

#### What the header lets the operator do

- tap the organization breadcrumb to go back to organization selection
- tap the event breadcrumb to go back to event selection
- sign out from the live session using the header signout control

### Bottom navigation

The bottom navigation is the mobile-first operator spine.

#### Main destinations

- `Dashboard`
- `Roster`
- `Performances`
- `Show Flow`
- `Console`

#### Why it matters

- this is the main thumb-zone navigation while walking the venue, working the floor, or running a tablet backstage

---

## 5. Control Panel: decide what needs attention

### Route

`/dashboard`

### Purpose in plain English

This is not just a stats page. It is the operator’s “where do I need to go right now?” page.

### What the operator sees

- title:
  - `Control Panel`
- subtitle:
  - `Phone-first event pulse for placement, docs, and day-to-day manager follow-up.`
- live chip:
  - `Active Ops`

### Main radar cards

- `Needs Placement`
- `Approvals`
- `Safety`

Each one is clickable and takes the operator into a focused roster state.

### What each radar card means

- `Needs Placement`
  - how many people still are not assigned to an act
- `Approvals`
  - how many approval/doc items are still missing or pending
- `Safety`
  - how many minors are missing guardian information or other safety-critical follow-up

### Secondary metrics

- `Checked In`
- `On Deck`
- `Roster`
- `Approvals Pending`

### Operational links on the dashboard

- `Participants`
- `Performances`
- `Show Flow`
- `Stage Console`

### What an operator actually uses this for

- checking whether roster work is more urgent than performance work
- spotting unresolved approvals before rehearsal or showtime
- seeing whether minor safety issues still exist
- jumping directly into the work screen that matters next

---

## 6. Roster: the participant triage surface

### Route

`/participants`

### Purpose in plain English

This is the day-to-day roster working surface. It is where the operator scans people, sees who is missing something, places people into acts, and follows up on problems that would otherwise live in spreadsheets or messages.

### Top-level actions

- `Add Participant`
- `Open Sync Tools`

### What is visible near the top

The page shows roster-level attention blocks such as:

- total roster count
- `Needs Placement`
- `Clearance Risk`

These are clickable summary blocks, not just passive labels.

### Search and sorting

- text field:
  - `Find someone on the roster...`
- sort dropdown with:
  - `Name`
  - `Age`
  - `Clearance`
  - `Recent`

### Filter chips

- `All`
- `Cleared`
- `Approvals Pending`
- `Needs Placement`
- `Special Requests`
- `No Phone`
- `Identity Verification Needed`
- `Minor Info Missing`

### What each participant card shows

At a glance, a roster card can show:

- participant name
- age if present
- number of assigned acts or a `Needs Placement` indicator
- `Minor` indicator when applicable
- overall short status such as:
  - `Cleared`
  - `Requires Work`
  - `Pending`

### What each participant card summarizes

Each card has small operational summary blocks for:

- `Placement`
- `Approvals`
- `Follow-Up`

That lets the operator judge whether the next action is assignment, paperwork, guardian follow-up, or something else.

### Quick actions on each participant card

- `Open`
- `Place`
- phone button when a guardian phone exists
- note button
- `Details`

### Expanded participant card state

When the operator expands a participant card, the app can show:

- guardian name
- guardian relationship
- assignment and follow-up summary
- document / approval counts
- special request presence
- minor safety warning when guardian info is incomplete
- latest internal note summary

### Empty-state behavior

If there are no participants, the operator sees:

- `No Participants Found`
- empty-state guidance to sync from Google Sheet or CSV
- action:
  - `Import Participants` for elevated users
  - `Sync Requires Event Admin` for restricted users

### Add Participant modal

When the operator taps `Add Participant`, the modal includes:

- `First Name`
- `Last Name`
- `Guardian Name`
- `Guardian Phone`
- `Notes`

Actions:

- `Cancel`
- `Add Participant`

### Quick placement modal

When the operator taps `Place`, the app opens a lightweight assignment modal:

- title:
  - `Add to Performance`
- search field:
  - `Search performances...`
- list of matching performances
- action:
  - `Confirm Placement`

This is intentionally lighter than leaving the roster and opening a full workspace.

### Quick note modal

When the operator taps the note action, the app opens a lightweight coordination-note modal:

- title:
  - `Quick Operational Note`
- note category toggles:
  - `operational`
  - `internal`
  - `special request`
- text area:
  - `Type your note here...`

Actions:

- `Cancel`
- `Save Note`

### What this means operationally

The roster is designed to be more useful than a spreadsheet for:

- finding who still needs placement
- finding who is missing approvals
- finding minors who still need guardian completion
- making fast assignment decisions
- capturing follow-up notes without leaving the event workflow

---

## 7. Sync Board: bring participant sources into the roster

### Entry point

From `/participants` using:

- `Open Sync Tools`

### Purpose in plain English

This is the operator/admin intake surface for refreshing roster data from source systems without leaving the main app.

### Header and navigation

- title:
  - `Sync Board`
- close button
- back arrow when inside a nested sync mode

### Main dashboard mode

The dashboard mode of the Sync Board shows:

- existing sources
- source type
- source status
- last-synced timestamps
- source-level sync action
- source removal action
- primary global action:
  - `Sync All Sources`
- entry action to add a new source

### Success state after sync

When sync completes, the operator sees:

- `Sync Complete`
- summary counters:
  - `New`
  - `Updates`
  - `Missing`

### Add-source options

- `Upload Spreadsheet`
- `Link Google Sheet`

### Link Google Sheet flow

This path is for a live Google Sheet connection.

#### Fields

- source name:
  - example placeholder: `e.g., Ugadi Registrations`
- sheet URL:
  - placeholder: `Paste link...`

#### Supporting utility

- expandable `Setup Guide`
- displayed service account email for sharing the Google Sheet
- copy-to-clipboard action for that service account

#### Primary action

- `Link & Sync`

### Upload Spreadsheet flow

This path is for a file-based source.

#### Fields

- source name:
  - placeholder: `e.g., Spring RSVP List`
- file picker

#### Primary action

- `Upload & Sync`

### Why the recent hardening matters here

Two important trust fixes now make this screen more believable to operators:

1. the roster freshness signal is aligned with the same source-level timestamps the Sync Board updates
2. `Sync All Sources` now updates per-source sync timestamps instead of leaving source cards looking stale

### What this means operationally

An operator can now:

- connect a sheet
- upload a roster spreadsheet
- sync one source
- sync all sources
- trust the app a bit more when it says the source was refreshed

---

## 8. Participant profile: full detail, uploads, source, and audit

### Route

`/participants/:participantId`

### Purpose in plain English

This is the participant workspace. The roster is for triage; this screen is for detailed coordination and record handling.

### Top-level tabs

- `Overview`
- `Acts`
- `Assets`
- `Source`
- `Audit`

### Common operator actions on this page

- go back to the roster
- edit participant
- add notes
- resolve notes
- update participant status
- assign or remove act placement
- upload participant assets
- review source history
- review audit history

### Overview tab

This is the main summary view of the person.

The operator can use it to inspect:

- basic participant identity
- arrival or readiness context
- guardian and minor status
- assignment summary
- internal notes
- AI-assisted suggestion output when applicable

### Acts tab

This is the act-assignment view for the participant.

The operator can:

- see which acts the person belongs to
- assign them to an act
- remove them from an act if needed

### Assets tab

This is the participant-level asset and document area.

This is where the operator handles things like:

- waivers
- photos
- intro media
- other participant files

The operator can:

- upload a requested asset
- replace an existing upload
- do a `Manual Upload`
- preview supported assets
- delete certain assets

### Upload modal fields in the participant workspace

- name field:
  - placeholder: `Waiver, photo, audio note...`
- asset type selector:
  - `waiver`
  - `photo`
  - `intro_media`
  - `other`
- file picker
- notes:
  - placeholder: `Optional review notes or upload context`

Actions:

- `Cancel`
- `Upload Asset`

### Source tab

This gives the operator context about how the participant record entered the system.

### Audit tab

This gives the operator record-level history for changes over time.

### What this means operationally

The participant profile is where the operator goes when the roster card is not enough and they need:

- exact guardian context
- exact approval/document handling
- source history
- audit visibility

---

## 9. Performances: the acts triage surface

### Route

`/acts`

### Purpose in plain English

This is the operator scan surface for acts. It answers questions like:

- which acts still need cast?
- which acts are blocked on documents or media?
- which acts have intro issues?
- which acts are actually close to stage-ready?

### Top-level actions

- `Add Performance`

### Top summary blocks

- `Needs Cast`
- `Intro Ready`
- `On Deck`

### Search and filter controls

- search field:
  - `Search performances...`
- filter chips:
  - `All`
  - `Needs Cast`
  - `Docs`
  - `Intro Ready`
  - `On Deck`

### What the list itself is for

It is meant to be a scan-and-triage surface, not a deep editing screen.

From the list, the operator should be able to quickly see:

- whether the act has cast
- whether intro is approved, pending, or missing
- whether music has been recorded
- whether the act is blocked or on track
- whether the act is operationally on deck
- a limited set of summary counts such as open issues, next practice timing, and `Missing Items`

Important interpretation note:

- the `Missing Items` count on the acts list is currently narrow
- it reflects readiness items marked with a `missing` status
- it should not be read as “every incomplete checklist or prep task in the workspace”
- operators should still open the Performance Workspace when they need the full readiness picture

### Main actions from each act card

- change arrival / operational position
- `Open Workspace`
- `Add Performer`
- `Add Music Record`

### Important hardened behavior on this screen

The current build improved trust in the acts list by:

- separating `Approved`, `Pending`, and `Needs intro`
- using a stronger readiness summary that accounts for:
  - cast presence
  - participant approvals
  - music presence
  - intro approval
- invalidating the acts list when child readiness data changes, not only when the act record itself changes

### Add Performance modal

When the operator taps `Add Performance`, the form includes:

- `Performance Name`
- `Duration (mins)`
- `Setup Time (mins)`
- `Technical Notes`

Actions:

- `Cancel`
- `Create Performance`

### What this means operationally

This is the screen an operator uses to decide:

- what is blocked
- what is underprepared
- what can move to the next stage of execution

---

## 10. Performance Workspace: detailed act coordination

### Route

`/acts/:actId`

### Purpose in plain English

This is the detailed workspace for a single act. The acts list tells you which act needs attention; this screen is where you actually work the problem.

Important wording note:

- `Performance Workspace` is our operator/developer shorthand in this document
- in the live UI, the screen is identified primarily by the act name plus the visible tabs:
  - `Overview`
  - `Readiness`
  - `Team`
  - `Activity`
  - `Media & Intro`

### Top-of-screen controls

- back link:
  - `Back to Performances`
- arrival / operational status picker

### Arrival-status choices

- `Not Here`
- `Checked In`
- `Backstage`
- `On Deck`

### Header and summary badges

The page shows a richer header for the act, including:

- performance name
- cast count
- duration
- draft or operational mode badge
- business-status badge when present, such as:
  - `Awaiting Roster`
  - `Needs Attention`
  - `Ready`

### Readiness summary strip

Near the top, the operator gets a simple strip for:

- `Music`
- `Cast`
- `Intro`

Typical values include:

- `Uploaded`
- `Missing`
- `Needs cast`
- `Approved`
- `Pending`
- `Needs Intro`

There is also a direct jump action:

- `Review Media & Intro`

### Top-level tabs

- `Overview`
- `Readiness`
- `Team`
- `Activity`
- `Media & Intro`

---

### 10A. Overview tab

This is the quick summary for the act.

The operator uses it to confirm:

- which act they are in
- how many cast members are assigned
- whether the act is in draft or closer to operational
- whether core dependencies look complete or missing

---

### 10B. Readiness tab

This is the structured preparation area for the act.

#### Summary blocks

- `Overall`
- `Next Practice`
- `Open Issues`
- `Missing Items`

Important interpretation note:

- this `Missing Items` number is currently tied to readiness items marked `missing`
- it is not a full rollup of every possible prep task, custom checklist entry, or other coordination work shown elsewhere in the workspace

#### Main actions

- `Add Practice`
- `Add Checklist Item`
- `Raise Issue`

#### Practice form fields

- `Venue name`
- `Address`
- `Room / area`
- `Expected for`
- `Contact name`
- `Contact phone`
- `Parking / drop-off note`
- `Special instructions`
- `Practice notes`

#### Checklist item fields

- `Checklist item title`
- `Owner`
- `Notes`

#### Issue fields

- `Owner`
- `Issue title`
- `Details`
- `Resolution note`

#### What this tab means to an operator

This is where the app becomes more than a list of acts.

It lets the operator track:

- prep sessions
- open blocking issues
- checklist work that needs an owner
- whether the act is `On Track`, `At Risk`, or `Blocked`

---

### 10C. Team tab

This is the cast and team coordination area.

It lets the operator:

- review who is assigned to the act
- add a performer
- add a team member / manager
- remove or update cast composition through the act flow

This is the main place to correct “who is actually in this act?”

---

### 10D. Activity tab

This is the act-level change history surface.

It gives the operator:

- a feed of recent act-related changes
- a quick sense of what has already been done and by whom

This matters when multiple people are coordinating the same act.

---

### 10E. Media & Intro tab

This is the act-level media and stage-requirements area.

#### Main visible sections

- `Music & Audio`
- `Stage Requirements`

#### Main actions

- `Add Record`
- `Review`

#### What this tab is for

The operator uses it to answer questions like:

- do we have a music record at all?
- do we know the stage requirements?
- is the intro still missing, pending, or approved?

### Add act asset record modal

The act-level asset modal now supports:

- `Asset Name`
- asset type options:
  - `Audio`
  - `Prop`
  - `Instrument`
  - `Other`
- `Internal Notes`

Actions:

- `Cancel`
- `Save Record`

Important operational note:

- this creates an act asset record
- it does not upload a media file blob
- participant-level actual file uploads still live in the participant workspace

### What this means operationally

The operator can now use this workspace to coordinate the act as a real piece of event work:

- cast
- readiness
- prep
- blockers
- music record presence
- intro status

---

## 11. Show Flow: build and adjust the run of show

### Route

`/lineup`

### Purpose in plain English

This is the scheduling and sequencing surface for the event. It tells the operator what is on which stage, in what order, and what needs to move.

### Top-level actions

- `Run Flow Review`
- `Hide Flow Review`
- `Add Performance`

### Stage selection

The operator picks a stage using stage buttons at the top.

### Stage-level summary cards

When a lineup exists, the page shows:

- `Scheduled Acts`
- `Total Stage Duration`
- `On Deck`
- either:
  - `Critical Conflicts`
  - or `Estimated End Time`

### Main lineup area

The operator sees:

- the active stage name
- guidance about whether reordering is open or partially locked
- the lineup items in order

### What happens during a live run

If a stage is already active:

- the current or near-term items can be locked
- only the future queue is safely reorderable
- the page explains that near-term acts remain locked for backstage coordination

### Per-lineup-item controls

Operators can work each lineup item using:

- drag handle
- `Top`
- remove action

### Empty-state behavior

If no performances are scheduled on a stage:

- the page shows an empty lineup state
- the operator can use:
  - `Add the first performance`

### Add-to-lineup modal

The lineup add modal includes:

- search field:
  - `Search acts...`

This lets the operator locate an act and add it to the selected stage.

### What this means operationally

The Show Flow page is where the operator:

- decides stage order
- rearranges future acts
- sees the likely end time
- spots critical conflicts before the show starts or while it is running

---

## 12. Live Console: run the show

### Route

`/stage-console`

### Purpose in plain English

This is the live execution screen. It is the show-running surface, not the planning surface.

### Page-level elements

- title:
  - `Live Console`
- subtitle:
  - `Real-time show execution and stage control.`

### Top-stage selector

The operator chooses which stage they are controlling.

### Operational risk state

If critical risks are detected, the console can show:

- a risk banner
- `Fix in Lineup`

This gives the operator a quick escape back to Show Flow to repair problems.

### Recovery and drift messages

The console can show recovery warnings such as:

- `Recovered Live Position`
- `Stage State Drift`

These are important trust signals during refresh or reconnect scenarios.

### Empty or inactive states

If no lineup exists:

- `No Lineup Loaded`
- action:
  - `Open Show Flow`

If the stage is not active:

- `Stage Inactive`

### What the live controller supports

In active use, the operator can:

- see the current act
- see the next act
- see upcoming acts
- start the show
- pause the show
- resume the show
- advance to the next performance
- reset the show state
- play intro when an intro exists

### Main operator controls in the live controller

- `START SHOW`
- `PAUSE`
- `RESUME`
- `NEXT PERFORMANCE`
- reset control
- `PLAY INTRO`

### What the operator expects from this screen

This is the screen that needs to be trusted under pressure.

It should let the operator answer:

- what is live right now?
- what is next?
- did the console recover the right item after refresh?
- are we drifting behind?
- do I need to fix the lineup or continue the run?

### What has been validated recently

The current hardened version has stronger trust in:

- stage selection persistence
- recovery of the live pointer after refresh
- visible recovery messaging when the console had to recover state

---

## 13. Signout and re-entry

### How signout works now

The operator signs out using the header signout control.

### What happens after signout

- the session is cleared
- cached org/event selection is cleared appropriately
- the user returns to login

### What happens on re-entry

After logging back in:

- the user can re-enter the app cleanly
- org/event continuity is more reliable
- stale prior-user event context is less likely to bleed into the new session

### Why this matters

This is essential when:

- one operator signs out and another signs in on the same device
- an operator gets interrupted and has to re-enter the app quickly
- a deep link or protected route was the original destination

---

## 14. What the current live version can do today, in operator English

If you are running an event in the current live version, you can do the following in one connected workflow:

- sign in with a magic link
- choose the right organization and event
- use a dashboard to decide whether roster, approvals, safety, acts, show flow, or console needs attention first
- work the roster with search, sort, and operational filters
- place unassigned participants into performances
- capture quick operational notes
- inspect participant details, source context, audit history, and participant uploads
- sync participant data from Google Sheets or spreadsheets
- scan the act list for cast gaps, intro gaps, music gaps, and blocked readiness
- create a new performance
- open a performance workspace and update arrival status
- add checklist items, practices, and issues for act readiness
- manage the act’s team and cast
- review activity history for an act
- add music / asset records and review media/intro readiness
- add acts into a stage lineup
- reorder future lineup items
- run a flow review to surface conflicts
- execute the live stage console
- recover after refresh during an active run
- sign out and come back without obvious session drift

---

## 15. What this document does not overclaim

This document is intentionally detailed, but it is still bounded by what is actually live and what has actually been proven.

It does not overclaim the following:

- full restricted-role validation for lower-privilege personas
- parked landing-page work
- parked SMTP work
- unfinished external intake surfaces that are not yet fully part of the current live operator spine

So the most accurate plain-English summary is:

The current live version is a substantially working elevated-operator event workflow that can carry a real event from login through roster management, act coordination, lineup building, and live console execution, with noticeably better continuity and trust than the earlier unstable state.

---

## 16. UI language and glossary

This section maps the plain-English workflow terms used in this document to the exact screen labels and narrower meanings in the current UI.

### Primary navigation labels

- `Dashboard`
  - bottom-nav label for `/dashboard`
- `Roster`
  - bottom-nav label for `/participants`
- `Performances`
  - bottom-nav label for `/acts`
- `Show Flow`
  - bottom-nav label for `/lineup`
- `Console`
  - bottom-nav label for `/stage-console`

### Screen-title mapping

- `Control Panel`
  - the page title shown on `/dashboard`
- `Select Organization`
  - the page title shown on `/select-org`
- `Select Event`
  - the page title shown on `/select-event`
- `Sync Board`
  - the modal title opened from `Open Sync Tools`
- `Live Console`
  - the page title shown on `/stage-console`

### Operator shorthand used in this document

- `Roster`
  - what operators see in bottom navigation for `/participants`
- `Participant profile`
  - this document’s shorthand for the participant detail screen at `/participants/:participantId`
  - in the live UI, the screen is identified more by the participant name and tabs:
    - `Overview`
    - `Acts`
    - `Assets`
    - `Source`
    - `Audit`
- `Performance Workspace`
  - this document’s shorthand for the act detail screen at `/acts/:actId`
  - in the live UI, the screen is identified more by the act name and tabs:
    - `Overview`
    - `Readiness`
    - `Team`
    - `Activity`
    - `Media & Intro`

### Readiness and status language

- `Needs Placement`
  - appears on roster summary surfaces and means the participant is not yet assigned to an act
- `Approvals Pending`
  - roster filter label for missing or pending participant approval/doc work
- `Clearance Risk`
  - roster top summary label for participants needing clearance or safety follow-up
- `Cleared`
  - participant-level roster status meaning the person is in a healthier approval state
- `Requires Work`
  - participant-level roster status meaning approval or follow-up work remains
- `Pending`
  - participant-level roster status used when the participant is neither clearly cleared nor flagged as requires-work
- `On Deck`
  - used in acts, dashboard, lineup, and console contexts for near-stage readiness
- `Operational`
  - badge shown on an act when the arrival status is `Ready`
- `Draft Mode`
  - badge shown on an act when it is not yet at the operational `Ready` state
- `On Track`, `At Risk`, `Blocked`
  - readiness summary states in the act workspace

### Counts that need careful interpretation

- `Missing Items`
  - on the acts list and in the `Readiness` tab, this currently means readiness items marked `missing`
  - it does not mean every incomplete prep task, every custom checklist entry, or every unresolved coordination gap in the act
- `Open Issues`
  - count of readiness issues that are not resolved
- `Next Practice`
  - next known practice / rehearsal checkpoint for the act

### Asset-language mapping

- `Add Music Record`
  - act-card shortcut action for creating an act asset record tied to music/media readiness
- `Add Record`
  - the similar action inside the `Media & Intro` tab
- `Upload Asset`
  - participant-level upload action for actual participant files

Important distinction:

- `Add Music Record` / `Add Record`
  - creates an act asset record
- `Upload Asset`
  - uploads a participant asset file

### Console-language mapping

- `Recovered Live Position`
  - banner shown when the console restores the live run after refresh or reconnect
- `Stage State Drift`
  - banner shown when the saved live pointer no longer cleanly matched the lineup and the console had to recover
- `Fix in Lineup`
  - action that sends the operator back to `Show Flow` to repair scheduling issues

### Why this glossary exists

The app mixes:

- exact UI labels the operator taps
- broader internal/product shorthand used by the team

This glossary is here so we can keep the document operator-friendly without blurring the exact words that appear in the live UI.
