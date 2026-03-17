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

---

## 11. Workflow Simplicity / Adoption Rules
- **Relief Over Process:** Users do not want to learn the system; they want relief from coordination chaos. The app must feel easier to move work forward in than juggling spreadsheets, WhatsApp, email, and printed trackers.
- **Hide Internal Complexity:** Internal stages such as parsing, staging, mapping, validation, and promotion may exist, but user-facing workflow must stay minimal and business-oriented.
- **Keep Visible Steps Tiny:** For approved external team/program intake, the visible workflow should feel like: `Approve Program -> Add Roster -> Review Flagged Gaps -> Continue`.
- **Prefer Assisted Intake:** Offer templates as an option, not as template-or-fail enforcement. Prefer “upload what you already have” plus assisted intake over rigid required formats.
- **Preferred but Flexible Intake:** Support a preferred import format where helpful, but do not require one rigid schema for all organizations. Flexible uploads should be handled through assisted mapping and review.
- **Use Business States:** Prefer user-facing labels such as `Submitted`, `Approved`, `Awaiting Roster`, `Needs Attention`, and `Ready`. Avoid exposing internal states like `staged`, `parsed`, `normalized`, `promoted`, `synced`, or `mapped` unless strictly necessary.
- **Show Attention, Not Machinery:** Do not force users through every row if most data is usable. Summarize outcomes in operator language, for example: `24 participants ready, 3 need attention`.
- **Require Operator Confirmation:** Smart mapping/import can assist, but messy external data must not auto-create participant records without explicit operator confirmation before promotion into the live roster.
- **Allow Partial Progress:** If some rows are clean and some need follow-up, the workflow should still move forward where safe. Unresolved items must remain visible and recoverable.
- **Complexity Belongs in Guided Review:** When complexity is unavoidable, contain it within a bounded admin review or mapping surface rather than spreading it across core operational screens.
- **Protect Live Surfaces:** Preserve the product spine:
  - `Acts list = scan/triage surface`
  - `Performance Workspace = coordination surface`
  - `Stage Console = live execution surface`
  Intake and review complexity must not leak into live execution surfaces.
- **Do Not Overbuild MVP Workflow:** Avoid portal-heavy admin flows, multi-step wizard complexity, chat/comms systems, generic task-management behavior, and unnecessary review stages.
- **Adoption Test:** Every new screen or flow must pass this test: does it help the user move forward quickly, or does it force the user to learn the system? If it teaches the system more than it reduces work, simplify it.

---

## 12. Dual-Intake Guardrail
- **Separate Upstream Sources:** Keep direct participant intake and external team/program submissions separate upstream.
- **Converge Late:** Converge the two intake paths only at the approved act/performance layer.
- **Approved Is Not Ready:** Approval alone does not mean stage readiness.
- **Use Clear Business Labels:** If an approved act is still awaiting cast or roster completion, show a clear business label such as `Awaiting Roster`.
