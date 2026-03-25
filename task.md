# Operational Roadmap & Validation Gates

This file is the tactical truth for rollout readiness.

Working rule:
- **Phase 1** = customer pilot readiness for one event operated end-to-end on mobile/PWA
- **Phase 2** = structural cleanup, support tooling, and premium workflow upgrades after Phase 1 is stable

---

## Phase 1: Pilot Rollout Readiness

### Exit Criteria
- [ ] One event can be run end-to-end on mobile/PWA across roster, participants, performances, show flow, and live console.
- [ ] Role behavior is correct for super admin, org admin, event admin, stage manager, act admin, and limited/member users.
- [ ] Requirements admin, participant profiles, and performance profiles reflect the same policy truth.
- [ ] The core operator flow is compact, stable, and free of major mobile navigation or density regressions.

### Open Work
- [ ] Validate org/event workspace selection on device, including long-name handling and create/edit affordances.
- [ ] Validate Dashboard on mobile, including top metrics, Response Queue behavior, and return-focus from Special Requests.
- [ ] Verify dashboard RBAC by role for admin, event-ops, and limited/member views.
- [ ] Run the Phase 1 operator rehearsal across Access, Requirements, participant/performance profiles, Show Flow, and Live Console.
- [ ] Finalize the Phase 1 people model for manual entry so crew/support and participants do not drift.
- [ ] Keep signed-in account profile work disabled unless explicitly prioritized.
- [ ] Define the first readiness insight set so Dashboard can explain participant/performance prep risk, blocked work, and unresolved readiness instead of only linking to tools.
- [ ] Define the tenant onboarding automation flow from source connection to first trusted sync, including success metrics for time-to-first-value.
- [ ] Document the operational resilience pillars for product and pitch use: refresh recovery, live-pointer recovery, protected live window, and role-safe execution.

### Performance Intake & Staging
- [x] **Backend/Supabase:** Performance Request Staging model (Table, RLS, Audit).
- [x] **Intake Review:** Implement UI for Review -> Approve/Reject flow.
- [x] **Operational Conversion:** Implement logic for Approved Request -> Operational Act.
- [x] **History:** Intake Audit Timeline visibility for operators.

### UX Guardrails
- [ ] Do not redesign while wiring; keep implementation aligned to the agreed surface model.
- [ ] Keep Dashboard metrics and Response Queue MECE.
- [ ] Standardize header, sticky strip, and bottom nav as the shared shell container.
- [ ] Keep empty states and helper text compact and operational.
- [ ] Keep Dashboard evolving toward `insights first, tools second` without weakening the operator workflows underneath.

### Requirements / Readiness Contract
- [ ] Keep participant requirements limited to actual admin-defined obligations, not inbound participant requests.
- [ ] Keep performance requirements limited to the approved Phase 1 set.
- [ ] Review the current hybrid requirements bridge and define the Phase 2 cleanup path.
- [ ] Define and implement post-approval readiness convergence so converted requests seed the right operational follow-up instead of stopping at shell creation.

Phase 2 roadmap links:
- intake mapping review / confirm / lock: [/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-mapping-review-and-lock.md](/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-mapping-review-and-lock.md)
- post-approval readiness convergence: [/Users/vinay/dev/InOutHub-Events-main/docs/plans/post-approval-readiness-convergence.md](/Users/vinay/dev/InOutHub-Events-main/docs/plans/post-approval-readiness-convergence.md)
- readiness insights layer: [/Users/vinay/dev/InOutHub-Events-main/docs/plans/readiness-insights-layer.md](/Users/vinay/dev/InOutHub-Events-main/docs/plans/readiness-insights-layer.md)
- intake and review roadmap status: [/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-and-review-unification.md](/Users/vinay/dev/InOutHub-Events-main/docs/plans/intake-and-review-unification.md)
- onboarding go / no-go rubric: [/Users/vinay/dev/InOutHub-Events-main/docs/plans/new-tenant-onboarding-go-no-go-rubric.md](/Users/vinay/dev/InOutHub-Events-main/docs/plans/new-tenant-onboarding-go-no-go-rubric.md)
- operator screen organization: [/Users/vinay/dev/InOutHub-Events-main/docs/plans/operator-screen-organization-framework.md](/Users/vinay/dev/InOutHub-Events-main/docs/plans/operator-screen-organization-framework.md)

### Intro System Final Checks
- [ ] Verify approved intro playback timing and cinematic polish.
- [ ] Confirm the current intro loop remains stable: approved photo selection, uploaded music preference, build, approve, preview, and console playback.

---

## Phase 2: Post-Pilot Expansion

### Intro Audio Intelligence
- [ ] Extend intro compositions with explicit clip metadata: `startMs`, `durationMs`, `fadeInMs`, `fadeOutMs`, and optional confidence.
- [ ] Add operator-controlled audio trim and preview in Intro Builder.
- [ ] Add smart audio clip suggestion that avoids slow openings and favors energetic segments with a smooth lead-in.
- [ ] Persist clip metadata cleanly into intro approval and stage playback.

### Architecture Cleanup
- [ ] Replace or formalize the hybrid bridge between `requirement_policies`, `requirement_assignments`, and file/template surfaces.
- [ ] Remove policy-code alias drift and legacy bridge assumptions from profile consumers.
- [ ] Finalize a canonical People model spanning participants, crew/support, manual entry, and source-synced people.

### Support & Admin Hardening
- [ ] Keep Super Admin internal-only and out of customer workflows.
- [ ] Add a runbook or internal tooling for super-admin bootstrap and audit.
- [x] Capture customer-side intake workspace errors with support codes for internal review.
- [ ] Consider scoped support access or impersonation instead of long-term global super-admin dependence.

### Growth & Proof
- [ ] Use the first tenant onboarding cycle to prove mapping review / confirm / lock against a second real source shape.
- [ ] Add the first readiness insight set to the roadmap before broad onboarding: blocked performances, missing participant follow-up, intro/media readiness, unresolved contact or special-request gaps, and later execution drift.
- [ ] Position operational resilience as a product pillar in internal materials: live refresh recovery, execution continuity, and safe RBAC under pressure.

### UI System Cleanup
- [ ] Finish the card/pill density overhaul across Dashboard, Lineup, Participants, and profiles.
- [ ] Decide whether profile screens move to one shared MECE model in a coordinated pass.

---

## UI Backlog

- [ ] Flatten `ActCard` mini-grids into one compact summary line.
- [x] Keep the participant ActionMenu inline with shell-level `Edit Profile`.
- [ ] Remove redundant `PageHeader` subtitles that repeat visible information.
- [ ] Eliminate surface-panel double nesting on Dashboard, Lineup, and Participants.
- [ ] Downgrade pills-as-labels to plain text unless they convey live status.

---

## Verified Foundation

- [x] Show Flow
- [x] Live Execution
- [x] PWA initial setup
- [x] OTP-first pilot validation
- [x] Access admin workflow validation
- [x] Intro Builder persistence loop
- [x] Trust-header / CORS validation for internal AI pipeline calls
- [x] Universal mobile/tablet UX standardization baseline
- [x] Dashboard readiness baseline
- [x] Performance workspace deep-dive routes
- [x] Supabase operational field hardening
- [x] Vertex connectivity and persistence pipeline
- [x] Gemini prompt engineering handoff
- [x] Imagen production path refinement
- [x] Audio generation and storage flow
- [x] Intro Builder assembly flow
- [x] Intro approval vs draft distinction
- [x] Console playback wiring for approved intros
- [x] Performance Intake backend foundation (Staging, RLS, Lineage)

Historical note:
- `main` worktree is canonical: `/Users/vinay/dev/InOutHub-Events-main`
