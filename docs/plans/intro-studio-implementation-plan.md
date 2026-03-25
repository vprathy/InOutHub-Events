# Intro Studio Implementation Plan

Imported into the repo from external agent artifact history on 2026-03-13.

This plan is preserved as historical design intent. It does not override the current stabilization policy in `AGENTS.md` or the current gate ordering in `task.md`.

## Goal

Transform the existing intro-builder workflow into a more discoverable, dedicated "Intro Studio" workspace for act-level intro authoring.

## Proposed Structural Direction

- Add an `INTRO STUDIO` top-level workspace tab to the performance profile.
- Move the intro builder out of the `Assets` sub-tab and into that dedicated workspace.
- Emphasize a canvas-first workflow with clearer step progression.

## Proposed UX Directions

- storyboard-style composition surface
- stronger step copy and onboarding text
- integrated preview flow
- clearer distinction between authoring, curation, preview, and approval

## Current Constraint

This plan remains subordinate to intro-system stabilization. Any future build work should preserve the canonical `IntroComposition` contract and should not use UI refactoring to hide unresolved playback or persistence regressions.

## 2026-03-25 Selective Recovery Candidate

One worthwhile item from the older `codex/mobile-readiness-redesign` branch should stay on the roadmap even if the larger branch is never merged.

### Recover Preview Timing Controls In The Existing Builder

Why it is worth recovering:
- Operators benefit from quick control over per-scene timing before approval.
- This improves intro prep quality without requiring the full dedicated Intro Studio workspace to exist first.

Recommended behavior:
- show compact scene timing controls in the existing builder
- allow simple timing changes like `2s / 3s / 4s / 5s`
- show total storyboard timing
- allow saving preview timing before final approval
- keep preview playback tied to the canonical `IntroComposition` model

Why this belongs here:
- it is an intro-authoring enhancement, not an intake or dashboard concern
- it improves the current builder immediately while still aligning with the longer-term Intro Studio direction

Roadmap timing:
- after intake hardening and mapping review / lock
- before any larger Intro Studio tab refactor

Guardrail:
- do not replace contract stability with visual polish
- timing controls must preserve `IntroComposition` consistency across builder, persistence, and console playback
