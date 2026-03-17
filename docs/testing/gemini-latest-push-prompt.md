# Gemini Prompt

Use this prompt with Gemini to test the latest pushed InOutHub Events build.

---

You are testing the latest deployed MVP hardening build of InOutHub Events.

Target:

- App URL: `https://events.inouthub.ziffyvolve.com`
- Repo commit expected in deployed behavior: `f355c66`
- Focus: real operator workflows only

Your mission:

1. Execute the full MVP browser and backend validation defined in:
   - `docs/testing/gemini-latest-push-mvp-test-plan.md`
   - `docs/testing/gemini-latest-push-test-script.md`
2. Cover every current MVP route, screen, major button, tab, modal, link, and end-to-end workflow in those files.
3. Report results with high signal and minimal fluff.

Important constraints:

- Do not test landing page polish.
- Do not spend effort on SMTP/deliverability.
- Do not reopen auth architecture unless you find a concrete bug.
- Focus on operator trust and continuity.

## Credit Optimization Rules

Use backend-fast checks first whenever possible. Use browser-agent only when visual routing, UI behavior, or interactive controls must be validated.

### Use backend-fast for:

- fixture existence checks
- DB row counts
- role/access validation
- stage state resets
- lineup setup
- event source timestamp verification
- confirming mutations persisted
- confirming whether a missing browser behavior is actually a data/setup issue

### Use browser-agent for:

- redirects and deep-link continuity
- login screen behavior
- org/event selection
- header and bottom-nav routing
- roster filters, search, sort, expansion, and inline actions
- sync board interaction
- participant profile tabs and actions
- acts list filters and readiness labels
- performance workspace tabs and status controls
- lineup buttons, reorder, add/remove flows
- stage console start/pause/resume/advance/reset/recovery behavior
- signout and re-entry flows

### Optimization rule:

Before opening a browser flow, ask:

"Can I prove or prepare this with a cheap backend-fast step first?"

If yes, do that first.

## Test Personas

Run at minimum:

1. EventAdmin pass
2. StageManager pass
3. Signed-out redirect pass

## Fixture Policy

Do not waste browser steps on broken or missing fixtures.

If the current seed is insufficient, use backend-fast setup to create the smallest safe missing fixtures required for:

- participant approvals states
- Google Sheet and file-sync paths
- lineup on at least one stage
- intro-ready and intro-missing acts
- minor safety and unassigned roster cases

Document exactly what fixtures you had to add.

## Required Deliverable Format

Produce output in these sections:

1. `Environment`
   - target URL
   - personas used
   - fixture summary
   - what was verified with backend-fast before browser

2. `Results Summary`
   - total cases
   - passed
   - failed
   - blocked
   - overall recommendation

3. `Failures`
   - ordered by severity and operator risk
   - for each:
     - title
     - severity
     - route
     - persona
     - reproduction steps
     - expected
     - actual
     - evidence

4. `Case Log`
   - concise case-by-case pass/fail ledger

5. `Trust Assessment`
   - login/session continuity
   - org/event continuity
   - roster/sync trust
   - acts/workspace trust
   - lineup/console trust
   - signout/re-entry trust

## Severity Guidance

- `S1`: blocks operator workflow or risks wrong-event/wrong-live-state behavior
- `S2`: key trust break likely to cause spreadsheet fallback
- `S3`: moderate defect, workaround exists
- `S4`: minor visual/copy issue

## Special Assertions To Verify

You must explicitly verify and report on these:

1. Deep links survive login and org/event selection.
2. Signout and user-switch do not leak stale org/event context.
3. Roster freshness badge matches source sync timestamps.
4. `Sync All` updates per-source timestamps.
5. Acts list intro state does not collapse `Needs intro` into generic pending.
6. Acts list refreshes when child readiness data changes.
7. Readiness summary does not overstate readiness when cast/music/approvals/intro are missing.
8. Stage selection persists correctly in stage console.
9. Live console recovers after refresh while a show is active.
10. StageManager cannot use EventAdmin-only sync mutation path.

If any of these are not testable, say exactly why they were blocked and what missing fixture or access prevented validation.

Now execute the test plan and return the report.

---
