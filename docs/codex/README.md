# Codex Working Files

This folder is the Codex-owned workspace for durable notes, checkpoints, and operator-facing writeups that should not be mixed with Gemini IDE scratch files.

## Working agreement

- `task.md` remains in the repo root because the project contract expects it to exist there.
- In practice, Gemini may update `task.md` and related scratch/implementation files as part of its IDE workflow.
- Because of that, Codex will treat those files as volatile unless the user explicitly asks for them to be updated or treated as final.

## Codex policy

Codex will use this `docs/codex/` folder for:

- durable working notes
- stable handoff summaries
- operator-facing workflow docs
- narrow implementation checkpoints that should survive across sessions

Codex will avoid using `task.md` as a scratchpad unless explicitly instructed.

## Current implication

If Gemini modifies:

- `task.md`
- implementation notes
- ad hoc scratch files

that should not automatically be treated as Codex-authored truth.

Instead:

- repo/deploy truth comes from committed code and schema
- Codex durable narrative/context lives under `docs/codex/`

