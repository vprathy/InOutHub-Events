# Antigravity Prompt: Show Flow / Live Console Validation

Use this prompt to validate the live-event rehearsal spine after the performance-intake batch.

```text
Validate `Show Flow` and `Live Console` for rehearsal readiness in InOutHub Events.

Repo:
`/Users/vinay/dev/InOutHub-Events-main`

Primary goal:
Determine whether the live-event execution spine is in reasonable shape before broader new-tenant onboarding becomes the main priority.

Critical framing:
- intake/review is no longer the main uncertainty
- the next gating area is `Show Flow + Live Console`
- treat this as a rehearsal-readiness validation, not a cosmetic UI pass

Method order:
1. repo / contract review first
2. local app validation second
3. Supabase inspection only if runtime behavior suggests backend mismatch
4. browser automation only as the last option

Dev login rule:
- use `/dev/login` only for role switching
- do NOT use `Reset Demo Event` unless a scenario explicitly requires reseeding the canonical dev fixture

Use these repo docs:
- `/Users/vinay/dev/InOutHub-Events-main/docs/show_flow_console_validation_script.md`
- `/Users/vinay/dev/InOutHub-Events-main/docs/plans/operator-screen-organization-framework.md`
- `/Users/vinay/dev/InOutHub-Events-main/task.md`

Core product contract to validate:
- `Show Flow` = planning / repair / lineup shaping
- `Live Console` = live execution / current-next-upcoming / advance-pause-recover
- these screens must not feel redundant

Required scenarios:
1. stage setup / stage management in Show Flow
2. add to lineup
3. reorder lineup
4. remove from lineup
5. risk visibility in Show Flow
6. stage selection restore in Live Console
7. no-lineup empty state in Live Console
8. current / next / upcoming clarity
9. start / advance / pause flow
10. refresh / reconnect recovery
11. drift / overtime visibility
12. intro visibility in console when approved
13. EventAdmin access
14. StageManager access
15. lower-privilege limitation
16. explicit distinction check: are Show Flow and Console materially different operator workspaces?

Deliverable format:
1. exact scenarios executed
2. pass/fail per scenario
3. findings ordered by severity with exact file references when identifiable
4. whether Show Flow and Live Console are rehearsal-ready for Phase 1
5. recommendation:
   - safe to continue toward broader onboarding
   - or pause onboarding until execution-spine issues are fixed

If you find a blocker:
- identify whether it is:
  - product-structure issue
  - UI/interaction issue
  - RBAC issue
  - runtime/backend issue
- do not make speculative fixes unless clearly justified and repo-backed
```
