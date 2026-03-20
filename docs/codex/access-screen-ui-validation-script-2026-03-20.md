# Access Screen UI Validation Script / March 20, 2026

Use this as the exact test brief for Antigravity.

Goal:
- validate that the `/admin/access` screen matches the shipped access-lifecycle behavior
- validate UI behavior, visible state, user messaging, and mutation outcomes
- catch regressions in route visibility, permission gating, quick grant, pending access, current event access, search, edit, and delete behavior

Scope:
- [AccessPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/AccessPage.tsx)
- [useAccess.ts](/Users/vinay/dev/InOutHub-Events-main/src/hooks/useAccess.ts)
- [AdminPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/AdminPage.tsx)
- [BottomNav.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/BottomNav.tsx)
- [AppRouter.tsx](/Users/vinay/dev/InOutHub-Events-main/src/router/AppRouter.tsx)

Out of scope:
- redesign
- unrelated Requirements page behavior
- deep DB migration verification beyond what is necessary to confirm the Access UI is correct
- changes to app code unless a clear bug is confirmed and separately approved

## Prompt For Antigravity

You are validating the InOutHub Access screen UI on `main` in `/Users/vinay/dev/InOutHub-Events-main`.

Do not change frontend code in this task.

Validate the shipped behavior of `/admin/access` exhaustively and produce a findings-first report with:
- `Passes`
- `Failures`
- `Open Questions`
- `Evidence`

For every failure, include:
- exact repro steps
- expected result
- actual result
- whether the bug is UI-only, data-sync, permissions, or backend-linked
- file references only when the code path is obvious

Use the current product rules:
- admin access is visible only to super admin, org `Owner`, org `Admin`, or event `EventAdmin`
- Access page itself allows management only for super admin, org `Owner`, org `Admin`, or event `EventAdmin`
- baseline access is source-managed
- elevated roles remain admin-managed
- automated baseline event access must not be removable from the UI
- quick grant must auto-create org membership if needed
- if the target email has not signed in yet, event access must remain pending until first sign-in
- `/access` should redirect to `/admin/access`

Validate on both desktop-width and mobile-width layouts.

If local seeded data is insufficient, create only the minimum test data needed through the app or direct Supabase actions. Keep track of exactly what test records you create.

Do not stop at smoke coverage. Exercise empty, loading, happy path, and edge cases.

## Preconditions

Antigravity should confirm these before running tests:

1. App boots and is reachable locally.
2. There is at least one selectable org and event.
3. There are test accounts or impersonation paths for:
   - super admin
   - org owner or org admin
   - event admin without org-admin role
   - event member without admin rights
   - user with no event access
4. There is at least one event where test data can be safely created and removed.
5. There is a way to observe Supabase table state when needed:
   - `event_members`
   - `organization_members`
   - `pending_event_access`

If any precondition is missing, call it out explicitly and continue with the maximum safe coverage possible.

## Core Expected Behavior

These are the acceptance rules the test must validate:

1. Navigation and routing
- Bottom nav shows `Admin` only for super admin, org `Owner`, org `Admin`, or event `EventAdmin`.
- `/admin` is reachable for those same roles.
- `/admin/access` renders the Access page.
- `/access` redirects to `/admin/access`.

2. Permission gating inside the Access page
- Unauthorized users should not get the management UI.
- Unauthorized users should see the `Access` header and the message that the event does not grant access-management permissions.
- Authorized users should see:
  - `Quick Grant`
  - pending access section
  - current event access section
  - search input

3. Quick Grant
- Email input is required.
- Default selected role is `StageManager`.
- Available role options are:
  - `Event Admin`
  - `Stage Manager`
  - `Act Admin`
  - `Member`
- Submit button is disabled when email is blank.
- Submitting with a valid signed-in user email succeeds and shows a success notice.
- Submitting with a valid not-yet-signed-in email succeeds as pending and shows a success notice.
- On success, email input resets to blank and role resets to `StageManager`.
- On failure, an error notice appears and prior inputs are not falsely cleared.

4. Pending Access section
- Shows loading spinner while pending data is loading.
- Shows empty-state copy when no pending rows exist.
- Shows pending rows for `status = pending`.
- Each row displays:
  - normalized email
  - target role
  - pending label reflecting `manual` vs automated baseline
- Search filters pending rows by email and role text.
- A successful pending quick-grant should appear in this list after refetch.

5. Current Event Access section
- Shows loading spinner while current event access is loading.
- Shows empty-state copy when no rows exist.
- Each row displays:
  - user email
  - current role
  - `Manual` or `Automated Baseline`
- Each row allows choosing a different role from the same four allowed roles.
- `Save` is disabled when the selected draft role equals the current stored role.
- Changing the role and saving shows a success notice and persists the new role after refetch.
- Search filters current rows by email and role text.

6. Deletion and source-managed protections
- Manual rows can be removed via trash action.
- Successful removal shows a success notice and removes the row after refetch.
- Automated baseline rows must not be removable.
- For automated rows:
  - trash button is disabled
  - tooltip/title indicates baseline access is source-managed
- Removing a manual row must not remove unrelated pending rows or unrelated org membership.

7. Data side effects
- Granting event access to a signed-in user who is not already in the org should create org membership automatically.
- Granting access to a not-yet-signed-in email should create or update `pending_event_access`, not `event_members`.
- Updating an existing member role should mutate the same access intent rather than creating duplicate visible rows.
- Refetch after successful mutation should refresh both current access and pending access lists.

8. Mobile/tablet behavior
- At mobile width, the page remains usable without horizontal scrolling.
- Inputs and buttons remain reachable with touch-friendly height.
- Search, role selector, save, and delete controls remain operable.
- Long email addresses do not break card layout badly enough to block operation.
- The quick-grant area, pending section, and current section are visually understandable on a phone viewport.

9. Regression checks from shipped intent
- Event-scoped quick grant is the primary manual staffing path.
- The page messaging still states:
  - org membership is auto-added if needed
  - pending sign-in behavior for unsigned emails
- Automated baseline access remains clearly distinguished from manual access.

## Test Matrix

Run this matrix if possible. If any persona cannot be tested, say why.

### Persona A: Super Admin
- Confirm `Admin` appears in bottom nav.
- Confirm `/admin` and `/admin/access` both open.
- Confirm full Access management UI appears.

### Persona B: Org Owner or Org Admin
- Confirm `Admin` appears in bottom nav.
- Confirm `/admin/access` opens and management UI appears even if event role is not `EventAdmin`.

### Persona C: EventAdmin but not org admin
- Confirm `Admin` appears in bottom nav.
- Confirm `/admin/access` opens and management UI appears.

### Persona D: Event member without elevated access
- Confirm `Admin` is hidden in bottom nav.
- Navigate directly to `/admin/access`.
- Confirm page loads but shows the unauthorized message, not the management controls.

### Persona E: User with no event access
- If app routing allows direct navigation, try `/admin/access`.
- Confirm unauthorized experience is consistent and no privileged controls appear.

## Detailed Step Script

### Phase 1: Routing and entry points

1. As Persona A, open the app with an org and event selected.
2. Verify bottom nav includes `Admin`.
3. Open `/admin`.
4. Verify the Admin landing page has an `Access` card and can navigate to `/admin/access`.
5. Open `/access`.
6. Verify it redirects to `/admin/access`.
7. Repeat the nav visibility and direct-route checks for Personas B, C, and D.

Expected:
- Personas A, B, C see `Admin` in nav.
- Persona D does not see `Admin` in nav.
- Direct `/admin/access` route still renders the page shell, but unauthorized personas do not get management controls.

### Phase 2: Unauthorized state

1. As Persona D or E, open `/admin/access`.
2. Verify header title is `Access`.
3. Verify subtitle says event access requires `EventAdmin` or org admin authority.
4. Verify message says the event does not grant access-management permissions.
5. Verify the following are absent:
   - quick-grant email field
   - role selector
   - grant button
   - pending list cards
   - current access controls

Expected:
- unauthorized users see explanation only, not privileged controls

### Phase 3: Authorized base render

1. As Persona A, B, or C, open `/admin/access`.
2. Verify page header subtitle is `Quick event access, pending sign-ins, and current event roles.`
3. Verify quick-grant card renders:
   - email field
   - role selector
   - grant button
   - current-count badge
   - pending sign-in helper copy
4. Verify search field renders with placeholder `Search email or role`.
5. Verify `Pending Access` and `Current Event Access` sections render.

Expected:
- all major control groups appear without overlap or broken layout

### Phase 4: Empty states

Use an event with no pending rows and preferably no event members beyond what is unavoidable.

1. Open `/admin/access`.
2. Observe pending section.
3. Observe current event access section.

Expected:
- pending section empty state: `No pending sign-ins for this event.`
- current access empty state: `No event access rows yet.`

If a truly empty event is not practical, note this and validate empty states in isolation using controlled test data cleanup.

### Phase 5: Quick grant to existing signed-in user

Choose a signed-in user email that is valid and not yet in the event.

1. Record whether the target user is already an org member.
2. On `/admin/access`, enter the email.
3. Leave role as default `StageManager`.
4. Submit.
5. Observe the success notice.
6. Verify email field is cleared.
7. Verify role selector resets to `StageManager`.
8. Verify current event access list now includes the target email.
9. Verify the row role is `StageManager`.
10. Verify the row is labeled `Manual`.
11. If the user was not in the org before, verify org membership now exists.
12. Verify no pending row was created for that email.

Expected:
- success notice text is sensible
- user appears under current access, not pending
- org membership is auto-created if previously absent

### Phase 6: Quick grant to not-yet-signed-in email

Use a valid email that does not correspond to an existing signed-in user.

1. Enter the new email.
2. Choose role `ActAdmin`.
3. Submit.
4. Observe success notice.
5. Verify email clears and role resets.
6. Verify the email appears in `Pending Access`.
7. Verify pending label reflects manual grant wording.
8. Verify no current event access row exists yet for that email.
9. Verify `pending_event_access` contains a `pending` row for the event.

Expected:
- quick grant succeeds without hard failure
- pending row appears instead of event-member row

### Phase 7: Invalid input and failure handling

1. Confirm grant button is disabled while email input is blank or whitespace-only.
2. Enter an obviously invalid email and try to submit if browser validation allows it.
3. If browser blocks submit, record that native email validation is doing the first-line validation.
4. If submit reaches backend and backend rejects, verify an error notice appears.
5. Verify failed submission does not create pending or current rows.
6. Verify previous visible data remains stable after the error.

Expected:
- invalid data does not silently create access
- UI surfaces an error instead of pretending success

### Phase 8: Pending list search

Create at least two pending rows with different emails and roles if needed.

1. Search by exact email fragment.
2. Search by lowercase role fragment such as `actadmin`, `member`, or `stage`.
3. Clear search.

Expected:
- matching pending rows remain visible
- non-matching pending rows disappear from the filtered list
- clearing search restores the full list

### Phase 9: Current access search

Ensure there are at least three current rows across different roles if possible.

1. Search by email fragment.
2. Search by role fragment.
3. Clear search.

Expected:
- same filtering behavior as pending
- search is case-insensitive

### Phase 10: Update existing manual member role

Use a manual row created through quick grant.

1. Locate the member row.
2. Verify `Save` is initially disabled when the dropdown matches the current role.
3. Change role to another valid role.
4. Verify `Save` becomes enabled.
5. Click `Save`.
6. Observe success notice.
7. Verify row reflects the updated role after refresh/refetch.
8. Verify no duplicate row for the same email appears.

Expected:
- one row remains for the user
- role changes persist cleanly

### Phase 11: Manual delete

Use a manual row that is safe to remove.

1. Locate a manual row.
2. Verify trash button is enabled.
3. Click trash.
4. Observe success notice.
5. Verify the row disappears after refetch.
6. Verify other unrelated rows remain.
7. Verify any unrelated pending rows remain.

Expected:
- only the targeted manual event membership is removed

### Phase 12: Automated baseline protections

Find or create an automated baseline row through the participant-linked source path if available.

1. Locate a row labeled `Automated Baseline`.
2. Verify trash button is disabled.
3. Hover or inspect the control and confirm tooltip/title indicates source-managed access.
4. Change dropdown to another role and test whether save is allowed.
5. Record whether role updates are currently permitted for automated rows.

Expected minimum:
- automated rows are not removable from this page

Important:
- if automated rows can be role-edited, do not assume that is correct or incorrect without checking resulting behavior against product intent; report it as observed behavior plus risk if it appears questionable

### Phase 13: Loading-state behavior

Use slow network throttling or query observation if possible.

1. Reload `/admin/access`.
2. Observe initial page state.
3. Verify the page shows a global spinner while role authority is loading.
4. Once authorized, verify pending and current sections independently show loading spinners if their queries are still in flight.

Expected:
- no broken half-authorized flash exposing controls to unauthorized users
- loading states are visually stable and understandable

### Phase 14: Mobile viewport validation

Run at a phone viewport, ideally one narrow width and one common iPhone width.

1. Open `/admin/access`.
2. Validate the quick-grant stack order.
3. Validate email field, role selector, and grant button are all visible and usable.
4. Validate search field remains reachable.
5. Validate current access cards do not require horizontal scrolling.
6. Validate dropdown, save, and trash actions can be reached and tapped.
7. Validate long email strings do not push controls off-screen.
8. Validate notices appear without obscuring the whole workflow.

Expected:
- screen remains operationally usable on touch devices

### Phase 15: Cross-check with data tables

For every create, update, and delete mutation above, spot-check the relevant table state.

Check:
- `event_members`
- `pending_event_access`
- `organization_members` when testing org auto-membership

Expected:
- UI state matches persisted data after refetch
- no duplicate visible rows caused by one action

## Evidence To Capture

Antigravity should collect:
- screenshot of unauthorized Access view
- screenshot of authorized Access view
- screenshot of successful pending grant
- screenshot of successful existing-user grant
- screenshot of current access row edit flow
- screenshot of automated baseline row showing non-removable state
- mobile-width screenshot
- brief table snapshots or query outputs proving create/update/delete side effects

## Failure Heuristics

Raise a failure if any of these happen:
- unauthorized user sees management controls
- authorized admin cannot reach management UI
- `/access` does not redirect to `/admin/access`
- signed-in target only creates pending instead of current event membership
- unsigned target hard-fails instead of creating pending access
- org membership is not auto-created for signed-in targets when missing
- manual delete removes automated/source-managed access
- search behaves inconsistently between pending and current sections
- save action creates duplicate visible access rows
- success notice appears but table state does not match
- mobile layout prevents completion of a core staffing action

## Suggested Report Format

Ask Antigravity to return:

1. Summary
- overall status: pass, pass with issues, or fail
- number of failures
- highest-risk regression

2. Passes
- concise bullet list of validated behaviors

3. Failures
- one bullet per failure with:
  - severity
  - repro
  - expected
  - actual
  - likely layer

4. Open Questions
- anything ambiguous in shipped intent, especially around editable automated rows

5. Evidence
- screenshots
- table-state confirmation
- tested personas and environments

## Notes For This Repo

Relevant implementation references:
- [AccessPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/AccessPage.tsx)
- [useAccess.ts](/Users/vinay/dev/InOutHub-Events-main/src/hooks/useAccess.ts)
- [AdminPage.tsx](/Users/vinay/dev/InOutHub-Events-main/src/pages/AdminPage.tsx)
- [BottomNav.tsx](/Users/vinay/dev/InOutHub-Events-main/src/components/layout/BottomNav.tsx)
- [AppRouter.tsx](/Users/vinay/dev/InOutHub-Events-main/src/router/AppRouter.tsx)

Current product and Supabase expectations were documented in:
- [session-handoff-2026-03-20-manage-reqs-mvp.md](/Users/vinay/dev/InOutHub-Events-main/docs/codex/session-handoff-2026-03-20-manage-reqs-mvp.md)
