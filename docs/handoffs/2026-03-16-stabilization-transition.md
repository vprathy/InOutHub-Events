# Stabilization Transition: March 16, 2026

Repo: `/Users/vinay/dev/InOutHub-Events`  
Branch: `main`  
Local app target: `http://127.0.0.1:4173/`  
Current mode: launch hardening / UX stabilization, not broad feature expansion

## Read This First

If a new chat takes over, read these in order:

1. `database_schema.sql`
2. `AGENTS.md`
3. `task.md`
4. `docs/handoffs/2026-03-16-stabilization-transition.md`
5. `docs/handoffs/2026-03-15-launch-transition.md` for prior context only

External Gemini "brain" files are not authoritative.

## Working Contract

- Treat this as a product-quality consolidation sprint, not a feature sprint.
- Do not casually edit user-owned dirty docs/files.
- Gemini is useful as verifier and browser operator, not source-of-truth editor.
- Prefer repo-grounded implementation and bounded verification slices.
- Mobile-first operational UX is the north star.

## Current Launch-State Summary

The recent high-value reliability and accountability slices are now mostly complete.

### Completed And Verified

- Act/performance `Activity` feed is shipped and verified.
  - Live DB migration applied.
  - Performance Workspace `Activity` tab exists.
  - EventAdmin browser verification passed.
  - StageManager browser verification passed.
  - realtime refresh after local mutations now passes.

- StageManager arrival-status updates are fixed and verified.
  - Direct `acts` writes were replaced with a scoped RPC path.
  - Browser verification confirmed no more `406` on StageManager status updates.
  - Activity feed/count update immediately after status change.

- Participant activity/audit feed is aligned and live.
  - Participant workspace now uses scoped RPC instead of raw `audit_logs`.
  - Browser verification passed.

- Participant manual upload ad-hoc path is browser-verified.
  - upload, preview, delete, auto-refresh, and mobile viewport fit all passed.

- Performance arrival-status wording is clarified and browser-verified on mobile.
  - Stored values remain:
    - `Not Arrived`
    - `Arrived`
    - `Backstage`
    - `Ready`
  - UI labels now show:
    - `Not Here`
    - `Checked In`
    - `Backstage`
    - `On Deck`

- Stage Console bootstrap on missing `stage_state` is verified.
  - Console loads cleanly even if `stage_state` row is absent.
  - `START SHOW` creates/persists `stage_state` and initializes the live pointer.
  - Gemini verified this with a temporary fresh stage and cleaned it up.

- Participant roster readiness/count logic is corrected.
  - The prior mismatch where a badge count could imply "ready" while no names appeared was fixed.

- Demo seed/reset was improved.
  - explicit event role fixtures
  - deterministic readiness seed data
  - duplicate-event CLI seed bug fixed
  - reset copy improved

## Completed But Still Worth A Quick UX Pass

- Intro Video Builder was simplified substantially in code, but has not yet had a fresh browser verification after the rewrite.
  - The old overflowing horizontal step strip was removed.
  - The screen now has a single guidance flow:
    1. select approved photos
    2. arrange photos
    3. generate backdrop
    4. review preview
    5. approve for stage
  - This is a likely next UX verification target.

## Remaining True Gaps

### 1. Templated participant upload branch

Still not browser-verified.

Current situation:
- ad-hoc upload path is proven
- required-assets / templated upload branch has not been exercised because suitable templates were not present in the verified environment

### 2. `asset_templates` physical-truth drift

Runtime and generated types clearly use:
- `asset_templates`
- related bulk assignment behavior such as `assign_asset_template_bulk`

But the physical definition is not clearly present in `database_schema.sql`.

Treat this as real schema/runtime drift.

Important:
- do not invent missing physical schema blindly
- reconcile carefully from repo history and live contract only if enough evidence exists

### 3. UX stabilization pass

The product now has enough capability that UX coherence matters more than adding more surface area.

Priority direction already agreed:
- pause broad feature expansion
- run a focused UX stabilization / consolidation sprint

Anchor operational surfaces:
- Acts list = scan / triage surface
- Performance Workspace = coordination surface
- Stage Console = live execution surface

## Current Tactical Ledger

`task.md` has been restored as the tactical launch ledger and should be preferred over Gemini-edited fragments.

Current state from `task.md`:
- Verified:
  - Gate 15 intro loop revalidation
  - event-time display contract
  - act readiness and StageManager RLS alignment
  - Performance Workspace activity feed
  - StageManager arrival-status update path
  - participant activity/audit feed
  - participant manual upload ad-hoc happy path
  - performance arrival-status wording clarity
  - Stage Console bootstrap verification
- Needs Revalidation:
  - templated participant upload branch
- Known Drift / Cleanup:
  - `asset_templates` physical-truth reconciliation
  - `docs/walkthrough.md` cleanup
  - review Gemini-edited docs before treating them as durable truth

## Files Most Recently Touched For Launch Hardening

### Audit / Activity / Status
- `database_schema.sql`
- `src/hooks/useActs.ts`
- `src/pages/PerformanceProfilePage.tsx`
- `src/hooks/useParticipants.ts`
- `src/pages/ParticipantProfilePage.tsx`
- `src/types/database.types.ts`
- `src/types/domain.ts`
- `supabase/migrations/20260315_add_act_activity_feed.sql`
- `supabase/migrations/20260315_add_participant_activity_feed.sql`
- `supabase/migrations/20260315_allow_stage_manager_act_status_updates.sql`

### Mobile / Label / UX cleanup
- `src/pages/ParticipantsPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/ActsPage.tsx`
- `src/pages/LineupPage.tsx`
- `src/components/acts/StatusPicker.tsx`
- `src/components/acts/ActCard.tsx`
- `src/components/lineup/LineupItemCard.tsx`
- `src/components/console/LivePerformanceController.tsx`
- `src/components/acts/IntroVideoBuilder.tsx`

### Stage bootstrap / seed
- `src/hooks/useStageConsole.ts`
- `src/hooks/useLineup.ts`
- `src/lib/dev/seed.ts`
- `src/lib/dev/seedDemoEvent.ts`
- `src/pages/dev/DevQuickLogin.tsx`

## Dirty / Sensitive Files

Do not casually overwrite these without explicit need:
- `docs/audits/knowledge-report.md`
- `docs/plans/tarangini-2026-cutline.md`
- `docs/verification/gate-15-intro-system-revalidation.md`
- `docs/walkthrough.md`
- `task.md`
- `supabase/functions/generate-act-assets/index.ts`
- `supabase/.temp/`

There are also many untracked docs and audit artifacts in the worktree.

## Git / Runtime Status

- `main` is synced with `origin/main` at branch tip (`0 ahead / 0 behind` when last checked).
- Worktree is dirty.
- Build has been passing after each major bounded slice.

## Recommended Immediate Next Sequence

### Option A: Continue stabilization

1. Verify the rewritten Intro Video Builder in browser on mobile.
2. Start the first UX stabilization implementation slice:
   - shared shell/header/vertical rhythm
   - Acts list as reference scan surface
   - Performance Workspace top-of-page simplification
3. After shared-system cleanup, tackle Participant Workspace trust cleanup.

### Option B: Finish remaining trust checks first

1. Verify templated participant upload branch when a valid template scenario exists.
2. Then return to UX stabilization.

## UX Stabilization Direction

Do not start with broad coding in a new chat without first re-grounding in the current app.

Agreed framing:
- phone-first operational product
- compact vertical layout
- content above chrome
- no dead controls
- no misleading placeholders
- clear scan surfaces
- clear action surfaces
- strong operator trust
- consistent list / workspace / console roles

Priority model for issues:
- `P0`: broken, misleading, or trust-damaging
- `P1`: materially hurts operator speed/usability
- `P2`: polish or consistency gap

Shared-system fixes should be preferred before local screen hacks.

Likely shared files to touch first:
- `src/components/layout/PageHeader.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/BottomNav.tsx`

## Gemini Usage Guidance

Use Gemini for:
- browser smoke tests
- mobile viewport verification
- live Supabase verification when a migration or SQL proof is needed

Do not use Gemini as:
- source-of-truth document editor
- planner for repo state
- authority over in-repo handoffs

Gemini repeatedly edited `task.md` and `docs/walkthrough.md`. Treat those edits as untrusted unless reviewed.

## New Chat Prompt

Use this exact prompt to start the next chat:

```text
Read `docs/handoffs/2026-03-16-stabilization-transition.md` first and treat it as the current in-repo handoff source of truth.

Context:
- repo: `/Users/vinay/dev/InOutHub-Events`
- branch: `main`
- local app target: `http://127.0.0.1:4173/`
- do not rely on external Gemini “brain” files
- do not casually edit user-owned dirty docs/files
- Gemini is verifier only, not source-of-truth editor

Important:
- `database_schema.sql` is physical truth
- `AGENTS.md` is operational truth
- `task.md` is the tactical launch ledger

Current state:
- act/performance activity feed is shipped and browser-verified
- StageManager arrival-status updates are fixed and browser-verified
- participant activity feed is live and verified
- participant manual upload ad-hoc happy path is browser-verified
- stage console bootstrap on missing `stage_state` is verified
- performance arrival-status wording pass is verified on mobile
- Intro Video Builder was recently simplified for coherence but still needs a fresh browser UX verification
- templated participant upload branch is still not browser-verified
- `asset_templates` remains a schema/runtime source-of-truth drift item

Goal:
Continue with a bounded stabilization-first workflow, not broad feature expansion.

What I want back first:
1. a concise current-state read
2. the highest-value next bounded slice
3. whether the next step should be:
   - Intro Video Builder mobile/browser verification
   - first UX stabilization implementation slice
   - templated participant upload verification path
   - `asset_templates` source-of-truth reconciliation
4. any drift or risk that should be called out before coding

Constraints:
- optimize for productivity
- prefer shared-system fixes over one-off screen hacks
- keep mobile-first live-ops UX as the north star
- do not broaden into new modules/features before stabilization
```
