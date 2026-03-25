# AGENTS.md

## Purpose
This file defines the operating contract for any agent working in the `InOutHub-Events` repository to ensure planning, implementation, and verification remain aligned with the operational source of truth.

---

## 1. Project Identity & Core Loop
**InOutHub** is a live event operations platform.
**Goal:** `Ingest -> Assemble Acts -> Schedule -> Execute`.
**Primary Object:** The `Act`.
**Priority:** Live-event reliability over creative flexibility.

---

## 2. Canonical Authority (Order of Precedence)
1. `database_schema.sql` (Physical Truth)
2. `AGENTS.md` (Operational Truth)
3. `task.md` (Tactical Truth - MUST live in repo root)
4. `SPEC.md` (Architectural Intent)
5. `.agents/skills/` (Domain Guardrails)
6. Runtime code in `src/` and `supabase/functions/`
7. `docs/` (Supplementary tracked planning and audit history only)

> [!IMPORTANT]
> External "brain" files are NOT authoritative.
> Call out drift between docs/code before implementing.
> Durable artifacts that matter should be moved into the repo `docs/` directory.

---

## 3. Technology Baseline
- **Stack:** Vite, React, TS, Tailwind, Supabase (Postgres), PWA.
- **Reference Alert:** Any Firestore/Firebase mentions in `SPEC.md` are **STALE**. Use Supabase.
- **Security:** Use `x-inouthub-trust` headers for internal pipeline calls.

---

## 4. Collaboration Modes
- **Plan Mode (Default):** Fact-gathering, drift identification, decision-complete plans. No disk writes to `src/`.
- **Build Mode:** Active only after explicit authorization (e.g., "Implement this").

---

## 5. Scope Guardrails
- **In Scope:** Roster sync, Act assembly, Stage scheduling, Console execution, PWA resilience, AI-assistance for operators.
- **Out of Scope:** Ticketing, Payments, Seating, General attendee management, V1 family UX (unless planned).

---

## 6. UI / UX Guardrails (Mobile-First)
- **Touch Targets:** min `44px`.
- **Thumb-Zone:** Place primary actions in lower portion for mobile operators.
- **Disclosure:** Keep list views clean; dense data belongs in dedicated workspaces.
- **Contrast:** High-contrast status visibility for low-light environments.

---

## 7. AI & Intro Studio Rules
- **Subordination:** AI assists; it does not dictate.
- **Approval:** Explicit operator approval required for all generative outputs.
- **States:** Draft vs Approved MUST be distinct.
- **Consistency:** Do not drift data shapes between Builder, Database, and Console.

---

## 8. release & Verification Loop
**Complete = Contract Aligned + Build Passes + Flow Verified.**
1. Select Org/Event.
2. Verify Roster/Participants.
3. Assemble/Open Act.
4. Update Act/Intro Studio data.
5. Verify Schedule/Lineup.
6. **Execution Test:** Verify Stage Console reflects changes and advances correctly.

Critical flow guardrail:
- Any change affecting auth, workspace selection, onboarding, dashboard entry, or stage-console entry must be regression-checked against the protected entry flows in `docs/critical_flow_guardrails.md` before it is treated as complete.

---

## 9. Gate Tracking
`task.md` at the root is the validation ledger.
- `Verified` means current behavior matches the ledger.
- Regressions MUST revert a gate to `Needs Revalidation` or `In Progress`.

---

## 10. Preferred Agent Behavior
- **Direct & Rigorous:** Focus on contracts and regressions.
- **No Speculation:** Avoid adding scope during stabilization.
- **Fact-First:** Inspect `git status` and `database_schema.sql` before planning.
