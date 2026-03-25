# Testing Thread Transition Document

Repo:
`/Users/vinay/dev/InOutHub-Events-main`

Purpose of this document:
- provide a clean handoff for a separate Codex chat focused on testing and validation
- keep that thread out of implementation unless explicitly requested
- review Antigravity results critically before any code changes are proposed

## Current Repo State

Current workspace state at handoff:
- modified: `.gitignore`
- modified: `task.md`
- untracked: `docs/phase_1_validation_report.md`

Current remote baseline for app behavior:
- `5cb087d` `Refine performances list for mobile ops`

## Recently Shipped / Relevant Changes

### Auth
- invited users can now use email OTP on first sign-in
- pending event access should activate on first sign-in

### Requirements / Admin
- requirements screen was reorganized around clearer event/org and people/performances hierarchy
- requirements changes were wired to better invalidate downstream profile consumers

### Performances Screen
- sticky subtitle restored
- `Add` moved to a floating action button
- metrics aligned to dashboard metric-card style
- search/filter moved toward participants-style interaction
- performance cards tightened for mobile ops
- direct upload/call affordances added
- expanded filter coverage added for performance gaps

## Product Truth Already Agreed

### Protect the current operator backbone
- ingest people
- assemble performances
- readiness
- lineup
- console

### Future performance request intake
- this is a future path, not a replacement for the current operator workflow
- sparse external requests must not appear as live operational performances until approved and converted

### Two-layer intake model
1. `Request to Approval`
   - upstream request review
   - review, approve, reject
   - request is not yet a real operational performance

2. `Approval to Operations`
   - approved request is converted into a real performance record
   - only then does it enter normal operations

### Three intake origins
1. participant-based intake
2. external request / partner submission intake
3. manual emergency intake

All three should converge into one operational performance model eventually.

## Naming Direction

User-facing naming should favor plain language:
- `Imports` instead of `Sources`
- `Performance Requests` instead of `Performance Intake`

## Information Architecture Direction

### `Admin > Imports`
- canonical home for source connection, mapping, refresh, and sync health

### `Admin > Performance Requests`
- separate from `Imports`
- review imported external requests
- approve / reject / convert

### `Participants`
- operational screen only
- at most a quick `Refresh Imports` shortcut

### `Performances`
- operational screen only
- only real converted performances belong here

## Testing Priorities

1. validate participant and performance profile wiring
2. validate requirements truth propagates correctly into those profiles
3. validate dashboard mobile behavior and RBAC
4. validate performances screen behavior on mobile
5. review Antigravity findings critically before acting

## Antigravity Testing Strategy Already Agreed

- backend / db / code truth first
- browser last
- use browser only for proof and final UI validation
- do not treat Antigravity as authoritative if it edits code during validation

## How the New Testing Thread Should Operate

When Antigravity results are pasted into the testing thread, that thread should:
1. identify what appears credible
2. identify what appears weak or unproven
3. identify what still needs manual confirmation
4. prioritize real defects
5. recommend next steps
6. avoid redesign suggestions unless the findings truly justify them

## Starter Prompt For The New Testing Chat

Use this exact starter prompt in the new testing window:

```md
Use the transition document at `/Users/vinay/dev/InOutHub-Events-main/docs/testing_thread_transition.md` as the working context for this testing thread.

This thread is for testing/validation only:
- review Antigravity results
- validate credibility
- identify real defects
- recommend next steps

Do not code yet.

Wait for me to paste Antigravity’s results before making recommendations.

When I do, respond in this structure:
1. Credible findings
2. Weak or unproven findings
3. What needs manual confirmation
4. Highest-priority defects
5. Recommended next steps
```
