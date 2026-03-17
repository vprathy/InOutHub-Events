# Knowledge Report

Imported into the repo from external agent artifact history on 2026-03-13 and lightly normalized so the repo is self-contained.

This is a supporting planning artifact, not a canonical authority file. If it conflicts with `database_schema.sql`, `AGENTS.md`, `task.md`, `SPEC.md`, or current runtime code, treat this report as stale and update it.

## Executive Summary

The repository is in a stabilization phase around the intro system and related generative asset flows. The operational core remains the product center of gravity, but documentation, schema, and runtime behavior have drifted.

The most important realities are:
- the stack is Supabase/Postgres, not Firebase/Firestore
- Gate 15 should be treated as needing revalidation
- intro naming and data contracts need to stay consistent across builder, persistence, console, and playback

## Source of Truth Audit

| Source | Status | Authority Level | Key Finding |
| :--- | :--- | :--- | :--- |
| `database_schema.sql` | Canonical | 1 | Physical contract for the live data model. |
| `AGENTS.md` | Active | 2 | Operational rules for planning, build behavior, and verification. |
| `task.md` | Tactical | 3 | Current validation ledger; some historical statuses may require revalidation. |
| `SPEC.md` | Active but needed cleanup | 4 | Strategic product blueprint; stale Firebase/Firestore references were a drift source. |
| `.agents/skills/*` | Guardrails | 5 | Domain, product, and mobile/tablet constraints. |

## Gate Status Reality Check

| Gate | Status | Reality Assessment |
| :--- | :--- | :--- |
| Gate 3 | Verified | Scheduling and orchestration remain part of the stable V1 path. |
| Gate 4 | Verified | Live execution remains central, but must still be verified through runtime smoke tests for release confidence. |
| Gate 6 | Partial | Generative pipeline exists, but poster/composition expectations have shifted over time. |
| Gate 15 | Needs Revalidation | Intro creation and playback must be treated as revalidation work until the current contract is proven end to end. |
| Gate 17 | Planned / In Progress | UX overhaul is downstream of Gate 15 intro stability. |

## Risks and Drift

1. Backend terminology drift: older docs referenced Firebase/Firestore while the real stack is Supabase/Postgres.
2. Intro terminology drift: UI, plans, and code have used both "AI Intro Package" and "Intro Composition".
3. Schema/runtime drift: generative and intro requirement types must match across schema constraints, types, and runtime mapping.
4. Release confidence drift: historical gate completion does not guarantee current runtime health.

## Recommended Future Sequence

1. Keep the root governance docs current and committed.
2. Revalidate Gate 15 end to end against the stabilized intro contract using `docs/verification/gate-15-intro-system-revalidation.md`.
3. Continue Gate 17 only from a stable intro baseline.
4. Keep V1 hardening ahead of broader feature expansion.
