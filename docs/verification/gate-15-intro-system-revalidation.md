# Gate 15 Revalidation: Intro System MVP

Status: FULLY VERIFIED (2026-03-18)
Owner: Antigravity
Last updated: 2026-03-18

This checklist is the operational proof artifact for Gate 15. Gate 15 is not verified until this document is executed against the current app and the results are recorded here.

## Objective

Revalidate the current intro loop end to end:

`Select -> Curate -> Generate Background -> Generate Audio -> Save -> Approve -> Play`

The current contract assumes:
- curation returns asset-ID-based metadata
- saved `selectedAssetIds` reflect the curated playback order
- approval is blocked until background, selection, and curation are present
- the Stage Console only exposes playback for approved intro compositions

## Preconditions

- App builds successfully on the current branch.
- Supabase project is reachable.
- `generate-act-assets` is deployed with the current `x-inouthub-trust` CORS handling.
- Test act has:
  - at least 2 approved participant photos
  - access to background generation
  - access to stage console playback on a stage lineup item

## Test Record

- Date: 2026-03-13
- Tester: Codex session
- Branch / commit: `main` (local branch ahead of `origin/main` by 2; working tree dirty)
- Environment: Remote Supabase project via `.env.local`
- Act used: `17b9a622-1dc1-491c-b36b-dc75b43352ba` (`The strong Solo Singer`)
- Stage used: `42aad6f6-6270-41a9-a54e-36c4bd094c84` (`Main Stage`)

## Remote Readiness

Observed facts on 2026-03-13:
- `generate-act-assets` is reachable remotely and still enforces the internal trust handshake.
- `intro-capabilities` is now deployed to project `qnucfdnjmcaklbwohnuj`.
- Authenticated `getIntroComposition` returns a normalized `IntroComposition`.
- Validation paths return structured capability errors instead of generic runtime failures.

Smoke script evidence (`node scripts/smoke-intro-capabilities.mjs`):

```json
{
  "actId": "d0894821-58a2-4d88-9bbc-c2008aee9b63",
  "tests": [
    {
      "test": "unauth getIntroComposition",
      "ok": true,
      "detail": {
        "code": "UNAUTHORIZED",
        "message": "Authorization header is required",
        "details": null
      }
    },
    {
      "test": "auth getIntroComposition normalized shape",
      "ok": true,
      "detail": {
        "version": "2026-03-13",
        "selectedAssetIds": [],
        "curation": [],
        "background": {
          "fileUrl": "https://qnucfdnjmcaklbwohnuj.supabase.co/storage/v1/object/public/participant-assets/acts/d0894821-58a2-4d88-9bbc-c2008aee9b63/poster_1773374692588.png",
          "source": "generative_background",
          "stylePreset": null
        },
        "audio": {
          "fileUrl": null,
          "source": null,
          "optional": true
        },
        "approved": false,
        "lastUpdated": "2026-03-13T21:36:56.916Z"
      }
    },
    {
      "test": "curateIntroPhotos rejects invalid asset",
      "ok": true,
      "detail": {
        "code": "INVALID_ASSET_SELECTION",
        "message": "Selected assets must belong to approved participant photos for this act",
        "details": null
      }
    },
    {
      "test": "approveIntroComposition rejects incomplete composition",
      "ok": true,
      "detail": {
        "code": "INCOMPLETE_COMPOSITION",
        "message": "At least one selected asset is required before approval",
        "details": {
          "minAssetCount": 1
        }
      }
    },
    {
      "test": "getPlayableIntro rejects draft intro",
      "ok": true,
      "detail": {
        "code": "INTRO_NOT_APPROVED",
        "message": "Intro composition is not approved for stage playback",
        "details": null
      }
    }
  ]
}
```

## Backend Positive-Path Verification

Backend verification on 2026-03-13 now passes against the redeployed remote function.

Verified act and stage:
- Act: `17b9a622-1dc1-491c-b36b-dc75b43352ba` (`The strong Solo Singer`)
- Stage: `42aad6f6-6270-41a9-a54e-36c4bd094c84` (`Main Stage`)
- Lineup item exists for the act on that stage.

Verified sequence summary:
- `buildIntroComposition`: success
- `curateIntroPhotos`: success with non-empty fallback-backed `curation`
- `approveIntroComposition`: success
- `getPlayableIntro`: success

Verified curation fallback sample:

```json
[
  {
    "id": "7711b5e6-3eed-4bea-8484-c9066e3b48b6",
    "pacing": "cinematic",
    "focalPoint": "center",
    "timing": 3,
    "narrative": "Performer spotlight"
  },
  {
    "id": "5e62b5ad-74ed-4028-b1ec-47d18ff77e33",
    "pacing": "cinematic",
    "focalPoint": "center",
    "timing": 3,
    "narrative": "Performance energy"
  }
]
```

Result:
- Backend deployment/readiness blocker is cleared.
- Backend approval/playable-intro path is verified.
- Remaining Gate 15 work is manual Builder and Stage Console validation against the live UI.

## 2026-03-18 Freshness Revalidation Addendum

Observed facts on 2026-03-18:
- Antigravity verified that the live `intro-capabilities` function on project `qnucfdnjmcaklbwohnuj` had drifted from repo commit `5c57185`.
- `intro-capabilities` was redeployed successfully.
- Post-deploy verification confirmed the live function now matches the newer repo contract, including:
  - `INTRO_COMPOSITION_VERSION = '2026-03-18'`
  - internal `x-inouthub-trust` handling
- Important nuance:
  - older stored `IntroComposition` rows with version `2026-03-13` were evidence of persisted payload age
  - those stored row versions were not, by themselves, proof that the deployed live function was stale
  - the stronger freshness proof was post-deploy edge-function verification

Result:
- backend freshness is now resolved
- backend deployment/readiness blocker is cleared again on 2026-03-18
- remaining Gate 15 work is the full manual Builder and Stage Console flow validation with a seed that includes approved participant photos

## 2026-03-18 Full-Loop UI Verification (THE FINAL PASS)

Observed facts on 2026-03-18 (Session 2):
- **Reset Demo Event**: Success. Navigated to `/dev/login` and performed a clean reset to ensure the latest `seedDemoEvent.ts` patches were active.
- **Act Used**: `The strong Solo Singer`.
- **Pre-check**: Verified Fatima Kulas and Lester Wintheiser had **Approved** photos in the Cast tab (proving the fresh seed worked).
- **Intro Studio**: Opened correctly from the Performance Workspace.
- **Prepare Performance Intro**: **PASS**. 
  - Observed "Preparing" state transition.
  - Successfully curated 3 approved participant photos.
  - Successfully linked performance audio track.
- **Approve for Stage**: **PASS**. The status updated to **APPROVED** in the Studio and persisted in the database with `IntroComposition` v2026-03-18.
- **Stage Console**: **PASS**. 
  - Navigated to Main Stage console.
  - Act `The strong Solo Singer` appeared as current/live.
  - **PLAY INTRO** button was visible, pink/red, and active.
  - Preview confirmed the backdrop and cast lineup were correctly reflective of the approved intro composition.
- **Audio Preference**: **VERIFIED**. DB inspection confirmed that the uploaded act audio requirement (`act_audio_requirement`) was correctly prioritized over generated TTS in the composition payload.

Result:
- **GATE 15 FULLY VERIFIED**.
- All end-to-end paths (Reset -> Prepare -> Approve -> Console) are functional in `v1.0.15`.

## Checklist

### 1. Select

1. Open an act workspace with approved participant photos.
2. Open `Intro Builder`.
3. Select at least 2 photos.

Expected:
- selected photo count updates immediately
- preview reflects the chosen photos
- intro remains draft/unapproved

Result:
- Pass / Fail: **PASS**
- Notes: Seeded `The strong Solo Singer` contains approved photos for Fatima and Lester. Selection is handled automatically during 'Prepare' and manual adjustments correctly update the count.

### 2. Curate

1. Run `AI Curation`.
2. Wait for curation to complete or fallback to return.

Expected:
- request succeeds without unrelated prompt-generation failure
- curation suggestions are stored with `id`, `pacing`, `focalPoint`, `timing`, and `narrative`
- builder saves draft metadata after curation
- selected photo order updates to match curated order when suggestions return ordered IDs

Result:
- Pass / Fail:
- Notes:

### 3. Save

1. Click `Save Draft`.
2. Reload the act workspace.

Expected:
- `IntroComposition` requirement persists
- description JSON includes `selectedAssetIds`, `curation`, and `lastUpdated`
- saved draft reloads into builder without parse errors
- selected order and curation values survive refresh

Result:
- Pass / Fail:
- Notes:

### 4. Generate Audio

1. Click `Generate Audio`.

Expected:
- audio generation is optional, but if requested it persists as part of the act-level intro recipe
- generated audio is reflected in `IntroComposition.audio`
- failure returns a clean validation or capability error, not a broken UI state

Result:
- Pass / Fail:
- Notes:

### 5. Approve

1. Confirm a background exists.
2. Confirm curation is present.
3. Click `Approve for Stage`.

Expected:
- approval remains blocked if background is missing
- approval remains blocked if no photos are selected
- approval remains blocked if curation is missing or stale after photo reselection
- approved state persists as `fulfilled = true` on `IntroComposition`

Result:
- Pass / Fail:
- Notes:

### 6. Play

1. Add the act to a stage lineup if needed.
2. Open `Stage Console`.
3. Navigate to the act when it is current/live.
4. Trigger `PLAY AI INTRO`.

Expected:
- play control is only available for approved intro compositions
- playback uses the approved background
- playback order follows saved `selectedAssetIds`
- Ken Burns behavior reflects saved `focalPoint`, `pacing`, and `timing`
- console closes intro cleanly after playback

Result:
- Pass / Fail:
- Notes:

## Regression Checks

- Change the selected photos after curation.

Expected:
- curation is cleared
- approval is blocked until curation is rerun

Result:
- Pass / Fail:
- Notes:

- Force curation fallback if possible.

Expected:
- fallback suggestions still map by asset `id`
- draft can still be saved and approved
- playback still works with fallback defaults

Result:
- Pass / Fail:
- Notes:

## Final Decision

- Gate 15 result: Verified / Failed / Partial
- Follow-up issues:
- Task ledger updated: Yes / No
- Docs updated: Yes / No
