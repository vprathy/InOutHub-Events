# Launch Transition: March 15, 2026

Repo: `/Users/vinay/dev/InOutHub-Events`  
Branch: `main`  
Launch target: Tarangini / 2026 Ugadi on May 16, 2026

## Use This File First

If a new chat needs to take over, point it here first:

- `docs/handoffs/2026-03-15-launch-transition.md`

This is the current in-repo transition artifact. External Gemini "brain" files are not authoritative.

## Mission

Continue launch-hardening without broadening scope.

Current product framing:
- phone-first manager workflow: Dashboard, Participants, Performances
- tablet-first operator workflow: Show Flow, Stage Console
- support capability: Intro pipeline, participant assets, act readiness
- not in scope now: broad media platform, general chat, ticketing, payments, desktop polish

Current priority order:
1. trust/reliability on live operator and manager paths
2. keep schema/RLS/runtime aligned
3. keep event-time semantics safe for remote users
4. only bounded, independently testable slices

## Important Constraints

- Do not revert unrelated dirty files.
- Do not blindly touch:
  - `docs/audits/knowledge-report.md`
  - `docs/plans/tarangini-2026-cutline.md`
  - `docs/verification/gate-15-intro-system-revalidation.md`
  - `docs/walkthrough.md`
  - `task.md`
  - `supabase/functions/generate-act-assets/index.ts`
  - `supabase/.temp/`
- Build has been passing after each code slice.
- Local dev app target is `http://127.0.0.1:4173/`
- Prefer that over `localhost` for verification.
- Gemini repeatedly edited docs/tasks even when told not to. Treat Gemini as verifier, not source-of-truth editor.

## Current State Summary

### Verified / Stable

- Gate 15 intro loop: passed
- Stage Console tablet rehearsal path: passed
- manager mobile compaction and CTA surfacing: shipped
- performance workspace mobile density pass: shipped
- participant workspace mobile density pass: shipped
- roster create regression: fixed
- act readiness feature: shipped, live, and verified
- event-time display hardening: shipped and live
- readiness RLS alignment: shipped and live
- act/performance activity feed:
  - surfaced in the Performance Workspace via `Activity` tab
  - scoped DB path and capture gaps closed for cast, assets, and requirements
  - EventAdmin and StageManager browser verification passed
  - realtime refresh after local mutations passed
- StageManager arrival-status updates:
  - no longer rely on direct `acts` table writes
  - scoped RPC path is live and browser-verified
- participant manual upload path:
  - modal responsiveness fixed
  - table RLS fixed
  - storage bucket upload policy fixed live and tracked in repo
  - ad-hoc browser happy path passed: upload, preview, delete, auto-refresh, mobile fit
- participant activity feed:
  - scoped RPC path replaces raw `audit_logs` reads
  - browser verification passed
- performance arrival-status wording:
  - `Not Here`, `Checked In`, `Backstage`, `On Deck`
  - mobile browser verification passed on key operator surfaces

### Still Worth Watching

- legacy malformed readiness dates can still render badly for old bad records
- templated participant upload branch is not yet browser-verified
- stage console bootstrap still needs a browser check on a stage without an existing `stage_state` row
- `asset_templates` / related RPC physical-truth coverage in `database_schema.sql` should be reviewed

## Most Important Recent Commits

- `34caf9d` `track participant asset storage upload policy`
- `15e09c9` `prefetch playable intro responses`
- `19d67e6` `lazy load intro prototype route`
- `92ce99d` `lazy load intro video player`
- `a1406b0` `allow participant asset ops for stage managers`
- `55e978e` `lazy load heavy operator routes`
- `b9ab142` `fix participant upload modal mounting`
- `7a11a29` `simplify pwa update registration`
- `b64dea9` `tighten operator action wording`
- `c34bcdb` `tighten modal trust states`
- `0974712` `clarify asset actions and upload feedback`
- `d64aba1` `add event timezone contract`
- `147e4a7` `align readiness rls with stage operations`
- `0435538` `anchor key displays to event time`
- `b4ab8ac` `polish readiness date handling`

## Runtime / Infrastructure Notes

### Event Time

- The pilot now uses an event-time-first contract.
- `events.timezone` was added and applied live.
- Main operational surfaces now read event time instead of blindly using viewer-local browser time:
  - lineup
  - stage console
  - readiness practice times

### Readiness

- New readiness tables are live:
  - `act_readiness_practices`
  - `act_readiness_items`
  - `act_readiness_issues`
- `StageManager` readiness writes were missing live at one point and were fixed.
- Readiness flow is now structurally and operationally healthy.

### Participant Uploads

- There were two real blockers:
  - table RLS on `participant_assets`
  - missing storage `INSERT` policy on the `participant-assets` bucket
- Both were fixed live.
- The storage policy fix is tracked in:
  - `supabase/migrations/20260315_allow_authenticated_participant_asset_uploads.sql`

## Audit / Accountability Status

- DB-level audit capture exists via `audit_logs` and triggers for:
  - `participants`
  - `acts`
  - `events`
  - `organization_members`
  - `lineup_items`
  - `stage_state`
  - `act_participants`
  - `act_assets`
  - `act_requirements`
  - `act_readiness_practices`
  - `act_readiness_items`
  - `act_readiness_issues`
- Participant workspace surfaces audit history through a scoped RPC.
- Act/performance workspace surfaces comparable activity through the `Activity` tab in the performance workspace.
- Raw `audit_logs` table access should still be treated as privileged; UI surfaces rely on scoped RPCs.

## Performance / Latency Status

- Major route-level code splitting is done.
- Heavy operator pages are lazy-loaded.
- Intro player is lazy-loaded.
- Prototype-only media dependencies were isolated away from normal operator routes.
- `Play Intro` now benefits from a small prefetch/cache warm-up path.

Current read:
- no obvious frontend architecture issue remains that should cause major lag on `START SHOW` or `Play Intro`
- remaining latency risk is backend/network/device conditions, not obvious bundle or blocking UI mistakes

## Local Runtime

- Local app target: `http://127.0.0.1:4173/`
- Do not assume `localhost` behavior matches

## Dirty / User-Owned Files

Do not overwrite these casually:
- `docs/audits/knowledge-report.md`
- `docs/plans/tarangini-2026-cutline.md`
- `docs/verification/gate-15-intro-system-revalidation.md`
- `docs/walkthrough.md`
- `task.md`
- `supabase/functions/generate-act-assets/index.ts`

There are also multiple untracked docs and `supabase/.temp/` artifacts in the worktree.

## Recommended Next Steps

Highest-value next slices:

1. Final manual trust checks on real devices / browser
- stage console start/show/play intro responsiveness
- stage bootstrap on a stage without existing `stage_state`
- readiness add flows on mobile

2. Templated participant upload verification
- verify required-assets upload/replacement when suitable templates exist

3. Legacy data cleanup
- identify and clean malformed old readiness datetime rows
- ensure they never render as `Invalid date`

4. Schema source-of-truth cleanup
- reconcile `database_schema.sql` with runtime/types for `asset_templates` and related RPCs if they are part of the supported live contract

## What Not To Reopen Without Good Reason

- Gate 15 verification work
- broad bottom-nav rewrite
- generic “dead link” hunts without a concrete control
- full logistics module redesign
- manifest-wide orientation lock
- major schema redesign beyond bounded launch fixes

## Useful Files To Re-ground In

- `database_schema.sql`
- `src/hooks/useActs.ts`
- `src/hooks/useParticipants.ts`
- `src/pages/ActsPage.tsx`
- `src/pages/PerformanceProfilePage.tsx`
- `src/pages/ParticipantProfilePage.tsx`
- `src/pages/LineupPage.tsx`
- `src/pages/StageConsolePage.tsx`
- `src/components/console/LivePerformanceController.tsx`
- `src/lib/eventTime.ts`
- `src/lib/actReadiness.ts`
- `src/lib/introCapabilities.ts`
- `supabase/migrations/20260315_add_act_readiness_tables.sql`
- `supabase/migrations/20260315_relax_readiness_rls_for_stage_managers.sql`
- `supabase/migrations/20260315_add_event_timezone.sql`
- `supabase/migrations/20260315_allow_participant_asset_ops.sql`
- `supabase/migrations/20260315_allow_authenticated_participant_asset_uploads.sql`
