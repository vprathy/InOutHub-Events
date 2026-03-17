# Tarangini 2026 Launch-State Matrix

**Date:** March 15, 2026
**Purpose:** Define the definitive operational states for core objects to ensure alignment between Manager and Operator tools.

---

## 1. Participant States (Manager Focus)

| State | DB/Logic Criteria | UI Display | Available Actions | Blocker Info |
| :--- | :--- | :--- | :--- | :--- |
| **Needs Work** | `has_special_requests: true` OR `missing_assets: >0` | 🔴 **Needs Work** (Badge) | Edit Profile, Contact Guardian, Upload Docs | Blocks "Act Readiness" |
| **Identity Pending** | `identity_verified: false` | 🟠 **Pending ID** | "Verify Identity" toggle | Warning only; doesn't block stage |
| **Ready** | `status: 'active'`, all required assets Approved | 🟢 **Ready** | Assign to Act | None |
| **Backstage** | `arrival_status: 'Backstage'` | 🔵 **Backstage** | Mark "Ready for Stage" | Manager can see "Real-time" arrival |
| **Withdrawn** | `status: 'withdrawn'` | ⚪ **Withdrawn** | Restore to Active | Excluded from rosters |

---

## 2. Act / Performance States (Manager & Operator)

| State | DB/Logic Criteria | UI Display | Available Actions | Blocker Info |
| :--- | :--- | :--- | :--- | :--- |
| **Draft / Needs Cast** | `participant_count: 0` | ⚪ **Needs Cast** | Add Performers | Cannot build Intro |
| **Assets Pending** | `missing_asset_count: >0` | 🟠 **Missing Assets** | Upload Music/Assets | Blocks "Stage Readiness" |
| **Intro Required** | `has_approved_intro: false` | 🟣 **Intro Needed** | Open Intro Studio | Required for "Play Intro" in Console |
| **Ready / Approved** | All criteria met + Intro approved | 🟢 **Ready for Stage** | Move to Lineup | None |

---

## 3. Intro Composition States (Intro Studio)

| State | UI Display | Logic | Allowed actions |
| :--- | :--- | :--- | :--- |
| **Empty** | `Not Saved` | `compositionId` is null | Select Photos, Generate Bkgr/Audio |
| **Processing** | `Generating...` | Edge function triggered, `isPending: true` | Wait, Poll |
| **Draft** | `Draft` (Amber) | Saved but `approved: false` | Curate, Regen, Approve |
| **Approved** | `Approved` (Green) | `approved: true` | Revoke approval (moves back to Draft) |

---

## 4. Lineup Item States (Show Flow)

| State | Execution Status | UI Display | Impact |
| :--- | :--- | :--- | :--- |
| **Queued** | `Queued` | Standby (Gray) | Visible in Lineup |
| **Backstage** | `Backstage` | Arrived (Blue) | Operator knows they are present |
| **On Deck** | `On Deck` | **NEXT UP** (Amber) | Ready for transition |
| **Live** | `Live` | **LIVE NOW** (Red Pulse) | Active on Stage |
| **Completed** | `Completed` | Done (Green) | History/Audit |

---

## 5. Stage Console Control States (Tablet)

| State | UI Display | Actions Allowed | Impact |
| :--- | :--- | :--- | :--- |
| **Idle** | **START SHOW** (Big Play) | Start Show | Resets drift; starts first act |
| **Active** | **LIVE** (Status Picker) | Pause, Next, Play Intro | Real-time execution |
| **Paused** | **PAUSED** (Amber) | Resume, Reset | Halts drift timer |
| **Finished** | **SHOW COMPLETE** | Restart / Reset | Clears console state |

---

## Blocker Resolution Guide for Tarangini 2026

- **The "Force Ready" Rule**: If an act is missing a non-critical asset (e.g., a "Fun Fact" photo) but is physically ready, the Manager should use the **Notes** field to signal the Operator to "Skip Intro" or "Play Default".
- **The "Waiver Hard-Stop"**: No participant should be marked **Ready** if `Waiver` asset is not `Approved`.
- **The "Show Advance" Rule**: Tapping "Next Performance" automatically marks the current act `Completed` and the next act `Live`. No intermediate "Loading" state is permitted for live-event speed.
