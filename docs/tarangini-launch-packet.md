# Tarangini 2026 Consolidated Launch Packet

**Date:** March 15, 2026
**Target Event:** Tarangini 2026 / Ugadi Sambaralu (May 16, 2026)
**Purpose:** Executive and operational summary for the final launch phase.

---

## 📅 1. Execution-Grade Launch Cutline

### 🔥 PHASE A: Stabilization (By March 29)
*Focus: Phone-First Manager Readiness*
- **Roster Lock:** Ensure nightly sync from Google Sheets is 100% reliable.
- **Assignment Polish:** Managers must be able to assign 50+ participants to acts on mobile without lag.
- **Clearance Visibility:** High-contrast "Needs Work" and "Safety" badges must be the primary dashboard drive.
- **[CRITICAL]** Fix build errors in `ParticipantProfilePage.tsx` preventing act management.

### 🎭 PHASE B: Rehearsal Prep (By April 12)
*Focus: Tablet-First Operator Orchestration*
- **Lineup Integrity:** Show Flow must support real-time reordering with immediate time recalculation.
- **Console Reliability:** Live Console must handle network dropouts without losing track of the "Live Now" act.
- **Intro Completion:** 100% of acts must have a "Green Badge" (Approved Intro) before dress rehearsal.

### 🛡️ PHASE C: Hardening (After April 12)
*Focus: Polish & Resilience*
- **Transition Smoothness:** Ken Burns animation tuning for Intro playback.
- **Safety Guards:** Long-press or double-tap for "Reset Show" activation.
- **Empty States:** Clear "Wait for Stage" messaging if no act is loaded.

---

## 📱 2. Phone Manager Test Script (Ugadi Refreshed)

| Step | Action | Expected UI Result |
| :--- | :--- | :--- |
| 1. DASH | Open `/dashboard` | See **Needs Placement**, **Docs & Waivers**, **Safety** cards. |
| 2. SYNC | Tap "Sync Now" (if visible) | Pulse counts update; "Last Synced" time refreshes. |
| 3. ROSTER | Navigate to `/participants` | See filter bar: **All**, **Ready**, **Docs Pending**, **Needs Placement**. |
| 4. ASSIGN | Pick "Needs Placement" user | Tap "Assign to Act"; see searchable modal; assign to a Tarangini act. |
| 5. REVIEW | Open Act Workspace | See tabs: **OVERVIEW**, **TEAM**, **MEDIA & INTRO**. |
| 6. INTRO | Select **MEDIA & INTRO** | See **Intro Studio** header and available participant photos. |

---

## 🏗️ 3. Tablet Operator Test Script (Console/Flow)

| Step | Action | Expected UI Result |
| :--- | :--- | :--- |
| 1. CONSOLE | Open `/console` | "Stage Inactive" or Select "Main Stage". |
| 2. PREP | Select "Main Stage" | See **START SHOW** button and lineup preview. |
| 3. START | Tap **START SHOW** | Act 1 becomes **LIVE NOW**; timer starts. |
| 4. INTRO | Tap **PLAY INTRO** | Theatrical overlay appears; Ken Burns playback starts. |
| 5. NEXT | Tap **NEXT PERFORMANCE** | Act 1 moves to history; Act 2 becomes **LIVE NOW** instantly. |
| 6. RESET | Tap Stop Icon | **Reset Stage?** modal appears; Stage goes back to Idle. |

---

## 🔓 4. Gate 15 Unblock Note (Critical Path)

> [!IMPORTANT]
> **Primary Blocker:** `src/pages/PerformanceProfilePage.tsx` (Current build error: missing `</Button>` tag at Line 961). This must be fixed for manual validation to resume.

### Functional Requirements for Unblocking:
1. **Persistence Verification:** Ensure that "Approved for Stage" state remains after page reload.
2. **Curation Logic:** Verify `CurationInfo` correctly maps to the Ken Burns sequence (no 404s on asset URLs).
3. **Draft Guardrail:** Console must show **INTRO PENDING APPROVAL** (Amber) if the Manager hasn't hit Approve.

---

## 📘 5. Event-Day Operator Playbook (Cheat Sheet)

### 🚨 EMERGENCY: "The Intro Won't Load"
- **Reason:** Network dropout or AI generation failure.
- **Action:** Tap the "X" on the overlay or use "Advance Act" to skip content. **Prioritize the live performer over the digital asset.**

### 📈 PACING: "We are running 5m late"
- **Insight:** Check the **LIVE EXECUTION PACE** banner.
- **Action:** Communicate with Backstage via the **Needs Work** roster notes. Do NOT attempt to "Force Reset" the timer.

### 🏢 SETUP: "I see the wrong data"
- **Action:** Check top-left Organization. Switch between **Tarangini** (Prod) and **ZiffyVolve** (Staging/Demo) to find the correct event.
