# 🧪 Gate 15 Morning Testing Packet
**Date:** Monday Morning Performance Audit
**Target:** Intro System MVP Validation (The strong Solo Singer)

---

## 📋 1. Strict Gate 15 Test Script

| Phase | Step | Action | Success Signal |
| :--- | :--- | :--- | :--- |
| **I. Upload** | 1 | Open `/acts` -> **The strong Solo Singer** -> **Cast** tab. | Primary Act loads with 5 assigned cast members. |
| | 2 | Pick 1st performer -> Open Profile -> Upload 1 new `.jpg`. | File upload succeeds; thumbnail appears in profile. |
| | 3 | Toggle "Approve" for the new asset; refresh page. | Asset keeps "Approved" state after reload. |
| **II. Studio** | 4 | Return to Act workspace -> **Media & Intro** tab. | "Intro Studio" section renders correctly. |
| | 5 | Select 2+ Approved photos -> Tap **Arrange Photos**. | Storyboard/Grid updates with selected assets. |
| | 6 | Tap **Generate Background** -> wait through the normal review window only. | Static AI background renders. If no background appears after the wait window, mark `BLOCKED: background pending` and stop. |
| | 7 | Tap **Approve for Stage**. | Workspace shows **APPROVED** (Green) status badge. |
| **III. Stage** | 8 | Open `/stage-console` -> Select **Main Stage** -> Tap **START SHOW**. | Console promotes "The strong Solo Singer" into the live/current slot. |
| | 9 | Verify: **INTRO PENDING APPROVAL** banner is GONE on the live/current act card. | "Play Intro" button is enabled/visible on the live/current act. |
| | 10 | Tap **PLAY INTRO**. | Ken Burns cinematic playback starts on the console. |

---

## 🪲 2. Bug Capture Template

**Issue ID:** `G15-REH-[00X]`
- **Step Detected:** (e.g., Step 6 - Background Gen)
- **Symptom:** (e.g., Infinite loader, 404 on image, or layout shift)
- **Impact:** (BLOCKER / WORKAROUND AVAILABLE / COSMETIC)
- **Device:** (iPhone Manager / iPad Operator)
- **Error Log snippet:** (Check console for `x-inouthub-trust` or `403` errors)

---

## 🌲 3. Fallback Decision Tree

1. **Does "The strong Solo Singer" fail to load cast?**
   - ➔ **FALLBACK 1:** Switch to "The gummy Theater Monologue" on Side Stage.
2. **Does Photo Upload fail or vanish on refresh?**
   - ➔ **WORKAROUND:** Use existing "Approved" photos already on the profile. Skip Step 2 & 3.
3. **Does Background generation stay pending or does "Approve for Stage" trigger a background error?**
   - ➔ **BLOCKER:** Log `BLOCKED: background pending` or the exact approval error and stop Gate 15 validation for that act.
4. **Does "Play Intro" fail to start in Console?**
   - ➔ **EMERGENCY:** Use "Advance Act" to jump straight to the live performance; bypass Intro playback.

---

## ✅ 4. One-Page Execution Checklist

### 📱 Phone Manager (Pre-Show)
- [ ] Login confirmed (Admin or Org Owner).
- [ ] Org = **Tarangini** (prod) or **ZiffyVolve** (test).
- [ ] Verify "The strong Solo Singer" has approved participant photos available in the act.
- [ ] Check Dashboard pulse for any "Waiver/Doc" blocks on this act’s cast.

### 🔓 Gate 15 Validation (Studio)
- [ ] Select/Curate loop completes on mobile/tablet.
- [ ] Background generation produces a distinct image inside the allowed wait window.
- [ ] **Approve for Stage** hit. Verify "Draft" banner turns Green.

### 🏗️ Tablet Console (Stage-Side)
- [ ] "Main Stage" explicitly selected from header.
- [ ] Lineup shows correct sort order (Singer = #0).
- [ ] **START SHOW** pressed so the Singer is in the live/current slot.
- [ ] `Play Intro` is available on the live/current act card.
