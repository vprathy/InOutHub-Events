# [SUPERSEDED] Tarangini 2026 Mobile/Tablet QA Checklists
> [!IMPORTANT]
> This file is superseded by the [Consolidated Launch Packet](file:///Users/vinay/dev/InOutHub-Events/docs/tarangini-launch-packet.md).

**Date:** March 15, 2026
**Scope:** Final operational clearance for live deployment.

---

## 📱 Manager Checklist (Phone-First)
*Goal: Accurate Roster & Readiness*

### 1. Roster Integrity
- [ ] **Sync Verification**: Tap "Sync Now" on Dashboard. Verify "Last Seen" timestamp updates.
- [ ] **Search Performance**: Search for "Solo Singer". Verify results appear in < 500ms.
- [ ] **Filter Stress**: Cycle through `All` -> `Missing Docs` -> `Ready`. Ensure no list jump.

### 2. Readiness Clearance
- [ ] **Waiver Check**: Open a participant with "Missing Docs". Upload a placeholder. Verify status moves to `Ready`.
- [ ] **Guardian Contact**: Tap "Call Guardian" (Simulated). Verify phone number is formatted correctly for mobile dialer.
- [ ] **Note Persistence**: Add an "Internal Note". Reload. Verify Note appears with correct timestamp.

### 3. Act Assignment
- [ ] **Search-to-Assign**: Search for a participant in the "Add Cast" modal. Assign to "Strong Solo Singer".
- [ ] **Collision Check**: Assign same participant to two back-to-back acts. Verify "Conflict Detection" badge appears.

---

## 🏗️ Operator Checklist (Tablet-First)
*Goal: Zero-Latency Execution*

### 1. Show Flow Management
- [ ] **Drag-and-Drop**: Move "Act 5" to Position 1. Verify "Scheduled Time" recalculates immediately.
- [ ] **Locking Mechanism**: Verify "Locked" items cannot be dragged.
- [ ] **Optimizer Run**: Tap "Analyze Flow". Verify conflict warnings are resolved or highlighted.

### 2. Intro Studio Reliability
- [ ] **Photo Selection**: Select 3 photos. Verify checkmarks appear clearly.
- [ ] **Curation Loop**: Tap "Arrange Photos". Verify AI suggestions appear with "Pacing" and "Focal Point".
- [ ] **Background Preview**: Generate Background. Verify the static image fits the canvas without stretching.
- [ ] **Approval Persistence**: Mark "Approved". Reload workspace. Verify "Approved" badge remains.

### 3. Stage Console Execution
- [ ] **Start Show**: Tap "START SHOW". Verify timer begins at zero.
- [ ] **Intro Flow**: Tap "PLAY INTRO" on the current act. Verify Ken Burns animation is smooth.
- [ ] **Next Advance**: Tap "NEXT PERFORMANCE". Verify the "Next Up" act becomes "LIVE NOW" instantly.
- [ ] **Offline Simulation**: Toggle airplane mode. Verify "Offline" badge appears and status picker still responds (optimistic UI).

---

## 🚨 Final "Red Flag" Pass (Do NOT launch if these fail)
1. **Broken Persistence**: Changes lost after browser refresh.
2. **Horizontal Scroll Overlap**: Navigation bars overlapping primary action buttons.
3. **Identity Blindness**: Cannot see "Minor" status clearly in the Stage Console notes.
4. **CORS Rejection**: `x-inouthub-trust` errors in the network tab preventing AI generation.
