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
