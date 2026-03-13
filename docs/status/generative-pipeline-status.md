# Generative Pipeline Status

Imported into the repo from external agent artifact history on 2026-03-13 and normalized for local reference.

This document is a supporting status snapshot, not the canonical source of truth.

## Summary

The production generative pipeline centers on:
1. a frontend trigger
2. the `generate-act-assets` edge function
3. Google AI authentication and model calls
4. Supabase Storage persistence
5. `act_requirements` updates
6. runtime console or workspace consumption

## Stable Themes from the Prior Status

- the edge function moved from mock behavior toward production structure
- generated assets are persisted into Supabase storage and linked through `act_requirements`
- the console/rendering side has historically been the least stable part of the pipeline

## Current Caveat

Poster-generation status should not be conflated with intro-composition stability. The intro system now has its own contract and verification burden across builder, persistence, approval state, console detection, and playback.
