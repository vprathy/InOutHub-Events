# Docs

This directory holds tracked supporting documents that were previously stored only in external agent artifact history.

Authority order still lives at the repo root:
1. `database_schema.sql`
2. `AGENTS.md`
3. `task.md`
4. `SPEC.md`
5. `.agents/skills/*`
6. runtime code

Everything under `docs/` is supplementary. These files are useful for planning, audits, verification history, and implementation context, but they do not override the root source-of-truth files above.

## Imported Supporting Docs

- [Knowledge Report](./audits/knowledge-report.md)
- [Regression Audit](./audits/regression-audit.md)
- [Intro Studio Plan](./plans/intro-studio-implementation-plan.md)
- [Generative Pipeline Status](./status/generative-pipeline-status.md)
- [Edge Function Verification](./verification/edge-function-verification.md)
- [Walkthrough Summary](./walkthrough.md)

## Compatibility Notes

Older top-level `docs/implementation_plan.md` and `docs/knowledge_report.md` names are retained as compatibility pointers to the curated files above.

## Usage

- Keep canonical governance and product docs at the repo root.
- Move durable planning and audit artifacts here instead of relying on external `.gemini/...` storage.
- If a `docs/` file conflicts with a root file or runtime behavior, update the `docs/` file or treat it as stale.
