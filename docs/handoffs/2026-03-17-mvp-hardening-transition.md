# MVP Hardening Transition: March 17, 2026

Repo: `/Users/vinay/dev/InOutHub-Events`  
Branch: `main`  
Latest pushed commit: `ba9a0f45bcbc5923e473807520904073fb121e08`  
Primary app domain: `https://events.inouthub.ziffyvolve.com`  
Local app target: `http://127.0.0.1:4173/`

## Read First

For any new chat, re-ground in this order:

1. `database_schema.sql`
2. `AGENTS.md`
3. `task.md`
4. `docs/handoffs/2026-03-17-mvp-hardening-transition.md`
5. `docs/handoffs/2026-03-16-stabilization-transition.md`

External Gemini files are not authoritative.

## Current Priority

The priority is now **MVP hardening**, not landing-page polish and not broader feature expansion.

Working rule:
- if the app creates enough friction that operators fall back to spreadsheets, the MVP is failing

Near-term production spine:
- Login and access
- Org/Event selection
- Participants / Roster
- Sync Board
- Acts / Performances
- Performance Workspace
- Stage Console
- Signout / session continuity

## What Is Working Now

### Auth rollout

App-side auth rollout is now substantially in place and pushed.

Current production-safe behavior intended:
- real `/login` magic-link screen
- `AuthGuard` protects signed-out access
- `/dev/login` is dev-only in repo logic
- signout routes to `/login`
- org/event selection clears on signout
- sync/admin surfaces are role-gated in UI

Relevant commits already pushed:
- `c66fc38` `Ship rollout-safe auth entry and dev-login gating`
- `8f9de74` `Repair auth rollout build dependencies`
- `b469173` `Refine login screen customer copy`
- `ba9a0f4` `Clarify one-time sign-in link behavior`

### Production/domain state

Current observed status:
- `https://events.inouthub.ziffyvolve.com/` now reaches the login flow instead of defaulting to the old dev-login path
- this means the auth blocker repair is effectively live

### Login copy

Current login copy is customer-facing and includes the one-time-link clarification:
- badge: `Secure Sign In`
- headline: `Sign in to InOutHub`
- helper text explains secure sign-in link
- support text explains one-time-use link behavior

## Important Temporary Tradeoff

To get Vercel building cleanly, the production repair intentionally removed dependencies on uncommitted local work.

That means:
- the auth blocker fix was preserved
- some non-auth local work was intentionally not included in production-safe routing/build paths

Most important consequence:
- local `/landing-v3` is currently not active in the pushed production-safe router
- this was an intentional repair tradeoff, not a product decision

Landing-page work is explicitly parked for now.

## What Is Parked

Do not prioritize these right now:
- SMTP polish
- landing-page merge/polish
- broader marketing route cleanup
- external-team workflow completion

External-team / Path B work remains local and not fully committed as a clean production-ready slice.

## Biggest MVP Risks Now

The biggest risk is operational fallback to manual methods.

Highest spreadsheet-fallback risks:
- Sync Board is unclear, slow, or feels less trustworthy than the spreadsheet
- roster readiness is not easier to scan than a sheet
- acts and roster feel disconnected
- performance updates do not feel immediate or reliable
- session/selection state feels inconsistent

## Highest-Priority Next Hardening Checks

### 1. Login -> selection -> dashboard
- signed out route redirects cleanly to `/login`
- magic link sign-in works
- org selection works
- event selection works
- no stale selection confusion after signout or user switch

### 2. Roster scan path
- `/participants` loads cleanly
- search/filter/open-participant is fast and trustworthy
- readiness and follow-up status are clearer than spreadsheet scanning

### 3. Sync Board trust path
- EventAdmin can open sync tools
- StageManager cannot mutate sync/admin surfaces
- sync result is visible enough that operators know what changed

### 4. Acts -> Performance Workspace path
- `/acts` remains a trustworthy scan/triage surface
- opening a performance is fast
- status/next action are clear

### 5. Stage Console continuity
- console still reflects current state
- no regressions after auth/route cleanup

### 6. Signout / re-entry
- signout returns to `/login`
- selection is cleared
- re-login behaves like a new session

## Most Likely Regression Areas After Auth Repair

- route protection edges
- org/event selection persistence and clearing
- EventAdmin vs StageManager UI gating mismatches
- any route that was temporarily simplified for build safety
- local vs deployed behavior differences due to uncommitted local work

## Local Worktree Warning

The worktree is still very dirty.

Important:
- many docs are modified/untracked
- many product/UX/staging/landing files are modified/untracked
- do not casually stage broad file sets
- isolate the next hardening work carefully

## Recommended Next Sequence

1. Browser-validate the live auth path on the real domain:
   - `/`
   - `/login`
   - signed-out protected route redirect
   - signout
2. Validate StageManager vs EventAdmin access differences
3. Validate roster + sync trust path
4. Validate acts -> performance workspace path
5. Validate stage console continuity
6. Only after core operator trust is solid, return to parked work like landing pages or external-team flow completion

