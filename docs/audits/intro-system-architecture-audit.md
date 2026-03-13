# Intro System Architecture Audit

Date: 2026-03-13
Status: Current after intro capability refactor

## Boundary Audit

The current intro system boundaries are broadly correct:

- Frontend capability client:
  - [src/lib/introCapabilities.ts](/Users/vinay/dev/InOutHub-Events/src/lib/introCapabilities.ts)
  - Exposes product-level intro capabilities only.
- Server capability layer:
  - [supabase/functions/intro-capabilities/index.ts](/Users/vinay/dev/InOutHub-Events/supabase/functions/intro-capabilities/index.ts)
  - Owns intro validation, composition persistence, approval semantics, and playable intro shaping.
- Low-level AI/media adapter:
  - [supabase/functions/generate-act-assets/index.ts](/Users/vinay/dev/InOutHub-Events/supabase/functions/generate-act-assets/index.ts)
  - Owns model routing, prompt construction, trust header handling, storage pathing, and fallback logic.

This matches the intended product shape:

UI
→ capability client
→ intro capability/orchestrator
→ AI/storage adapter

## Remaining Leaks

Intro-specific leaks are mostly removed. The main remaining direct `generate-act-assets` callers in the frontend are not part of the intro pipeline:

- [src/pages/ParticipantProfilePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ParticipantProfilePage.tsx)
- [src/components/acts/ActCard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/acts/ActCard.tsx)

These appear to be legacy/experimental generative media entry points, not the canonical intro workflow.

One controlled freeform JSON parse still exists server-side:

- [supabase/functions/intro-capabilities/index.ts](/Users/vinay/dev/InOutHub-Events/supabase/functions/intro-capabilities/index.ts)

That parse is intentional and acts as a normalization boundary for previously persisted `IntroComposition` descriptions.

## IntroComposition Contract

Canonical shape:

- `version`
- `selectedAssetIds`
- `curation`
- `background`
- `audio`
- `approved`
- `lastUpdated`

Primary references:

- [src/types/domain.ts](/Users/vinay/dev/InOutHub-Events/src/types/domain.ts)
- [src/components/acts/IntroVideoBuilder.tsx](/Users/vinay/dev/InOutHub-Events/src/components/acts/IntroVideoBuilder.tsx)
- [supabase/functions/intro-capabilities/index.ts](/Users/vinay/dev/InOutHub-Events/supabase/functions/intro-capabilities/index.ts)
- [src/components/console/IntroVideoPlayer.tsx](/Users/vinay/dev/InOutHub-Events/src/components/console/IntroVideoPlayer.tsx)
- [src/components/console/LivePerformanceController.tsx](/Users/vinay/dev/InOutHub-Events/src/components/console/LivePerformanceController.tsx)

Assessment:
- Builder uses the canonical shape.
- Server normalizes persisted shape before returning it.
- Playback consumes the canonical shape directly.
- Console no longer parses description JSON for intro playback decisions.

## Approval Semantics

Current enforcement is correct:

- Draft intros do not surface as playable in the Stage Console.
- `getPlayableIntro` rejects unapproved compositions.
- Approval fails cleanly if:
  - no valid selected assets exist
  - selected assets do not belong to the act
  - no background exists
  - no curation metadata exists

## Deployment Readiness

Required environment for `intro-capabilities`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required environment for downstream AI adapter:

- `GOOGLE_SERVICE_ACCOUNT_KEY`

Readiness notes:

- `intro-capabilities` now validates the caller using Supabase Auth before orchestrating intro actions.
- `generate-act-assets` still requires `x-inouthub-trust` for internal calls and remains the only layer that knows that handshake.
- Storage pathing remains under `participant-assets/acts/...` and is unchanged by this refactor.
- Intro background and audio remain act-level references persisted through `IntroComposition`.

Current remote status on 2026-03-13:

- Remote project URL from local `.env.local` is reachable.
- `generate-act-assets` is deployed remotely.
- `intro-capabilities` is now deployed remotely.
- Authenticated `getIntroComposition` returns a normalized `IntroComposition`.
- Validation paths currently return expected structured errors such as `INVALID_ASSET_SELECTION`, `INCOMPLETE_COMPOSITION`, and `INTRO_NOT_APPROVED`.
- Smoke verification passes from the local script after switching it to inspect raw HTTP error payloads.

## Gate 15 Risk Points

Most likely breakpoints in the end-to-end intro loop:

1. `intro-capabilities` not deployed while frontend expects it.
2. Missing `SUPABASE_ANON_KEY` in edge-function env, which now matters for auth validation.
3. Background or audio generation blocked by external provider availability.
4. Legacy UI entry points still using `generate-act-assets` directly for non-intro media and creating confusion during operator testing.

Current active blocker:

- deployment blocker is cleared
- curation fallback gap has been fixed and redeployed
- backend positive path is verified through build, curate, approve, and playable-intro retrieval
- remaining work is manual Builder and Stage Console flow validation

## Experimental Media Classification

Production intro pipeline:

- intro photo curation
- intro background generation
- intro audio generation
- act-level `IntroComposition` persistence
- approved playable intro retrieval
- dynamic browser playback

Experimental media capabilities:

- poster generation via [src/pages/ParticipantProfilePage.tsx](/Users/vinay/dev/InOutHub-Events/src/pages/ParticipantProfilePage.tsx)
- act-card AI generation trigger via [src/components/acts/ActCard.tsx](/Users/vinay/dev/InOutHub-Events/src/components/acts/ActCard.tsx)
- Veo video path in [supabase/functions/generate-act-assets/index.ts](/Users/vinay/dev/InOutHub-Events/supabase/functions/generate-act-assets/index.ts)
- other adapter-level Vertex experiments that still live inside `generate-act-assets`

Recommendation:
- preserve them as-is for now
- keep them outside Gate 15 validation
- move them behind separate capability APIs later only if they become production product surfaces
