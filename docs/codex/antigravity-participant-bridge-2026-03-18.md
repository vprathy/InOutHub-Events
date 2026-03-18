# Antigravity Prompt: Participant Backend Bridge (Fixed Policies Only)

```text
Work only on precise Supabase execution/verification for InOutHub.

Repo context:
- Workspace: /Users/vinay/dev/InOutHub-Events
- Branch: codex/mobile-readiness-redesign
- Project Ref: qnucfdnjmcaklbwohnuj

Operating rules:
- Do not redesign app UX.
- Do not broaden scope beyond the requested database-side work.
- Keep this additive and safe.
- Do not create live triggers or dual-write paths in this pass.
- Do not implement template/document distribution logic in this pass.
- Stop and report if the repo contract blocks execution.

Return exactly:
1. SQL executed
2. row counts / aggregate results
3. any missing objects or policy errors
4. any mismatch against repo files
5. whether repo-side follow-up tweaks are needed

Objective:
Create the minimal participant-side backend bridge for fixed participant policies only, so the app can begin reading participant requirement assignments from Supabase without inventing a second system.

Important scope boundary:
- Include only these fixed participant policies:
  - guardian_contact_complete
  - identity_verified
  - special_request_reviewed
- Do NOT create participant assignment rows for dynamic template documents, compliance packets, or asset_templates-derived items in this pass.
- Do NOT create a participant-side trigger yet.

Requested work:

1. Verify these tables already exist:
- requirement_policies
- requirement_assignments
- participants
- participant_notes

2. Verify whether org-scoped participant policies already exist for every organization for these exact codes:
- guardian_contact_complete
- identity_verified
- special_request_reviewed

3. If any are missing, insert org-scoped requirement_policies for every organization using these exact contracts:

- code: guardian_contact_complete
  - subject_type: participant
  - label: Guardian Contact
  - description: Guardian name and phone must be captured for minor participants before show-day clearance.
  - category: safety
  - input_type: guardian_contact
  - input_config: {}
  - is_required: true
  - review_mode: system_derived
  - blocking_level: blocking
  - allow_bulk_approve: false
  - applies_when: {"is_minor": true}
  - sort_order: 10
  - is_active: true

- code: identity_verified
  - subject_type: participant
  - label: Identity Check
  - description: Participant identity should be reviewed before the record is considered clear.
  - category: identity
  - input_type: identity_check
  - input_config: {}
  - is_required: true
  - review_mode: review_required
  - blocking_level: warning
  - allow_bulk_approve: true
  - applies_when: {}
  - sort_order: 20
  - is_active: true

- code: special_request_reviewed
  - subject_type: participant
  - label: Special Request Review
  - description: Special requests should be logged and acknowledged before scheduling and show day.
  - category: readiness
  - input_type: text_note
  - input_config: {}
  - is_required: true
  - review_mode: no_review
  - blocking_level: warning
  - allow_bulk_approve: false
  - applies_when: {"has_special_requests": true}
  - sort_order: 30
  - is_active: true

4. Backfill requirement_assignments for participant rows using only those three policies.

Backfill rules:
- Use org-scoped policies matched through participants -> events -> organizations.
- subject_type must be participant.
- No act_id should be populated.
- Upsert safely on (policy_id, participant_id).
- Do not touch existing act-side assignments.

Exact status mapping:

- guardian_contact_complete
  - create assignments only for participants where is_minor = true
  - status = auto_complete when guardian_name and guardian_phone are both present
  - status = missing otherwise
  - evidence_summary should include guardian_name, guardian_phone, is_minor

- identity_verified
  - create assignments for all participants
  - status = approved when identity_verified = true
  - status = pending_review otherwise
  - evidence_summary should include identity_verified

- special_request_reviewed
  - create assignments only for participants where has_special_requests = true
  - status = approved when at least one participant_notes row exists for that participant with category = 'special_request'
  - status = missing otherwise
  - evidence_summary should include has_special_requests, special_request_note_count, special_request_raw

5. Verify and report:
- total participant-side requirement_assignments created/updated for these three policy codes
- counts by policy code
- counts by status
- counts by policy code + status
- number of minor participants missing guardian contact
- number of participants pending identity review
- number of participants with special requests but no special_request note

6. Verify that no participant-side trigger exists yet for automatic bridge sync.
- If a trigger exists, report its name and state.
- If no trigger exists, say explicitly that no participant bridge trigger is active.

7. Verify RLS/policy coverage still allows EventAdmin reads/manages for participant-side requirement_assignments.

8. If there is any mismatch against the repo contract, stop after reporting the mismatch.
```
