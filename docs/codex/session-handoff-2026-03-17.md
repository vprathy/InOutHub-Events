# Session Handoff - 2026-03-17

This document is the fast-start context pack for the next chat.

It captures:
- current repo truth
- current local-only work
- what Gemini explored
- what was kept vs discarded
- what should happen next

This version is intentionally exhaustive enough that the next chat should not need to return to the prior conversation.

---

## 0. Late-Session Update - 2026-03-17 23:31:59 EDT

This section supersedes older parts of this document where the repo state changed later in the session.

### Current operating split between user, Codex, and Gemini

- user sets product direction, workflow priorities, and acceptance bar
- Codex owns repo implementation, verification, and git hygiene
- Gemini is **not** a coding agent for this repo
- Gemini may be used only for:
  - Supabase MCP inspection / live DB-side execution when needed
  - browser-based UI/UX validation when backend or code inspection is insufficient

Rule going forward:
- Codex writes repo code
- Gemini may inspect or validate
- Gemini should not make repo app changes

### Current local working tree after the later prototype and backend passes

Modified real-app files now include:
- [database_schema.sql](/Users/vinay/dev/InOutHub-Events/database_schema.sql)
- [src/components/acts/ActCard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/acts/ActCard.tsx)
- [src/components/console/LivePerformanceController.tsx](/Users/vinay/dev/InOutHub-Events/src/components/console/LivePerformanceController.tsx)
- [src/components/layout/AppShell.tsx](/Users/vinay/dev/InOutHub-Events/src/components/layout/AppShell.tsx)
- [src/components/layout/Header.tsx](/Users/vinay/dev/InOutHub-Events/src/components/layout/Header.tsx)
- [src/components/lineup/LineupItemCard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/lineup/LineupItemCard.tsx)
- [src/components/selection/SelectionGuard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/selection/SelectionGuard.tsx)
- [src/context/AuthContext.tsx](/Users/vinay/dev/InOutHub-Events/src/context/AuthContext.tsx)
- [src/hooks/useAppSignOut.ts](/Users/vinay/dev/InOutHub-Events/src/hooks/useAppSignOut.ts)
- [src/lib/supabase.ts](/Users/vinay/dev/InOutHub-Events/src/lib/supabase.ts)
- [src/pages/ActsPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ActsPage.tsx)
- [src/pages/DashboardPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/DashboardPage.tsx)
- [src/pages/LineupPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/LineupPage.tsx)
- [src/pages/ParticipantsPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ParticipantsPage.tsx)
- [src/pages/PerformanceProfilePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/PerformanceProfilePage.tsx)
- [src/pages/StageConsolePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/StageConsolePage.tsx)
- [src/pages/auth/AuthCompletePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/auth/AuthCompletePage.tsx)
- [src/pages/auth/LoginPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/auth/LoginPage.tsx)
- [src/types/database.types.ts](/Users/vinay/dev/InOutHub-Events/src/types/database.types.ts)

Untracked but real/working docs or code:
- [docs/codex/db-contract-v1-proposal.md](/Users/vinay/dev/InOutHub-Events/docs/codex/db-contract-v1-proposal.md)
- [src/lib/authTelemetry.ts](/Users/vinay/dev/InOutHub-Events/src/lib/authTelemetry.ts)
- [supabase/migrations/20260317_add_auth_profiles_and_sessions.sql](/Users/vinay/dev/InOutHub-Events/supabase/migrations/20260317_add_auth_profiles_and_sessions.sql)

Exploratory/reference-only lane remains:
- [SITE.md](/Users/vinay/dev/InOutHub-Events/SITE.md)
- [next-prompt.md](/Users/vinay/dev/InOutHub-Events/next-prompt.md)
- `queue/`
- `site/`

### Real app changes completed after the earlier handoff draft

#### Cross-app workflow simplification prototype

The following surfaces were simplified locally and are reviewable in the real app:
- [src/pages/DashboardPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/DashboardPage.tsx)
- [src/pages/ParticipantsPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ParticipantsPage.tsx)
- [src/pages/LineupPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/LineupPage.tsx)
- [src/pages/StageConsolePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/StageConsolePage.tsx)
- [src/components/console/LivePerformanceController.tsx](/Users/vinay/dev/InOutHub-Events/src/components/console/LivePerformanceController.tsx)
- [src/components/lineup/LineupItemCard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/lineup/LineupItemCard.tsx)
- [src/components/layout/AppShell.tsx](/Users/vinay/dev/InOutHub-Events/src/components/layout/AppShell.tsx)

Direction taken:
- calmer, workflow-first surfaces
- summary metrics demoted
- orientation/context blocks added where useful
- hero surface is the working area, not a grid of mini dashboards

#### Dashboard-specific changes

Current local dashboard direction in [src/pages/DashboardPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/DashboardPage.tsx):
- page identity aligned to `Dashboard`
- `Active Ops` removed
- `Show Snapshot` pulled above the priority cards
- primary attention area centered on:
  - `Needs Placement`
  - `Approvals`
  - `Safety`
- duplicate approvals reporting removed from snapshot
- lower area reframed as a lighter navigation surface
- signed-in user context moved into the header account control

Open dashboard note:
- the color system still needs central semantic token cleanup in shared styles instead of per-screen tuning

#### Header / account / access changes

Current local header behavior in [src/components/layout/Header.tsx](/Users/vinay/dev/InOutHub-Events/src/components/layout/Header.tsx):
- compact initials-only account button on the right
- dropdown with:
  - `Profile`
  - `Log Out`
  - `Manage Org Access` when applicable
  - `Manage Event Access` when applicable
- older neutral palette restored for the header control

#### Selection flow streamlining

[src/components/selection/SelectionGuard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/selection/SelectionGuard.tsx) now:
- restores last valid org/event when available
- auto-selects the org when exactly one org is accessible
- auto-selects the event when exactly one event is available in context
- only shows selection screens when there is an actual choice to make

#### Session behavior changes already wired in app code

- auth persistence uses `sessionStorage` in [src/lib/supabase.ts](/Users/vinay/dev/InOutHub-Events/src/lib/supabase.ts)
- session clears on browser close
- idle timeout is 30 minutes in [src/context/AuthContext.tsx](/Users/vinay/dev/InOutHub-Events/src/context/AuthContext.tsx)

### Backend auth/profile/session slice now implemented in repo

Repo-side backend contract is now in:
- [database_schema.sql](/Users/vinay/dev/InOutHub-Events/database_schema.sql)
- [supabase/migrations/20260317_add_auth_profiles_and_sessions.sql](/Users/vinay/dev/InOutHub-Events/supabase/migrations/20260317_add_auth_profiles_and_sessions.sql)
- [src/types/database.types.ts](/Users/vinay/dev/InOutHub-Events/src/types/database.types.ts)

What was added:
- `user_profiles.phone_number`
- `user_profiles.timezone_pref`
- `user_profiles.metadata`
- `auth_events`
- `user_sessions`
- `can_manage_event_staff(uuid)`
- RLS + indexes for the new tables

### Auth/session logging is now wired in the app

[src/lib/authTelemetry.ts](/Users/vinay/dev/InOutHub-Events/src/lib/authTelemetry.ts) was added and the flow is wired as follows:

- [src/pages/auth/LoginPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/auth/LoginPage.tsx)
  - stores pending `magic_link_requested` intent in session storage after successful OTP request
- [src/pages/auth/AuthCompletePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/auth/AuthCompletePage.tsx)
  - flushes `magic_link_requested`
  - records `login_completed`
- [src/context/AuthContext.tsx](/Users/vinay/dev/InOutHub-Events/src/context/AuthContext.tsx)
  - creates/touches `user_sessions`
  - records `session_timeout` on idle sign-out
- [src/hooks/useAppSignOut.ts](/Users/vinay/dev/InOutHub-Events/src/hooks/useAppSignOut.ts)
  - records `logout`
  - ends the active user session

Important limitation:
- browser-close behavior clears local auth because of `sessionStorage`
- a `user_sessions` row may stay `active` until a stale-session cleanup path is added

### Live Supabase status

Important:
- Codex changed repo schema/migrations and app wiring only
- Codex did **not** apply the migration to the live Supabase project in this session
- Gemini should be used for the live Supabase step because Gemini has Supabase MCP access

Pending external step before real end-to-end validation:
- inspect live Supabase for drift
- if safe, apply [supabase/migrations/20260317_add_auth_profiles_and_sessions.sql](/Users/vinay/dev/InOutHub-Events/supabase/migrations/20260317_add_auth_profiles_and_sessions.sql)
- verify resulting live tables, policies, function, and indexes

Prompt already prepared for Gemini:

`Please handle the live Supabase side for the new auth/profile telemetry slice. Read AGENTS.md, database_schema.sql, and supabase/migrations/20260317_add_auth_profiles_and_sessions.sql. Inspect the live project for the new columns, auth_events, user_sessions, can_manage_event_staff(uuid), and related policies. Compare live state against the repo migration and database_schema.sql. If there is no blocking conflict, apply the migration. Then verify the tables, function, policies, and indexes, and report exactly what already existed, what changed, and any drift Codex should know before further testing.`

### Verification state

- local `npm run build` passed after the UI prototype changes
- local `npm run build` also passed after the backend auth/session slice and app wiring

### Recommended immediate next action in the next chat

1. Read this handoff and inspect `git status`
2. Preserve the exploratory lane as reference only
3. Use Gemini for the pending live Supabase migration/apply step
4. Then resume app workflow cleanup and real validation from the updated prototype state

### Suggested continuation prompt for the next chat

Use this:

`Read /Users/vinay/dev/InOutHub-Events/docs/codex/session-handoff-2026-03-17.md first, especially the late-session update at the top. Then inspect git status, preserve the unsynced /acts work and exploratory SITE.md/next-prompt.md/queue/site lane, and continue execution from the current prototype + backend state. The immediate external dependency is the live Supabase migration step via Gemini MCP before full auth/session validation.`

---

## 1. Current Repo Truth

### Branches

- `main`
  - deploy branch
  - Vercel syncs `main`
- `wip/tarangini-hardening-mixed`
  - preserved mixed older local state
  - pushed to origin as a safety snapshot

### Important committed history on `main`

- `a947f5d` `Add InOutHub design system constitution`
  - adds repo-root [DESIGN.md](/Users/vinay/dev/InOutHub-Events/DESIGN.md)
- `7a9a010` `Add Codex knowledge base workspace`
  - adds [docs/codex/README.md](/Users/vinay/dev/InOutHub-Events/docs/codex/README.md)
  - adds [docs/codex/current-live-mvp-workflow.md](/Users/vinay/dev/InOutHub-Events/docs/codex/current-live-mvp-workflow.md)
- `b6fb2f6` `Align super admin event role resolution with production`
- `3763c37` `Improve mobile auth handoff after magic link`
- `62384cc` `Align act audio asset schema with music record workflow`

### What is currently deployed on `main`

The deployed app on Vercel should include:
- audio asset schema/runtime alignment
- mobile auth-complete handoff flow after magic link
- super-admin effective event-role alignment
- Codex docs workspace
- committed repo-root `DESIGN.md`

It does **not** include the current local-only `/acts` simplification work described later in this file.

### Repo-level design truth

- [DESIGN.md](/Users/vinay/dev/InOutHub-Events/DESIGN.md)
  - this is now committed and should be treated as the authoritative design constitution
  - it preserves:
    - InOutHub dark command-center brand
    - premium backstage atmosphere
    - mobile-first operator clarity
    - surface-role model
    - progressive disclosure rules

### Durable Codex docs

- [docs/codex/README.md](/Users/vinay/dev/InOutHub-Events/docs/codex/README.md)
- [docs/codex/current-live-mvp-workflow.md](/Users/vinay/dev/InOutHub-Events/docs/codex/current-live-mvp-workflow.md)

These are the stable narrative/context lane.

### Important repo-level operating truth

- `AGENTS.md` is authoritative for operating rules and product guardrails
- `DESIGN.md` is authoritative for UI/UX design constitution
- `docs/codex/` is the Codex-owned durable docs lane
- Gemini `.gemini/...` brain files are **not** authoritative

---

## 1.1 Skills / Agent Context Worth Remembering

The repo session had these relevant skills available:
- `stitch-loop`
- `design-md`
- `react:components`
- `Mobile & Tablet UX Guardrails`
- `Product North Star`

Important conclusion from this session:
- `stitch-loop` is useful as an **exploratory prototype lane**
- it is **not** a safe source of production truth for this repo
- its outputs should be reviewed, then selectively translated into the real app

---

## 2. Current Local Working Tree

At the end of this session, the remaining local diff is:

- modified:
  - [src/components/acts/ActCard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/acts/ActCard.tsx)
  - [src/pages/ActsPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ActsPage.tsx)
  - [src/pages/PerformanceProfilePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/PerformanceProfilePage.tsx)
- untracked:
  - [SITE.md](/Users/vinay/dev/InOutHub-Events/SITE.md)
  - [next-prompt.md](/Users/vinay/dev/InOutHub-Events/next-prompt.md)
  - [docs/codex/session-handoff-2026-03-17.md](/Users/vinay/dev/InOutHub-Events/docs/codex/session-handoff-2026-03-17.md)
  - `queue/`
  - `site/`

Out-of-scope Gemini edits were cleaned up:
- [src/router/AppRouter.tsx](/Users/vinay/dev/InOutHub-Events/src/router/AppRouter.tsx) restored
- [task.md](/Users/vinay/dev/InOutHub-Events/task.md) restored
- `src/pages/marketing/CompetitionLandingPage.tsx` removed

### Files that should remain untouched unless explicitly requested

- [src/components/acts/ActCard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/acts/ActCard.tsx)
- [src/pages/ActsPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ActsPage.tsx)
- [src/pages/PerformanceProfilePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/PerformanceProfilePage.tsx)

Reason:
- these contain the current local `/acts` iteration the user asked **not** to sync yet

### Files that are safe to treat as exploratory / provisional

- [SITE.md](/Users/vinay/dev/InOutHub-Events/SITE.md)
- [next-prompt.md](/Users/vinay/dev/InOutHub-Events/next-prompt.md)
- everything under `queue/`
- everything under `site/`

---

## 3. What Was Implemented Locally In The Real App

These are real app changes, local only, not yet synced to git.

### `/acts` simplification pass

Files:
- [src/components/acts/ActCard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/acts/ActCard.tsx)
- [src/pages/ActsPage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ActsPage.tsx)
- [src/pages/PerformanceProfilePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/PerformanceProfilePage.tsx)

What changed:

#### Acts list card model
- moved to a two-step model
- collapsed card shows only:
  - act name
  - one overall state
  - one short critical-info line
- state label changed from `Blocked` to `Needs Attention` on the list card
- removed redundant CTA button from collapsed state
- card now supports:
  - tap anywhere -> expand inline
  - expanded state -> minimal helper copy + `View Details`
  - `View Details` opens the act detail screen

#### Interaction decision behind the design
- collapsed card = triage
- expanded inline card = lightweight intent confirmation
- detail screen = execution

This was chosen deliberately instead of:
- a duplicate CTA on the collapsed card
- or forcing the user straight into the detail screen with no intermediate reveal

#### Page-level `/acts`
- top summary chips were compressed into a smaller strip
- search, filters, and `Add Performance` were preserved
- the list now starts higher on mobile than before

#### Act detail Team tab
- the full-width mobile `Add Performer` and `Add Team Member` actions were reduced to compact top-right icon-first controls on mobile

#### Language changes
- list-facing `Blocked` became `Needs Attention`
- no new `On Deck` vocabulary was introduced on `/acts`
- the critical line stays operator-facing:
  - `Needs cast`
  - `Docs and music missing`
  - `Music missing`
  - `Intro pending`

Why this matters:
- `/acts` is materially calmer and less cockpit-like
- triage is on the list
- execution is in the detail screen

Build status:
- local builds passed after these changes during the session

Important:
- user explicitly said not to git-sync the `/acts` work until they say so

### Why the `/acts` work matters

Before this pass:
- the act cards felt like mini dashboards
- too many counters, tiles, preview surfaces, and secondary actions competed at once

After this pass:
- the list is more believable as a mobile triage surface
- the deeper act screen remains the place for real coordination work

This is a meaningful product direction and should be preserved when the next chat continues.

---

## 4. What Was Fixed Earlier And Is Already Deployed

### Audio asset schema/runtime mismatch

Problem:
- DB did not allow `act_assets.asset_type = 'Audio'`
- app logic expected `Audio`

What was done:
- UI and DB aligned
- production migration applied
- real insert tested and cleaned up

Relevant committed work:
- `62384cc`

Production status:
- confirmed live
- real DB insert tested
- temporary test row cleaned up

### Mobile auth handoff improvement

Problem:
- magic link from email opens browser, not installed PWA

What was done:
- redirect target changed to `/auth/complete`
- dedicated completion screen added
- clearer browser-to-PWA handoff for mobile users

Relevant committed work:
- `3763c37`

Behavioral expectation:
- email link still opens browser
- browser now lands on a dedicated completion page instead of generic login
- user then returns to the installed PWA more cleanly

### Super admin event-role resolution

Problem:
- `Open Sync Tools` could be greyed out because super admins were not resolving as `EventAdmin` in the effective role path

What was done:
- production DB fixed
- repo aligned
- Tarangini sync access verified in browser

Relevant committed work:
- `b6fb2f6`

Browser verification status:
- Tarangini `/participants`
- `Open Sync Tools` enabled for `vinay.prathy@ziffyvolve.com`
- `Sync Board` opens successfully

---

## 5. Gemini / Stitch-Loop Exploration Summary

We eventually allowed Gemini to run a fuller exploratory design loop because over-constraining it was slowing progress.

### What was created in the repo as exploratory artifacts

- [SITE.md](/Users/vinay/dev/InOutHub-Events/SITE.md)
- [next-prompt.md](/Users/vinay/dev/InOutHub-Events/next-prompt.md)
- `queue/`
- `site/`

### What `SITE.md` is

A loop manifest for the exploratory stitch-loop lane.

It is useful and worth keeping.

It currently reflects:
- Dashboard / Control Panel
- Roster
- Performances
- Act Detail Screen
- Show Flow
- Live Console

### What `next-prompt.md` is

A baton prompt for stitch-loop.

It is useful and worth keeping.

### What `queue/` and `site/` are

Prototype/reference output only.

They contain generated mockups for:
- global frame
- dashboard
- roster
- performances
- act detail
- show flow
- live console

They should not be treated as production truth.

### Exact generated prototype surfaces

The exploratory loop generated prototype/reference artifacts for:
- `global-frame`
- `dashboard`
- `roster`
- `performances`
- `act-detail`
- `show-flow`
- `live-console`

Generated HTML lives under both:
- `queue/`
- `site/public/`

Generated PNG references live under both:
- `queue/`
- `site/public/`

### Per-screen prototype takeaways

#### Global Frame
Keep:
- persistent shell concept
- compact header
- stable bottom nav

Reject:
- decorative glow-heavy framing
- over-literal shell styling
- fake context labels

#### Dashboard
Keep:
- shell confirms a strong orientation model

Reject:
- stitched shell reused too literally
- tendency toward “pulse” gimmicks and glowing indicators

#### Roster
Keep:
- reminder that triage should be obvious

Reject:
- over-decorated panels
- inconsistent relation to actual app language

#### Performances
Keep:
- confirms the product needs a strong list surface for scan/triage

Reject:
- live-broadcast / marketing-ish treatment
- decorative media-heavy act presentation

#### Act Detail
Keep:
- validates need for a clear shell and focused work zones

Reject:
- over-panelization
- progress-bar fetish
- glass-card overload

#### Show Flow
Keep:
- lineup as the hero
- current/live emphasis matters

Reject:
- artificial glow-heavy “live tracking”
- over-styled schedule artifacts

#### Live Console
Keep:
- large, high-confidence live controls
- command emphasis is appropriate here

Reject:
- too much decorative polish
- overly branded pulse effects
- more spectacle than calm control

### What the prototypes taught us

Worth keeping conceptually:
- persistent orientation header
- stable bottom nav
- swappable middle task surface
- the value of exploring the full app spine quickly

Worth rejecting visually:
- glassmorphism overuse
- `Nunito`
- radial glows
- token-heavy teal effects
- over-stylized marketing-ish polish
- invented placeholder content and fake event labels

### Why the exploration is still valuable

Even though the visual drift was frequent, the loop still provided signal:
- where persistent shell matters
- which surfaces benefit from stronger hierarchy
- which surfaces should remain quieter
- where live intensity is appropriate (`Live Console`)
- where it is harmful (`Dashboard`, `Performances`, much of `Act Detail`)

### Important cleanup that already happened

Gemini had also dirtied:
- [src/router/AppRouter.tsx](/Users/vinay/dev/InOutHub-Events/src/router/AppRouter.tsx)
- [task.md](/Users/vinay/dev/InOutHub-Events/task.md)
- a marketing page under `src/pages/marketing/`

Those were restored/removed.

So the exploratory lane is now isolated to:
- [SITE.md](/Users/vinay/dev/InOutHub-Events/SITE.md)
- [next-prompt.md](/Users/vinay/dev/InOutHub-Events/next-prompt.md)
- `queue/`
- `site/`

### Important trust note about Gemini

Gemini summaries were often directionally useful but not always file-accurate.

Rule for next chat:
- trust `git status`
- trust actual file contents
- do not trust Gemini’s “only these files changed” claims without checking the repo

---

## 6. Current Product / UX Judgments

### `/acts` current local direction

Assessment:
- much better than before
- no longer “mini dashboard cards”
- right direction for mobile-first triage

Current rough rating discussed:
- `/acts` flow overall: about `6.5/10`
- list surface specifically: better, demo-credible
- detail surface still too dense

### Design constitution judgment

The committed [DESIGN.md](/Users/vinay/dev/InOutHub-Events/DESIGN.md) is good enough to act as:
- design constitution for Codex
- design rulebook for Gemini
- guiding document for future stitch-loop usage

It explicitly preserves:
- current InOutHub brand
- dark command-center atmosphere
- progressive disclosure
- operator language over system jargon

### Biggest app-facing next opportunity

Recommended next real implementation pass:
- **Dashboard / Control Panel**

Reason:
- `/acts` was already improved locally
- dashboard is the next highest-leverage demo-facing surface
- it still has too much secondary metric density and equal-weight card competition

Recommended focus for the next implementation pass:
- emphasize 3 priority cards
- demote secondary metrics
- make action/navigation clearer
- preserve brand without dashboard clutter

### Why Dashboard is the best next pass

- `/acts` already moved materially in the right direction
- Dashboard is the next highest-visibility screen for demos
- the current Dashboard still behaves like a metrics surface more than a calm operator surface
- it is the most efficient next improvement with the highest user-facing payoff

---

## 7. Important User Preferences / Constraints

- do not work on landing page
- do not work on SMTP
- do not reopen auth architecture
- do not do lint cleanup
- keep changes narrow and reversible
- preserve current InOutHub visual brand
- preserve dark command-center feel
- mobile first now; tablet refinement later
- user wanted to review `/acts` locally before git sync
- user eventually allowed Gemini broad exploration, but repo truth should still be handled carefully

Also important:
- Gemini/Google IDE may edit `task.md` and similar files as part of its workflow
- Codex should treat those as volatile
- durable docs should live in repo-owned paths like `docs/codex/`

Additional preferences surfaced in this session:
- user is okay with Gemini exploring broadly if Codex later helps sort signal from noise
- user does not want to lose important design/context work to scratch paths
- user values fast momentum, but still wants disciplined extraction into real app work

---

## 8. Recommended Next Steps In The New Chat

### Best next action

Proceed with a real app-facing **Dashboard / Control Panel simplification pass**.

Do not spend more time on stitch-loop planning.

### Suggested order

1. Inspect current local diff
2. Preserve the current separation:
   - real app work: `/acts` files
   - exploratory lane: `SITE.md`, `next-prompt.md`, `queue/`, `site/`
3. Implement Dashboard simplification in app code locally
4. Build and verify locally
5. Then decide what to commit:
   - likely commit `SITE.md` / `next-prompt.md` separately if desired
   - keep `queue/` / `site/` out of git unless explicitly wanted
   - do not accidentally mix `/acts` local UI work with unrelated exploratory files

### Practical git guidance for the next chat

If committing in the next chat:

Commit separately:
1. `docs/codex/session-handoff-2026-03-17.md`
2. optional loop artifacts:
   - [SITE.md](/Users/vinay/dev/InOutHub-Events/SITE.md)
   - [next-prompt.md](/Users/vinay/dev/InOutHub-Events/next-prompt.md)
3. real app UI work:
   - `/acts` files
   - and later Dashboard files

Do **not** combine:
- exploratory stitch artifacts
- `/acts` local UI changes
- future Dashboard real app work
in one commit unless the user explicitly asks for that bundling.

### Practical review guidance for the next chat

Before doing any new work:
- inspect `git status`
- preserve the current lane split
- keep prototype output as reference, not authority
- avoid re-opening stitch-loop planning

If user wants progress quickly:
- go straight to Dashboard simplification implementation

### If the next chat needs a direct instruction

Use something like:

`Read docs/codex/session-handoff-2026-03-17.md first. Then continue with the next real app-facing UI simplification pass on Dashboard / Control Panel, keeping the current local /acts work unsynced and preserving the exploratory stitch-loop artifacts as reference only.`

### Short continuation prompt for the next chat

Use this:

`Read docs/codex/session-handoff-2026-03-17.md first. Then inspect git status and continue with the next real app-facing UI simplification pass on Dashboard / Control Panel. Do not sync the local /acts changes yet. Treat SITE.md, next-prompt.md, queue/, and site/ as exploratory reference only unless explicitly asked to commit them.`

---

## 9. Final State Snapshot

### Keep

- [DESIGN.md](/Users/vinay/dev/InOutHub-Events/DESIGN.md)
- [docs/codex/current-live-mvp-workflow.md](/Users/vinay/dev/InOutHub-Events/docs/codex/current-live-mvp-workflow.md)
- [docs/codex/session-handoff-2026-03-17.md](/Users/vinay/dev/InOutHub-Events/docs/codex/session-handoff-2026-03-17.md)
- local `/acts` UI work
- [SITE.md](/Users/vinay/dev/InOutHub-Events/SITE.md)
- [next-prompt.md](/Users/vinay/dev/InOutHub-Events/next-prompt.md)
- `queue/`
- `site/`

### Do not resurrect

- Gemini router drift
- Gemini `task.md` edits
- Gemini marketing page

### Core decision

Planning/exploration is sufficient.
Next chat should focus on **execution in the real app**, not more loop setup.

---

## 10. Final One-Sentence Summary

The repo is now in a usable state where the real app lane contains meaningful local `/acts` improvements, the exploratory stitch-loop lane is isolated as reference, the design constitution is committed, and the next chat should spend its energy on implementing the Dashboard simplification in the actual app rather than doing more planning.
