# Tarangini 2026 UX Audit (Overnight Deep Dive)

**Date:** March 15, 2026
**Target Event:** Tarangini 2026
**Focus:** Operational reliability and high-stress usability.

---

## 1. Dashboard (Phone-First Manager Tool)

### Top Friction Points
- **Dense Readiness Cards**: The "RadarCard" components are visually rich but can overlap information. "Needs Placement" and "Docs & Waivers" often correlate, creating redundant alerts.
- **Contextless Numbers**: Secondary metrics like "Arrived" and "Performances Ready" show raw totals but lack a "out of X" denominator, making it hard to judge overall progress.

### Confusing Labels
- **"Active Ops"**: Implies the show is currently running. If viewed weeks before, it might be misleading. Suggest "Operational View" or "Pre-Event Pulse".

### Missing States
- **Data Refresh State**: The dashboard relies on `useDashboardRadar`. If the background sync fails, there's no "Stale Data" warning.
- **Empty Event Selection**: The "Select Event" screen is a dead-end if the user has no permissions yet.

### MVP Simplification / Deferrals
- **Defer**: "Safety / Minors at Risk" can be simplified to a general "Missing Docs" filter if minor-specific field coverage is low.
- **Simplify**: Combine "Arrived" and "Ready" into a single "Stage-Ready" count for the dashboard.

---

## 2. Participants / Event Roster (Phone/Manager)

### Top Friction Points
- **Filter Density**: 8 filter types in a horizontal scroll (`all`, `missing`, `unassigned`, `special`, etc.) is hard to navigate with one thumb.
- **Import/Sync Prominence**: The "Sync Now" button is very prominent. During the live event, this should be guarded to prevent data overwrites.

### Confusing Labels
- **"Ready" vs "Assigned"**: In the UI, "Ready" means docs are approved AND assigned. "Assigned" just means they are in an act. This distinction is subtle.

### Missing States
- **Partial Sync**: If a Google Sheet sync fails halfway, the UI doesn't show which participants are "Sync-Stale".

### MVP Simplification / Deferrals
- **Defer**: "Identity Verification Needed" and "Minor Safety Follow-Up" details. Focus instead on a "Cleared for Stage" flag.
- **Simplify**: Group filters into 3 buckets: "Ready", "Pending", "Risk".

---

## 3. Performance Profile / Workspace (Tablet/Operator)

### Top Friction Points
- **Intro Builder Weight**: Having the `IntroVideoBuilder` directly inside the `AssetsTab` makes the page very heavy. 
- **Tab Swiping**: The custom "Swippable Cockpit" for tabs might conflict with browser "back" gestures on mobile.

### Confusing Labels
- **"Director's Notes"**: Often remains empty. If empty, the placeholder "No technical notes..." takes up too much vertical space.

### Missing States
- **Intro Processing**: While a background is generating, the user can navigate away. There's no global "Intro Rendering" indicator.

---

## 4. Show Flow / Lineup (Tablet/Operator)

### Top Friction Points
- **Reorder Handles**: Using the index number as a drag handle is clever but non-standard. Users might try to drag the card itself.
- **Locked Prefix Utility**: It's great, but the "Locked for backstage coordination" text is small. Operators need a clear visual "No-Touch Zone".

### Confusing Labels
- **"Review Flow"**: Sounds like a read-only action. It actually activates the `optimizer` logic. "Analyze Flow" or "Check Conflicts" is more descriptive.

---

## 5. Stage Console (Tablet/Operator)

### Top Friction Points
- **"Start Show" Risk**: A single huge button starts the show. Accidental taps are possible.
- **Button Proximity**: "Pause" and "Reset" (Square) are close. Tapping "Reset" instead of "Pause" during a live act would be catastrophic.

### Missing States
- **Drift Warning thresholds**: "Delayed (+Xm)" is good, but does it change color based on severity (e.g., >15m = Red)?

---

## 6. Intro Studio (Special Capability)

### Top Friction Points
- **Polling Latency**: Generating a background takes time. The "Under Review" message is vague.
- **Broken Asset Handling**: If a photo is broken, there's no "Fix Now" link to jump to the participant profile to re-upload.

### Missing States
- **Audio/No-Audio Toggle**: If an act doesn't want an audio intro, the UI still pushes "Generate Audio".

---

## Summary of Top 10 High-Value Usability Changes

1. **Dashboard Denominator**: Show "X / Y" for all metrics.
2. **Simplified Filters**: Reduce Participant filters to "Ready", "Needs Work", "All".
3. **Intro Studio Jump-Link**: Add "Edit Participant" links for missing/broken photos.
4. **Console Safety**: Add a "Hold to Start" or "Confirm Start" for the Live Console.
5. **Console Separation**: Move the "Reset" button away from "Pause/Next".
6. **Note Condensing**: If "Director's Notes" is empty, collapse it or show a + button.
7. **Lineup Drag Visibility**: Add a clearer texture or "drag-dots" icon to handles.
8. **Stale Data Warning**: Show a clear warning if the "Last Synced" time is > 4 hours ago.
9. **Intro Progress Persistence**: Show a toast or banner if a background completes while the user is on another page.
10. **Ready-for-Stage Toggle**: Allow Managers to manually mark an act "Ready" even if auto-checks fail (Override Mode).
