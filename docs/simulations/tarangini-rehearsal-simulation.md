# Tarangini Rehearsal Simulation (Operational Trace)

**Date:** March 15, 2026
**Scenario:** Full Dress Rehearsal for Tarangini 2026.
**Objective:** Stress-test the app under "Near-Live" conditions with intentional data gaps and high operator load.

---

## Phase 1: The "Gate 0" Organization Pivot
**Simulated Issue:** Operator logs in and sees an empty Tarangini dashboard.
- **Observation:** Real-world drill showed that deep data (curated photos, approved music) often lives in the "ZiffyVolve" test org during rehearsal, while the "Tarangini" production org is fresh.
- **Support Gap:** The organization switcher is small (top-left).
- **Remedy:** Ensure Playbook Step 1 is "Verify Organization Selection: TARANGINI vs ZIFFYVOLVE".

---

## Phase 2: Roster Panic (Manager Loop)
**Simulated Issue:** 5 performers arrived but aren't assigned to any act.
- **Observation:** Filtering by "Needs Placement" correctly identified them.
- **Success:** Multi-select to "Add to Act" worked efficiently on mobile.
- **Risk:** If a performer name is misspelled in the source sheet, "Instant Search" might fail to find them unless the Manager uses partial matching (e.g., "Soh" instead of "Sohana").

---

## Phase 3: The "Wait... No Intro?" (Intro Studio Loop)
**Simulated Issue:** An act is about to start, but the Intro says "No Photos Found".
- **Observation:** This happens if photos are uploaded but not "Approved" by the Manager.
- **Latency Issue:** Browser simulation showed Intro Builder takes ~7s to initialize after assigning a cast.
- **App Stress:** If the Operator tries to "Approve for Stage" while the background is still "Pending Review" (404/403 errors), the Console might fail to load the intro overlay.
- **Remedy:** Operators must verify the "Green Badge" in Intro Studio at least 2 acts *before* the performance.

---

## Phase 4: Stage Execution Pressure (Console Loop)
**Simulated Issue:** An act runs over by 4 minutes.
- **Observation:** The "Running Over (+4m)" badge in the Console provides good situational awareness.
- **Success:** Transitioning to the next act via "NEXT PERFORMANCE" was instantaneous.
- **Friction:** On tablet, the "START SHOW" button is close to the "RESET" button. A mis-tap during show-start would clear the entire lineup progress.
- **Remedy:** Added "Confirm Reset" requirement to the Usability Wins list.

---

## Phase 5: Network Dropout (PWA Simulation)
**Simulated Issue:** Wi-Fi fails in the stage wing.
- **Observation:** The "Offline Mode" badge (WifiOff icon) is highly visible.
- **Success:** The Stage Console remains interactive; operators can advance acts.
- **Gap:** Changes made while offline (e.g., marking an act "Ready") aren't instantly visible to the Manager on their phone.
- **Remedy:** Manager must periodically check the "Status Badge" color on their dashboard.

---

## Final Post-Simulation Verdict
The application is **Launch Ready** for core loops, but "Operational Discipline" is required to handle Intro Studio latency and organization data shifts. The high-contrast Console status is a major win for stage visibility.
