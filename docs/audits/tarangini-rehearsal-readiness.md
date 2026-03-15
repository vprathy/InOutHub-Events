# Tarangini Rehearsal-Readiness Audit

Date: March 15, 2026
Audit focus: the five core launch loops for the May 16 customer event.

## 1. Participant → Act Assignment
- Goal: fast roster sync and assignment without manual entry drift.
- Current state:
  - roster sync is already live for Tarangini / 2026 Ugadi.
  - participant assignment can now be driven from roster and directly from the performance workspace.
  - performances list now surfaces acts that still need cast.
- Risk: medium. The loop is materially better, but it still needs real-event usage against finalized acts.

## 2. Waiver/Doc Blocker Visibility
- Goal: manager identifies non-compliant performers at a glance on a phone.
- Current state:
  - dashboard, roster, and performances now surface docs and minor-safety blockers more clearly.
  - roster cards expose docs pending, special requests, and guardian-data risk without opening each profile.
- Risk: medium. The core visibility is present, but the real event still needs consistent waiver/doc inputs.

## 3. Act Readiness
- Goal: clear readiness signal for managers and stage operators.
- Current state:
  - performance workspace now shows cast, docs follow-up, arrival state, and intro approval separately.
  - empty asset arrays no longer incorrectly display as ready in the cast list.
- Risk: medium. The UI signal is better, but real acts still need rehearsal-driven tuning.

## 4. Intro Approve → Console Playback
- Goal: secure approval loop and cinematic tablet playback.
- Current state:
  - backend capability path is healthy.
  - builder and playback now consistently require approved participant photos only.
  - builder empty states now distinguish between "no cast assigned" and "no approved photos."
  - manual UI verification is still blocked by environment/data readiness.
- Risk: high. Rehearsal cannot rely on this path until the validation act/data is restored and re-tested.

## 5. Lineup → Console → Advance Act
- Goal: smooth show orchestration with one-tap advancement.
- Current state: core loop is the right next operator priority after manager-path stabilization.
- Risk: medium. It is not the biggest product unknown, but it still needs tablet-first rehearsal hardening before April 12.
