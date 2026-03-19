# Supabase Physical Truth (Snapshot: 2026-03-18)

This document represents the absolute current state of the Supabase project `qnucfdnjmcaklbwohnuj`, verified via MCP on 2026-03-18. This serves as the "Physical Truth" for Codex and development agents.

---

## 1. Project Identity
- **Project Ref**: `qnucfdnjmcaklbwohnuj`

---

## 2. Core Operational Tables
The schema follow the `Ingest -> Assemble -> Execute` pipeline.

### root Hierarchy
- `organizations`: Root container for events.
- `events`: Individual live events.
- `stages`: Venues/Tracks within an event.

### The Roster (Ingest)
- `participants`: Event roster (imported from external systems or manual).
- `participant_assets`: Photos, waivers, and docs.
- `participant_notes`: Operational tracking for individuals.

### The Show (Assemble)
- `acts`: The primary operational unit.
- `act_participants`: Join table mapping participants to acts.
- `act_assets`: Props, instruments, or static media.
- `act_requirements`: Requirements for stage readiness (Audio, Lighting, Intro).
- `act_readiness_practices`: Scheduled rehearsals or prep sessions.
- `act_readiness_items`: Individual prep tasks (costumes, shoes, etc.).
- `act_readiness_issues`: Blocker tracking (missing costumes, parent discord).

### The Pipeline (Execute)
- `lineup_items`: Scheduled acts on a specific stage.
- `stage_state`: Live monitoring of stage activity (Idle, Active, etc.).

### System Support
- `internal_config`: Stores application-level secrets (e.g., `google_service_account_json`).
- `audit_logs`: Transaction history for all primary tables.
- `auth_events`: Login/Session tracking.
- `user_profiles`: Unified identity mapping `auth.users` to DB roles.
- `requirement_policies`: Templates for what a participant/act "needs".
- `requirement_assignments`: The status ledger for individual requirement fulfillment.

---

## 3. Data Shapes (Deep Dive)

### Intro Composition JSON (Historical Stored-Row Sample)
*Note: This sample reflects `version: 2026-03-13`. Current live contract may evolve.*
```json
{
  "version": "2026-03-13",
  "selectedAssetIds": ["uuid", "..."],
  "curation": [
    {
      "id": "uuid",
      "pacing": "cinematic",
      "focalPoint": "center",
      "timing": 3,
      "narrative": "text"
    }
  ],
  "background": {
    "fileUrl": "data:image/svg+xml;...",
    "source": "fallback_background",
    "stylePreset": "theatrical-safe"
  },
  "audio": {
    "fileUrl": "https://...",
    "source": "generated_tts",
    "optional": true
  },
  "approved": true,
  "lastUpdated": "2026-03-16T..."
}
```

### Participant Status Enum
Type `participant_status`: `active`, `inactive`, `withdrawn`, `refunded`, `missing_from_source`.

---

## 4. Edge Functions
| Slug | Purpose | Current Version |
| :--- | :--- | :--- |
| `import-participants` | Sheet/CSV Ingestion | v11 |
| `import-participants-test` | Testing / Debugging | v2 |
| `generate-act-assets` | AI Media Pipeline | v35 |
| `intro-capabilities` | Intro Selection & Composition | v4 (Active) |

---

## 5. Storage Buckets
- `performance-assets` (Public): Stage console media and finalized renders.
- `participant-assets` (Public): Original uploads and AI-curated participant photos.

---

## 6. Known Drifts (vs database_schema.sql)
- `participants`: Includes `identity_verified`, `is_minor`, and `guardian_relationship` columns documented in DB but omitted in early plans.
- `lineup_items`: Includes `execution_status` (Default: `Queued`).

---

## 7. Operational Guardrails
- **RLS**: Enabled on all public tables. Policies generally allow `EventAdmin` and `StageManager` broad access within their assigned events.
- **Audit**: `handle_audit_log()` trigger is attached to all mutation-heavy tables.
- **Identity**: User profiles are auto-provisioned via `on_auth_user_created` trigger.
