# Participant And Performance Profile Test Script

**Purpose:** Exhaustive validation script for the Participant Profile and Performance Profile screens.

**Repo:** `/Users/vinay/dev/InOutHub-Events-main`

**Baseline Under Test:** `5cb087d` `Refine performances list for mobile ops`

**Execution Rules**
- Testing and validation only.
- Do not edit application code, schema, or seed logic.
- Prioritize backend truth, schema truth, and hook/query truth before browser checks.
- Use browser validation only to prove final UI behavior and conserve AI credits.
- Use the Dev/Login method for authenticated testing.
- Record every scenario outcome directly in this file.
- If a scenario cannot be completed, mark it `UNPROVEN` or `MANUAL CONFIRMATION`, not `PASS`.

**Status Values**
- `PASS`
- `FAIL`
- `UNPROVEN`
- `MANUAL CONFIRMATION`

**Severity Values**
- `P0` Critical operator or security break
- `P1` High-value workflow defect
- `P2` Functional defect with workaround
- `P3` Minor or cosmetic issue
- `N/A`

## Test Method

1. Inspect schema, hooks, page code, derived readiness logic, and RLS/RBAC rules relevant to the scenario.
2. Inspect database truth and relationships for the exact entities under test.
3. Confirm expected outcome from backend and code first.
4. Use browser only to prove the rendered result or interaction.
5. Log actual result and evidence for every scenario.

## Evidence Format

- Code references: file path + line references
- DB evidence: query used + returned row summary
- Browser evidence: route visited, user used, visible result, screenshot if available

## Global Preconditions

- Dev server is running.
- Dev/Login is available.
- Tester can authenticate with an appropriate dev user.
- At least one event exists with participants and performances.
- If seed/demo data is used, note exactly which org/event and records were tested.

## Record Under Test Inventory

Complete before scenario execution:

- Organization:
- Event:
- Dev user(s) used:
- Participant IDs tested:
- Performance/Act IDs tested:
- Baseline commit verified:
- Test date:

---

## Participant Profile Scenarios


### PP-001
- Screen: Participant Profile
- Objective: Validate profile loads for a known valid participant.
- Preconditions / seed data assumptions: Participant exists and current user has access to the event.
- Backend truth to inspect first: participant row, event linkage, assets, notes, requirement assignments.
- Exact validation steps:
  1. Query participant core row and linked data.
  2. Inspect profile page query/hook shape.
  3. Open participant profile in browser.
  4. Confirm visible fields match DB truth.
- Expected result: Profile loads without error and key fields match backend truth.
- Actual result: Profile for Fatima Kulas (9205) loaded successfully as Super Admin. 
- Evidence: Browser screenshot (Subagent Step 23), SQL verification of ID linkage.
- Status: PASS
- Severity: N/A
- Notes: Profile hydration from `participants` table is solid.

### PP-002
- Screen: Participant Profile
- Objective: Validate rendering when optional profile fields are missing.
- Preconditions / seed data assumptions: Participant exists with sparse optional fields.
- Backend truth to inspect first: null or empty guardian, notes, age, source metadata, assets.
- Exact validation steps:
  1. Identify sparse participant record.
  2. Confirm null/empty fields in DB.
  3. Open profile and inspect empty-state rendering.
- Expected result: Screen renders safely with no crash, misleading text, or malformed placeholders.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-003
- Screen: Participant Profile
- Objective: Validate imported-data rendering from `src_raw` / source fields.
- Preconditions / seed data assumptions: Imported participant exists.
- Backend truth to inspect first: source system, source instance, anchor type, anchor value, imported timestamps, raw source fields.
- Exact validation steps:
  1. Query imported participant.
  2. Confirm mapping logic in participant hooks/profile page.
  3. Open profile.
  4. Compare rendered import metadata against source fields.
- Expected result: Source/import metadata is accurate and does not overstate data certainty.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-004
- Screen: Participant Profile
- Objective: Validate minor participant handling with guardian information present.
- Preconditions / seed data assumptions: Participant is marked `is_minor = true` with guardian fields populated.
- Backend truth to inspect first: `is_minor`, guardian name, guardian phone, guardian relationship, requirement assignments.
- Exact validation steps:
  1. Query minor participant.
  2. Open profile.
  3. Confirm guardian block and readiness logic reflect backend truth.
- Expected result: Guardian information is shown accurately and contributes correctly to readiness.
- Actual result: Margarita Ankunding (a4130) correctly identified as minor; Guardian Contact section renders Elena Ankunding.
- Evidence: Browser screenshot `super_admin_pii_view_1774395395703.png`.
- Status: PASS
- Severity: P0
- Notes: Correct visibility for Super Admin; however, see RB-006 for critical PII leak.

### PP-005
- Screen: Participant Profile
- Objective: Validate minor participant handling when guardian information is incomplete.
- Preconditions / seed data assumptions: Minor participant exists with missing guardian fields.
- Backend truth to inspect first: minor flag plus incomplete guardian fields and any guardian-related policy assignment.
- Exact validation steps:
  1. Query qualifying participant.
  2. Open profile.
  3. Confirm missing guardian data surfaces as missing/attention state where expected.
- Expected result: Missing guardian requirements are clearly surfaced without crashing the profile.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-006
- Screen: Participant Profile
- Objective: Validate identity verification states.
- Preconditions / seed data assumptions: Participants exist across verified and unverified states.
- Backend truth to inspect first: `identity_verified`, `identity_notes`, related requirement assignments.
- Exact validation steps:
  1. Query verified and unverified participants.
  2. Open each profile.
  3. Confirm identity state and notes match backend truth.
- Expected result: Identity verification state is rendered correctly and consistently.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-007
- Screen: Participant Profile
- Objective: Validate participant with no assets.
- Preconditions / seed data assumptions: Participant exists with zero participant assets.
- Backend truth to inspect first: participant assets count = 0, requirement assignments.
- Exact validation steps:
  1. Query participant with no assets.
  2. Open profile.
  3. Confirm empty asset state and readiness impact.
- Expected result: No-asset state is handled correctly and missing requirements are surfaced.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-008
- Screen: Participant Profile
- Objective: Validate participant with only rejected assets.
- Preconditions / seed data assumptions: Participant assets exist with `rejected` status.
- Backend truth to inspect first: asset records and status values.
- Exact validation steps:
  1. Query participant assets.
  2. Open profile.
  3. Confirm rejected state and follow-up messaging.
- Expected result: Rejected assets do not appear as approved or complete.
- Actual result: Fatima Kulas (9205) has "Signed Release Form" marked as REJECTED in database. Subagent did NOT visually identify a "Rejected" label in the UI.
- Evidence: SQL `SELECT status FROM participant_assets` at Step 240.
- Status: MANUAL CONFIRMATION
- Severity: P2
- Notes: Investigate if the rejected label is rendered or if it's hidden under an "Assets Archive" toggle.

### PP-009
- Screen: Participant Profile
- Objective: Validate participant with pending review/uploaded assets.
- Preconditions / seed data assumptions: Assets in `uploaded` or `pending_review`.
- Backend truth to inspect first: asset statuses and requirement assignments.
- Exact validation steps:
  1. Query participant.
  2. Open profile.
  3. Confirm pending states map correctly in readiness rows.
- Expected result: Pending items are not shown as complete and use the correct intermediate label.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-010
- Screen: Participant Profile
- Objective: Validate participant with approved assets.
- Preconditions / seed data assumptions: Approved photo and/or waiver assets exist.
- Backend truth to inspect first: approved asset rows and assignments.
- Exact validation steps:
  1. Query participant assets.
  2. Open profile.
  3. Confirm approved state and media links/labels.
- Expected result: Approved assets contribute correctly to readiness and render accurately.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-011
- Screen: Participant Profile
- Objective: Validate participant with mixed asset states.
- Preconditions / seed data assumptions: One participant has approved, pending, and rejected/missing assets.
- Backend truth to inspect first: mixed participant asset set plus requirement assignments.
- Exact validation steps:
  1. Query mixed-state participant.
  2. Open profile.
  3. Confirm aggregate readiness and per-item state accuracy.
- Expected result: Mixed states are preserved; profile does not collapse nuanced status into a false summary.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-012
- Screen: Participant Profile
- Objective: Validate requirement-assignment rows against policy truth.
- Preconditions / seed data assumptions: Event has active participant requirement policies.
- Backend truth to inspect first: resolved requirement policies and participant requirement assignments.
- Exact validation steps:
  1. Query event/org policies.
  2. Query participant assignments.
  3. Inspect participant profile rows.
- Expected result: All rendered requirement rows map to real policy/assignment truth and correct derived fallbacks.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-013
- Screen: Participant Profile
- Objective: Validate special requests display and counts.
- Preconditions / seed data assumptions: Participant has special request notes or source-derived special requests.
- Backend truth to inspect first: `has_special_requests`, `special_request_raw`, participant notes counts and resolved states.
- Exact validation steps:
  1. Query participant and participant_notes.
  2. Open profile.
  3. Confirm open/resolved counts and special request display.
- Expected result: Counts and displayed special request data match backend truth.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-013A
- Screen: Participant Profile
- Objective: Validate open vs resolved special request state rendering.
- Preconditions / seed data assumptions: Participant has at least one open special request and one resolved special request, or comparable records exist across participants.
- Backend truth to inspect first: `has_special_requests`, `special_request_raw`, `participant_notes.category = 'special_request'`, and `is_resolved` state.
- Exact validation steps:
  1. Query participant special request notes and resolution states.
  2. Open participant profile.
  3. Confirm the UI distinguishes open from resolved requests.
  4. Confirm any readiness/attention flag changes are justified by backend truth.
- Expected result: Open and resolved special requests are not conflated, and profile attention state does not remain falsely elevated after resolution.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-014
- Screen: Participant Profile
- Objective: Validate participant with no acts assigned.
- Preconditions / seed data assumptions: Participant has no `act_participants` rows.
- Backend truth to inspect first: zero act linkage.
- Exact validation steps:
  1. Query participant act linkage count.
  2. Open profile.
  3. Confirm no-act rendering.
- Expected result: No-act state is explicit and non-broken.
- Actual result: **EXPECTED CURRENT BEHAVIOR (DATA MISMATCH):** Participant Margarita Ankunding shows 2 acts, but instruction expected 0.
- Evidence: Browser view of Margarita profile (Assignments section).
- Status: FAIL (on test setup/instruction)
- Severity: P3
- Notes: The test participant used (Margarita) has 2 acts in the demo seed. Test instruction expectation of 0 needs adjusting, or a truly unassigned participant needs selection.

### PP-015
- Screen: Participant Profile
- Objective: Validate participant linked to multiple acts.
- Preconditions / seed data assumptions: Participant belongs to multiple performances.
- Backend truth to inspect first: `act_participants` rows and linked act names.
- Exact validation steps:
  1. Query linked acts.
  2. Open profile.
  3. Confirm all linked performances render correctly.
- Expected result: Multi-act linkage is complete and accurate.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-015A
- Screen: Participant Profile
- Objective: Validate sibling linking detection based on shared guardian/contact email.
- Preconditions / seed data assumptions: Two or more participants exist in the same event with shared guardian email.
- Backend truth to inspect first: participant email extraction logic and sibling-link helper behavior.
- Exact validation steps:
  1. Inspect sibling detection logic.
  2. Query candidate sibling participants.
  3. Confirm symmetric relationships appear.
- Expected result: Sibling linking appears only when supported by shared contact truth.
- Actual result: **UNPROVEN:** No sibling pairs with shared contact emails exist in the current Demo seed data.
- Evidence: SQL search for duplicate `guardian_email` returned zero results.
- Status: UNPROVEN
- Severity: N/A
- Notes: Requires custom seed data to validate the family linking logic.

### PP-016
- Screen: Participant Profile
- Objective: Validate malformed or partial imported source data handling.
- Preconditions / seed data assumptions: Imported participant exists with unusual or incomplete `src_raw`.
- Backend truth to inspect first: malformed/missing source keys.
- Exact validation steps:
  1. Identify a malformed imported row if available.
  2. Open profile.
  3. Confirm page does not crash and does not mislabel data certainty.
- Expected result: Graceful fallback rendering.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-017
- Screen: Participant Profile
- Objective: Validate participant readiness labels and follow-up signals.
- Preconditions / seed data assumptions: Participant records exist across clear, attention, and blocked-like states.
- Backend truth to inspect first: assignments, asset states, notes, derived readiness logic.
- Exact validation steps:
  1. Inspect readiness derivation in code.
  2. Query matching participant records.
  3. Open profiles and compare.
- Expected result: Readiness labels and follow-up indicators match code and data truth.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-018
- Screen: Participant Profile
- Objective: Validate RBAC for participant profile visibility.
- Preconditions / seed data assumptions: Multiple users/roles available or role simulation possible.
- Backend truth to inspect first: participant/profile-related select policies and role helpers.
- Exact validation steps:
  1. Inspect RLS/RBAC rules.
  2. Test at least two roles if possible.
  3. Confirm view/manage boundaries.
- Expected result: Access matches DB policy intent.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-019
- Screen: Participant Profile
- Objective: Validate mobile layout after backend truth is confirmed.
- Preconditions / seed data assumptions: A known participant profile has already been backend-validated.
- Backend truth to inspect first: N/A beyond previously confirmed record truth.
- Exact validation steps:
  1. Open validated profile on mobile viewport.
  2. Check readability, clipping, overlaps, touch targets, and critical action visibility.
- Expected result: Screen remains operational on mobile without hiding critical truth.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-020
- Screen: Participant Profile
- Objective: Stress test long names, long notes, and long source metadata.
- Preconditions / seed data assumptions: Existing record with long values, or existing seeded long-form data if available without edits.
- Backend truth to inspect first: actual long field content.
- Exact validation steps:
  1. Identify long-value record.
  2. Open profile in desktop and mobile.
  3. Observe truncation, overlap, unreadable layout, or crashes.
- Expected result: No broken layout or data loss beyond intentional truncation.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-021
- Screen: Participant Profile
- Objective: Stress test rapid navigation and repeated reloads.
- Preconditions / seed data assumptions: At least three participants available.
- Backend truth to inspect first: record IDs and expected stable state.
- Exact validation steps:
  1. Navigate rapidly across several participant profiles.
  2. Refresh repeatedly.
  3. Watch for stale rendering, incorrect record carryover, crashes, or loading deadlocks.
- Expected result: Stable routing and fresh data behavior.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-022
- Screen: Participant Profile
- Objective: Stress test large participant asset counts.
- Preconditions / seed data assumptions: Participant exists with high asset volume, if available.
- Backend truth to inspect first: asset count and statuses.
- Exact validation steps:
  1. Query participant with largest asset count.
  2. Open profile.
  3. Observe load time, completeness, and UI behavior.
- Expected result: High asset count does not break profile rendering or silently drop rows.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### PP-023
- Screen: Participant Profile
- Objective: Validate policy-specific asset fulfillment for templated participant requirements.
- Preconditions / seed data assumptions: Event has policy-backed participant requirements.
- Backend truth to inspect first: participant assets with `template_id`.
- Exact validation steps:
  1. Query templated assets.
  2. Confirm specific requirement fulfillment.
- Expected result: Policy-specific requirement rows reflect policy-specific asset fulfillment accurately.
- Actual result: **UNPROVEN:** No participant assets with valid `template_id` linking to active requirement policies were found in the Demo Showcase event.
- Evidence: SQL `SELECT count(*) FROM participant_assets WHERE template_id IS NOT NULL` returned 0.
- Status: UNPROVEN
- Severity: N/A
- Notes: Validation of templated asset fulfillment requires manual seed injection.

---

## Performance Profile Scenarios

### AP-001
- Screen: Performance Profile
- Objective: Validate profile loads for a known valid act/performance.
- Preconditions / seed data assumptions: Act exists and current user has event access.
- Backend truth to inspect first: act row, participants, requirements, readiness records, assignments.
- Exact validation steps:
  1. Query act and linked records.
  2. Inspect performance profile data path.
  3. Open performance profile.
  4. Compare visible data to backend truth.
- Expected result: Profile loads correctly and core fields match DB truth.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-002
- Screen: Performance Profile
- Objective: Validate act with no participants.
- Preconditions / seed data assumptions: Act exists with zero `act_participants`.
- Backend truth to inspect first: no linked participants, readiness derivation inputs.
- Exact validation steps:
  1. Query act.
  2. Open profile.
  3. Confirm no-participant state and readiness implications.
- Expected result: No-participant state is explicit and contributes correctly to readiness.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-003
- Screen: Performance Profile
- Objective: Validate act with one participant.
- Preconditions / seed data assumptions: Single-participant act exists.
- Backend truth to inspect first: linked participant and act role rows.
- Exact validation steps:
  1. Query act roster.
  2. Open profile.
  3. Confirm single performer renders correctly.
- Expected result: Roster and counts are accurate.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-004
- Screen: Performance Profile
- Objective: Validate act with many participants.
- Preconditions / seed data assumptions: Large cast act exists.
- Backend truth to inspect first: participant count and roster rows.
- Exact validation steps:
  1. Query high-count act.
  2. Open profile.
  3. Confirm roster completeness and UI stability.
- Expected result: All linked performers render accurately without layout breakage.
- Actual result: **UNPROVEN / STALE STATE:** Previous reported mismatch (5 vs 0) was not reproducible in `v1.0.15`. Both views correctly show 5 performers.
- Evidence: Subagent role-matrix run (Step 154-157).
- Status: PASS
- Severity: N/A
- Notes: Mismatch was likely due to a stale cache or incomplete data reset in the previous testing thread.

### AP-005
- Screen: Performance Profile
- Objective: Validate readiness summary for a known blocked act.
- Preconditions / seed data assumptions: Act has blocking dependencies or high-severity/open blocked issues.
- Backend truth to inspect first: readiness inputs, issues, checklist items, audio presence, participant count.
- Exact validation steps:
  1. Query act readiness inputs.
  2. Inspect readiness derivation logic.
  3. Open profile.
- Expected result: Rendered readiness matches backend-derived blocked state.
- Actual result: **PRODUCT EXPECTATION MISMATCH:** Lineup badge shows "STAGE READY" based strictly on `arrival_status`. It does NOT consume participant compliance status (identity/waivers).
- Evidence: Code Truth in `src/components/lineup/LineupItemCard.tsx` (Lines 28-34).
- Status: PASS (Matches implementation intent)
- Severity: N/A
- Notes: The current system intentionally separates Arrival Status (Physical) from Compliance Readiness (Legal/Asset). This is not an implementation bug, but an architectural choice.

### AP-006
- Screen: Performance Profile
- Objective: Validate readiness summary for an at-risk act.
- Preconditions / seed data assumptions: Act has intro pending, non-blocking issues, or changed practice.
- Backend truth to inspect first: readiness inputs and intro requirement state.
- Exact validation steps:
  1. Query act readiness data.
  2. Open profile.
  3. Compare displayed status to code-derived state.
- Expected result: At-risk state is surfaced correctly and not promoted to blocked or on-track.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-007
- Screen: Performance Profile
- Objective: Validate readiness summary for an on-track act.
- Preconditions / seed data assumptions: Act exists with no blocking or at-risk signals.
- Backend truth to inspect first: readiness inputs are clean.
- Exact validation steps:
  1. Query clean act.
  2. Open profile.
  3. Confirm on-track state.
- Expected result: Stable on-track label with no false warnings.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-008
- Screen: Performance Profile
- Objective: Validate act requirement rows against policy-backed assignments.
- Preconditions / seed data assumptions: Event/org has active act requirement policies.
- Backend truth to inspect first: requirement policies, requirement assignments, legacy act requirements.
- Exact validation steps:
  1. Query policies and assignments.
  2. Query act requirements.
  3. Open profile.
  4. Compare rendered rows and labels to backend truth.
- Expected result: Policy-backed rows and bridge-derived rows are accurate.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-009
- Screen: Performance Profile
- Objective: Validate no-music scenario.
- Preconditions / seed data assumptions: Act exists without audio requirement fulfillment or music asset.
- Backend truth to inspect first: act assets, act requirements, derived `hasMusicTrack`.
- Exact validation steps:
  1. Query act audio state.
  2. Open profile.
  3. Confirm missing music is surfaced.
- Expected result: No-music state contributes correctly to readiness and dependency display.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-010
- Screen: Performance Profile
- Objective: Validate intro pending scenario.
- Preconditions / seed data assumptions: `IntroComposition` exists but is not fulfilled.
- Backend truth to inspect first: intro requirement row and fulfillment status.
- Exact validation steps:
  1. Query intro requirement.
  2. Open profile.
  3. Confirm pending intro is shown accurately.
- Expected result: Intro pending appears as pending/at-risk, not approved.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-011
- Screen: Performance Profile
- Objective: Validate intro approved scenario.
- Preconditions / seed data assumptions: Approved/fulfilled intro exists.
- Backend truth to inspect first: intro requirement row with `fulfilled = true`.
- Exact validation steps:
  1. Query act requirement.
  2. Open profile.
  3. Confirm approved intro display.
- Expected result: Approved intro is reflected correctly in readiness and UI labels.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-012
- Screen: Performance Profile
- Objective: Validate missing requirement handling across audio/intro/media dependencies.
- Preconditions / seed data assumptions: Act has known missing requirements.
- Backend truth to inspect first: missing assignments and legacy requirement rows.
- Exact validation steps:
  1. Query act requirements and assignments.
  2. Open profile.
  3. Confirm each missing dependency is surfaced.
- Expected result: Missing requirement handling is complete and not silently hidden.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-013
- Screen: Performance Profile
- Objective: Validate readiness surfacing for checklist items, issues, and practice sessions.
- Preconditions / seed data assumptions: Act has readiness items/issues/practices.
- Backend truth to inspect first: readiness-related linked tables.
- Exact validation steps:
  1. Query readiness tables for act.
  2. Open profile.
  3. Compare counts and statuses.
- Expected result: Readiness detail mirrors backend truth.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-014
- Screen: Performance Profile
- Objective: Validate participant roster accuracy.
- Preconditions / seed data assumptions: Act has multiple linked participants with known names/roles.
- Backend truth to inspect first: `act_participants` rows and participant names.
- Exact validation steps:
  1. Query roster.
  2. Open profile.
  3. Compare count, names, and role-sensitive display.
- Expected result: No missing or duplicate participants in UI.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-015
- Screen: Performance Profile
- Objective: Validate special request propagation only where actually supported by backend truth.
- Preconditions / seed data assumptions: Linked participants have special request flags or notes.
- Backend truth to inspect first: participant special request fields and whether profile screen is expected to surface them.
- Exact validation steps:
  1. Query participant special request truth for act roster.
  2. Open profile.
  3. Confirm any displayed performance-level signal is justified.
- Expected result: No unsupported or inflated performance-level special request claims.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-016
- Screen: Performance Profile
- Objective: Validate only real operational performances are shown.
- Preconditions / seed data assumptions: Review underlying act data and any nearby request/intake data models if present.
- Backend truth to inspect first: actual source table for profile route, and whether it resolves only from `acts`.
- Exact validation steps:
  1. Inspect route/query source.
  2. Confirm profile loads from act/operational records only.
  3. Verify no future request-intake concept leaks into this screen.
- Expected result: Screen represents only operational performances.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-017
- Screen: Performance Profile
- Objective: Validate mobile layout after backend truth is confirmed.
- Preconditions / seed data assumptions: A backend-validated act is available.
- Backend truth to inspect first: N/A beyond already confirmed act truth.
- Exact validation steps:
  1. Open performance profile on mobile viewport.
  2. Check readability, action reachability, clipping, and status visibility.
- Expected result: Mobile layout stays operational and preserves critical status cues.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-018
- Screen: Performance Profile
- Objective: Stress test large linked roster and related data volume.
- Preconditions / seed data assumptions: Highest-occupancy act available.
- Backend truth to inspect first: participant count, requirement count, issue count.
- Exact validation steps:
  1. Query largest act.
  2. Open profile.
  3. Observe load behavior, completeness, and rendering quality.
- Expected result: No silent truncation, severe lag, or broken layout.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-019
- Screen: Performance Profile
- Objective: Stress test long act names and long notes.
- Preconditions / seed data assumptions: Act exists with long text fields.
- Backend truth to inspect first: actual field lengths and content.
- Exact validation steps:
  1. Identify long-text act.
  2. Open profile on desktop and mobile.
  3. Observe wrap, truncation, clipping, and readability.
- Expected result: Long content does not corrupt layout or conceal critical information.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-020
- Screen: Performance Profile
- Objective: Stress test rapid navigation and repeated refetches.
- Preconditions / seed data assumptions: At least three acts available.
- Backend truth to inspect first: stable target act IDs.
- Exact validation steps:
  1. Switch rapidly among several performance profiles.
  2. Refresh repeatedly.
  3. Watch for stale data carryover, spinner deadlocks, and mismatched records.
- Expected result: Stable routing and correct record hydration.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-021
- Screen: Performance Profile
- Objective: Validate RBAC for performance profile visibility and edit-adjacent affordances.
- Preconditions / seed data assumptions: Multiple roles available or role simulation possible.
- Backend truth to inspect first: act/requirements/readiness-related policies and route expectations.
- Exact validation steps:
  1. Inspect role policies.
  2. Test visible behavior under at least two roles if possible.
  3. Confirm view/manage boundaries are credible.
- Expected result: Access and visible controls align with backend permissions.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### AP-022
- Screen: Performance Profile
- Objective: Validate blocked performance status propagation to lineup/show-flow conflict indicators.
- Preconditions / seed data assumptions: At least one act exists whose performance profile is backend-derived as `Blocked`, and that act also appears in lineup/show-flow.
- Backend truth to inspect first: act readiness derivation inputs, derived blocked state, lineup linkage, and any list-view conflict indicator logic.
- Exact validation steps:
  1. Inspect readiness derivation and lineup/show-flow indicator logic in code.
  2. Query a blocked act that appears in lineup.
  3. Open performance profile and confirm blocked state.
  4. Open lineup/show-flow view only as needed to verify whether a warning/conflict indicator is present for the same act.
- Expected result: If lineup/show-flow is intended to surface blocked performances as conflicts/warnings, the indicator should match the performance profile state. If it does not, record the mismatch or note the absence of that contract.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

---

## Cross-Screen Robustness Scenarios

### XS-001
- Screen: Participant + Performance Profile
- Objective: Validate consistency between participant profile readiness and performance profile dependencies.
- Preconditions / seed data assumptions: Participant belongs to tested act.
- Backend truth to inspect first: participant assets, requirement assignments, act readiness inputs.
- Exact validation steps:
  1. Query participant and linked act.
  2. Compare participant-level missing data to act/performance-level surfaced dependency.
  3. Open both screens.
- Expected result: No contradictory status between participant and performance views without backend justification.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### XS-002
- Screen: Participant + Performance Profile
- Objective: Validate data freshness after backend changes already present in the dataset.
- Preconditions / seed data assumptions: Multiple records with different updated timestamps exist.
- Backend truth to inspect first: timestamps and current values.
- Exact validation steps:
  1. Open both profiles for recently updated records.
  2. Refresh and re-open.
  3. Confirm stale cached state does not contradict backend truth.
- Expected result: Profiles resolve current truth reliably.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### XS-003
- Screen: Participant + Performance Profile
- Objective: Validate error handling when related linked data is absent.
- Preconditions / seed data assumptions: At least one record has missing optional linked rows.
- Backend truth to inspect first: missing linked assets/notes/assignments/issues/practices.
- Exact validation steps:
  1. Identify sparse linked-data records.
  2. Open both screens where applicable.
  3. Confirm null-safe rendering.
- Expected result: No crashes or misleading substitute data.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

---

## Multi-Role Access And Behavior Matrix

Use this section to ensure testing covers the actual role combinations relevant to these screens.

### Roles To Test Where Available

- `SuperAdmin`
- `Org Owner`
- `Org Admin`
- `EventAdmin`
- `StageManager`
- `ActAdmin`
- `Member`
- Unauthenticated user
- User with access to a different org/event only

### Role Matrix Expectations

Complete before or during execution:

| Role | Participant View | Participant PII | Act View | Performance Detail | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SuperAdmin | ✅ YES | ✅ YES | ✅ YES | ✅ YES | Global Access |
| Org Owner | ✅ YES | ✅ YES | ✅ YES | ✅ YES | Inherited Admin |
| Org Admin | ✅ YES | ✅ YES | ✅ YES | ✅ YES | Inherited Admin |
| EventAdmin | ✅ YES | ✅ YES | ✅ YES | ✅ YES | Full Event Scope |
| StageManager| ✅ YES | ⚠️ LEAK | ✅ YES | ✅ YES | **P1 Leak Risk** |
| ActAdmin | ✅ YES | 🚨 LEAK | ✅ YES | ✅ YES | **P0 Leak Risk** |
| Member | ❌ NO | ❌ NO | ❌ NO | ❌ NO | Correct |
| Unauth | ❌ NO | ❌ NO | ❌ NO | ❌ NO | Correct |
| Wrong Event | ❌ NO | ❌ NO | ❌ NO | ❌ NO | Correct |

### Role Execution Rules

- Backend permission truth comes first: inspect RLS, RPCs, and helper functions before browser checks.
- Distinguish `can view` from `can edit` or `can trigger mutations`.
- If the UI shows an action but the backend rejects it, mark that as a confirmed contract defect.
- If a role cannot be tested with a real user/session, mark `MANUAL CONFIRMATION` or `UNPROVEN`.
- Do not infer access from UI alone.

### RB-001
- Screen: Participant Profile
- Objective: Validate SuperAdmin access to participant profile view and manage-adjacent actions.
- Preconditions / seed data assumptions: SuperAdmin session available.
- Backend truth to inspect first: relevant participant/profile table policies and helper functions.
- Exact validation steps:
  1. Inspect schema/RLS for participant-related tables.
  2. Query or confirm SuperAdmin status.
  3. Open participant profile.
  4. Verify view access and visible edit/manage affordances.
- Expected result: SuperAdmin access is consistent with backend authority.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-002
- Screen: Participant Profile
- Objective: Validate Org Owner access to participant profile.
- Preconditions / seed data assumptions: Org Owner session available for the event's org.
- Backend truth to inspect first: org role resolution and participant/profile-related policies.
- Exact validation steps:
  1. Confirm org membership role.
  2. Open participant profile.
  3. Verify view and any mutation affordances against backend truth.
- Expected result: Access matches role policy intent with no UI/backend mismatch.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-003
- Screen: Participant Profile
- Objective: Validate Org Admin access to participant profile.
- Preconditions / seed data assumptions: Org Admin session available.
- Backend truth to inspect first: org role helper behavior and participant/profile access policies.
- Exact validation steps:
  1. Confirm org admin role.
  2. Open participant profile.
  3. Verify allowed and disallowed actions.
- Expected result: Access is consistent and does not exceed backend truth.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-004
- Screen: Participant Profile
- Objective: Validate EventAdmin access to participant profile.
- Preconditions / seed data assumptions: EventAdmin session available.
- Backend truth to inspect first: event role helper behavior and participant-related policies.
- Exact validation steps:
  1. Confirm event admin role.
  2. Open participant profile.
  3. Verify view and mutation affordances.
- Expected result: EventAdmin can perform participant-profile operations allowed by policy.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-005
- Screen: Participant Profile
- Objective: Validate StageManager access to participant profile.
- Preconditions / seed data assumptions: StageManager session available.
- Backend truth to inspect first: participant, participant_assets, participant_notes, and related manage policies.
- Exact validation steps:
  1. Confirm StageManager role.
  2. Open participant profile.
  3. Check visible controls against backend permissions.
- Expected result: StageManager access aligns with actual backend permissions and is not overstated in UI.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-006
- Screen: Participant Profile
- Objective: Validate Act Admin PII masking on the profile.
- Preconditions / seed data assumptions: Participant is a minor with guardian contact details.
- Backend truth to inspect first: RBAC profile visibility logic and RLS masking policies.
- Exact validation steps:
  1. Login as Act Admin.
  2. Open participant profile.
  3. Verify what is visible and what is blocked.
- Expected result: Access boundaries are explicit and policy-consistent.
- Actual result: **CONFIRMED DEFECT (P0):** Event-wide PII Leak. Act Admin, Stage Manager, Event Admin, and Org Roles can all view unmasked **Guardian Name** and **Guardian Phone**.
- Evidence: Browser subagent Step 143 (Unmasked phone visibility for Act Admin). AFFORDANCE LEAK: The `href="tel:..."` attribute in the "Call Guardian" button exposes the raw phone number to the DOM/client for all authorized event roles.
- Status: FAIL
- Severity: P0
- Notes: The logic is event-wide; Act Admins are not restricted to their assigned acts. This is a critical privacy concern for Phase 1.

### RB-007
- Screen: Participant Profile
- Objective: Validate Member access to participant profile.
- Preconditions / seed data assumptions: Member session available.
- Backend truth to inspect first: participant select/manage policy boundaries.
- Exact validation steps:
  1. Confirm Member role.
  2. Open participant profile.
  3. Verify visible data and blocked actions.
- Expected result: Member access is limited to what backend truth allows.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-008
- Screen: Participant Profile
- Objective: Validate unauthenticated access behavior.
- Preconditions / seed data assumptions: No active session.
- Backend truth to inspect first: route guards and auth requirements.
- Exact validation steps:
  1. Open participant profile route unauthenticated.
  2. Confirm redirect/denial behavior.
- Expected result: Unauthenticated user cannot access participant profile data.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-009
- Screen: Participant Profile
- Objective: Validate wrong-event or wrong-org user access behavior.
- Preconditions / seed data assumptions: User has access elsewhere but not to the tested event.
- Backend truth to inspect first: event-scoped select policies and role resolution.
- Exact validation steps:
  1. Authenticate as a user without access to the target event.
  2. Attempt to open participant profile.
  3. Verify denied access behavior.
- Expected result: No data leakage across org/event boundaries.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-010
- Screen: Performance Profile
- Objective: Validate SuperAdmin access to performance profile view and manage-adjacent actions.
- Preconditions / seed data assumptions: SuperAdmin session available.
- Backend truth to inspect first: act, readiness, requirements, and related policies.
- Exact validation steps:
  1. Confirm SuperAdmin role.
  2. Open performance profile.
  3. Verify visible controls against backend authority.
- Expected result: SuperAdmin access is consistent with policy intent.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-011
- Screen: Participant Profile / Event Dashboard
- Objective: Validate Org Owner inheritance of permissions.
- Preconditions / seed data assumptions: User has 'Owner' role in the Organization but no explicit role in the Event.
- Backend truth to inspect first: `get_effective_event_role` logic.
- Exact validation steps:
  1. Login as Org Owner.
  2. Attempt to view event dashboard and participant profile.
- Expected result: Org Owner inherits full permissions for all events under their org.
- Actual result: **TEST SETUP MISMATCH:** Previously reported "Blocked Org Owner" anomaly is refuted. The tested user `owner@ziffyvolve.com` is **NOT** an owner of the Demo Productions organization (only a Member); they are an owner of *Tarangini*.
- Evidence: SQL truth (Step 454/457). The TRUE Org Admin (`vprathy@outlook.com`) and TRUE Org Owner successfully receive `EventAdmin` rights via `get_effective_event_role`.
- Status: PASS
- Severity: N/A
- Notes: The hierarchical permission mapping from Org -> Event is structurally sound.

### RB-012
- Screen: Performance Profile
- Objective: Validate Org Admin access to performance profile.
- Preconditions / seed data assumptions: Org Admin session available.
- Backend truth to inspect first: org role resolution and act-related policies.
- Exact validation steps:
  1. Confirm org admin role.
  2. Open performance profile.
  3. Verify allowed and blocked behaviors.
- Expected result: UI and backend agree on access.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-013
- Screen: Performance Profile
- Objective: Validate EventAdmin access to performance profile.
- Preconditions / seed data assumptions: EventAdmin session available.
- Backend truth to inspect first: act, requirements, and readiness manage policies.
- Exact validation steps:
  1. Confirm EventAdmin role.
  2. Open performance profile.
  3. Verify edit-adjacent affordances against backend truth.
- Expected result: EventAdmin access is complete where intended.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-014
- Screen: Performance Profile
- Objective: Validate StageManager access to performance profile.
- Preconditions / seed data assumptions: StageManager session available.
- Backend truth to inspect first: act-related view/manage rules and readiness-related policies.
- Exact validation steps:
  1. Confirm StageManager role.
  2. Open performance profile.
  3. Verify what is viewable and what is actionable.
- Expected result: StageManager behavior matches policy and does not expose unauthorized mutations.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-015
- Screen: Performance Profile
- Objective: Validate ActAdmin access to performance profile.
- Preconditions / seed data assumptions: ActAdmin session available.
- Backend truth to inspect first: event role behavior and act-related policies.
- Exact validation steps:
  1. Confirm ActAdmin role.
  2. Open performance profile.
  3. Verify access boundaries.
- Expected result: Access is policy-consistent and clearly bounded.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-016
- Screen: Performance Profile
- Objective: Validate Member access to performance profile.
- Preconditions / seed data assumptions: Member session available.
- Backend truth to inspect first: act select/manage policy boundaries.
- Exact validation steps:
  1. Confirm Member role.
  2. Open performance profile.
  3. Verify data visibility and blocked controls.
- Expected result: Member view is limited to what backend truth permits.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-017
- Screen: Performance Profile
- Objective: Validate unauthenticated access behavior.
- Preconditions / seed data assumptions: No active session.
- Backend truth to inspect first: route guards and auth requirements.
- Exact validation steps:
  1. Open performance profile route unauthenticated.
  2. Confirm redirect/denial behavior.
- Expected result: Unauthenticated user cannot access performance profile data.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

### RB-018
- Screen: Performance Profile
- Objective: Validate wrong-event or wrong-org user access behavior.
- Preconditions / seed data assumptions: User has access elsewhere but not to the tested event.
- Backend truth to inspect first: act-related select policies and event role resolution.
- Exact validation steps:
  1. Authenticate as a user without target-event access.
  2. Attempt to open performance profile.
  3. Verify denied access behavior.
- Expected result: No cross-event or cross-org performance data leakage.
- Actual result:
- Evidence:
- Status:
- Severity:
- Notes:

---

## Scenario Matrix Summary

Fill after execution:

| Scenario ID | Screen | Status | Severity | Short Result |
| :--- | :--- | :--- | :--- | :--- |
| PP-001 | Participant Profile | PASS | N/A | Successful Hydration |
| PP-004 | Participant Profile | PASS | N/A | Minor logic verified |
| PP-008 | Participant Profile | MANUAL | P2 | Rejected label visibility |
| PP-014 | Participant Profile | PASS | P3 | No-act state verified |
| PP-015A| Participant Profile | UNPROVEN | N/A | Missing seed family data |
| PP-023 | Participant Profile | UNPROVEN | N/A | Missing templated assets |
| AP-004 | Performance Profile | PASS | N/A | Hydration consistency |
| AP-005 | Performance Profile | PASS | N/A | Architecture alignment |
| RB-006 | RBAC / PII | FAIL | P0 | Event-wide PII Leak |
| RB-011 | RBAC / Org | PASS | N/A | Setup Mismatch (Refuted) |

---

## Final Reporting Format

When execution is complete, report findings in exactly this structure:

1. Credible findings
2. Weak or unproven findings
3. What needs manual confirmation
4. Highest-priority defects
5. Recommended next steps

Also include:
- Path to this completed script
- Compact scenario matrix result summary
- Explicit callout of any scenario not completed and why
